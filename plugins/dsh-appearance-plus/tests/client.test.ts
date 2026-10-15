import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';
import type { FontFamily, AppearanceSettings } from '../src/protocol.js';

// The VM exposes only the DOM and services exercised by the compiled Client.
// Keep that boundary explicit instead of asserting a full Context.
interface ClientPlugin {
  id: string;
  factory(requireModule: (id: string) => unknown): { apply(context: object): void };
}

interface TokenModes {
  light: string;
  dark: string;
}

interface Store {
  getSnapshot(): unknown;
}

interface PageInjection {
  hooks: { applyIssues: Store; actionIssues: Store };
  pick(kind: 'image' | 'directory', field: 'fontDir' | 'backgroundImage'): void;
}

interface PageRegistration {
  name: string;
  id: string;
  order: number;
  label(): string;
  inject(): PageInjection;
}

class TestFontFace {
  static failing = new Set<string>();
  readonly family: string;
  readonly source: string;
  readonly descriptors: { weight: string; style: string };

  constructor(family: string, source: string, descriptors: { weight: string; style: string }) {
    this.family = family;
    this.source = source;
    // Copy out of the VM realm so deepStrictEqual compares plain test objects.
    this.descriptors = { ...descriptors };
  }

  async load(): Promise<TestFontFace> {
    if (TestFontFace.failing.has(this.family)) {
      throw new Error('network error');
    }
    return this;
  }
}

/** Waits until queued fetches, font loads, and the apply pass settle. */
async function settle(): Promise<void> {
  for (let index = 0; index < 10; index++) {
    await new Promise<void>(resolve => { setImmediate(resolve); });
  }
}

