import type { SessionId } from '@deepseek-ai/dsh-session/types';
import type { SessionListState } from '@deepseek-ai/dsh-api-session-controller/client';
import type { WorkspaceId, WorkspaceSnapshot } from '@deepseek-ai/dsh-api-workspace-controller/client';
import type { SessionStatusSnapshot } from '@deepseek-ai/dsh-client-ui-session/client';
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots';
import type {} from './locales.js';

/** Account key of the Workspace-less section. */
export const UNGROUPED_ACCOUNT = '__ungrouped__';
/** Account key of the Pinned section, whose order is pin recency rather than a saved list. */
export const PINNED_ACCOUNT = '__pinned__';

/** The three pending-interaction kinds the runtime classifies (see `visiblePendingKind` in ui-workspace). */
export type PendingKind = 'approval' | 'plan-review' | 'question';
export type RowState = 'idle' | 'running' | 'input';
/**
 * One nested subagent row. Only an active child carries a mark; a stopped one
 * is identified by the absence of the loader, so completion never competes with
 * the Session marks for the same green.
 */
export type ChildState = 'ongoing' | 'idle';
export type TabId = 'workspaces' | 'status';

/** One Host content match: the Session and the matched excerpt. */
export interface ContentHit {
  readonly sessionId: SessionId;
  readonly snippet: string;
}

/** One row of the flat search result list, however it matched. */
export interface SearchHit {
  readonly id: SessionId;
  readonly title: string;
  /** The Workspace it is accounted to, or the loose-Session label. */
  readonly workspace: string;
  readonly state: RowState;
  readonly snippet?: string;
  readonly archived: boolean;
}

/** The Host content-search page: its matches plus whether more exist. */
export interface ContentHits {
  readonly items: readonly ContentHit[];
  readonly hasMore: boolean;
}

/** One subagent session nested under the session that spawned it. */
export interface ActivityChild {
  readonly key: string;
  readonly title: string;
  readonly state: ChildState;
  readonly openable: SessionId;
  /** Latest activity, shown as the row's trailing time. */
  readonly updatedAt: number;
}

export interface Row {
  readonly id: SessionId;
  readonly title: string;
  readonly state: RowState;
  readonly pending?: PendingKind;
  readonly updatedAt: number;
  readonly unread: boolean;
  readonly current: boolean;
  /** The selected blank New Session: labeled as such, exempt from the quota, and not draggable. */
  readonly blank: boolean;
  readonly children: readonly ActivityChild[];
}

export interface Group {
  readonly key: string;
  readonly title: string;
  readonly defaultOpen: boolean;
  readonly rows: readonly Row[];
  /** Fold a long section behind the one reveal control instead of rendering everything. */
  readonly revealable?: boolean;
  readonly unreadCount?: number;
  /** Whether its rows accept a drag reorder. The Pinned and Status sections do not. */
  readonly draggable: boolean;
  /** Whether idle Sessions fold behind the reveal control, outside its quota. */
  readonly quota: boolean;
  /** The Host Workspace this section stands for; absent on Pinned, Ungrouped, and Status sections. */
  readonly workspaceId?: WorkspaceId;
  /** Its canonical host directory, shown and copied from the section's menu. */
  readonly path?: string;
}

function pendingKind(kind: string | undefined): PendingKind | undefined {
  return kind === 'approval' || kind === 'plan-review' || kind === 'question' ? kind : undefined;
}

/**
 * One direct child as the parent-owned catalog records it: the identity the
 * shipped browser nests by, plus the durable delegation label it titles the
 * child's row with and the creation time a missing Session summary falls back to.
 */
interface SubagentEntry {
  readonly id: SessionId;
  readonly label?: string;
  readonly createdAt: number;
}

/** Subagent children are projected per parent; the shipped browser hides those rows entirely. */
function subagentEntries(list: SessionListState, parentId: SessionId): readonly SubagentEntry[] {
  const values = list.projectionsBySession?.[parentId]?.values as
    { readonly subagentCatalog?: readonly SubagentEntry[] } | undefined;
  return values?.subagentCatalog ?? [];
}

