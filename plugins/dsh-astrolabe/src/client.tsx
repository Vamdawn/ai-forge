import { createElement as h, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent as ReactChangeEvent, DragEvent as ReactDragEvent, MouseEvent as ReactMouseEvent, KeyboardEvent as ReactKeyboardEvent, ReactElement } from 'react';
import type { PropsStore } from '@deepseek-ai/dsh-client-store';
import { createSnapshotStore } from '@deepseek-ai/dsh-client-store';
// The host's own controls: hand-rolled buttons drifted from the native look
// (radius, height, hover fill), and this package owns those decisions.
import {
  Button, IconCheckCircleFillRegular, IconCheckCircleOutlineRegular, IconCloseFillRegular,
  IconEditOutlineRegular, IconEllipsisOutlineRegular, IconFlatListOutlineRegular,
  IconFolderCloseRegular, IconFolderOpenRegular, IconLoadingOutlineRegular,
  IconNewChatOutlineRegular, IconPinFillRegular, IconPinOutlineRegular,
  IconProjectAddOutlineRegular, IconSearchOutlineRegular, IconTrashOutlineRegular,
  IconUnarchiveOutlineRegular, IconWarningOutlineRegular, Menu, MenuItemButton, StateDot, Tooltip,
} from '@deepseek-ai/dsh-client-ui-primitives';
import type { Context } from '@deepseek-ai/cordis';
import type { SessionId } from '@deepseek-ai/dsh-session/types';
import type { WorkspaceId, WorkspaceView } from '@deepseek-ai/dsh-api-workspace-controller/client';
import type { InjectFace, PropsLocale, PropsRenderSlots, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots';
// These imports provide service type augmentations; the Desktop loader owns the runtime services.
import type {} from '@deepseek-ai/dsh-client-locale/client';
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client';
import type {} from '@deepseek-ai/dsh-client-ui-layout/client';
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client';
import type { WorkspaceBrowserInjected } from '@deepseek-ai/dsh-client-ui-workspace/client';
import type {} from '@deepseek-ai/dsh-client-shortcuts/client';
import type { StoredEntry } from '@deepseek-ai/dsh-client-ui-slots';
import { DICTIONARIES } from './locales.js';
import { FLOW_SLOT, MENU_SLOT, ROW_ACTION_SLOT, menuOpenStateFactory } from './contract.js';
import { createMirror } from './mirror.js';
import { createViewStore } from './store.js';
import { CSS } from './styles.js';
import { AnimatedList } from './motion.js';
import { PINNED_ACCOUNT, UNGROUPED_ACCOUNT, relativeTime, topRows, mainSessionId, workspaceGroups, statusGroups, layoutKeys, searchHits } from './model.js';
import type { ActivityChild, ContentHits, Group, Row, SearchHit, TabId } from './model.js';
import type { ViewStoreHandle } from './store.js';

export const name = 'dsh-astrolabe-client';
export const inject = ['slots', 'locale', 'uiWorkspace', 'workspaces', 'sessions', 'shortcuts'];

const NS = 'astrolabe' as const;
const STYLE_ID = 'dsh-astrolabe-style';
/** Completed rows revealed per "Show earlier" press. */
const REVEAL_STEP = 20;
/**
 * Idle Sessions one Workspace section shows before "Show more". Running
 * Sessions and the selected blank New Session row stay visible without using
 * this quota, matching the shipped browser.
 */
const IDLE_QUOTA = 5;
/** Pause between the latest keystroke and a Host content-search request. */
const SEARCH_DEBOUNCE_MS = 250;
/** The wire bound the Host applies; the merged result list is capped to match. */
const SEARCH_LIMIT = 20;
/** Nothing found yet, and nothing more to ask for. */
const EMPTY_CONTENT_HITS: ContentHits = { items: [], hasMore: false };
/** How often relative times re-render. */
const CLOCK_MS = 30_000;

interface Injected {
  openSession: (sessionId: SessionId) => void;
  /** Start a fresh Session inside one Workspace, the shell's own New Session path. */
  startSession: (workspaceId: WorkspaceId) => void;
  /** Restore an archived Session, offered on its own search result row. */
  unarchiveSession: (sessionId: SessionId) => Promise<void>;
  /** Move a Workspace in the Host-durable registry order; the list re-reads it. */
  insertWorkspaceBefore: (workspaceId: WorkspaceId, beforeWorkspaceId: WorkspaceId) => Promise<void>;
  /** Adopt a picked host directory as a real Workspace. */
  createWorkspace: (input: { path: string }) => Promise<{ readonly workspaceId: WorkspaceId }>;
  /** Rename a Workspace; rejects on a name conflict. */
  renameWorkspace: (workspaceId: WorkspaceId, title: string) => Promise<unknown>;
  /** Delete one Workspace registration; its directory and Session logs remain. */
  deleteWorkspace: (workspaceId: WorkspaceId) => Promise<unknown>;
  /** Ranked current-conversation matches; a refusal resolves to an empty list. */
  searchSessions: (query: string, signal: AbortSignal) => Promise<ContentHits>;
  hooks: {
    /** Whether the directory-picking hole has an occupant; an empty hole offers no trigger. */
    directoryFlow: { getSnapshot(): boolean; subscribe(listener: () => void): () => void };
    shortcuts: WorkspaceBrowserInjected['hooks']['shortcuts'];
    /** Monotonic counter forwarded from the host's search command. */
    searchRequest: { getSnapshot(): number; subscribe(listener: () => void): () => void };
  };
}

/** One transient hover card, positioned from the hovered row's box. */
interface HoverInfo {
  readonly row: Row;
  readonly top: number;
  readonly left: number;
}

/** Per-row drag wiring, built once per section. */
interface RowDnd {
  readonly enabled: boolean;
  readonly dragging: SessionId | undefined;
  readonly hint: (id: SessionId) => 'before' | 'after' | undefined;
  readonly start: (id: SessionId) => void;
  readonly over: (id: SessionId, after: boolean) => void;
  readonly drop: (id: SessionId, after: boolean) => void;
  readonly end: () => void;
}

/** Per-section drag wiring for reordering the Workspace groups themselves. */
interface GroupDnd {
  readonly enabled: boolean;
  readonly hint: boolean;
  readonly start: () => void;
  readonly over: () => void;
  readonly drop: () => void;
  readonly end: () => void;
}

type Props = PropsRuntime<'sidebar.workspaces'>
  & PropsRenderSlots<typeof MENU_SLOT | typeof ROW_ACTION_SLOT | typeof FLOW_SLOT>
  & PropsStore<ViewStoreHandle>
  & PropsLocale<typeof NS>
  & InjectFace<Injected>;

/**
 * A Workspace's absolute creation instant, in the shipped hover card's own
 * shape: a locale-ordered date followed by a padded 24-hour time.
 */
function createdLabel(createdAt: string, t: Props['t']): string {
  const at = new Date(createdAt);
  const pad = (value: number): string => String(value).padStart(2, '0');
  const date = t('date.ymd', { y: at.getFullYear(), m: at.getMonth() + 1, d: at.getDate() });
  return t('card.created', { time: `${date} ${pad(at.getHours())}:${pad(at.getMinutes())}` });
}

/**
 * The nested subagent layer: one row per delegation the parent is showing, most
 * recently active first. Only an active child carries a mark, so the layer
 * reads as what the Session is doing now rather than as a second history, and
 * every row keeps the time it was last touched.
 */
function ActivityList(props: {
  readonly children: readonly ActivityChild[];
  readonly openSession: Injected['openSession'];
  readonly now: number;
  readonly t: Props['t'];
}): ReactElement {
  const { children, openSession, now, t } = props;
  return h('div', { className: 'dwt-children' }, children.map(child => h('div', {
    key: child.key,
    className: 'dwt-child',
    // A nested row animates on its own: it is a sibling of the row carrying
    // the Session id, so the two position transforms never compound.
    'data-motion-id': `child:${child.key}`,
    'data-openable': true,
    role: 'button',
    tabIndex: 0,
    onClick: () => {
      openSession(child.openable);
    },
    onKeyDown: (event: ReactKeyboardEvent<HTMLDivElement>) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openSession(child.openable);
      }
    },
  },
  h('span', { className: 'dwt-row-mark' },
    child.state === 'ongoing' ? h(StateDot, { state: 'ongoing' }) : null),
  h('span', { className: 'dwt-child-title' }, child.title),
  h('span', { className: 'dwt-child-time' }, relativeTime(child.updatedAt, now, t)))));
}

