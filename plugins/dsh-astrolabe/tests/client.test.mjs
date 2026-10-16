import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';
import React from 'react';
import { act, create } from 'react-test-renderer';
import { SlotCore } from '@deepseek-ai/dsh-client-ui-slots';

const source = await readFile(new URL('../dist/client.js', import.meta.url), 'utf8');
const primitives = new Proxy({}, { get: (_, name) => {
  if (name === 'Menu') return ({ anchor, open, children }) => React.createElement('div', null, anchor, open ? children : null);
  if (name === 'Tooltip') return ({ children }) => children;
  if (name === 'StateDot') return ({ state }) => React.createElement('span', { className: 'dwt-state-dot', 'data-state': state });
  return ({ children, ...props }) => React.createElement(name === 'Button' || name === 'MenuItemButton' ? 'button' : 'span', props, children);
} });
const summary = (id, updatedAt = 1) => ({ displayTitle: id, updatedAt, running: false, blank: false, retainedBy: {} });
const workspace = (id, sessionIds) => ({ workspaceId: id, title: id, path: `/${id}`, sessionIds });
const keyEvent = (target = {}) => ({ key: 'Enter', target, currentTarget: {}, preventDefault() {}, nativeEvent: { isComposing: false } });

async function mount(t, overrides = {}, setupSlots = () => {}) {
  let plugin;
  const cleanups = [];
  const store = initial => {
    let value = initial;
    const listeners = new Set();
    return { getSnapshot: () => value, set: next => { value = next; for (const listener of listeners) listener(); }, subscribe: listener => { listeners.add(listener); return () => listeners.delete(listener); } };
  };
  runInNewContext(source, {
    window: { __ModuleLoader__: { load: value => { plugin = value; } }, setTimeout, clearTimeout },
    document: { createElement: () => ({ remove() {} }), head: { append() {} }, addEventListener() {}, removeEventListener() {} },
    Error, AbortController, setTimeout, clearTimeout, setInterval, clearInterval,
  });
  const client = plugin.factory(id => {
    if (id === 'react') return React;
    if (id === '@deepseek-ai/dsh-client-ui-primitives') return primitives;
    if (id === '@deepseek-ai/dsh-client-store') return { createSnapshotStore: store, defineStore: options => options };
    throw new Error(`Unexpected import: ${id}`);
  });
  const slots = new SlotCore();
  slots.register({ name: 'root', children: { 'sidebar.workspaces': { kind: 'single', scope: 'root' } } }, () => null);
  setupSlots(slots, store);
  const ctx = {
    slots: Object.assign(slots, { inject: (_, callback) => { cleanups.push(callback()); } }),
    effect: callback => { cleanups.push(callback()); },
    locale: { register: () => () => {} },
    shortcuts: { platform: 'macos', catalog: store([]) },
  };
  client.apply(ctx);
  const entry = slots.entriesOfSlot('sidebar.workspaces')[0];
  const searchRequests = entry.inject().hooks.searchRequest;
  const props = {
    wide: true, expandSidebar() {}, t: key => key, openSession() {}, startSession() {},
    unarchiveSession: async () => {}, insertWorkspaceBefore: async () => {},
    createWorkspace: async () => ({ workspaceId: 'created' }), searchSessions: async () => ({ items: [], hasMore: false }),
    renameWorkspace: async () => {}, deleteWorkspace: async () => {}, renderSlot: () => null,
    useDirectoryFlow: () => false, useSearchRequest: () => React.useSyncExternalStore(searchRequests.subscribe, searchRequests.getSnapshot),
    useShortcuts: () => [],
    useSessions: () => ({ ids: ['a', 'b'], byId: { a: summary('a'), b: summary('b', 2) }, phase: 'ready' }),
    useSessionStatus: () => new Map(),
    useWorkspaces: () => ({ items: [workspace('one', ['a']), workspace('two', ['b'])], pinnedSessionIds: [], archivedSessionIds: [] }),
    useStore: () => ({ orderBy: 'updated', sessionOrder: {}, groupExpansion: { 'workspaces:one': true, 'workspaces:two': true } }),
    actions: { setSessionOrder() {}, setOrderBy() {}, setGroupExpanded() {} }, ...overrides,
  };
  let renderer;
  await act(async () => { renderer = create(React.createElement(entry.component, props)); });
  t.after(() => { act(() => renderer.unmount()); cleanups.reverse().forEach(dispose => dispose?.()); });
  return { renderer, props, update: async () => { await act(async () => renderer.update(React.createElement(entry.component, props))); } };
}