export function relativeTime(updatedAt: number, now: number, t: PropsLocale<'astrolabe'>['t']): string {
  const seconds = Math.max(0, Math.round((now - updatedAt) / 1000));
  if (seconds < 60) {
    return t('time.now');
  }
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) {
    return t('time.minute', { n: minutes });
  }
  const hours = Math.round(minutes / 60);
  return hours < 24 ? t('time.hour', { n: hours }) : t('time.day', { n: Math.round(hours / 24) });
}

/** Non-running nested rows one Session shows; an active child never uses this quota. */
const CHILD_QUOTA = 5;

/**
 * The nested layer a row renders: every active child, then the most recently
 * active others while the quota lasts. The excess stays out of the sidebar
 * rather than behind a reveal, so a wide fan-out cannot stretch it.
 */
function visibleChildren(children: readonly ActivityChild[]): ActivityChild[] {
  let slots = Math.max(0, CHILD_QUOTA - children.filter(child => child.state === 'ongoing').length);
  return children.filter(child => {
    if (child.state === 'ongoing') {
      return true;
    }
    if (slots === 0) {
      return false;
    }
    slots -= 1;
    return true;
  });
}

/**
 * The one nested layer a row offers: the subagent sessions it spawned, most
 * recently active first, each carrying the delegation label the shipped catalog
 * shows as that row's title. Subagent rows are the only sessions the top-level
 * filter hides, so nesting is what makes them reachable at all.
 */
function subagentChildren(
  list: SessionListState,
  statuses: SessionStatusSnapshot,
  id: SessionId,
): ActivityChild[] {
  return subagentEntries(list, id).map(entry => {
    const summary = list.byId[entry.id];
    const status = statuses.get(entry.id);
    const running = status?.running ?? summary?.running ?? false;
    const label = entry.label?.trim();
    const at = summary?.updatedAt ?? entry.createdAt;
    return {
      child: {
        key: entry.id,
        // The log-backed title is only the fallback: for a delegated child it is
        // the first sentence of its prompt rather than the task it was given.
        title: label === undefined || label === '' ? summary?.displayTitle ?? entry.id : label,
        state: running ? 'ongoing' : 'idle',
        openable: entry.id,
        updatedAt: at,
      } satisfies ActivityChild,
      at,
    };
  }).sort((left, right) => right.at - left.at).map(item => item.child);
}

export function rowStateOf(
  statuses: SessionStatusSnapshot,
  id: SessionId,
  fallbackRunning: boolean,
  childRunning = false,
): { readonly state: RowState; readonly pending?: PendingKind } {
  const status = statuses.get(id);
  const pending = pendingKind(status?.pendingInteraction?.kind);
  if (pending !== undefined) {
    return { state: 'input', pending };
  }
  return { state: (status?.running ?? fallbackRunning) || childRunning ? 'running' : 'idle' };
}

/**
 * Top-level rows include the current blank Session, but exclude subagent
 * rows (they appear as children) and archived rows.
 */
export function topRows(
  list: SessionListState,
  statuses: SessionStatusSnapshot,
  archived: ReadonlySet<SessionId>,
  current: SessionId | undefined,
): Row[] {
  const rows: Row[] = [];
  for (const id of list.ids) {
    const summary = list.byId[id];
    // A blank Session is the New Session row, but only the one the main view
    // retains; every other blank row stays hidden, as the shipped browser does.
    if (summary === undefined || summary.origin === 'subagent' || archived.has(id)) {
      continue;
    }
    if (summary.blank && id !== current) {
      continue;
    }
    const status = statuses.get(id);
    const selfRunning = status?.running ?? summary.running;
    const unread = status?.completionUnread === true;
    const children = subagentChildren(list, statuses, id);
    const childRunning = children.some(child => child.state === 'ongoing');
    const { state, pending } = rowStateOf(statuses, id, summary.running, childRunning);
    rows.push({
      id,
      title: summary.displayTitle,
      state,
      ...pending === undefined ? {} : { pending },
      updatedAt: summary.updatedAt,
      unread,
      current: id === current,
      blank: summary.blank,
      // The nested layer belongs to a Session that is working or owes a look, so
      // it folds away with the last of those and never grows past its quota.
      children: selfRunning || childRunning || unread ? visibleChildren(children) : [],
    });
  }
  rows.sort((left, right) => right.updatedAt - left.updatedAt);
  return rows;
}

/**
 * The session the main view retains. The shipped browser derives its "current
 * session" the same way (`retainedBy.mainView`) instead of exposing a current
 * session seat, and uses it to open that session's group on its own.
 */
