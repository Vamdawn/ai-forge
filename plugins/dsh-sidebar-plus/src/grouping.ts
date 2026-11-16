/** The three native values are also the keys stored by the host browser. */
export const NATIVE_GROUPINGS = ['workspace', 'workspace-tree', 'flat'] as const;
export const GROUPINGS = [...NATIVE_GROUPINGS, 'status'] as const;
export type NativeGrouping = typeof NATIVE_GROUPINGS[number];
export type Grouping = typeof GROUPINGS[number];
export type ShortcutPosition = 0 | 1;
export type GroupingShortcuts = readonly [Grouping | null, Grouping | null];

export const GROUP_LABELS = {
  workspace: 'tab.workspaces',
  'workspace-tree': 'groupBy.tree',
  flat: 'groupBy.flat',
  status: 'tab.status',
} as const;

export const DEFAULT_SHORTCUTS: GroupingShortcuts = ['workspace', 'status'];

export interface GroupingPreferences {
  readonly statusSelected: boolean;
  readonly shortcuts: GroupingShortcuts;
}

export interface NativeView {
  readonly groupBy: NativeGrouping;
  readonly orderBy: 'manual' | 'updated';
  readonly archivedFilter?: 'default' | 'show' | 'only';
}

export interface NativeViewStore {
  getSnapshot(): NativeView;
  subscribe(listener: () => void): () => void;
  readonly actions: {
    setGroupBy(group: NativeGrouping): void;
    setOrderBy(order: NativeView['orderBy'], initialOrders: Record<string, readonly string[]>): void;
    setArchivedFilter(filter: NonNullable<NativeView['archivedFilter']>): void;
  };
}

export function setGroupingShortcut(
  shortcuts: GroupingShortcuts, position: ShortcutPosition, group: Grouping | null,
): GroupingShortcuts {
  const other = position === 0 ? 1 : 0;
  const next: [Grouping | null, Grouping | null] = [...shortcuts];
  // Picking a group from the other position swaps the two shortcuts.
  if (group !== null && next[other] === group) next[other] = next[position];
  next[position] = group;
  return next;
}