const findClass = (renderer, className) => renderer.root.findAll(node => node.props.className === className && typeof node.type === 'string');

test('keyboard activation of row controls does not navigate the parent session', async t => {
  const opened = [];
  const { renderer } = await mount(t, { openSession: id => opened.push(id) });
  const row = findClass(renderer, 'dwt-row')[0];
  act(() => row.props.onKeyDown(keyEvent()));
  assert.deepEqual(opened, []);
});

test('cross-workspace drops do not write a foreign session into saved ordering', async t => {
  const writes = [];
  const { renderer } = await mount(t, { actions: { setSessionOrder: (...args) => writes.push(args), setOrderBy() {} } });
  const event = { dataTransfer: { setData() {} }, preventDefault() {}, clientY: 1, currentTarget: { getBoundingClientRect: () => ({ top: 0, height: 10 }) } };
  act(() => findClass(renderer, 'dwt-row')[0].props.onDragStart(event));
  act(() => findClass(renderer, 'dwt-row')[1].props.onDrop(event));
  assert.equal(writes.length, 0);
});

test('new query immediately discards previous content hits, including after a failed request', async t => {
  const { renderer } = await mount(t, { searchSessions: async query => {
    if (query === 'first') return { items: [{ sessionId: 'a', snippet: 'old result' }], hasMore: false };
    throw new Error('offline');
  } });
  await act(async () => renderer.root.findAllByType('button').find(node => node.props['aria-label'] === 'search.open').props.onClick());
  const change = async value => { await act(async () => findClass(renderer, 'dwt-search')[0].props.onChange({ target: { value } })); };
  await change('first');
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 280)); });
  assert.equal(findClass(renderer, 'dwt-hit').length, 1);
  await change('second');
  assert.equal(findClass(renderer, 'dwt-hit').length, 0);
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 280)); });
  assert.equal(findClass(renderer, 'dwt-hit').length, 0);
});

test('directory adoption starts a session in the created workspace', async t => {
  let flow;
  const started = [];
  await mount(t, { startSession: id => started.push(id), renderSlot: (name, owner) => { if (name === 'astrolabe.directoryFlow') flow = owner; return null; } });
  await act(async () => flow.onPicked('/new'));
  assert.deepEqual(started, ['created']);
});

/** One parent above `children` (`[id, label, updatedAt]`), running unless told otherwise. */
const nested = (children, parentRunning = true) => ({
  list: {
    ids: ['p'],
    phase: 'ready',
    byId: {
      p: { ...summary('p'), running: parentRunning },
      ...Object.fromEntries(children.map(([id, , updatedAt]) => [id, { ...summary(id, updatedAt), origin: 'subagent' }])),
    },
    projectionsBySession: { p: { values: { subagentCatalog: children.map(([id, label]) => ({
      id, createdAt: 1, mode: 'continuable', label,
    })) } } },
  },
  workspaces: { items: [workspace('one', ['p'])], pinnedSessionIds: [], archivedSessionIds: [] },
});

test('a nested list keeps every running row and fills the rest to five', async t => {
  const { list, workspaces } = nested([
    ['r1', 'Running one', 90], ['r2', 'Running two', 89], ['r3', 'Running three', 88],
    ['s1', 'Stopped one', 80], ['s2', 'Stopped two', 79], ['s3', 'Stopped three', 78],
  ]);
  const { renderer } = await mount(t, {
    useSessions: () => list,
    useWorkspaces: () => workspaces,
    useSessionStatus: () => new Map(['r1', 'r2', 'r3'].map(id => [id, { running: true }])),
  });
  assert.deepEqual(findClass(renderer, 'dwt-child-title').map(node => node.children.join('')),
    ['Running one', 'Running two', 'Running three', 'Stopped one', 'Stopped two']);
  assert.equal(findClass(renderer, 'dwt-more').length, 0);
});

