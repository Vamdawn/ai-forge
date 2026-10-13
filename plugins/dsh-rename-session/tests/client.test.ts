import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';
import type { RenameResult } from '../src/protocol.js';

// The VM exposes plain test elements and only the services exercised by the
// compiled Client. Keep that boundary explicit instead of asserting a full Context.
interface ClientPlugin {
  factory(requireModule: (id: string) => unknown): { apply(context: object): void };
}

interface TestElement {
  type: unknown;
  props: Record<string, unknown>;
  children: unknown[];
}

type TestNotice =
  | { kind: 'pending' }
  | { kind: 'success'; title: string }
  | { kind: 'error'; code: string };

interface MenuInjection {
  renameSession(sessionId: string): Promise<void>;
}

interface NoticeInjection {
  hooks: { notice: unknown };
  dismiss(): void;
}

interface Registration {
  metadata: {
    name: string;
    order?: number;
    inject(): MenuInjection | NoticeInjection;
  };
  component(props: Record<string, unknown>): TestElement | null;
}

type Locale = 'en' | 'zh';
type Dictionaries = Record<Locale, Record<string, string>>;

test('menu, pending, success and all errors follow the selected official locale', async () => {
  const source = await readFile(new URL('../dist/client.js', import.meta.url), 'utf8');
  let plugin: ClientPlugin | undefined;
  const registrations = new Map<string, Registration>();
  let notice: TestNotice | null = null;
  let dictionaries: Dictionaries | undefined;
  let activeLocale: Locale = 'en';
  let released = false;
  const calls: Array<{ url: string; method: string; payload: unknown }> = [];
  let result: RenameResult = { ok: true, value: { title: '定位超时原因' } };
  runInNewContext(source, {
    window: { __ModuleLoader__: { load: (value: ClientPlugin) => { plugin = value; } } },
    AbortController,
    fetch: async (url: string, options: { method: string; body: string }) => {
      calls.push({ url, method: options.method, payload: JSON.parse(options.body) });
      return { ok: true, json: async () => result };
    },
  });
  const modules: Record<string, unknown> = {
    react: {
      createElement: (
        type: unknown, props: Record<string, unknown>, ...children: unknown[]
      ): TestElement => ({ type, props, children }),
    },
    '@deepseek-ai/dsh-client-ui-primitives': {
      IconEditOutlineRegular: 'edit-icon', MenuItemButton: 'menu', Toast: 'toast',
    },
    '@deepseek-ai/dsh-client-store': {
      createSnapshotStore: () => ({ set: (value: TestNotice | null) => { notice = value; } }),
    },
  };
  const ctx = {
    effect: (callback: () => unknown) => callback(),
    locale: { register: (namespace: string, translations: Dictionaries) => {
      assert.equal(namespace, 'renameSession');
      dictionaries = translations;
      return () => {};
    } },
    slots: {
      inject: (slot: string, callback: () => unknown) => callback(),
      register: (metadata: Registration['metadata'], component: Registration['component']) => {
        registrations.set(metadata.name, { metadata, component });
      },
    },
    sessions: { using: async <T>(
      id: string, options: { source: string }, operation: () => Promise<T>,
    ): Promise<T> => {
      assert.equal(id, 'test-session');
      assert.equal(options.source, 'workspaceOperation');
      try {
        return await operation();
      } finally {
        released = true;
      }
    } },
  };
  assert.ok(plugin);
  plugin.factory(id => modules[id]).apply(ctx);
  assert.ok(dictionaries);
  assert.deepEqual(Object.keys(dictionaries).sort(), ['en', 'zh']);
  assert.deepEqual(Object.keys(dictionaries.en).sort(), Object.keys(dictionaries.zh).sort());
  const t = (key: string, values: Record<string, string> = {}): string => {
    assert.ok(dictionaries);
    const translation = dictionaries[activeLocale][key];
    assert.ok(translation, `missing ${activeLocale} translation: ${key}`);
    return translation.replace(/\{(\w+)\}/g, (match: string, name: string) => {
      assert.ok(name in values, `missing interpolation value: ${match}`);
      return values[name];
    });
  };
  const menu = registrations.get('sidebar.workspaces.session.menu.item');
  const overlay = registrations.get('shell.overlay');
  assert.ok(menu);
  assert.ok(overlay);
  const renderNoticeText = (): string => {
    const element = overlay.component({
      useNotice: (select: (value: TestNotice | null) => TestNotice | null) => select(notice),
      dismiss() {}, t,
    });
    assert.ok(element);
    assert.ok(typeof element.props.text === 'string');
    return element.props.text;
  };
  const currentNotice = (): TestNotice => {
    assert.ok(notice);
    return notice;
  };
  assert.equal(menu.metadata.order, 250);
  const actions = menu.metadata.inject();
  assert.ok('renameSession' in actions);
  let menuOpen = true;
  const row = menu.component({
    sessionId: 'test-session',
    useMenuOpenState: () => [true, (value: boolean) => { menuOpen = value; }],
    ...actions, t,
  });
  assert.ok(row);
  assert.equal(row.children[0], 'Rename from context');
  assert.ok(typeof row.props.onSelect === 'function');
  row.props.onSelect();
  assert.equal(menuOpen, false);
  assert.equal(renderNoticeText(), 'Generating a name from the conversation…');
  activeLocale = 'zh';
  assert.equal(renderNoticeText(), '正在根据会话上下文生成名称…');
  await new Promise<void>(resolve => { setImmediate(resolve); });
  assert.equal(released, true);
  assert.deepEqual(calls, [{
    url: 'api/dsh-rename-session', method: 'POST', payload: { sessionId: 'test-session' },
  }]);
  const successfulNotice = currentNotice();
  assert.ok(successfulNotice.kind === 'success');
  assert.equal(successfulNotice.title, '定位超时原因');
  assert.equal(renderNoticeText(), '会话已重命名为：定位超时原因');
  activeLocale = 'en';
  assert.equal(renderNoticeText(), 'Session renamed to: 定位超时原因');
  result = {
    ok: false,
    error: { code: 'rename-session/no-model', message: '该会话尚无模型请求', details: {} },
  };
  await actions.renameSession('test-session');
  assert.equal(currentNotice().kind, 'error');
  assert.equal(renderNoticeText(), 'Rename failed: Send a message before generating a name.');
  activeLocale = 'zh';
  assert.equal(renderNoticeText(), '重命名失败：发送消息后再生成会话名称。');
  for (const code of ['invalid-request', 'session-not-open', 'busy', 'no-model', 'empty-context', 'model-failed',
    'incomplete-output', 'tool-output', 'empty-title', 'title-changed', 'timeout', 'cancelled', 'failed']) {
    result = {
      ok: false,
      error: { code: `rename-session/${code}`, message: '不应直接显示的后端消息', details: {} },
    };
    await actions.renameSession('test-session');
    const languages: Locale[] = ['en', 'zh'];
    for (const language of languages) {
      activeLocale = language;
      assert.doesNotMatch(renderNoticeText(), /不应直接显示|\{\w+\}/);
    }
  }
  result = {
    ok: false,
    error: { code: 'unexpected/code', message: 'untranslated backend text', details: {} },
  };
  await actions.renameSession('test-session');
  activeLocale = 'en';
  assert.equal(renderNoticeText(), 'Rename failed: Could not rename the session. Please try again.');
});
