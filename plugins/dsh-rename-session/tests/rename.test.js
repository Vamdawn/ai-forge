import assert from 'node:assert/strict'
import { test } from 'node:test'
import { apply } from '../dist/index.js'

function fixture({ output = '修复登录超时', finish = { kind: 'stop' }, messages, route, beforeFinish } = {}) {
  const calls = []
  const renames = []
  let title = { title: '旧标题', eventSeq: 1 }
  const session = {
    id: 'session-1',
    deriveMessages: () => (messages ?? [
      { role: 'system', content: [{ type: 'text', text: 'system instruction' }] },
      { role: 'user', content: [{ type: 'text', text: '排查登录失败' }] },
      { role: 'assistant', content: [{ type: 'reasoning', text: 'private reasoning' }, { type: 'text', text: '已经定位到请求超时' }] },
      { role: 'tool', content: [{ type: 'text', text: 'raw tool output' }] },
      { role: 'user', source: { form: 'catalog' }, content: [{ type: 'text', text: 'skill catalog' }] },
      { role: 'user', source: { form: 'snapshot' }, content: [{ type: 'text', text: 'runtime context' }] },
      { role: 'user', source: { form: 'instructions' }, content: [{ type: 'text', text: 'injected instructions' }] },
      { role: 'user', source: { kind: 'compact-checkpoint' }, content: [{ type: 'text', text: '之前的对话摘要' }] },
    ]).map(message => ({ source: { kind: 'user' }, ...message })),
    requestHeader: () => ({ config: route ?? { provider: 'deepseek', model: 'deepseek-v4' } }),
  }
  const disposers = []
  let handler
  const ctx = {
    sessions: { get: id => id === session.id ? session : undefined },
    sessionTitle: {
      get: () => title,
      rename: (target, value) => {
        assert.equal(target, session)
        renames.push(value)
        title = { title: value, eventSeq: 2 }
        return title
      },
    },
    llm: {
      async *stream(options) {
        calls.push(options)
        if (beforeFinish) await beforeFinish({ ctx, session })
        yield { type: 'text-delta', index: 0, text: output }
        yield { type: 'finish', reason: finish }
      },
    },
    parallel: async () => {},
    effect: callback => { disposers.push(callback()) },
    connection: { fetch: { register: route => {
      assert.equal(route.path, '/api/dsh-rename-session')
      handler = route.fetch
    } } },
  }
  apply(ctx)
  return {
    ctx, session, calls, renames,
    request: async (payload = { sessionId: session.id }, signal = new AbortController().signal) => {
      const response = await handler(new Request('http://localhost/api/dsh-rename-session', {
        method: 'POST', body: JSON.stringify(payload), signal,
      }))
      return response.json()
    },
    dispose: async () => { for (const dispose of disposers) await dispose?.() },
  }
}

test('reads user and assistant context, reuses the session model and saves a normalized title', async () => {
  const f = fixture({ output: '  “修复登录\n超时”  ' })
  const result = await f.request()
  assert.equal(result.ok, true)
  assert.equal(result.value.title, '修复登录 超时')
  assert.deepEqual(f.renames, ['修复登录 超时'])
  const call = f.calls[0]
  assert.equal(call.provider, 'deepseek')
  assert.equal(call.model, 'deepseek-v4')
  assert.equal(call.purpose, 'session-title')
  assert.equal(call.sessionId, f.session.id)
  assert.match(call.messages[0].content[0].text, /排查登录失败/)
  assert.match(call.messages[0].content[0].text, /已经定位到请求超时/)
  assert.match(call.messages[0].content[0].text, /之前的对话摘要/)
  assert.doesNotMatch(call.messages[0].content[0].text, /private reasoning|raw tool output|system instruction|skill catalog|runtime context|injected instructions/)
})

test('empty context, missing model, invalid payload and cold session keep the title', async () => {
  for (const [f, code] of [[fixture({ messages: [] }), 'empty-context'], [fixture({ route: {} }), 'no-model']]) {
    const result = await f.request()
    assert.equal(result.ok, false)
    assert.equal(result.error.code, `rename-session/${code}`)
    assert.equal(f.calls.length, 0)
    assert.equal(f.renames.length, 0)
  }
  const f = fixture()
  for (const payload of [null, {}, { sessionId: 1 }, { sessionId: 'missing' }]) {
    const result = await f.request(payload)
    assert.equal(result.ok, false)
    assert.equal(result.error.code, `rename-session/${payload?.sessionId === 'missing' ? 'session-not-open' : 'invalid-request'}`)
  }
  assert.equal(f.calls.length, 0)
})

test('failed, truncated or empty model output keeps the existing title', async () => {
  for (const [options, code] of [
    [{ finish: { kind: 'error', failure: { code: 'offline', message: '模型不可用' } } }, 'model-failed'],
    [{ finish: { kind: 'max-tokens' } }, 'incomplete-output'],
    [{ output: '  ' }, 'empty-title'],
  ]) {
    const f = fixture(options)
    const result = await f.request()
    assert.equal(result.ok, false)
    assert.equal(result.error.code, `rename-session/${code}`)
    assert.equal(f.renames.length, 0)
  }
})

test('cancellation and a concurrent manual rename prevent the generated title from being written', async () => {
  const controller = new AbortController()
  const cancelled = fixture({ beforeFinish: () => { controller.abort() } })
  assert.equal((await cancelled.request(undefined, controller.signal)).error.code, 'rename-session/cancelled')
  assert.equal(cancelled.renames.length, 0)
  const timeout = new AbortController()
  const timedOut = fixture({ beforeFinish: () => { timeout.abort(new DOMException('deadline', 'TimeoutError')) } })
  assert.equal((await timedOut.request(undefined, timeout.signal)).error.code, 'rename-session/timeout')
  assert.equal(timedOut.renames.length, 0)
  const changed = fixture({ beforeFinish: ({ ctx, session }) => { ctx.sessionTitle.rename(session, '手动标题') } })
  assert.equal((await changed.request()).error.code, 'rename-session/title-changed')
  assert.deepEqual(changed.renames, ['手动标题'])
})

test('bounds long context while preserving the beginning and latest topic', async () => {
  const f = fixture({ messages: [
    { role: 'user', content: [{ type: 'text', text: '最初需求' + '长'.repeat(60000) + '最近任务' }] },
  ] })
  assert.equal((await f.request()).ok, true)
  const input = f.calls[0].messages[0].content[0].text
  assert.ok(input.length < 50000)
  assert.match(input, /最初需求/)
  assert.match(input, /最近任务/)
})

test('rejects duplicate requests and cancels pending work on plugin unload', async () => {
  let started
  const ready = new Promise(resolve => { started = resolve })
  const f = fixture({ beforeFinish: ({ ctx }) => new Promise(resolve => {
    ctx.llm.signal.addEventListener('abort', resolve, { once: true })
    started()
  }) })
  const stream = f.ctx.llm.stream
  f.ctx.llm.stream = function (options) { this.signal = options.signal; return stream.call(this, options) }
  const pending = f.request()
  await ready
  assert.equal((await f.request()).ok, false)
  await f.dispose()
  assert.equal((await pending).ok, false)
  assert.equal(f.renames.length, 0)
})