test('a nested row carries the loader only while it runs, plus its own time', async t => {
  const { list, workspaces } = nested([['c1', 'Running child', 100], ['c2', 'Stopped child', 200]]);
  const { renderer } = await mount(t, {
    useSessions: () => list,
    useWorkspaces: () => workspaces,
    useSessionStatus: () => new Map([['c1', { running: true }]]),
  });
  assert.deepEqual(findClass(renderer, 'dwt-child-title').map(node => node.children.join('')),
    ['Stopped child', 'Running child']);
  // Only the nested rows' own marks: the parent row carries the working
  // aggregate that this child gives it.
  assert.deepEqual(findClass(renderer, 'dwt-child').flatMap(row => row
    .findAll(node => node.props.className === 'dwt-state-dot' && typeof node.type === 'string'))
    .map(node => node.props['data-state']), ['ongoing']);
  assert.deepEqual(findClass(renderer, 'dwt-child-time').map(node => node.children.join('')), ['time.day', 'time.day']);
});

test('a Session row marks only what needs attention, keeping the leading cell', async t => {
  const { renderer } = await mount(t, {
    useSessions: () => ({ ids: ['run', 'done', 'wait', 'idle'], phase: 'ready', byId: {
      run: { ...summary('run'), running: true },
      done: summary('done'),
      wait: summary('wait'),
      idle: summary('idle'),
    } }),
    useWorkspaces: () => ({ items: [workspace('one', ['run', 'done', 'wait', 'idle'])], pinnedSessionIds: [], archivedSessionIds: [] }),
    useSessionStatus: () => new Map([
      ['done', { completionUnread: true }],
      ['wait', { pendingInteraction: { kind: 'question' } }],
    ]),
  });
  assert.deepEqual(findClass(renderer, 'dwt-state-dot').map(node => node.props['data-state']),
    ['ongoing', 'done', 'warning']);
  assert.equal(findClass(renderer, 'dwt-row-mark').length, 4);
});

test('the hover card prints the Workspace the Session is accounted to', async t => {
  const { renderer } = await mount(t, {
    useWorkspaces: () => ({ items: [{
      workspaceId: 'one', title: 'ai-forge', path: '/repo/ai-forge',
      createdAt: '2026-10-16T06:05:00.000Z', sessionIds: ['a'],
    }], pinnedSessionIds: [], archivedSessionIds: [] }),
  });
  await act(async () => findClass(renderer, 'dwt-row')[0]
    .props.onMouseEnter({ currentTarget: { getBoundingClientRect: () => ({ top: 0, right: 10 }) } }));
  assert.deepEqual(findClass(renderer, 'dwt-card-meta').map(node => node.children.join('')),
    ['ai-forge · status.idle · time.day']);
  assert.deepEqual(findClass(renderer, 'dwt-card-path').map(node => node.children.join('')), ['/repo/ai-forge']);
  assert.deepEqual(findClass(renderer, 'dwt-card-created').map(node => node.children.join('')), ['card.created']);
});

test('the blank New Session row carries no mark', async t => {
  const { renderer } = await mount(t, {
    useSessions: () => ({ ids: ['blank'], phase: 'ready', byId: {
      blank: { ...summary('blank'), blank: true, retainedBy: { mainView: 1 } },
    } }),
    useWorkspaces: () => ({ items: [workspace('one', ['blank'])], pinnedSessionIds: [], archivedSessionIds: [] }),
  });
  assert.equal(findClass(renderer, 'dwt-row').length, 1);
  assert.equal(findClass(renderer, 'dwt-state-dot').length, 0);
  assert.equal(findClass(renderer, 'dwt-row-mark').length, 1);
});

