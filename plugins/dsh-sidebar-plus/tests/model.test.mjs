import assert from 'node:assert/strict';
import { test } from 'node:test';
import { workspaceGroups, topRows, statusGroups, layoutKeys } from '../src/model.ts';

const row = (id, extra = {}) => ({ id, title: id, state: 'idle', updatedAt: 1, unread: false, current: false, blank: false, children: [], ...extra });
const view = { orderBy: 'updated', sessionOrder: {} };

test('status buckets separate active work, human waits, unseen results and idle sessions', () => {
  const rows = [row('idle'), row('done', { unread: true }),
    row('run', { state: 'running', unread: true }), row('wait', { state: 'input', unread: true }),
    row('blank', { blank: true }), row('pin', { unread: true })];
  const groups = statusGroups(rows, key => key, ['pin'], 'Pinned');
  assert.deepEqual(groups.map(group => [group.key, group.title, group.rows.map(row => row.id)]), [
    ['__pinned__', 'Pinned', ['pin']],
    ['running', 'group.working', ['run']],
    ['input', 'group.waiting', ['wait']],
    ['done', 'group.done', ['done']],
    ['idle', 'group.idle', ['idle']],
  ]);
  assert.ok(groups.every(group => group.revealable), 'each Status section uses the 50-row fold');
  assert.ok(groups.find(group => group.key === 'done').defaultOpen, 'unseen results are visible by default');
});

test('acknowledging a completion moves it from Done to Idle', () => {
  const list = { ids: ['a'], byId: { a: { displayTitle: 'a', updatedAt: 1, running: false, blank: false } } };
  const groups = unread => statusGroups(topRows(list, new Map([['a', { completionUnread: unread }]]), new Set()), key => key, [], 'Pinned');
  assert.equal(groups(true)[0].key, 'done');
  assert.equal(groups(false)[0].key, 'idle');
});

test('empty and fully pinned workspaces retain their management header', () => {
  const snapshot = { items: [
    { workspaceId: 'empty', title: 'Empty', sessionIds: [] },
    { workspaceId: 'pinned', title: 'Pinned workspace', sessionIds: ['a'] },
  ], pinnedSessionIds: ['a'] };
  const groups = workspaceGroups(snapshot, [row('a')], undefined, 'Pinned', 'Loose', view);
  assert.deepEqual(groups.map(group => group.key), ['__pinned__', 'empty', 'pinned']);
  assert.equal(groups.flatMap(group => group.rows).length, 1);
});

test('top rows respect archive, blank selection and pending state precedence', () => {
  const byId = Object.fromEntries(['a', 'b', 'blank', 'child'].map(id => [id, {
    displayTitle: id, updatedAt: 1, running: false, blank: id === 'blank',
    ...(id === 'child' ? { origin: 'subagent' } : {}),
  }]));
  const rows = topRows({ ids: Object.keys(byId), byId }, new Map([['a', { running: true, pendingInteraction: { kind: 'question' } }]]), new Set(['b']), 'blank');
  assert.deepEqual(rows.map(row => [row.id, row.state]), [['a', 'input'], ['blank', 'idle']]);
  const groups = statusGroups(rows, key => key, [], 'Pinned');
  assert.deepEqual(groups.flatMap(group => group.rows).map(row => row.id), ['a']);
});

/** One parent with a catalog of children: `[id, label, running, updatedAt]`. */
const nested = (parent, children, extra = {}) => ({
  ids: ['parent'],
  byId: {
    parent: { displayTitle: 'parent', updatedAt: 99, running: false, blank: false, ...parent },
    ...Object.fromEntries(children.map(([id, , running, updatedAt]) => [id, {
      displayTitle: `log title of ${id}`, updatedAt, running,
    }])),
  },
  projectionsBySession: { parent: { values: { subagentCatalog: children.map(([id, label, , updatedAt]) => ({
    id, createdAt: updatedAt - 50, mode: 'continuable', ...label === undefined ? {} : { label },
  })) } } },
  ...extra,
});
const childRows = (list, statuses = new Map()) => topRows(list, statuses, new Set(), undefined)[0];

