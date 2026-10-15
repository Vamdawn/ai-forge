import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import type { FontFamily, SkinResult } from '../src/protocol.js';
// Font parsing is internal to the Host bundle, so it is tested from source.
import { parseFamily, readFaces, scanFonts, systemFontDirs } from '../src/fonts.ts';
import { pickPath } from '../src/picker.ts';

type NameRecord = [platform: 1 | 3, language: number, nameId: number, text: string];

/** Builds an sfnt `name` table from records. */
function nameTable(records: NameRecord[]): Buffer {
  const strings = records.map(([platform, , , text]) =>
    platform === 3 ? Buffer.from(text, 'utf16le').swap16() : Buffer.from(text, 'latin1'));
  const header = Buffer.alloc(6 + records.length * 12);
  header.writeUInt16BE(records.length, 2);
  header.writeUInt16BE(header.length, 4);
  let offset = 0;
  records.forEach(([platform, language, nameId], index) => {
    const at = 6 + index * 12;
    header.writeUInt16BE(platform, at);
    header.writeUInt16BE(platform === 3 ? 1 : 0, at + 2);
    header.writeUInt16BE(language, at + 4);
    header.writeUInt16BE(nameId, at + 6);
    header.writeUInt16BE(strings[index].length, at + 8);
    header.writeUInt16BE(offset, at + 10);
    offset += strings[index].length;
  });
  return Buffer.concat([header, ...strings]);
}

interface FixtureFace {
  family: string;
  weight: number;
  italic: boolean;
}

/** Builds a minimal font holding only `name` and `OS/2`, optionally as a collection. */
function fontFile(faces: FixtureFace[], collection: boolean): Buffer {
  const headerLength = collection ? 12 + faces.length * 4 : 0;
  const chunks: Buffer[] = [];
  const offsets: number[] = [];
  let position = headerLength;
  for (const face of faces) {
    const name = nameTable([[3, 0x409, 1, face.family]]);
    const os2 = Buffer.alloc(64);
    os2.writeUInt16BE(face.weight, 4);
    os2.writeUInt16BE(face.italic ? 1 : 0, 62);
    const directory = Buffer.alloc(12 + 2 * 16);
    directory.writeUInt32BE(0x10000, 0);
    directory.writeUInt16BE(2, 4);
    const nameOffset = position + directory.length;
    for (const [index, tag, offset, length] of [
      [0, 'name', nameOffset, name.length],
      [1, 'OS/2', nameOffset + name.length, os2.length],
    ] as const) {
      directory.write(tag, 12 + index * 16, 'latin1');
      directory.writeUInt32BE(offset, 12 + index * 16 + 8);
      directory.writeUInt32BE(length, 12 + index * 16 + 12);
    }
    offsets.push(position);
    chunks.push(directory, name, os2);
    position = nameOffset + name.length + os2.length;
  }
  if (!collection) {
    return Buffer.concat(chunks);
  }
  const header = Buffer.alloc(headerLength);
  header.write('ttcf', 0, 'latin1');
  header.writeUInt32BE(0x10000, 4);
  header.writeUInt32BE(faces.length, 8);
  offsets.forEach((offset, index) => header.writeUInt32BE(offset, 12 + index * 4));
  return Buffer.concat([header, ...chunks]);
}

async function fixtureDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'dsh-skin-fonts-'));
  await mkdir(join(dir, 'nested'));
  await writeFile(join(dir, 'Sans-Bold.TTF'),
    fontFile([{ family: 'DshSkin Fixture Sans', weight: 700, italic: false }], false));
  await writeFile(join(dir, 'nested', 'Serif.ttc'), fontFile([
    { family: 'DshSkin Fixture Serif', weight: 400, italic: false },
    { family: 'DshSkin Fixture Serif', weight: 400, italic: true },
  ], true));
  await writeFile(join(dir, 'broken.ttf'), 'not a font');
  await writeFile(join(dir, 'notes.txt'), 'ignored');
  return dir;
}

test('family names prefer English typographic names and fall back by language', () => {
  assert.equal(parseFamily(nameTable([
    [3, 0x804, 16, '测试黑体'],
    [3, 0x409, 1, 'Fixture Sans Bold'],
    [3, 0x409, 16, 'Fixture Sans'],
  ])), 'Fixture Sans');
  assert.equal(parseFamily(nameTable([[3, 0x804, 1, '测试黑体'], [1, 0, 1, 'Fixture Mac']])), 'Fixture Mac');
  assert.equal(parseFamily(nameTable([[3, 0x804, 1, '测试黑体']])), '测试黑体');
  assert.equal(parseFamily(nameTable([[3, 0x409, 4, 'Full name only']])), undefined);
});

test('faces are read from fonts, collections, and compressed web fonts', async () => {
  const dir = await fixtureDir();
  try {
    assert.deepEqual(await readFaces(join(dir, 'Sans-Bold.TTF')),
      [{ family: 'DshSkin Fixture Sans', weight: 700, italic: false }]);
    assert.deepEqual(await readFaces(join(dir, 'nested', 'Serif.ttc')), [
      { family: 'DshSkin Fixture Serif', weight: 400, italic: false },
      { family: 'DshSkin Fixture Serif', weight: 400, italic: true },
    ]);
    await assert.rejects(readFaces(join(dir, 'broken.ttf')));
    const woff2 = new URL(
      '../node_modules/@deepseek-ai/dsh-client-ui-theme/lib/styles/montserrat-light.woff2', import.meta.url);
    assert.deepEqual(await readFaces(woff2.pathname), [{ family: 'Montserrat', weight: 300, italic: false }]);
  } finally {
    await rm(dir, { recursive: true });
  }
});