function SessionRow(props: {
  readonly row: Row;
  readonly t: Props['t'];
  readonly now: number;
  readonly openSession: Injected['openSession'];
  readonly renderSlot: Props['renderSlot'];
  readonly dnd: RowDnd;
  readonly onHover: (hover: HoverInfo | null) => void;
  readonly onInteraction: (key: string, active: boolean) => void;
}): ReactElement {
  const { row, t, now, openSession, renderSlot, dnd, onHover, onInteraction } = props;
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => {
    onInteraction(row.id, menuOpen);
    return () => onInteraction(row.id, false);
  }, [row.id, menuOpen, onInteraction]);
  const titleRef = useRef<HTMLSpanElement | null>(null);
  const clipRef = useRef<HTMLSpanElement | null>(null);
  /**
   * Scroll a clipped title to its far edge while the row is hovered, so a long
   * generated title can be read without opening anything. The shift is measured
   * per hover because the clip amount changes with the column width, and it is
   * read against the wrapper — the title's own box is content-sized while
   * hovered, so its client width is not the space the text is clipped to.
   */
  const shiftTitle = (): void => {
    const node = titleRef.current;
    const clip = clipRef.current;
    if (node === null || clip === null) {
      return;
    }
    const overflow = node.scrollWidth - clip.clientWidth;
    node.style.setProperty('--dwt-shift', overflow > 0 ? `-${overflow}px` : '0px');
  };
  const resetTitle = (): void => {
    titleRef.current?.style.setProperty('--dwt-shift', '0px');
  };
  const open = (): void => {
    // Opening can unmount this row without a mouseleave, so drop the card here.
    onHover(null);
    openSession(row.id);
  };
  const trailing = row.pending !== undefined
    ? { text: t(row.pending === 'approval' ? 'pending.approval'
      : row.pending === 'plan-review' ? 'pending.planReview' : 'pending.question'), tone: 'warn' }
    : { text: relativeTime(row.updatedAt, now, t), tone: 'plain' };
  /**
   * The one leading mark a Session row earns: something waiting on you,
   * something working — its own turn or a delegation it started — or a
   * completion to look at. Every other row keeps the 14px cell empty, so the
   * titles stay on one column without a colour that means two things.
   */
  const mark = row.blank ? undefined
    : row.state === 'input' ? 'warning'
      : row.state === 'running' ? 'ongoing'
        : row.unread ? 'done' : undefined;
  return h('div', null,
    h('div', {
      className: 'dwt-row',
      'data-motion-id': row.id,
      role: 'button',
      tabIndex: 0,
      title: row.title,
      'data-current': row.current,
      'data-menu': menuOpen ? 'open' : undefined,
      'data-drop': dnd.hint(row.id),
      'data-dragging': dnd.dragging === row.id,
      onMouseEnter: (event: ReactMouseEvent<HTMLDivElement>) => {
        shiftTitle();
        const box = event.currentTarget.getBoundingClientRect();
        onHover({ row, top: box.top, left: box.right + 8 });
      },
      onMouseLeave: () => {
        resetTitle();
        onHover(null);
      },
      ...dnd.enabled && !row.blank ? {
        draggable: true,
        onDragStart: (event: ReactDragEvent<HTMLDivElement>) => {
          event.dataTransfer.setData('text/plain', row.id);
          event.dataTransfer.effectAllowed = 'move';
          dnd.start(row.id);
        },
        onDragOver: (event: ReactDragEvent<HTMLDivElement>) => {
          event.preventDefault();
          const box = event.currentTarget.getBoundingClientRect();
          dnd.over(row.id, event.clientY > box.top + box.height / 2);
        },
        onDrop: (event: ReactDragEvent<HTMLDivElement>) => {
          event.preventDefault();
          const box = event.currentTarget.getBoundingClientRect();
          dnd.drop(row.id, event.clientY > box.top + box.height / 2);
        },
        onDragEnd: () => {
          dnd.end();
        },
      } : {},
      onClick: open,
      onKeyDown: (event: ReactKeyboardEvent<HTMLElement>) => {
        if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) {
          event.preventDefault();
          open();
        }
      },
    },
    h('span', { className: 'dwt-row-mark' }, mark === undefined ? null : h(StateDot, { state: mark })),
    // The crawl moves the title's own box, so the clipping has to come from this
    // wrapper: it is the flex item and never moves, which keeps every painted
    // pixel inside the row.
    h('span', {
      className: 'dwt-row-clip',
      ref: (node: HTMLSpanElement | null): void => {
        clipRef.current = node;
      },
    }, h('span', {
      className: 'dwt-row-title',
      ref: (node: HTMLSpanElement | null): void => {
        titleRef.current = node;
      },
    }, row.blank ? t('row.newSession') : row.title)),
    row.blank ? null : h('span', { className: 'dwt-trailing', 'data-tone': trailing.tone }, trailing.text),
    // The strip's clicks stay in the strip: neither the trigger nor a row.action
    // entry may reach the row's own click. The strip is hidden at rest, so the
    // relative time holds the trailing cell on its own.
    row.blank ? null : h('span', {
      className: 'dwt-rowbar',
      onClick: (event: MouseEvent) => {
        event.stopPropagation();
      },
    },
    h(Menu, {
      open: menuOpen,
      onClose: () => {
        setMenuOpen(false);
      },
      // Portalled and fixed-positioned from the trigger's rect: an in-place list
      // would be in flow (pushing every later row down) and cropped by the
      // sidebar's scroll container.
      portal: true,
      closeOnPointerLeave: true,
      anchor: h('button', {
        className: 'dwt-trigger',
        type: 'button',
        'aria-label': t('row.menu'),
        onClick: () => {
          setMenuOpen(value => !value);
          // The menu is the interaction now; a hover card behind it just stacks
          // two surfaces on the same row.
          onHover(null);
        },
      }, h(IconEllipsisOutlineRegular, { size: 14 })),
    }, renderSlot(MENU_SLOT, { sessionId: row.id, displayTitle: row.title }, {
      hookContext: [menuOpen, setMenuOpen] as const,
    })),
    renderSlot(ROW_ACTION_SLOT, { sessionId: row.id, displayTitle: row.title }))),
    row.children.length === 0 ? null : h(ActivityList, { children: row.children, openSession, now, t }));
}