test('owned live background work keeps a stopped Session Working until settlement', () => {
  const list = nested({}, []);
  const states = status => topRows(list, new Map([['parent', { completionUnread: true }]]), new Set(), undefined,
    { rows: { parent: [{ owner: 'parent', status }] }, observed: {} });
  for (const status of ['running', 'stopping']) {
    assert.equal(statusGroups(states(status), key => key, [], 'Pinned')[0].key, 'running');
  }
  for (const status of ['completed', 'killed', 'failed']) {
    assert.equal(statusGroups(states(status), key => key, [], 'Pinned')[0].key, 'done');
  }
  const foreign = topRows(list, new Map(), new Set(), undefined,
    { rows: { parent: [{ status: 'running' }, { owner: 'other', status: 'running' }] }, observed: {} });
  assert.equal(foreign[0].state, 'idle', 'unowned and foreign jobs do not mark every Session Working');
});

test('child background work and human requests propagate to the parent bucket', () => {
  const list = nested({}, [['child', 'Task', false, 2]]);
  const jobs = { rows: { child: [{ owner: 'child', status: 'running' }] }, observed: {} };
  assert.equal(topRows(list, new Map(), new Set(), undefined, jobs)[0].state, 'running');
  const statuses = new Map([['child', { pendingInteraction: { kind: 'approval' } }]]);
  const parent = topRows(list, statuses, new Set(), undefined, jobs)[0];
  assert.equal(parent.state, 'input');
  assert.equal(parent.pending, 'approval');
  assert.equal(parent.children[0].state, 'input');
});

test('nested rows take the delegation label, the loader and the newest activity order', () => {
  const list = nested({ running: true }, [
    ['one', 'Research AGENTS.md best practices', false, 20],
    ['two', 'Translate sidebar-plus README to Chinese', true, 30],
    ['three', '   ', false, 10],
  ]);
  assert.deepEqual(childRows(list, new Map([['two', { running: true }]])).children
    .map(child => [child.key, child.title, child.state, child.updatedAt]), [
    ['two', 'Translate sidebar-plus README to Chinese', 'ongoing', 30],
    ['one', 'Research AGENTS.md best practices', 'idle', 20],
    ['three', 'log title of three', 'idle', 10],
  ]);
});

test('an idle Session with nothing running and nothing unread shows no nested layer', () => {
  const list = nested({}, [['child', 'Finished task', false, 2]]);
  assert.deepEqual(childRows(list).children, []);
});

test('a running child keeps the nested layer and its parent in the working bucket', () => {
  const list = nested({}, [['child', 'Still working', false, 2]]);
  const row = childRows(list, new Map([['child', { running: true }]]));
  assert.equal(row.state, 'running');
  assert.deepEqual(row.children.map(child => child.key), ['child']);
  assert.deepEqual(statusGroups([row], key => key, [], 'Pinned')
    .map(group => [group.key, group.rows.length]), [['running', 1]]);
});

test('an unread completion keeps the nested layer without marking the row running', () => {
  const list = nested({}, [['child', 'Finished task', false, 2]]);
  const row = childRows(list, new Map([['parent', { completionUnread: true }]]));
  assert.equal(row.state, 'idle');
  assert.deepEqual(row.children.map(child => child.key), ['child']);
});