test('settings apply fonts and background, keep the last good values, and fully unload', async () => {
  const source = await readFile(new URL('../dist/client.js', import.meta.url), 'utf8');
  let plugin: ClientPlugin | undefined;
  const calls: Array<{ url: string; method: string; body?: string }> = [];
  const fileStatus = new Map<string, number>();
  let catalog: FontFamily[] = [];
  const style = { textContent: '', attached: false, remove() { this.attached = false; } };
  const fonts = new Set<TestFontFace>();
  runInNewContext(source, {
    window: { __ModuleLoader__: { load: (value: ClientPlugin) => { plugin = value; } } },
    document: {
      createElement: (tag: string) => {
        assert.equal(tag, 'style');
        return style;
      },
      head: { append: (element: typeof style) => { element.attached = true; } },
      fonts: { add: (face: TestFontFace) => fonts.add(face), delete: (face: TestFontFace) => fonts.delete(face) },
    },
    FontFace: TestFontFace,
    AbortController,
    URLSearchParams,
    setTimeout,
    clearTimeout,
    fetch: async (url: string, options: { method?: string; body?: string } = {}) => {
      const method = options.method ?? 'GET';
      calls.push({ url, method, ...options.body ? { body: options.body } : {} });
      if (url.startsWith('api/file?')) {
        const status = fileStatus.get(new URLSearchParams(url.slice('api/file?'.length)).get('path') ?? '') ?? 200;
        return { ok: status === 200, status };
      }
      const value = url.startsWith('api/dsh-appearance-plus/pick') ? '/picked/bg.webp' : catalog;
      return { ok: true, status: 200, json: async () => ({ ok: true, value }) };
    },
  });

  let settings: Partial<AppearanceSettings> = {
    uiFont: 'LXGW Bright', backgroundImage: '/Users/test/bg.jpg', backgroundFit: 'tile', overlayOpacity: 40,
  };
  let notify: (() => void) | undefined;
  const writes: Array<[string, unknown]> = [];
  const update = async (next: Partial<AppearanceSettings>): Promise<void> => {
    settings = { ...settings, ...next };
    notify?.();
    await settle();
  };
  const layers: Array<Record<string, TokenModes>> = [];
  let removedLayers = 0;
  let dictionaries: Record<'en' | 'zh', Record<string, string>> | undefined;
  let page: PageRegistration | undefined;
  const disposers: Array<() => void> = [];
  const modules: Record<string, unknown> = {
    react: { createElement: () => null, useEffect() {}, useMemo: (fn: () => unknown) => fn(), useState: (v: unknown) => [v, () => {}] },
    '@deepseek-ai/dsh-client-ui-primitives': { Button: 'button', Input: 'input', SegmentedControl: 'segmented' },
    '@deepseek-ai/dsh-client-store': {
      createSnapshotStore: (initial: unknown) => {
        let value = initial;
        return { getSnapshot: () => value, set: (next: unknown) => { value = next; } };
      },
    },
  };
  assert.ok(plugin);
  assert.equal(plugin.id, '@vamdawn/dsh-appearance-plus');
  plugin.factory(id => modules[id]).apply({
    effect: (callback: () => () => void) => {
      disposers.push(callback());
    },
    configForms: { get: (id: string) => {
      assert.equal(id, 'dsh-appearance-plus');
      return {
        getSnapshot: () => ({ value: settings }),
        subscribe: (listener: () => void) => {
          notify = listener;
          return () => { notify = undefined; };
        },
        set: async (field: string, value: unknown) => {
          writes.push([field, value]);
          return true;
        },
      };
    } },
    theme: { overrideTokens: (layerSource: string, tokens: Record<string, TokenModes>) => {
      assert.equal(layerSource, 'dsh-appearance-plus');
      layers.push(structuredClone(tokens));
      return () => { removedLayers++; };
    } },
    locale: {
      register: (namespace: string, value: typeof dictionaries) => {
        assert.equal(namespace, 'dshAppearancePlus');
        dictionaries = value;
        return () => {};
      },
      bind: () => (key: string) => dictionaries?.en[key] ?? key,
    },
    slots: {
      inject: (slot: string, callback: () => unknown) => {
        assert.equal(slot, 'settings.section');
        return callback();
      },
      register: (options: PageRegistration) => {
        page = options;
        return () => {};
      },
    },
  });
  assert.ok(dictionaries);
  assert.deepEqual(Object.keys(dictionaries.en).sort(), Object.keys(dictionaries.zh).sort());
  assert.ok(page);
  assert.deepEqual([page.name, page.id, page.order, page.label()],
    ['settings.section', 'dsh-appearance-plus', 10, 'Appearance+']);
  const injected = page.inject();
  const issues = () => structuredClone(injected.hooks.applyIssues.getSnapshot());
  const active = () => layers.at(-1) ?? {};
  await settle();

  // A system family resolves by name without reading the font catalog.
  assert.equal(style.attached, true);
  assert.match(active()['--dsw-font-family'].light, /^"LXGW Bright", -apple-system,/);
  assert.equal(active()['--dsw-font-family'].dark, active()['--dsw-font-family'].light);
  assert.deepEqual(active()['--dsw-alias-bg-base'], { light: 'transparent', dark: 'transparent' });
  assert.match(style.textContent, /url\("api\/file\?path=%2FUsers%2Ftest%2Fbg\.jpg"\) left top \/ auto repeat fixed/);
  assert.match(style.textContent, /rgb\(255 255 255 \/ 0\.4\)/);
  assert.match(style.textContent, /body\[data-ds-dark-theme\]\{background:linear-gradient\(rgb\(21 21 23 \/ 0\.4\)/);
  assert.deepEqual(calls, [{ url: 'api/file?path=%2FUsers%2Ftest%2Fbg.jpg', method: 'HEAD' }]);
  assert.deepEqual(issues(), {});

  // Invalid images report a reason and keep the last working background.
  const workingCss = style.textContent;
  fileStatus.set('/Users/test/missing.png', 404);
  fileStatus.set('/Users/test/huge.png', 413);
  for (const [image, reason] of [
    ['/Users/test/missing.png', 'error.not-found'],
    ['/Users/test/huge.png', 'error.too-large'],
    ['/Users/test/bg.gif', 'error.unsupported-format'],
    ['Pictures/bg.png', 'error.not-absolute'],
  ]) {
    await update({ backgroundImage: image });
    assert.deepEqual(issues(), { backgroundImage: reason });
    assert.equal(style.textContent, workingCss);
    assert.ok(active()['--dsw-alias-bg-base']);
  }

  // Extra-folder families load every face through the host file route.
  catalog = [{ family: 'Fixture Mono', source: 'extra', files: [
    { path: '/fonts/Fixture Mono Bold.ttf', weight: 700, italic: false },
    { path: '/fonts/FixtureMono-Italic.ttf', weight: 400, italic: true },
  ] }, { family: 'Broken Mono', source: 'extra', files: [{ path: '/fonts/broken.ttf', weight: 400, italic: false }] }];
  await update({ backgroundImage: '', fontDir: '/fonts', codeFont: 'Fixture Mono' });
  assert.deepEqual(issues(), {});
  assert.equal(style.textContent, '');
  assert.equal(active()['--dsw-alias-bg-base'], undefined);
  assert.match(active()['--ds-font-family-code'].light, /^"Fixture Mono", "SF Mono",/);
  assert.deepEqual([...fonts].map(face => [face.family, face.source, face.descriptors]), [
    ['Fixture Mono', 'url("api/file?path=%2Ffonts%2FFixture%20Mono%20Bold.ttf")', { weight: '700', style: 'normal' }],
    ['Fixture Mono', 'url("api/file?path=%2Ffonts%2FFixtureMono-Italic.ttf")', { weight: '400', style: 'italic' }],
  ]);
  assert.ok(calls.some(call => call.url === 'api/dsh-appearance-plus/fonts?dir=%2Ffonts'));

  // A failed font load keeps the previous family and its loaded faces.
  TestFontFace.failing.add('Broken Mono');
  await update({ codeFont: 'Broken Mono' });
  assert.deepEqual(issues(), { codeFont: 'error.font-load-failed' });
  assert.match(active()['--ds-font-family-code'].light, /^"Fixture Mono"/);
  assert.equal(fonts.size, 2);

  // Clearing a family returns that token to the host default and releases its faces.
  await update({ codeFont: '' });
  assert.equal(active()['--ds-font-family-code'], undefined);
  assert.equal(fonts.size, 0);

  // The native picker result is saved through the settings form.
  injected.pick('image', 'backgroundImage');
  await settle();
  assert.deepEqual(calls.find(call => call.url === 'api/dsh-appearance-plus/pick'),
    { url: 'api/dsh-appearance-plus/pick', method: 'POST', body: '{"kind":"image"}' });
  assert.deepEqual(writes, [['backgroundImage', '/picked/bg.webp']]);

  await update({ fontDir: '/fonts', codeFont: 'Fixture Mono', backgroundImage: '/Users/test/bg.jpg' });
  assert.equal(fonts.size, 2);
  for (const dispose of disposers.reverse()) {
    dispose?.();
  }
  assert.equal(style.attached, false);
  assert.equal(fonts.size, 0);
  assert.equal(removedLayers, 1);
  assert.equal(notify, undefined);
});