/**
 * Leading mark of one section. Every section carries the same 14px cell, so the
 * labels of both tabs stay on one column, and where the icon family has an
 * open/closed pair the mark also reads the fold state — the Workspace folder
 * does it by opening, its Pinned and Completed counterparts by filling in.
 * Status sections are keyed by their `RowState`, the workspace axis by a
 * `WorkspaceId`, and the two synthetic accounts stand for Pinned and for the
 * Sessions no Workspace accounts for.
 * @param props - the section and whether it is expanded.
 * @returns the mark cell.
 */
function GroupMark({ group, open }: { readonly group: Group; readonly open: boolean }): ReactElement {
  const mark = (kind: string, icon: ReactElement): ReactElement =>
    h('span', { className: 'dwt-group-mark', 'data-kind': kind }, icon);
  if (group.workspaceId !== undefined) {
    return mark('workspace', open
      ? h(IconFolderOpenRegular, { size: 14 })
      : h(IconFolderCloseRegular, { size: 14 }));
  }
  switch (group.key) {
    case PINNED_ACCOUNT:
      return mark('pinned', open
        ? h(IconPinFillRegular, { size: 14 })
        : h(IconPinOutlineRegular, { size: 14 }));
    case 'input':
      return mark('input', h(IconWarningOutlineRegular, { size: 14 }));
    case 'running':
      // Still by design: the rows below carry the animated loader.
      return mark('running', h(IconLoadingOutlineRegular, { size: 14 }));
    case 'idle':
      return mark('done', open
        ? h(IconCheckCircleFillRegular, { size: 14 })
        : h(IconCheckCircleOutlineRegular, { size: 14 }));
    default:
      return mark('loose', h(IconFlatListOutlineRegular, { size: 14 }));
  }
}