test('failed restore stays actionable and reports the failure', async t => {
  const { renderer } = await mount(t, {
    useWorkspaces: () => ({ items: [], pinnedSessionIds: [], archivedSessionIds: ['a'] }),
    unarchiveSession: async () => { throw new Error('restore refused'); },
  });
  await act(async () => renderer.root.findAllByType('button').find(node => node.props['aria-label'] === 'search.open').props.onClick());
  await act(async () => findClass(renderer, 'dwt-search')[0].props.onChange({ target: { value: 'a' } }));
  await act(async () => renderer.root.findAllByType('button').find(node => node.props['aria-label'] === 'search.unarchive').props.onClick({ stopPropagation() {} }));
  assert.ok(renderer.root.findAll(node => node.props.role === 'alert').some(node => node.children.includes('restore refused')));
});

test('same-workspace drop saves the complete order, including quota-hidden rows', async t => {
  const writes = [];
  const ids = ['a', 'b', 'c', 'd', 'e', 'f'];
  const { renderer } = await mount(t, {
    useSessions: () => ({ ids, byId: Object.fromEntries(ids.map(id => [id, summary(id)])), phase: 'ready' }),
    useWorkspaces: () => ({ items: [workspace('one', ids)], pinnedSessionIds: [], archivedSessionIds: [] }),
    actions: { setSessionOrder: (account, order) => writes.push([account, [...order]]), setOrderBy() {} },
  });
  const event = { dataTransfer: { setData() {} }, preventDefault() {}, clientY: 9, currentTarget: { getBoundingClientRect: () => ({ top: 0, height: 10 }) } };
  assert.equal(findClass(renderer, 'dwt-row').length, 5);
  act(() => findClass(renderer, 'dwt-row')[0].props.onDragStart(event));
  act(() => findClass(renderer, 'dwt-row')[1].props.onDrop(event));
  assert.deepEqual(writes, [['one', ['b', 'a', 'c', 'd', 'e', 'f']]]);
});

test('a superseded request cannot overwrite the newest search results', async t => {
  const requests = [];
  const { renderer } = await mount(t, { searchSessions: (query, signal) => new Promise(resolve => requests.push({ query, signal, resolve })) });
  await act(async () => renderer.root.findAllByType('button').find(node => node.props['aria-label'] === 'search.open').props.onClick());
  const search = async value => {
    await act(async () => findClass(renderer, 'dwt-search')[0].props.onChange({ target: { value } }));
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 280)); });
  };
  await search('first');
  await search('second');
  assert.equal(requests[0].signal.aborted, true);
  await act(async () => requests[1].resolve({ items: [{ sessionId: 'b', snippet: 'latest' }], hasMore: false }));
  await act(async () => requests[0].resolve({ items: [{ sessionId: 'a', snippet: 'stale' }], hasMore: false }));
  assert.deepEqual(findClass(renderer, 'dwt-hit-snippet').map(node => node.children.join('')), ['latest']);
});

test('the row itself still opens with Enter', async t => {
  const opened = [];
  const { renderer } = await mount(t, { openSession: id => opened.push(id) });
  const target = {};
  act(() => findClass(renderer, 'dwt-row')[0].props.onKeyDown({ ...keyEvent(target), currentTarget: target }));
  assert.deepEqual(opened, ['a']);
});

test('native search requests from the shadowed workspace browser reach Astrolabe', async t => {
  let requests;
  const { renderer } = await mount(t, {}, (slots, store) => {
    requests = store({ searchRequest: 0 });
    slots.register({ name: 'sidebar.workspaces',
      children: { 'sidebar.workspaces.directoryFlow': { kind: 'single', scope: 'root' } },
      inject: () => ({ hooks: { workspaceShortcuts: requests } }),
    }, () => null);
  });
  assert.equal(findClass(renderer, 'dwt-search').length, 0);
  await act(async () => requests.set({ searchRequest: 1 }));
  assert.equal(findClass(renderer, 'dwt-search').length, 1);
});


