import { open as openFontkit } from 'fontkit';
import { open, readdir } from 'node:fs/promises';
import type { FileHandle } from 'node:fs/promises';
import { extname, join } from 'node:path';
import type { FontFamily } from './protocol.js';

const EXTENSIONS = new Set(['.ttf', '.otf', '.ttc', '.woff', '.woff2']);
const WINDOWS_ENGLISH = 0x409;

/** Naming and style metadata of one face inside a font file. */
export interface FaceInfo {
  family: string;
  weight: number;
  italic: boolean;
}

/** Lists the platform's installed font directories; missing ones are skipped by the scanner. */
export function systemFontDirs(platform: NodeJS.Platform, home: string, env: NodeJS.ProcessEnv): string[] {
  switch (platform) {
    case 'darwin':
      return ['/System/Library/Fonts', '/Library/Fonts', join(home, 'Library/Fonts')];
    case 'win32':
      return [join(env.WINDIR ?? 'C:\\Windows', 'Fonts'),
        ...env.LOCALAPPDATA ? [join(env.LOCALAPPDATA, 'Microsoft/Windows/Fonts')] : []];
    default:
      return ['/usr/share/fonts', '/usr/local/share/fonts', join(home, '.local/share/fonts'), join(home, '.fonts')];
  }
}

/**
 * Picks the family name from an sfnt `name` table. English Windows records
 * match CSS family lookup on every platform, and the typographic family (16)
 * groups weights that the legacy family (1) splits into separate names.
 */
export function parseFamily(table: Buffer): string | undefined {
  const count = table.readUInt16BE(2);
  const strings = table.readUInt16BE(4);
  let best: { rank: number; value: string } | undefined;
  for (let index = 0; index < count && 6 + index * 12 + 12 <= table.length; index++) {
    const at = 6 + index * 12;
    const platform = table.readUInt16BE(at);
    const language = table.readUInt16BE(at + 4);
    const nameId = table.readUInt16BE(at + 6);
    if (nameId !== 1 && nameId !== 16) {
      continue;
    }
    const start = strings + table.readUInt16BE(at + 10);
    const raw = table.subarray(start, start + table.readUInt16BE(at + 8));
    let languageRank: number;
    let value: string;
    if (platform === 3 || platform === 0) {
      // Windows and Unicode records are UTF-16BE; drop a dangling odd byte.
      value = Buffer.from(raw.subarray(0, raw.length & ~1)).swap16().toString('utf16le');
      languageRank = platform === 0 ? 2 : language === WINDOWS_ENGLISH ? 0 : 3;
    } else if (platform === 1) {
      value = raw.toString('latin1');
      languageRank = language === 0 ? 1 : 3;
    } else {
      continue;
    }
    value = value.trim();
    const rank = languageRank * 2 + (nameId === 16 ? 0 : 1);
    if (value && (!best || rank < best.rank)) {
      best = { rank, value };
    }
  }
  return best?.value;
}

async function readAt(file: FileHandle, offset: number, length: number): Promise<Buffer> {
  const buffer = Buffer.alloc(length);
  const { bytesRead } = await file.read(buffer, 0, length, offset);
  if (bytesRead < length) {
    throw new Error('truncated font file');
  }
  return buffer;
}

async function readSfnt(file: FileHandle, offset: number): Promise<FaceInfo | undefined> {
  const count = (await readAt(file, offset, 12)).readUInt16BE(4);
  const records = await readAt(file, offset + 12, count * 16);
  const tables = new Map<string, { offset: number; length: number }>();
  for (let index = 0; index < count; index++) {
    const at = index * 16;
    tables.set(records.toString('latin1', at, at + 4),
      { offset: records.readUInt32BE(at + 8), length: records.readUInt32BE(at + 12) });
  }
  const name = tables.get('name');
  const family = name && parseFamily(await readAt(file, name.offset, name.length));
  if (!family) {
    return undefined;
  }
  const os2 = tables.get('OS/2');
  if (!os2 || os2.length < 64) {
    return { family, weight: 400, italic: false };
  }
  const metrics = await readAt(file, os2.offset, 64);
  // usWeightClass at byte 4; fsSelection bit 0 marks italic faces.
  return { family, weight: metrics.readUInt16BE(4) || 400, italic: (metrics.readUInt16BE(62) & 1) !== 0 };
}

/**
 * Reads face metadata without loading whole files: sfnt fonts read only their
 * table directory, `name`, and `OS/2`. WOFF containers are compressed, so
 * fontkit decodes them; they are small web fonts rather than system families.
 */
export async function readFaces(path: string): Promise<FaceInfo[]> {
  const extension = extname(path).toLowerCase();
  if (extension === '.woff' || extension === '.woff2') {
    const font = await openFontkit(path);
    return ('fonts' in font ? font.fonts : [font]).map(face => ({
      family: face.getName('preferredFamily', 'en') ?? face.familyName,
      weight: face['OS/2']?.usWeightClass || 400,
      italic: face.italicAngle !== 0,
    }));
  }
  const file = await open(path);
  try {
    const header = await readAt(file, 0, 12);
    if (header.toString('latin1', 0, 4) !== 'ttcf') {
      const face = await readSfnt(file, 0);
      return face ? [face] : [];
    }
    const count = header.readUInt32BE(8);
    const offsets = await readAt(file, 12, count * 4);
    const faces: FaceInfo[] = [];
    for (let index = 0; index < count; index++) {
      const face = await readSfnt(file, offsets.readUInt32BE(index * 4));
      if (face) {
        faces.push(face);
      }
    }
    return faces;
  } finally {
    await file.close();
  }
}

/**
 * Groups every readable font below the directories by family. Extra-directory
 * families keep their files so the browser can load them; system families are
 * referenced by name. Missing directories and damaged files are skipped.
 */
export async function scanFonts(dirs: readonly string[], source: FontFamily['source']): Promise<FontFamily[]> {
  const families = new Map<string, FontFamily>();
  for (const dir of dirs) {
    let entries;
    try {
      entries = await readdir(dir, { recursive: true, withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (!entry.isFile() || !EXTENSIONS.has(extname(entry.name).toLowerCase())) {
        continue;
      }
      const path = join(entry.parentPath, entry.name);
      let faces: FaceInfo[];
      try {
        faces = await readFaces(path);
      } catch {
        continue;
      }
      for (const face of faces) {
        let family = families.get(face.family);
        if (!family) {
          family = { family: face.family, source, files: [] };
          families.set(face.family, family);
        }
        if (source === 'extra') {
          family.files.push({ path, weight: face.weight, italic: face.italic });
        }
      }
    }
  }
  return [...families.values()];
}
