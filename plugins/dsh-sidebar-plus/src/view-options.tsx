import { createElement as h, useState } from 'react';
import type { ChangeEvent, ReactElement } from 'react';
import {
  IconArchiveCheckOutlineRegular, IconArchiveOffOutlineRegular, IconChevronsUpDownOutlineRegular,
  IconClockOutlineRegular, IconFlatListOutlineRegular, IconFolderCloseRegular, IconQueueOutlineRegular,
  IconSlidersTwoOutlineRegular, IconWorkspaceTreeOutlineRegular, Menu, Tooltip,
} from '@deepseek-ai/dsh-client-ui-primitives';
import type { MenuEntry } from '@deepseek-ai/dsh-client-ui-primitives';
import type { InjectFace, PropsLocale } from '@deepseek-ai/dsh-client-ui-slots';
import { GROUPINGS, GROUP_LABELS } from './grouping.js';
import type { Grouping, GroupingPreferences, NativeView, NativeViewStore, ShortcutPosition } from './grouping.js';

type Translate = PropsLocale<'sidebar-plus'>['t'];

export const GROUP_ICONS = {
  workspace: IconFolderCloseRegular,
  'workspace-tree': IconWorkspaceTreeOutlineRegular,
  flat: IconFlatListOutlineRegular,
  status: IconClockOutlineRegular,
};

const ARCHIVE_OPTIONS = {
  default: IconArchiveOffOutlineRegular,
  show: IconQueueOutlineRegular,
  only: IconArchiveCheckOutlineRegular,
} as const;

type ArchiveFilter = keyof typeof ARCHIVE_OPTIONS;

export function ViewOptions({ t, grouping, nativeView, onGrouping, setOrder, setArchived }: {
  t: Translate;
  grouping: Grouping;
  nativeView: NativeView | null;
  onGrouping(grouping: Grouping): void;
  setOrder(order: NativeView['orderBy']): void;
  setArchived: NativeViewStore['actions']['setArchivedFilter'];
}): ReactElement {
  const [open, setOpen] = useState(false);
  const groupings = nativeView === null ? ['workspace', 'status'] as const : GROUPINGS;
  const items: MenuEntry[] = [
    { type: 'label', id: 'group-by', text: t('groupBy.label') },
    ...groupings.map(id => ({ id, label: t(GROUP_LABELS[id]), icon: h(GROUP_ICONS[id], {}) })),
  ];
  const selectedIds: string[] = [grouping];
  if (nativeView !== null && grouping !== 'status') {
    items.push(
      { type: 'separator', id: 'order-by-separator' },
      { type: 'label', id: 'order-by', text: t('orderBy.label') },
      { id: 'manual', label: t('orderBy.manual'), icon: h(IconChevronsUpDownOutlineRegular, {}) },
      { id: 'updated', label: t('orderBy.updated'), icon: h(IconClockOutlineRegular, {}) },
      { type: 'separator', id: 'archive-separator' },
      { type: 'label', id: 'archive', text: t('archive.label') },
      ...Object.entries(ARCHIVE_OPTIONS).map(([filter, Icon]) => ({
        id: `archive.${filter}`, label: t(`archive.${filter as ArchiveFilter}`), icon: h(Icon, {}),
      })),
    );
    selectedIds.push(nativeView.orderBy, `archive.${nativeView.archivedFilter ?? 'default'}`);
  }
  return h(Menu, {
    open, items, selectedIds, align: 'end', dense: true, portal: true,
    onClose: () => setOpen(false),
    onSelect: id => {
      const group = groupings.find(group => group === id);
      if (group) onGrouping(group);
      if (id === 'manual' || id === 'updated') setOrder(id);
      const archive = (Object.keys(ARCHIVE_OPTIONS) as ArchiveFilter[]).find(filter => `archive.${filter}` === id);
      if (archive) setArchived(archive);
      setOpen(false);
    },
    anchor: h(Tooltip, {
      label: t('viewOptions.label'), side: 'bottom', delayMs: 500,
      children: h('button', {
        type: 'button', className: 'dwt-iconbutton',
        'aria-label': t('viewOptions.label'), 'aria-haspopup': 'menu', 'aria-expanded': open,
        onClick: () => setOpen(value => !value),
      }, h(IconSlidersTwoOutlineRegular, { size: 16 })),
    }),
  });
}

export interface ShortcutSettingsInjected {
  hooks: {
    groupingPreferences: {
      getSnapshot(): GroupingPreferences;
      subscribe(listener: () => void): () => void;
    };
  };
  setShortcut(position: ShortcutPosition, group: Grouping | null): void;
}

export function ShortcutSettings({ t, useGroupingPreferences, setShortcut }:
PropsLocale<'sidebar-plus'> & InjectFace<ShortcutSettingsInjected>): ReactElement {
  const shortcuts = useGroupingPreferences(value => value.shortcuts);
  return h('fieldset', { className: 'dwt-shortcut-settings' },
    h('legend', null, t('groupBy.shortcuts')),
    ([0, 1] as const).map(position => h('label', { key: position },
      t(position === 0 ? 'settings.first' : 'settings.second'),
      h('select', {
        value: shortcuts[position] ?? '',
        onChange: (event: ChangeEvent<HTMLSelectElement>) => {
          const value = event.target.value;
          setShortcut(position, GROUPINGS.find(group => group === value) ?? null);
        },
      },
      h('option', { value: '' }, t('settings.none')),
      GROUPINGS.map(group => h('option', { key: group, value: group }, t(GROUP_LABELS[group])))))));
}