function Section(props: {
  readonly group: Group;
  readonly holdLayout: boolean;
  readonly t: Props['t'];
  readonly now: number;
  readonly open: boolean;
  readonly onToggle: () => void;
  readonly openSession: Injected['openSession'];
  readonly startSession: Injected['startSession'];
  readonly renderSlot: Props['renderSlot'];
  readonly rowDnd: RowDnd;
  readonly groupDnd: GroupDnd;
  readonly onHover: (hover: HoverInfo | null) => void;
  readonly onInteraction: (key: string, active: boolean) => void;
  readonly renameWorkspace: Injected['renameWorkspace'];
  readonly deleteWorkspace: Injected['deleteWorkspace'];
}): ReactElement {
  const {
    group, holdLayout, t, now, open, onToggle, openSession, startSession, renderSlot, rowDnd, groupDnd, onHover,
    renameWorkspace, deleteWorkspace, onInteraction,
  } = props;
  const workspacePath = group.path;
  const [revealed, setRevealed] = useState(REVEAL_STEP);
  const [quota, setQuota] = useState(IDLE_QUOTA);
  // Two independent folds: the Status sections reveal in fixed steps, while a
  // Workspace section keeps running rows and the New Session row outside its
  // idle quota and preserves the section's own order.
  const idleRows = group.quota ? group.rows.filter(row => !row.blank && row.state === 'idle') : [];
  const idleShown = Math.min(quota, idleRows.length);
  const idleHidden = idleRows.length - idleShown;
  let rows = group.rows;
  if (group.revealable === true) {
    rows = rows.slice(0, revealed);
  }
  if (group.quota) {
    const allowed = new Set<SessionId>(idleRows.slice(0, idleShown).map(row => row.id));
    rows = group.rows.filter(row => row.blank || row.state !== 'idle' || allowed.has(row.id));
  }
  const visibleRows = useRef(rows);
  if (holdLayout) {
    const latest = new Map(group.rows.map(row => [row.id, row]));
    rows = visibleRows.current.flatMap(row => latest.has(row.id) ? [latest.get(row.id)!] : []);
  }
  useLayoutEffect(() => { if (!holdLayout) visibleRows.current = rows; }, [holdLayout, rows]);
  const hidden = group.rows.length - rows.length;
  const title = group.title === '' ? t('ungrouped') : group.title;
  const [renaming, setRenaming] = useState(false);
  const [draft, setDraft] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => {
    const key = `group:${group.key}`;
    onInteraction(key, menuOpen || renaming || confirming);
    return () => onInteraction(key, false);
  }, [group.key, menuOpen, renaming, confirming, onInteraction]);
  const [copied, setCopied] = useState(false);
  const copyTimer = useRef<number | undefined>(undefined);
  /** Copy the directory from the section menu; the label is the feedback. */
  const copyPath = (path: string): void => {
    void navigator.clipboard.writeText(path).then(() => {
      setCopied(true);
      window.clearTimeout(copyTimer.current);
      copyTimer.current = window.setTimeout(() => {
        setCopied(false);
      }, 1200);
    }).catch(() => {
      // A denied clipboard leaves the menu unchanged; the path stays readable.
    });
  };
  useEffect(() => () => { window.clearTimeout(copyTimer.current); }, []);
  const workspaceId = group.workspaceId;

  const commitRename = (): void => {
    const next = draft.trim();
    // Enter commits and then the input unmounts, which blurs it: without this
    // guard the same rename would be written twice.
    if (busy || workspaceId === undefined || next === '' || next === group.title) {
      setRenaming(false);
      return;
    }
    setBusy(true);
    void renameWorkspace(workspaceId, next)
      .then(() => {
        setBusy(false);
        setRenaming(false);
      })
      .catch((reason: unknown) => {
        setBusy(false);
        setError(reason instanceof Error ? reason.message : String(reason));
      });
  };

  const commitDelete = (): void => {
    if (busy || workspaceId === undefined) {
      return;
    }
    setBusy(true);
    void deleteWorkspace(workspaceId)
      .then(() => {
        setBusy(false);
        setConfirming(false);
      })
      .catch((reason: unknown) => {
        setBusy(false);
        setError(reason instanceof Error ? reason.message : String(reason));
      });
  };

  return h('section', { className: 'dwt-group', 'data-motion-group': group.key },
    h('div', { className: 'dwt-group-head', 'data-motion-id': `group:${group.key}`, 'data-menu': menuOpen ? 'open' : undefined },
      renaming
        ? h('input', {
          className: 'dwt-rename',
          type: 'text',
          value: draft,
          'aria-label': t('ws.rename'),
          autoFocus: true,
          onChange: (event: ReactChangeEvent<HTMLInputElement>) => {
            setDraft(event.target.value);
          },
          onKeyDown: (event: ReactKeyboardEvent<HTMLElement>) => {
            if (event.nativeEvent.isComposing) {
              return;
            }
            if (event.key === 'Enter') {
              commitRename();
            } else if (event.key === 'Escape') {
              setRenaming(false);
            }
          },
          onBlur: commitRename,
        })
        : h('button', {
          className: 'dwt-group-header',
          type: 'button',
          'data-open': open,
          'data-drop': groupDnd.hint ? 'group' : undefined,
          'aria-expanded': open,
          onClick: onToggle,
          ...groupDnd.enabled ? {
            draggable: true,
            onDragStart: (event: ReactDragEvent<HTMLButtonElement>) => {
              event.dataTransfer.setData('text/plain', group.key);
              event.dataTransfer.effectAllowed = 'move';
              groupDnd.start();
            },
            onDragOver: (event: ReactDragEvent<HTMLButtonElement>) => {
              event.preventDefault();
              groupDnd.over();
            },
            onDrop: (event: ReactDragEvent<HTMLButtonElement>) => {
              event.preventDefault();
              groupDnd.drop();
            },
            onDragEnd: () => {
              groupDnd.end();
            },
          } : {},
        },
        h(GroupMark, { group, open }),
        h('span', null, title)),
      workspaceId === undefined || renaming
        ? null
        : h('div', { className: 'dwt-group-actions' },
          h(Button, {
            size: 'sm',
            variant: 'ghost',
            title: t('ws.newSession'),
            'aria-label': t('ws.newSession'),
            onClick: () => {
              startSession(workspaceId);
            },
          }, h(IconNewChatOutlineRegular, { size: 16 })),
          // The section's own menu. Portalled like the Session row's, so opening
          // it cannot push the sections below it down the column.
          h(Menu, {
            open: menuOpen,
            onClose: () => {
              setMenuOpen(false);
            },
            portal: true,
            closeOnPointerLeave: true,
            anchor: h(Button, {
              size: 'sm',
              variant: 'ghost',
              title: t('ws.menu'),
              'aria-label': t('ws.menu'),
              onClick: () => {
                setMenuOpen(value => !value);
                onHover(null);
              },
            }, h(IconEllipsisOutlineRegular, { size: 16 })),
          },
          // Codex's project card, in this palette: what the section is, how much
          // is in it, where it lives, then the actions.
          h('div', { className: 'dwt-menu-head' },
            workspaceId === undefined ? null : h(IconFolderCloseRegular, { size: 14 }),
            h('span', { className: 'dwt-menu-name' }, group.title)),
          h('div', { className: 'dwt-menu-stat' },
            t('ws.sessions', { n: group.rows.length }),
            group.unreadCount === undefined || group.unreadCount === 0
              ? null
              : ` · ${group.unreadCount} ${t('unread')}`),
          workspacePath === undefined
            ? null
            : h('button', {
              className: 'dwt-menu-path',
              type: 'button',
              title: copied ? t('ws.pathCopied') : t('ws.path'),
              onClick: () => {
                void copyPath(workspacePath);
              },
            }, h(IconFolderCloseRegular, { size: 14 }), h('span', null, copied ? t('ws.pathCopied') : workspacePath)),
          workspaceId === undefined ? null : h(MenuItemButton, {
            icon: h(IconEditOutlineRegular, { size: 14 }),
            children: t('ws.rename'),
            onSelect: () => {
              setMenuOpen(false);
              setDraft(group.title);
              setRenaming(true);
            },
          }),
          workspaceId === undefined ? null : h(MenuItemButton, {
            icon: h(IconTrashOutlineRegular, { size: 14 }),
            children: t('ws.delete'),
            danger: true,
            onSelect: () => {
              setMenuOpen(false);
              setConfirming(true);
            },
          })))),
    confirming
      ? h('div', { className: 'dwt-confirm' },
        h('span', null, t('ws.deleteConfirm')),
        h(Button, {
          size: 'sm',
          variant: 'ghost',
          disabled: busy,
          onClick: commitDelete,
        }, t('ws.delete')),
        h(Button, {
          size: 'sm',
          variant: 'ghost',
          onClick: () => {
            setConfirming(false);
          },
        }, t('common.cancel')))
      : null,
    error === null ? null : h('div', { className: 'dwt-alert', role: 'alert' },
      error,
      h(Button, {
        size: 'sm',
        variant: 'ghost',
        onClick: () => {
          setError(null);
        },
      }, t('dismiss'))),
    open ? rows.map(row => h(SessionRow, {
      key: row.id,
      row,
      t,
      now,
      openSession,
      renderSlot,
      dnd: rowDnd,
      onHover,
      onInteraction,
    })) : null,
    open && group.quota && idleHidden > 0
      ? h(Button, {
        className: 'dwt-more',
        size: 'sm',
        variant: 'ghost',
        onClick: () => {
          setQuota(value => value + IDLE_QUOTA);
        },
      }, t('showMore'))
      : null,
    open && group.quota && quota > IDLE_QUOTA
      ? h(Button, {
        className: 'dwt-more',
        size: 'sm',
        variant: 'ghost',
        onClick: () => {
          setQuota(IDLE_QUOTA);
        },
      }, t('showLess'))
      : null,
    open && group.revealable === true && hidden > 0
      ? h(Button, {
        className: 'dwt-more',
        size: 'sm',
        variant: 'ghost',
        onClick: () => {
          setRevealed(value => value + REVEAL_STEP);
        },
      }, t('showEarlier'))
      : null);
}

/**
 * One search result, in the shipped browser's two-line shape: a leading 16px
 * marker cell and the title on top, the owning Workspace and the matching
 * snippet below. An archived match stays listed but cannot be opened — its row
 * carries the restore control instead, and the row reads as inactive.
 * @param props - the hit, whether it is the current Session, and the actions.
 * @returns the result row.
 */
function SearchHitRow(props: {
  readonly hit: SearchHit;
  readonly current: boolean;
  readonly t: Props['t'];
  readonly openSession: Injected['openSession'];
  readonly unarchiveSession: Injected['unarchiveSession'];
}): ReactElement {
  const { hit, current, t, openSession, unarchiveSession } = props;
  const openable = !hit.archived;
  const [restoring, setRestoring] = useState(false);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  return h('div', {
    className: 'dwt-hit',
    role: 'treeitem',
    'aria-selected': current,
    'data-current': current,
    'data-archived': hit.archived,
    'aria-description': hit.archived ? t('search.archived') : undefined,
    ...openable ? {
      tabIndex: 0,
      onClick: () => {
        openSession(hit.id);
      },
      onKeyDown: (event: ReactKeyboardEvent<HTMLElement>) => {
        if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) {
          event.preventDefault();
          openSession(hit.id);
        }
      },
    } : {},
  },
  h('span', { className: 'dwt-hit-head' },
    // The leading cell owns every row marker; an archived row keeps it blank
    // because the greyed row already carries that meaning.
    h('span', { className: 'dwt-hit-slot' },
      openable && hit.state !== 'idle'
        ? h(StateDot, { state: hit.state === 'input' ? 'warning' : 'ongoing' })
        : null),
    h('span', { className: 'dwt-hit-title' }, hit.title),
    openable ? null : h('span', { className: 'dwt-hit-actions' },
      h(Tooltip, {
        label: t('search.unarchive'),
        side: 'bottom',
        align: 'end',
        delayMs: 500,
        children: h('button', {
          className: 'dwt-iconbutton',
          type: 'button',
          'aria-label': t('search.unarchive'),
          disabled: restoring,
          onClick: (event: ReactMouseEvent<HTMLButtonElement>) => {
            event.stopPropagation();
            if (restoring) return;
            setRestoring(true);
            setRestoreError(null);
            void unarchiveSession(hit.id).catch((reason: unknown) => {
              setRestoreError(reason instanceof Error ? reason.message : String(reason));
            }).finally(() => {
              setRestoring(false);
            });
          },
        }, h(IconUnarchiveOutlineRegular, { size: 14 })),
      }))),
  h('span', { className: 'dwt-hit-meta' },
    h('span', { className: 'dwt-hit-ws' }, hit.workspace),
    hit.snippet === undefined ? null : h('span', { className: 'dwt-hit-snippet' }, hit.snippet)),
  restoreError === null ? null : h('span', { role: 'alert' }, restoreError));
}