export function mainSessionId(list: SessionListState): SessionId | undefined {
  return list.ids.find(id => (list.byId[id]?.retainedBy.mainView ?? 0) > 0);
}

/**
 * Apply an account's saved manual order. Rows the saved list does not know stay
 * in recency order at the end, so a Session created after the last drag is
 * appended rather than dropped.
 */
function orderRows(
  rows: readonly Row[],
  saved: readonly SessionId[] | undefined,
  manual: boolean,
): Row[] {
  if (!manual || saved === undefined) {
    return [...rows];
  }
  const position = new Map(saved.map((id, index) => [id, index]));
  return [...rows].sort((left, right) => {
    const leftAt = position.get(left.id);
    const rightAt = position.get(right.id);
    if (leftAt === undefined && rightAt === undefined) {
      return 0;
    }
    if (leftAt === undefined) {
      return 1;
    }
    return rightAt === undefined ? -1 : leftAt - rightAt;
  });
}

/**
 * Tab one: a Pinned section first, then registered Workspace sections in
 * registry order, then one Ungrouped section. A pinned Session leaves its own
 * Workspace section rather than appearing twice. Sections start collapsed — the
 * shipped browser's own rule is `groupExpansion[key] ?? ancestorKeys.has(key)`,
 * and its ancestor set is empty outside Workspace Tree — except Pinned and the
 * one holding the current session.
 */
export function workspaceGroups(
  snapshot: WorkspaceSnapshot,
  rows: readonly Row[],
  current: SessionId | undefined,
  pinnedTitle: string,
  ungroupedTitle: string,
  view: { readonly sessionOrder: Readonly<Record<string, readonly SessionId[]>>; readonly orderBy: string },
): Group[] {
  const manual = view.orderBy === 'manual';
  const pinOrder = new Map<SessionId, number>((snapshot.pinnedSessionIds ?? []).map((id, index) => [id, index]));
  const groups: Group[] = [];
  // The Pinned section follows pin recency, so it is neither reordered nor a drag target.
  const pinnedRows = rows.filter(row => pinOrder.has(row.id))
    .sort((left, right) => (pinOrder.get(left.id) ?? 0) - (pinOrder.get(right.id) ?? 0));
  if (pinnedRows.length > 0) {
    groups.push({
      key: PINNED_ACCOUNT,
      title: pinnedTitle,
      defaultOpen: true,
      rows: pinnedRows,
      draggable: false,
      quota: false,
    });
  }
  const claimed = new Set<SessionId>();
  const rowsById = new Map(rows.map(row => [row.id, row]));
  const recency = new Map(rows.map((row, index) => [row.id, index]));
  for (const item of snapshot.items) {
    const members = item.sessionIds.flatMap(id => {
      const row = rowsById.get(id);
      return row !== undefined && !pinOrder.has(id) ? [row] : [];
    }).sort((left, right) => recency.get(left.id)! - recency.get(right.id)!);
    const grouped = orderRows(
      members,
      view.sessionOrder[item.workspaceId],
      manual,
    );
    for (const row of grouped) {
      claimed.add(row.id);
    }
    groups.push({
      key: item.workspaceId,
      title: item.title,
      defaultOpen: current !== undefined && grouped.some(row => row.id === current),
      rows: grouped,
      draggable: true,
      quota: true,
      workspaceId: item.workspaceId,
      path: item.path,
    });
  }
  const rest = orderRows(
    rows.filter(row => !claimed.has(row.id) && !pinOrder.has(row.id)),
    view.sessionOrder[UNGROUPED_ACCOUNT],
    manual,
  );
  if (rest.length > 0) {
    groups.push({
      key: UNGROUPED_ACCOUNT,
      title: ungroupedTitle,
      defaultOpen: current !== undefined && rest.some(row => row.id === current),
      rows: rest,
      draggable: true,
      quota: true,
    });
  }
  return groups;
}

/**
 * Tab two: the status sections. Pinned Sessions keep a Pinned section of their
 * own at the top, in pin order and out of the status buckets — the same account
 * tab one gives them, so a pinned Session reads the same in both tabs instead of
 * leading a status section whose heading no longer describes it.
 */