test('the nested layer keeps every running child and fills the rest to five', () => {
  const stopped = (id, label, updatedAt) => [id, label, false, updatedAt];
  const list = nested({ running: true }, [
    ['r1', 'Running one', true, 90], ['r2', 'Running two', true, 89], ['r3', 'Running three', true, 88],
    stopped('s1', 'Stopped one', 80), stopped('s2', 'Stopped two', 79),
    stopped('s3', 'Stopped three', 78), stopped('s4', 'Stopped four', 77),
  ]);
  const running = new Map(['r1', 'r2', 'r3'].map(id => [id, { running: true }]));
  assert.deepEqual(childRows(list, running).children.map(child => child.key), ['r1', 'r2', 'r3', 's1', 's2']);

  const busy = nested({ running: true }, [
    ['r1', 'Running one', true, 90], ['r2', 'Running two', true, 89], ['r3', 'Running three', true, 88],
    ['r4', 'Running four', true, 87], ['r5', 'Running five', true, 86], ['r6', 'Running six', true, 85],
    stopped('s1', 'Stopped one', 80),
  ]);
  const allRunning = new Map(['r1', 'r2', 'r3', 'r4', 'r5', 'r6'].map(id => [id, { running: true }]));
  assert.deepEqual(childRows(busy, allRunning).children.map(child => child.key),
    ['r1', 'r2', 'r3', 'r4', 'r5', 'r6']);
});

test('a child without a session summary still carries its catalog identity', () => {
  const list = {
    ids: ['parent'],
    byId: { parent: { displayTitle: 'parent', updatedAt: 1, running: true, blank: false } },
    projectionsBySession: { parent: { values: { subagentCatalog: [
      { id: 'ghost', createdAt: 7, mode: 'continuable', label: 'Ghost task' },
    ] } } },
  };
  assert.deepEqual(childRows(list).children.map(child => [child.key, child.title, child.state, child.updatedAt]),
    [['ghost', 'Ghost task', 'idle', 7]]);
});

test('the animation gate follows nested order but not nested state', () => {
  const groups = children => [{ key: 'one', rows: [{ id: 'a', children }] }];
  const first = layoutKeys(groups([
    { key: 'c1', title: 'One', state: 'ongoing' },
    { key: 'c2', title: 'Two', state: 'idle' },
  ]));
  const settled = layoutKeys(groups([
    { key: 'c1', title: 'Renamed on completion', state: 'done' },
    { key: 'c2', title: 'Two', state: 'idle' },
  ]));
  const swapped = layoutKeys(groups([
    { key: 'c2', title: 'Two', state: 'idle' },
    { key: 'c1', title: 'One', state: 'ongoing' },
  ]));
  assert.equal(first.nested, settled.nested);
  assert.notEqual(first.nested, swapped.nested);
  assert.equal(first.rows, swapped.rows);
});

test('search keeps snippets for metadata matches and ranks metadata by recency', async () => {
  const { searchHits } = await import('../src/model.ts');
  const list = { ids: ['old', 'new'], byId: {
    old: { displayTitle: 'match old', updatedAt: 1 }, new: { displayTitle: 'match new', updatedAt: 2 },
  } };
  const page = searchHits(list, new Map(), new Set(), new Map(), 'match', { items: [{ sessionId: 'old', snippet: 'matched content' }], hasMore: false }, 'Loose', 20);
  assert.deepEqual(page.hits.map(hit => hit.id), ['new', 'old']);
  assert.equal(page.hits[1].snippet, 'matched content');
});

test('workspace grouping indexes rows instead of scanning all rows for every workspace', () => {
  let reads = 0;
  const rows = Array.from({ length: 1000 }, (_, index) => ({ ...row(`${index}`), get id() { reads++; return `${index}`; } }));
  const items = Array.from({ length: 100 }, (_, index) => ({ workspaceId: `w${index}`, title: `${index}`, sessionIds: Array.from({ length: 10 }, (_, member) => `${index * 10 + member}`) }));
  const groups = workspaceGroups({ items, pinnedSessionIds: [] }, rows, undefined, 'Pinned', 'Loose', view);
  assert.equal(groups.flatMap(group => group.rows).length, 1000);
  assert.ok(reads < 15000, `row id reads: ${reads}; full rescans require at least 100000`);
});
