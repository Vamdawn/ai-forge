import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { runInNewContext } from 'node:vm'
import { test } from 'node:test'

test('menu, pending, success and all errors follow the selected official locale', async () => {
  const source = await readFile(new URL('../dist/client.js', import.meta.url), 'utf8')
  let plugin
  const registrations = new Map()
  let notice
  let dictionaries
  let activeLocale = 'en'
  let released = false
  const calls = []
  let result = { ok: true, value: { title: '定位超时原因' } }
  runInNewContext(source, {
    window: { __ModuleLoader__: { load: value => { plugin = value } } }, AbortController,
    fetch: async (url, options) => {
      calls.push({ url, method: options.method, ...JSON.parse(options.body) })
      return { ok: true, json: async () => result }
    },
  })
  const modules = {
    react: { createElement: (type, props, ...children) => ({ type, props, children }) },
    '@deepseek-ai/dsh-client-ui-primitives': { IconEditOutlineRegular: 'edit-icon', MenuItemButton: 'menu', Toast: 'toast' },
    '@deepseek-ai/dsh-client-store': { createSnapshotStore: () => ({ set: value => { notice = value } }) },
  }
  const ctx = {
    effect: callback => callback(),
    locale: { register: (_, dicts) => { dictionaries = dicts; return () => {} } },
    slots: {
      inject: (_, callback) => callback(),
      register: (metadata, component) => { registrations.set(metadata.name, { metadata, component }) },
    },
    sessions: { using: async (id, options, operation) => {
      assert.equal(id, 'test-session')
      assert.equal(options.source, 'workspaceOperation')
      try { return await operation() } finally { released = true }
    } },
  }
  plugin.factory(id => modules[id]).apply(ctx)
  assert.deepEqual(Object.keys(dictionaries).sort(), ['en', 'zh'])
  assert.deepEqual(Object.keys(dictionaries.en).sort(), Object.keys(dictionaries.zh).sort())
  const t = (key, values = {}) => {
    assert.ok(dictionaries[activeLocale][key], `missing ${activeLocale} translation: ${key}`)
    return dictionaries[activeLocale][key].replace(/\{(\w+)\}/g, (_, name) => values[name])
  }
  const menu = registrations.get('sidebar.workspaces.session.menu.item')
  const overlay = registrations.get('shell.overlay')
  const renderNotice = () => overlay.component({ useNotice: select => select(notice), dismiss() {}, t })
  assert.equal(menu.metadata.order, 250)
  const actions = menu.metadata.inject()
  let menuOpen = true
  const row = menu.component({
    sessionId: 'test-session', useMenuOpenState: () => [true, value => { menuOpen = value }],
    ...actions, t,
  })
  assert.equal(row.children[0], 'Rename from context')
  row.props.onSelect()
  assert.equal(menuOpen, false)
  assert.equal(renderNotice().props.text, 'Generating a name from the conversation…')
  activeLocale = 'zh'
  assert.equal(renderNotice().props.text, '正在根据会话上下文生成名称…')
  await new Promise(resolve => setImmediate(resolve))
  assert.equal(released, true)
  assert.deepEqual(calls, [{ url: 'api/dsh-rename-session', method: 'POST', sessionId: 'test-session' }])
  assert.equal(notice.kind, 'success')
  assert.equal(notice.title, '定位超时原因')
  assert.equal(renderNotice().props.text, '会话已重命名为：定位超时原因')
  activeLocale = 'en'
  assert.equal(renderNotice().props.text, 'Session renamed to: 定位超时原因')
  result = { ok: false, error: { code: 'rename-session/no-model', message: '该会话尚无模型请求' } }
  await actions.renameSession('test-session')
  assert.equal(notice.kind, 'error')
  assert.equal(renderNotice().props.text, 'Rename failed: Send a message before generating a name.')
  activeLocale = 'zh'
  assert.equal(renderNotice().props.text, '重命名失败：发送消息后再生成会话名称。')
  for (const code of ['invalid-request', 'session-not-open', 'busy', 'no-model', 'empty-context', 'model-failed',
    'incomplete-output', 'tool-output', 'empty-title', 'title-changed', 'timeout', 'cancelled', 'failed']) {
    result = { ok: false, error: { code: `rename-session/${code}`, message: '不应直接显示的后端消息' } }
    await actions.renameSession('test-session')
    for (const language of ['en', 'zh']) {
      activeLocale = language
      assert.doesNotMatch(renderNotice().props.text, /不应直接显示|\{\w+\}/)
    }
  }
  result = { ok: false, error: { code: 'unexpected/code', message: 'untranslated backend text' } }
  await actions.renameSession('test-session')
  activeLocale = 'en'
  assert.equal(renderNotice().props.text, 'Rename failed: Could not rename the session. Please try again.')
})
