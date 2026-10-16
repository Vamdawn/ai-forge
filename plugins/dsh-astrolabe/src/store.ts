import { defineStore } from '@deepseek-ai/dsh-client-store';
import type { SessionId } from '@deepseek-ai/dsh-session/types';

/**
 * The region's browser-local viewing state.
 *
 * Fields stay mutable because the store hands the same type to immer drafts in
 * the actions table; the handle is created per `apply` (never at module level,
 * where module-cache identity would become a singleton across plugin reloads).
 */
export interface ViewState {
  /** Saved manual session order per account: a Workspace id, or one of the special keys above. */
  sessionOrder: Record<string, SessionId[]>;
  /** Active ordering axis. Dragging a row switches this to `manual`. */
  orderBy: 'updated' | 'manual';
  /** Explicit group expansion keyed `${tab}:${groupKey}`; absent means "use the derived default". */
  groupExpansion: Record<string, boolean>;
}

/**
 * The persisted view store. `persist` is the framework-run key: the snapshot is
 * written to browser storage and later sessions are seeded from it, which is
 * how the shipped browser keeps its own expansion and order records.
 * @returns the store handle to register as this entry's `store` seat.
 */
export function createViewStore() {
  return defineStore({
    persist: 'dsh-astrolabe/view',
    init: (): ViewState => ({ sessionOrder: {}, orderBy: 'updated', groupExpansion: {} }),
    actions: {
      setOrderBy(draft, mode: ViewState['orderBy']) {
        draft.orderBy = mode;
      },
      setSessionOrder(draft, account: string, order: readonly SessionId[]) {
        draft.sessionOrder[account] = [...order];
      },
      setGroupExpanded(draft, key: string, open: boolean) {
        draft.groupExpansion[key] = open;
      },
    },
  });
}

/** The store handle type the component's `useStore`/`actions` shares derive from. */
export type ViewStoreHandle = ReturnType<typeof createViewStore>;
