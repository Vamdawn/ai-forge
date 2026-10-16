import assert from 'node:assert/strict';
import { test } from 'node:test';
import { workspaceGroups, topRows, statusGroups } from '../src/model.ts';

const row = (id, extra = {}) => ({ id, title: id, state: 'idle', updatedAt: 1, unread: false, current: false, blank: false, children: [], ...extra });
const view = { orderBy: 'updated', sessionOrder: {} };

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