/**
 * The region's header: the two grouping modes in the label slot, then the
 * inline search and the add action. It is one 36px row shaped like the shipped
 * Workspace section header this entry replaces — same icon buttons, same
 * expanding search that takes the trailing action's room — because it stands in
 * that header's place.
 * @param props - the active mode, its attention flag, and the search and add
 * state the body owns.
 * @returns the header row.
 */
function Header(props: {
  readonly tab: TabId;
  readonly attention: boolean;
  readonly t: Props['t'];
  readonly onSelect: (tab: TabId) => void;
  readonly query: string;
  readonly onQuery: (value: string) => void;
  readonly searchOpen: boolean;
  readonly onSearchOpen: (open: boolean) => void;
  readonly searchRef: (node: HTMLInputElement | null) => void;
  readonly canAdd: boolean;
  readonly onAdd: () => void;
  readonly searchKeys: readonly string[];
  /** Put the caret back in the open field (the trigger doubles as its glyph). */
  readonly onSearchFocus: () => void;
  /** The header box, so an outside click can be told from one inside it. */
  readonly rootRef: (node: HTMLDivElement | null) => void;
}): ReactElement {
  const {
    tab, attention, t, onSelect, query, onQuery, searchOpen, onSearchOpen, searchRef, canAdd, onAdd,
    searchKeys, rootRef, onSearchFocus,
  } = props;
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const ids: readonly TabId[] = ['workspaces', 'status'];
  const move = (delta: number): void => {
    const index = ids.indexOf(tab);
    const next = ids[(index + delta + ids.length) % ids.length] ?? tab;
    onSelect(next);
    refs.current[ids.indexOf(next)]?.focus();
  };
  return h('div', { className: 'dwt-head', ref: rootRef },
    h('div', {
      className: 'dwt-tabs',
      role: 'tablist',
      'aria-label': t('tab.workspaces'),
      onKeyDown: (event: ReactKeyboardEvent<HTMLElement>) => {
        if (event.key === 'ArrowRight') {
          event.preventDefault();
          move(1);
        } else if (event.key === 'ArrowLeft') {
          event.preventDefault();
          move(-1);
        } else if (event.key === 'Home') {
          event.preventDefault();
          onSelect(ids[0] as TabId);
          refs.current[0]?.focus();
        } else if (event.key === 'End') {
          event.preventDefault();
          onSelect(ids[ids.length - 1] as TabId);
          refs.current[ids.length - 1]?.focus();
        }
      },
    }, ids.map((id, index) => h('button', {
      key: id,
      ref: (node: HTMLButtonElement | null): void => {
        refs.current[index] = node;
      },
      className: 'dwt-tab',
      type: 'button',
      role: 'tab',
      tabIndex: tab === id ? 0 : -1,
      'data-active': tab === id,
      'aria-selected': tab === id,
      onClick: () => {
        onSelect(id);
      },
    },
    t(id === 'workspaces' ? 'tab.workspaces' : 'tab.status'),
    id === 'status' && attention ? h('span', { className: 'dwt-badge' }) : null))),
    h('div', { className: searchOpen ? 'dwt-searchslot dwt-searchslot-open' : 'dwt-searchslot' },
      // The trigger stays mounted while the field is open: it shrinks into the
      // capsule's leading glyph, the way the shipped header keeps its own. It
      // must not be replaced — the click that opened the search is still
      // bubbling when the field mounts, and a detached target reads as an
      // outside click, which would close the search again immediately.
      h(Tooltip, {
        label: t('search.open'),
        shortcutKeys: searchKeys,
        side: 'bottom',
        delayMs: 500,
        disabled: searchOpen,
        children: h('button', {
          className: 'dwt-iconbutton',
          type: 'button',
          'aria-label': t('search.open'),
          'aria-expanded': searchOpen,
          onClick: () => {
            if (searchOpen) {
              onSearchFocus();
              return;
            }
            onSearchOpen(true);
          },
        }, h(IconSearchOutlineRegular, { size: searchOpen ? 11 : 14 })),
      }),
      searchOpen
        ? [
          h('input', {
            className: 'dwt-search',
            key: 'field',
            type: 'text',
            value: query,
            placeholder: t('search.placeholder'),
            'aria-label': t('search.open'),
            ref: searchRef,
            onChange: (event: ReactChangeEvent<HTMLInputElement>) => {
              onQuery(event.target.value);
            },
            onKeyDown: (event: ReactKeyboardEvent<HTMLElement>) => {
              if (event.key === 'Escape') {
                onQuery('');
                onSearchOpen(false);
              }
            },
          }),
          // Inside the capsule, the way the shipped header carries it: it never
          // reflows the row, and the field keeps the tabs' edge clear.
          h('button', {
            className: 'dwt-searchclear',
            key: 'clear',
            type: 'button',
            'aria-label': t('dismiss'),
            onClick: () => {
              onQuery('');
              onSearchOpen(false);
            },
          }, h(IconCloseFillRegular, { size: 12 })),
        ]
        : null),
    h('div', { className: searchOpen ? 'dwt-headactions dwt-headactions-hidden' : 'dwt-headactions' },
      canAdd
        ? h(Tooltip, {
          label: t('addWorkspace'),
          side: 'bottom',
          delayMs: 500,
          children: h('button', {
            className: 'dwt-iconbutton',
            type: 'button',
            'aria-label': t('addWorkspace'),
            onClick: onAdd,
          }, h(IconProjectAddOutlineRegular, { size: 16 })),
        })
        : null));
}