export function statusGroups(
  rows: readonly Row[],
  t: PropsLocale<'astrolabe'>['t'],
  pinnedSessionIds: readonly SessionId[],
  pinnedTitle: string,
): Group[] {
  const pinOrder = new Map<SessionId, number>(pinnedSessionIds.map((id, index) => [id, index]));
  const pinnedRows = rows.filter(row => pinOrder.has(row.id))
    .sort((left, right) => (pinOrder.get(left.id) ?? 0) - (pinOrder.get(right.id) ?? 0));
  const buckets: Record<RowState, Row[]> = { input: [], running: [], idle: [] };
  for (const row of rows) {
    // The New Session row belongs to the Workspace axis, not to a status bucket,
    // and a pinned row is accounted for by the section above.
    if (!row.blank && !pinOrder.has(row.id)) {
      buckets[row.state].push(row);
    }
  }
  const completed = [...buckets.idle].sort((left, right) => Number(right.unread) - Number(left.unread));
  const groups: Group[] = [];
  // As in tab one: pin recency is the order, so this section is not a drag target.
  if (pinnedRows.length > 0) {
    groups.push({
      key: PINNED_ACCOUNT,
      title: pinnedTitle,
      defaultOpen: true,
      rows: pinnedRows,
      draggable: false,
      quota: false,
    });
  }
  groups.push(
    {
      key: 'input',
      title: t('group.needsInput'),
      defaultOpen: true,
      rows: buckets.input,
      draggable: false,
      quota: false,
    },
    {
      key: 'running',
      title: t('group.working'),
      defaultOpen: true,
      rows: buckets.running,
      draggable: false,
      quota: false,
    },
    {
      key: 'idle',
      title: t('group.completed'),
      defaultOpen: false,
      rows: completed,
      revealable: true,
      unreadCount: completed.filter(row => row.unread).length,
      draggable: false,
      quota: false,
    });
  return groups.filter(group => group.rows.length > 0);
}

/**
 * Layout identity of the rendered sections. `rows` gates the hover card, which
 * a nested change does not invalidate; `nested` also carries each row's nested
 * order, so the list animates a re-sorted subagent layer as well.
 */
export function layoutKeys(groups: readonly Group[]): { readonly rows: string; readonly nested: string } {
  return {
    rows: JSON.stringify(groups.map(group => [group.key, group.rows.map(row => row.id)])),
    nested: JSON.stringify(groups.map(group => [group.key, group.rows.map(row => [row.id, row.children.map(child => child.key)])])),
  };
}

/** Merge immediate metadata matches with the bounded Host content page. */
export function searchHits(
  list: SessionListState,
  statuses: SessionStatusSnapshot,
  archived: ReadonlySet<SessionId>,
  workspaceTitles: ReadonlyMap<SessionId, string>,
  needle: string,
  contentHits: ContentHits,
  ungroupedTitle: string,
  limit: number,
): { hits: SearchHit[]; hasMore: boolean } {
  const found: SearchHit[] = [];
  const seen = new Set<SessionId>();
  const snippets = new Map(contentHits.items.map(hit => [hit.sessionId, hit.snippet]));
  const push = (id: SessionId, snippet?: string): void => {
    const summary = list.byId[id];
    if (summary === undefined) {
      return;
    }
    const { state } = rowStateOf(statuses, id, summary.running);
    found.push({
      id,
      title: summary.displayTitle,
      workspace: workspaceTitles.get(id) ?? ungroupedTitle,
      state,
      ...snippet === undefined ? {} : { snippet },
      archived: archived.has(id),
    });
  };
  for (const id of list.ids) {
    const summary = list.byId[id];
    if (summary === undefined || summary.blank || summary.origin === 'subagent') {
      continue;
    }
    const haystack = `${summary.displayTitle} ${workspaceTitles.get(id) ?? ''}`.toLowerCase();
    if (!haystack.includes(needle)) {
      continue;
    }
    seen.add(id);
    push(id, snippets.get(id));
  }
  found.sort((left, right) => list.byId[right.id]!.updatedAt - list.byId[left.id]!.updatedAt);
  for (const hit of contentHits.items) {
    if (seen.has(hit.sessionId)) {
      continue;
    }
    seen.add(hit.sessionId);
    push(hit.sessionId, hit.snippet);
  }
  return { hits: found.slice(0, limit), hasMore: contentHits.hasMore || found.length > limit };
}
