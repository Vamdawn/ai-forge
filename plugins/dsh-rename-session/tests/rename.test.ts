import assert from 'node:assert/strict';
import { test } from 'node:test';
import type {
  ContentBlock, FinishReason, GenerateOptions, Message, StreamChunk,
} from '@deepseek-ai/dsh-llm/types';
import type { RenameReason, RenameResult } from '../src/protocol.js';

// The built JavaScript has no declarations. Keep the import boundary typed
// against the fixture's exercised services rather than casting a partial Context.
const { apply }: { apply(ctx: ReturnType<typeof fixture>['ctx']): void } =
  await import(new URL('../dist/index.js', import.meta.url).href);

interface FixtureMessage {
  role: Message['role'];
  content: ContentBlock[];
  source?: { kind?: string; form?: string };
}

interface FixtureSession {
  id: string;
  deriveMessages(): FixtureMessage[];
  requestHeader(): { config: Partial<Pick<GenerateOptions, 'provider' | 'model'>> };
}

interface TitleSnapshot {
  title: string;
  eventSeq: number;
}

interface FixtureOptions {
  output?: string;
  finish?: FinishReason;
  messages?: FixtureMessage[];
  route?: Partial<Pick<GenerateOptions, 'provider' | 'model'>>;
  beforeFinish?: (state: {
    ctx: { sessionTitle: { rename(session: FixtureSession, title: string): TitleSnapshot } };
    session: FixtureSession;
    signal: AbortSignal;
  }) => void | Promise<void>;
}

function fixture({
  output = '修复登录超时', finish = { kind: 'stop' }, messages, route, beforeFinish,
}: FixtureOptions = {}) {
  const calls: GenerateOptions[] = [];
  const renames: string[] = [];
  let title: TitleSnapshot = { title: '旧标题', eventSeq: 1 };
  const defaultMessages: FixtureMessage[] = [
    { role: 'system', content: [{ type: 'text', text: 'system instruction' }] },
    { role: 'user', content: [{ type: 'text', text: '排查登录失败' }] },
    { role: 'assistant', content: [{ type: 'reasoning', text: 'private reasoning' }, { type: 'text', text: '已经定位到请求超时' }] },
    { role: 'tool', content: [{ type: 'text', text: 'raw tool output' }] },
    { role: 'user', source: { form: 'catalog' }, content: [{ type: 'text', text: 'skill catalog' }] },
    { role: 'user', source: { form: 'snapshot' }, content: [{ type: 'text', text: 'runtime context' }] },
    { role: 'user', source: { form: 'instructions' }, content: [{ type: 'text', text: 'injected instructions' }] },
    { role: 'user', source: { kind: 'compact-checkpoint' }, content: [{ type: 'text', text: '之前的对话摘要' }] },
  ];
  const session: FixtureSession = {
    id: 'session-1',
    deriveMessages: () => (messages ?? defaultMessages)
      .map(message => ({ source: { kind: 'user' }, ...message })),
    requestHeader: () => ({ config: route ?? { provider: 'deepseek', model: 'deepseek-v4' } }),
  };
  const disposers: Array<(() => void | Promise<void>) | void> = [];
  let handler: ((request: Request) => Promise<Response>) | undefined;
  const ctx = {
    sessions: { get: (id: string) => id === session.id ? session : undefined },
    sessionTitle: {
      get: () => title,
      rename: (target: FixtureSession, value: string): TitleSnapshot => {
        assert.equal(target, session);
        renames.push(value);
        title = { title: value, eventSeq: 2 };
        return title;
      },
    },
    llm: {
      async *stream(options: GenerateOptions): AsyncGenerator<StreamChunk> {
        calls.push(options);
        if (beforeFinish) {
          assert.ok(options.signal);
          await beforeFinish({ ctx, session, signal: options.signal });
        }
        yield { type: 'text-delta', index: 0, text: output };
        yield { type: 'finish', reason: finish };
      },
    },
    parallel: async () => {},
    effect: (callback: () => (() => void | Promise<void>) | void) => {
      disposers.push(callback());
    },
    connection: { fetch: { register: (endpoint: {
      path: string;
      fetch(request: Request): Promise<Response>;
    }) => {
      assert.equal(endpoint.path, '/api/dsh-rename-session');
      handler = endpoint.fetch;
    } } },
  };
  apply(ctx);
  return {
    ctx, session, calls, renames,
    request: async (
      payload: unknown = { sessionId: session.id },
      signal = new AbortController().signal,
    ): Promise<RenameResult> => {
      assert.ok(handler);
      const response = await handler(new Request('http://localhost/api/dsh-rename-session', {
        method: 'POST', body: JSON.stringify(payload), signal,
      }));
      // This JSON boundary returns the endpoint protocol asserted by each test.
      return await response.json() as RenameResult;
    },
    dispose: async () => {
      for (const dispose of disposers) {
        await dispose?.();
      }
    },
  };
}