function WorkspaceTabs(props: Props): ReactElement {
  const {
    wide, expandSidebar, t, openSession, startSession, unarchiveSession, renderSlot,
    insertWorkspaceBefore,
    createWorkspace, searchSessions, useDirectoryFlow, useSearchRequest, useShortcuts,
    renameWorkspace, deleteWorkspace,
    useSessions, useSessionStatus, useWorkspaces, useStore, actions,
  } = props;
  const [tab, setTab] = useState<TabId>('workspaces');
  const [now, setNow] = useState(() => Date.now());
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [contentHits, setContentHits] = useState<ContentHits>(EMPTY_CONTENT_HITS);
  const [searching, setSearching] = useState(false);
  const [flowOpen, setFlowOpen] = useState(false);
  const [flowBusy, setFlowBusy] = useState(false);
  const [flowError, setFlowError] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const searchRootRef = useRef<HTMLDivElement | null>(null);
  const searchRequest = useSearchRequest(value => value);
  const searchKeys = useShortcuts(entries => entries.find(entry => entry.id === 'session.search')?.keys ?? []);
  useEffect(() => {
    if (searchRequest === 0) {
      return;
    }
    // The rail has no header to expand a field into, so a request from the
    // collapsed layout asks the shell for the wide one first. Deliberately not a
    // dependency of this effect: the shell rebuilds that callback every render,
    // and it is idempotent while the sidebar is already wide.
    expandSidebar();
    setSearchOpen(true);
  }, [searchRequest]);
  /**
   * The field only exists once the slot has expanded, so focus follows the open
   * state instead of the request that asked for it — focusing from the request
   * itself would run before React renders the input.
   */
  useEffect(() => {
    if (searchOpen) {
      searchInputRef.current?.focus();
    }
  }, [searchOpen, searchRequest, wide]);
  /**
   * Opening a result ends the search: the query clears and the header returns to
   * its tabs, so the row the Session appears in is what the list shows next.
   */
  const openHit = (sessionId: SessionId): void => {
    setQuery('');
    setContentHits(EMPTY_CONTENT_HITS);
    setSearchOpen(false);
    openSession(sessionId);
  };
  /**
   * Clicking away from the header dismisses an untouched search but leaves a
   * query standing: its results are what the click was reading.
   */
  useEffect(() => {
    if (!searchOpen) {
      return;
    }
    const onClick = (event: MouseEvent): void => {
      if (!(event.target instanceof Node) || !event.target.isConnected
        || searchRootRef.current?.contains(event.target) === true) {
        // A target that already left the document is the trigger this very click
        // just replaced, not a click outside.
        return;
      }
      searchInputRef.current?.blur();
      if (query.trim() !== '') {
        return;
      }
      setSearchOpen(false);
    };
    document.addEventListener('click', onClick);
    return () => {
      document.removeEventListener('click', onClick);
    };
  }, [searchOpen, query]);
  const [dragging, setDragging] = useState<{ readonly sessionId: SessionId; readonly account: string } | null>(null);
  const [dropAt, setDropAt] = useState<{ readonly id: SessionId; readonly after: boolean } | null>(null);
  const [draggingGroup, setDraggingGroup] = useState<string | null>(null);
  const [dropGroup, setDropGroup] = useState<string | null>(null);
  const [hover, setHover] = useState<HoverInfo | null>(null);

  const list = useSessions(state => state);
  const statuses = useSessionStatus(state => state);
  const snapshot = useWorkspaces(state => state);
  const view = useStore(state => state);

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, CLOCK_MS);
    return () => {
      clearInterval(timer);
    };
  }, []);

  /**
   * Host content search, debounced and superseded: every keystroke aborts the
   * request before it, and a failure resolves to "no content matches" so the
   * metadata matches already on screen stay put.
   */
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed === '') {
      setContentHits(EMPTY_CONTENT_HITS);
      setSearching(false);
      return;
    }
    const controller = new AbortController();
    setContentHits(EMPTY_CONTENT_HITS);
    setSearching(true);
    const timer = setTimeout(() => {
      searchSessions(trimmed, controller.signal)
        .then(page => {
          if (!controller.signal.aborted) {
            setContentHits(page);
          }
        })
        .catch(() => undefined)
        .finally(() => {
          if (!controller.signal.aborted) {
            setSearching(false);
          }
        });
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, searchSessions]);

  const archived = useMemo(() => new Set<SessionId>(snapshot.archivedSessionIds), [snapshot.archivedSessionIds]);
  const directoryFlow = useDirectoryFlow(value => value);
  /** Workspace titles by Session, for search matching and the row's place. */
  const workspaceTitles = useMemo(() => {
    const titles = new Map<SessionId, string>();
    for (const item of snapshot.items) {
      for (const id of item.sessionIds) {
        titles.set(id, item.title);
      }
    }
    return titles;
  }, [snapshot.items]);
  /** The Workspace each Session is accounted to, for the hover card's own three lines. */
  const workspaceBySession = useMemo(() => {
    const byId = new Map<SessionId, WorkspaceView>();
    for (const item of snapshot.items) {
      for (const id of item.sessionIds) {
        byId.set(id, item);
      }
    }
    return byId;
  }, [snapshot.items]);
  const current = useMemo(() => mainSessionId(list), [list]);
  const rows = useMemo(() => topRows(list, statuses, archived, current), [list, statuses, archived, current]);
  const nextGroups = useMemo(() => tab === 'workspaces'
    ? workspaceGroups(snapshot, rows, current, t('group.pinned'), t('ungrouped'), view)
    : statusGroups(rows, t, snapshot.pinnedSessionIds ?? [], t('group.pinned')),
  [tab, snapshot, rows, current, t, view.sessionOrder, view.orderBy]);
  const [interactions, setInteractions] = useState<ReadonlySet<string>>(() => new Set());
  const onInteraction = useCallback((key: string, active: boolean): void => {
    setInteractions(previous => {
      if (previous.has(key) === active) return previous;
      const next = new Set(previous);
      if (active) next.add(key); else next.delete(key);
      return next;
    });
  }, []);
  const heldGroups = useRef(nextGroups);
  const heldTab = useRef(tab);
  const locked = dragging !== null || draggingGroup !== null || interactions.size > 0;
  const groups = useMemo(() => {
    if (!locked || heldTab.current !== tab) return nextGroups;
    const latest = new Map(rows.map(row => [row.id, row]));
    return heldGroups.current.map(group => ({ ...group,
      rows: group.rows.flatMap(row => latest.has(row.id) ? [latest.get(row.id)!] : []),
    }));
  }, [locked, nextGroups, rows, tab]);
  useLayoutEffect(() => {
    if (!locked || heldTab.current !== tab) {
      heldGroups.current = nextGroups;
      heldTab.current = tab;
    }
  }, [locked, nextGroups, tab]);
  const layout = useMemo(() => layoutKeys(groups), [groups]);
  useEffect(() => { setHover(null); }, [layout.rows]);
  const attention = rows.some(row => row.state === 'input');

  const isOpen = (group: Group): boolean => view.groupExpansion[`${tab}:${group.key}`] ?? group.defaultOpen;
  const toggle = (group: Group): void => {
    const key = `${tab}:${group.key}`;
    actions.setGroupExpanded(key, !(view.groupExpansion[key] ?? group.defaultOpen));
  };

  /**
   * Commit a row drop as the account's complete manual order. The saved list is
   * the whole account, not just the visible slice, so a later drag cannot drop
   * rows it never saw.
   */
  const reorderSessions = (account: string, targetId: SessionId, after: boolean): void => {
    const source = dragging?.sessionId;
    setDragging(null);
    setDropAt(null);
    if (source === undefined || source === targetId || dragging?.account !== account) {
      return;
    }
    const order = (groups.find(group => group.key === account)?.rows ?? [])
      .map(row => row.id)
      .filter(id => id !== source);
    const at = order.indexOf(targetId);
    if (at < 0) {
      return;
    }
    order.splice(after ? at + 1 : at, 0, source);
    actions.setSessionOrder(account, order);
    actions.setOrderBy('manual');
  };

  const rowDndFor = (account: string, enabled: boolean): RowDnd => ({
    enabled,
    dragging: dragging?.sessionId,
    hint: id => (dragging?.account === account && dropAt?.id === id ? (dropAt.after ? 'after' : 'before') : undefined),
    start: id => {
      setDragging({ sessionId: id, account });
    },
    over: (id, after) => {
      if (dragging?.account !== account) return;
      setDropAt(current => (current?.id === id && current.after === after ? current : { id, after }));
    },
    drop: (id, after) => {
      reorderSessions(account, id, after);
    },
    end: () => {
      setDragging(null);
      setDropAt(null);
    },
  });

  /** Workspace order is Host-durable, so a drop is a registry write, not local state. */
  const moveWorkspace = (beforeKey: string): void => {
    const source = draggingGroup;
    setDraggingGroup(null);
    setDropGroup(null);
    if (source === null || source === beforeKey || beforeKey === UNGROUPED_ACCOUNT) {
      return;
    }
    void insertWorkspaceBefore(source as WorkspaceId, beforeKey as WorkspaceId).catch(() => {
      // A refused move leaves the Host order as it was; there is nothing local to undo.
    });
  };

  const groupDndFor = (group: Group): GroupDnd => ({
    enabled: group.workspaceId !== undefined,
    hint: draggingGroup !== null && dropGroup === group.key && draggingGroup !== group.key,
    start: () => {
      setDraggingGroup(group.key);
    },
    over: () => {
      setDropGroup(current => (current === group.key ? current : group.key));
    },
    drop: () => {
      moveWorkspace(group.key);
    },
    end: () => {
      setDraggingGroup(null);
      setDropGroup(null);
    },
  });

  if (!wide) {
    return h('div', { className: 'dwt-rail' },
      h('button', {
        className: 'dwt-rail-button',
        type: 'button',
        title: t('tab.workspaces'),
        'data-active': tab === 'workspaces',
        onClick: () => {
          setTab('workspaces');
          expandSidebar();
        },
      }, '▤'),
      h('button', {
        className: 'dwt-rail-button',
        type: 'button',
        title: t('tab.status'),
        'data-active': tab === 'status',
        'data-attention': attention,
        onClick: () => {
          setTab('status');
          expandSidebar();
        },
      }, '◷'));
  }

  const needle = query.trim().toLowerCase();
  /**
   * Metadata matches first (immediate, by recency), then the Host content page
   * (de-duplicated, keeping that page's snippet). The merged list is capped, and
   * either source having more than the cap is what the footer notice reports.
   */
  const search = needle === '' ? { hits: [] as SearchHit[], hasMore: false }
    : searchHits(list, statuses, archived, workspaceTitles, needle, contentHits, t('ungrouped'), SEARCH_LIMIT);

  /** Two skeleton rows on an empty list, one when local matches already show. */
  const skeleton = (): ReactElement => h('div', {
    key: 'pending',
    className: 'dwt-skeleton',
    role: 'status',
    'aria-label': t('search.pending'),
  }, (search.hits.length === 0 ? [0, 1] : [0]).map(index => h('div', {
    key: index,
    className: 'dwt-skeleton-row',
    'aria-hidden': true,
  },
  h('span', { className: 'dwt-skeleton-dot' }),
  h('span', { className: 'dwt-skeleton-bars' },
    h('span', { className: 'dwt-skeleton-bar' }),
    h('span', { className: 'dwt-skeleton-bar dwt-skeleton-bar-wide' })))));

  const body = needle !== ''
    ? [
      h('div', {
        key: 'hits',
        className: 'dwt-hits',
        role: 'tree',
        'aria-label': t('search.results'),
      }, search.hits.map(hit => h(SearchHitRow, {
        key: hit.id,
        hit,
        current: hit.id === current,
        t,
        openSession: openHit,
        unarchiveSession,
      }))),
      searching ? skeleton() : null,
      !searching && search.hits.length === 0
        ? h('div', { key: 'none', className: 'dwt-empty' }, t('search.empty'))
        : null,
      search.hasMore
        ? h('div', { key: 'more', className: 'dwt-hits-note' }, t('search.hasMore', { n: SEARCH_LIMIT }))
        : null,
    ]
    : list.phase === 'pending' && rows.length === 0
      ? h('div', { className: 'dwt-empty' }, t('loading'))
      : groups.length === 0
        ? h('div', { className: 'dwt-empty' }, t('empty'), h('br'), t('emptyHint'))
        : groups.map(group => h(Section, {
          key: group.key,
          group,
          holdLayout: locked,
          t,
          now,
          open: isOpen(group),
          onToggle: () => {
            toggle(group);
          },
          openSession,
          startSession,
          renderSlot,
          rowDnd: rowDndFor(group.key, group.draggable),
          groupDnd: groupDndFor(group),
          onHover: setHover,
          onInteraction,
          renameWorkspace,
          deleteWorkspace,
        }));

  /** The Workspace of the hovered Session, whose facts the card prints. */
  const hoveredWorkspace = hover === null ? undefined : workspaceBySession.get(hover.row.id);

  return h('div', { className: 'dwt-root' },
    h(Header, {
      tab,
      attention,
      t,
      onSelect: setTab,
      query,
      onQuery: setQuery,
      searchOpen,
      onSearchOpen: setSearchOpen,
      searchRef: (node: HTMLInputElement | null): void => {
        searchInputRef.current = node;
      },
      canAdd: directoryFlow,
      onAdd: () => {
        setFlowOpen(true);
      },
      searchKeys,
      onSearchFocus: () => {
        searchInputRef.current?.focus();
      },
      rootRef: (node: HTMLDivElement | null): void => {
        searchRootRef.current = node;
      },
    }),
    flowError === null ? null : h('div', { className: 'dwt-alert', role: 'alert' },
      t('addFailed'), ': ', flowError,
      h(Button, {
        size: 'sm',
        variant: 'ghost',
        onClick: () => {
          setFlowError(null);
        },
      }, t('dismiss'))),
    h(AnimatedList, {
      context: `${tab}:${wide}:${needle !== ''}:${JSON.stringify(view.groupExpansion)}`,
      layout: layout.nested,
      dragging: dragging !== null || draggingGroup !== null,
    }, body),
    // The picking interaction fills our own hole; the trigger above only shows
    // while it has an occupant, so an empty hole leaves no dead add affordance.
    renderSlot(FLOW_SLOT, {
      open: flowOpen,
      busy: flowBusy,
      onPicked: (path: string) => {
        setFlowBusy(true);
        void createWorkspace({ path })
          .then(workspace => {
            setFlowBusy(false);
            setFlowOpen(false);
            startSession(workspace.workspaceId);
          })
          .catch((reason: unknown) => {
            setFlowBusy(false);
            setFlowOpen(false);
            setFlowError(reason instanceof Error ? reason.message : String(reason));
          });
      },
      onCancel: () => {
        setFlowOpen(false);
      },
      onError: (message: string) => {
        setFlowOpen(false);
        setFlowError(message);
      },
    }),
    // The card is fixed-positioned from the hovered row's box, so the sidebar's
    // scroll container cannot clip it.
    hover === null ? null : h('div', {
      className: 'dwt-card',
      role: 'tooltip',
      style: { top: `${hover.top}px`, left: `${hover.left}px` },
    },
    h('div', { className: 'dwt-card-title' }, hover.row.blank ? t('row.newSession') : hover.row.title),
    h('div', { className: 'dwt-card-meta' },
      hoveredWorkspace === undefined ? null : `${hoveredWorkspace.title} · `,
      hover.row.pending !== undefined
        ? t(hover.row.pending === 'approval'
          ? 'pending.approval'
          : hover.row.pending === 'plan-review' ? 'pending.planReview' : 'pending.question')
        : t(hover.row.state === 'running' ? 'status.running' : 'status.idle'),
      ' · ',
      relativeTime(hover.row.updatedAt, now, t)),
    // The shipped card's own three lines for a Workspace: title, directory, and
    // the absolute creation instant. A Session row carries the Workspace it is
    // accounted to, which is the only creation time the client holds.
    hoveredWorkspace === undefined ? null : h('div', { className: 'dwt-card-path' }, hoveredWorkspace.path),
    hoveredWorkspace === undefined ? null : h('div', { className: 'dwt-card-created' },
      createdLabel(hoveredWorkspace.createdAt, t))));
}