test('search bridge ignores other host actions and rebinds a replaced browser', async t => {
  let requests, oldRequests, replace;
  const { renderer } = await mount(t, {}, (slots, store) => {
    const register = () => {
      requests = store({ searchRequest: 0 });
      return slots.register({
        name: 'sidebar.workspaces',
        children: { 'sidebar.workspaces.directoryFlow': { kind: 'single', scope: 'root' } },
        inject: () => ({ hooks: { workspaceShortcuts: requests } }),
      }, () => null);
    };
    let dispose = register();
    replace = () => { oldRequests = requests; dispose(); dispose = register(); };
  });
  await act(async () => requests.set({ searchRequest: 0, addRequested: true }));
  assert.equal(findClass(renderer, 'dwt-search').length, 0);
  await act(async () => replace());
  await act(async () => oldRequests.set({ searchRequest: 1 }));
  assert.equal(findClass(renderer, 'dwt-search').length, 0);
  await act(async () => requests.set({ searchRequest: 1 }));
  assert.equal(findClass(renderer, 'dwt-search').length, 1);
});

test('host updates during drag keep targets stable and apply latest order on release', async t => {
  const { renderer, props, update } = await mount(t, {
    useWorkspaces: () => ({ items: [workspace('one', ['a', 'b'])], pinnedSessionIds: [], archivedSessionIds: [] }),
  });
  const ids = () => findClass(renderer, 'dwt-row').map(node => node.props['data-motion-id']);
  assert.deepEqual(ids(), ['b', 'a']);
  await act(async () => findClass(renderer, 'dwt-row')[0].props.onDragStart({ dataTransfer: { setData() {} } }));
  props.useSessions = () => ({ ids: ['a', 'b'], byId: { a: summary('a', 5), b: summary('b', 2) }, phase: 'ready' });
  await update();
  assert.deepEqual(ids(), ['b', 'a']);
  await act(async () => findClass(renderer, 'dwt-row')[0].props.onDragEnd());
  assert.deepEqual(ids(), ['a', 'b']);
});

test('an open row menu holds cross-group movement until it closes', async t => {
  const { renderer, props, update } = await mount(t);
  const menu = renderer.root.findAllByType('button').find(node => node.props['aria-label'] === 'row.menu');
  assert.ok(menu);
  await act(async () => menu.props.onClick());
  props.useWorkspaces = () => ({ items: [workspace('one', []), workspace('two', ['a', 'b'])], pinnedSessionIds: [], archivedSessionIds: [] });
  await update();
  const membership = () => findClass(renderer, 'dwt-group').map(group => group.findAll(node => node.props.className === 'dwt-row').map(row => row.props['data-motion-id']));
  assert.deepEqual(membership(), [['a'], ['b']]);
  await act(async () => renderer.root.findAllByType('button').find(node => node.props['aria-label'] === 'row.menu').props.onClick());
  assert.deepEqual(membership(), [[], ['b', 'a']]);
});


test('an idle transition during dragging cannot remove a quota-exempt target', async t => {
  const ids = ['a', 'b', 'c', 'd', 'e', 'f'];
  let running = true;
  const { renderer, update } = await mount(t, {
    useSessions: () => ({ ids, byId: Object.fromEntries(ids.map((id, i) => [id, summary(id, 10 - i)])), phase: 'ready' }),
    useWorkspaces: () => ({ items: [workspace('one', ids)], pinnedSessionIds: [], archivedSessionIds: [] }),
    useSessionStatus: () => new Map([['f', { running }]]),
  });
  const visible = () => findClass(renderer, 'dwt-row');
  assert.equal(visible().length, 6);
  await act(async () => visible()[5].props.onDragStart({ dataTransfer: { setData() {} } }));
  running = false;
  await update();
  assert.equal(visible().length, 6);
  await act(async () => visible()[5].props.onDragEnd());
  assert.equal(visible().length, 5);
});