function failureCode(result: RenameResult): string {
  assert.ok(!result.ok);
  return result.error.code;
}

function requestText(options: GenerateOptions): string {
  const block = options.messages[0].content[0];
  assert.ok(block.type === 'text');
  return block.text;
}

test('reads user and assistant context, reuses the session model and saves a normalized title', async () => {
  const subject = fixture({ output: '  “修复登录\n超时”  ' });
  const result = await subject.request();
  assert.ok(result.ok);
  assert.equal(result.value.title, '修复登录 超时');
  assert.deepEqual(subject.renames, ['修复登录 超时']);
  const call = subject.calls[0];
  assert.equal(call.provider, 'deepseek');
  assert.equal(call.model, 'deepseek-v4');
  assert.equal(call.purpose, 'session-title');
  assert.equal(call.sessionId, subject.session.id);
  const input = requestText(call);
  assert.match(input, /排查登录失败/);
  assert.match(input, /已经定位到请求超时/);
  assert.match(input, /之前的对话摘要/);
  assert.doesNotMatch(input, /private reasoning|raw tool output|system instruction|skill catalog|runtime context|injected instructions/);
});

test('empty context, missing model, invalid payload and cold session keep the title', async () => {
  const unavailable: Array<[ReturnType<typeof fixture>, RenameReason]> = [
    [fixture({ messages: [] }), 'empty-context'], [fixture({ route: {} }), 'no-model'],
  ];
  for (const [subject, code] of unavailable) {
    assert.equal(failureCode(await subject.request()), `rename-session/${code}`);
    assert.equal(subject.calls.length, 0);
    assert.equal(subject.renames.length, 0);
  }
  const subject = fixture();
  const invalidPayloads: Array<[unknown, RenameReason]> = [
    [null, 'invalid-request'], [{}, 'invalid-request'],
    [{ sessionId: 1 }, 'invalid-request'], [{ sessionId: 'missing' }, 'session-not-open'],
  ];
  for (const [payload, code] of invalidPayloads) {
    assert.equal(failureCode(await subject.request(payload)), `rename-session/${code}`);
  }
  assert.equal(subject.calls.length, 0);
});

test('failed, truncated or empty model output keeps the existing title', async () => {
  const failures: Array<[FixtureOptions, RenameReason]> = [
    [{ finish: { kind: 'error', failure: { code: 'offline', message: '模型不可用' } } }, 'model-failed'],
    [{ finish: { kind: 'max-tokens' } }, 'incomplete-output'],
    [{ output: '  ' }, 'empty-title'],
  ];
  for (const [options, code] of failures) {
    const subject = fixture(options);
    assert.equal(failureCode(await subject.request()), `rename-session/${code}`);
    assert.equal(subject.renames.length, 0);
  }
});

test('cancellation and a concurrent manual rename prevent the generated title from being written', async () => {
  const controller = new AbortController();
  const cancelled = fixture({ beforeFinish: () => { controller.abort(); } });
  assert.equal(failureCode(await cancelled.request(undefined, controller.signal)), 'rename-session/cancelled');
  assert.equal(cancelled.renames.length, 0);
  const timeout = new AbortController();
  const timedOut = fixture({ beforeFinish: () => {
    timeout.abort(new DOMException('deadline', 'TimeoutError'));
  } });
  assert.equal(failureCode(await timedOut.request(undefined, timeout.signal)), 'rename-session/timeout');
  assert.equal(timedOut.renames.length, 0);
  const changed = fixture({ beforeFinish: ({ ctx, session }) => {
    ctx.sessionTitle.rename(session, '手动标题');
  } });
  assert.equal(failureCode(await changed.request()), 'rename-session/title-changed');
  assert.deepEqual(changed.renames, ['手动标题']);
});

test('bounds long context while preserving the beginning and latest topic', async () => {
  const subject = fixture({ messages: [
    { role: 'user', content: [{ type: 'text', text: '最初需求' + '长'.repeat(60_000) + '最近任务' }] },
  ] });
  assert.ok((await subject.request()).ok);
  const input = requestText(subject.calls[0]);
  assert.ok(input.length < 50_000);
  assert.match(input, /最初需求/);
  assert.match(input, /最近任务/);
});

test('rejects duplicate requests and cancels pending work on plugin unload', async () => {
  const { promise: ready, resolve: started } = Promise.withResolvers<void>();
  const subject = fixture({ beforeFinish: ({ signal }) => new Promise<void>(resolve => {
    signal.addEventListener('abort', () => { resolve(); }, { once: true });
    started();
  }) });
  const pending = subject.request();
  await ready;
  assert.equal(failureCode(await subject.request()), 'rename-session/busy');
  await subject.dispose();
  assert.equal(failureCode(await pending), 'rename-session/cancelled');
  assert.equal(subject.renames.length, 0);
});