/**
 * Shadowing entry: the shipped browser registers at the default priority 0, so
 * a lower priority wins the single slot. It declares its own two Session-row
 * seats rather than the shipped keys — a duplicate declaration throws, and the
 * renderer authorizes `renderSlot` per declaring entry — and the mirror
 * re-registers the shipped and third-party rows into those seats.
 */
export function apply(ctx: Context): void {
  ctx.effect(() => {
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = CSS;
    document.head.append(style);
    return () => style.remove();
  });
  ctx.effect(() => ctx.locale.register(NS, DICTIONARIES));

  // Our registration declares the two Session-row seats below, but the shipped
  // entries that belong in them live in a slot only the entry we shadow may
  // render. `createMirror` re-registers those components into our own seats, so
  // the shipped actions, their dialogs, and third-party rows all keep working.
  let hostReady = false;
  /** Published occupancy of our directory-flow hole; the add trigger reads it. */
  const directoryFlowStore = createSnapshotStore(false);
  /** Bumped by the host search command; the component opens and focuses the box. */
  const searchRequests = createSnapshotStore(0);
  const mirrors = [
    createMirror(ctx, 'sidebar.workspaces.session.menu.item', MENU_SLOT, () => hostReady),
    // The row keeps two controls — the menu trigger and Archive — so the
    // shipped pin button is dropped here; pinning stays reachable as the menu's
    // own Pin/Unpin row, which the mirror above still hosts.
    createMirror(ctx, 'sidebar.workspaces.session.row.action', ROW_ACTION_SLOT, () => hostReady, undefined, ['pin']),
    createMirror(ctx, 'sidebar.workspaces.directoryFlow', FLOW_SLOT, () => hostReady, count => {
      directoryFlowStore.set(count > 0);
    }),
  ];
  const syncMirrors = (): void => {
    // A mirror failure must degrade to "no mirrored rows", never take the
    // registration (and with it the whole region) down.
    try {
      for (const mirror of mirrors) {
        mirror.sync();
      }
    } catch {
      // createMirror already guards its own body; this is the last resort.
    }
  };
  ctx.effect(() => {
    const stops = [
      ctx.slots.subscribe('sidebar.workspaces.session.menu.item', syncMirrors),
      ctx.slots.subscribe('sidebar.workspaces.session.row.action', syncMirrors),
      ctx.slots.subscribe('sidebar.workspaces.directoryFlow', syncMirrors),
    ];
    return () => {
      for (const stop of stops) {
        stop();
      }
      for (const mirror of mirrors) {
        mirror.dispose();
      }
    };
  });

  // Persisted viewing state: expansion and manual session order survive a
  // reload, and the store seat is what lets the component read and write it.
  const viewStore = createViewStore();
  // Desktop dispatches native shortcuts through the host command registry.
  // Observe the shadowed browser's request source so custom bindings work too.
  ctx.effect(() => {
    let source: StoredEntry | undefined;
    let unsubscribe: (() => void) | undefined;
    const sync = (): void => {
      const next = ctx.slots.entries('sidebar.workspaces').find(entry =>
        entry.children?.['sidebar.workspaces.directoryFlow'] !== undefined);
      if (next === source) return;
      unsubscribe?.();
      unsubscribe = undefined;
      source = next;
      if (!next?.inject) return;
      const { hooks } = next.inject() as unknown as WorkspaceBrowserInjected;
      const requests = hooks.workspaceShortcuts;
      let seen = requests.getSnapshot().searchRequest;
      unsubscribe = requests.subscribe(() => {
        const current = requests.getSnapshot().searchRequest;
        if (current === seen) return;
        seen = current;
        searchRequests.set(searchRequests.getSnapshot() + 1);
      });
    };
    sync();
    const stop = ctx.slots.subscribe('sidebar.workspaces', sync);
    return () => { stop(); unsubscribe?.(); };
  });

  ctx.slots.inject('sidebar.workspaces', () => {
    const dispose = ctx.slots.register({
      name: 'sidebar.workspaces',
      priority: -1,
      locale: NS,
      store: viewStore,
      children: {
        [MENU_SLOT]: {
          kind: 'list',
          scope: 'root',
          // The shipped rows read `useMenuOpenState` and `useShortcuts`, so the
          // seat must declare the same factories the shipped slot declared.
          inject: {
            hooks: {
              menuOpenState: menuOpenStateFactory,
              shortcuts: ctx.shortcuts.catalog,
            },
          },
        },
        [ROW_ACTION_SLOT]: { kind: 'list', scope: 'root' },
        [FLOW_SLOT]: { kind: 'single', scope: 'root' },
      },
      inject: (): Injected => ({
        openSession: sessionId => ctx.uiWorkspace.openSession(sessionId),
        startSession: workspaceId => ctx.uiWorkspace.startSession(workspaceId),
        unarchiveSession: sessionId => ctx.uiWorkspace.unarchiveSession(sessionId),
        insertWorkspaceBefore: (workspaceId, beforeWorkspaceId) =>
          ctx.workspaces.insertBefore(workspaceId, beforeWorkspaceId),
        createWorkspace: input => ctx.workspaces.create(input),
        renameWorkspace: (workspaceId, title) => ctx.workspaces.rename(workspaceId, title),
        deleteWorkspace: workspaceId => ctx.workspaces.delete(workspaceId),
        searchSessions: async (query, signal) => {
          const result = await ctx.sessions.search(query, signal);
          return result.ok
            ? { items: result.value.items, hasMore: result.value.hasMore }
            : { items: [], hasMore: false };
        },
        hooks: { directoryFlow: directoryFlowStore, searchRequest: searchRequests, shortcuts: ctx.shortcuts.catalog },
      }),
    }, WorkspaceTabs);
    hostReady = true;
    syncMirrors();
    return () => {
      hostReady = false;
      for (const mirror of mirrors) {
        mirror.dispose();
      }
      dispose();
    };
  });
}