test('scans group faces by family and skip missing directories and damaged files', async () => {
  const dir = await fixtureDir();
  try {
    const sort = (fonts: FontFamily[]) => fonts.sort((a, b) => a.family.localeCompare(b.family));
    assert.deepEqual(sort(await scanFonts([join(dir, 'missing'), dir], 'extra')), [
      { family: 'DshSkin Fixture Sans', source: 'extra',
        files: [{ path: join(dir, 'Sans-Bold.TTF'), weight: 700, italic: false }] },
      { family: 'DshSkin Fixture Serif', source: 'extra', files: [
        { path: join(dir, 'nested', 'Serif.ttc'), weight: 400, italic: false },
        { path: join(dir, 'nested', 'Serif.ttc'), weight: 400, italic: true },
      ] },
    ]);
    // System families resolve by name, so their files are not exposed.
    assert.ok((await scanFonts([dir], 'system')).every(font => font.files.length === 0));
  } finally {
    await rm(dir, { recursive: true });
  }
});

test('system font directories follow the platform', () => {
  assert.deepEqual(systemFontDirs('darwin', '/Users/test', {}),
    ['/System/Library/Fonts', '/Library/Fonts', '/Users/test/Library/Fonts']);
  assert.ok(systemFontDirs('linux', '/home/test', {}).includes('/home/test/.local/share/fonts'));
  assert.equal(systemFontDirs('win32', 'C:\\Users\\test', { WINDIR: 'D:\\Windows' })[0], join('D:\\Windows', 'Fonts'));
});

test('native pickers report unsupported platforms instead of running a command', async () => {
  await assert.rejects(pickPath('image', AbortSignal.timeout(1_000), 'linux'),
    (error: unknown) => error instanceof Error && 'code' in error && error.code === 'dsh-skin/unsupported-platform');
});

// The compiled Host is loaded through its package export, as DSH loads it.
// The built JavaScript has no declarations, so type the exercised exports here.
const PACKAGE_NAME = '@vamdawn/dsh-skin';
const { apply, Config }: {
  apply(ctx: object): void;
  Config(value: object): Record<string, { get(): unknown }>;
} = await import(PACKAGE_NAME);

test('Host routes validate input and serve the extra folder catalog', async () => {
  const routes = new Map<string, (request: Request) => Promise<Response>>();
  const disposers: Array<() => unknown> = [];
  let presentation: unknown;
  const fiber = {};
  apply({
    fiber,
    effect: (callback: () => () => unknown) => {
      disposers.push(callback());
    },
    inject: (deps: string[], callback: (child: object) => void) => {
      assert.deepEqual(deps, ['settings']);
      callback({
        effect: (inner: () => unknown) => inner(),
        settings: { configure: (value: unknown, owner: unknown) => {
          assert.equal(owner, fiber);
          presentation = value;
        } },
      });
    },
    connection: { fetch: { register: (route: { path: string; fetch(request: Request): Promise<Response> }) => {
      routes.set(route.path, route.fetch);
      return () => routes.delete(route.path);
    } } },
  });
  assert.deepEqual(presentation, { auto: false });
  const call = async <T>(path: string, init?: RequestInit): Promise<SkinResult<T>> => {
    const route = routes.get(path.split('?')[0]);
    assert.ok(route);
    return await (await route(new Request(`http://127.0.0.1${path}`, init))).json() as SkinResult<T>;
  };
  assert.deepEqual(await call('/api/dsh-skin/fonts?dir=relative/fonts'),
    { ok: false, error: { code: 'dsh-skin/invalid-request', message: 'invalid-request' } });
  for (const body of ['{"kind":"file"}', 'not json']) {
    assert.deepEqual(await call('/api/dsh-skin/pick', { method: 'POST', body }),
      { ok: false, error: { code: 'dsh-skin/invalid-request', message: 'invalid-request' } });
  }
  const dir = await fixtureDir();
  try {
    const result = await call<FontFamily[]>(`/api/dsh-skin/fonts?dir=${encodeURIComponent(dir)}`);
    assert.ok(result.ok);
    const families = result.value.map(font => font.family);
    assert.deepEqual(families, [...families].sort((a, b) => a.localeCompare(b)));
    assert.deepEqual(result.value.find(font => font.family === 'DshSkin Fixture Sans'), {
      family: 'DshSkin Fixture Sans', source: 'extra',
      files: [{ path: join(dir, 'Sans-Bold.TTF'), weight: 700, italic: false }],
    });
  } finally {
    await rm(dir, { recursive: true });
  }
  for (const dispose of disposers) {
    await dispose();
  }
  assert.equal(routes.size, 0);
});

test('settings schema supplies defaults and rejects invalid values', () => {
  const defaults = Object.fromEntries(Object.entries(Config({})).map(([key, value]) => [key, value.get()]));
  assert.deepEqual(defaults, {
    uiFont: '', codeFont: '', fontDir: '', backgroundImage: '', backgroundFit: 'cover', overlayOpacity: 60,
  });
  for (const invalid of [{ overlayOpacity: 101 }, { overlayOpacity: 1.5 }, { backgroundFit: 'stretch' }]) {
    assert.throws(() => Config(invalid));
  }
});
