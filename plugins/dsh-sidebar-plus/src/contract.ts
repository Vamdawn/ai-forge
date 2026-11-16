import type { HTMLAttributes } from 'react';
import type { HostObservable, SlotHookFactory } from '@deepseek-ai/dsh-client-ui-slots';
import type { ShortcutCatalogEntry } from '@deepseek-ai/dsh-client-shortcuts/client';
import type {
  DirectoryFlowOwnerProps,
  MenuOpenState,
  SessionRowOwnerProps,
  UseMenuOpenState,
} from '@deepseek-ai/dsh-client-ui-workspace/client';

/**
 * The two child slots this plugin declares for its own Session rows.
 *
 * They exist because a replacing registration cannot render the child slots the
 * entry it shadows declared: `renderSlot` is authorized per declaring entry
 * (`entry.children?.[key]` must exist), and the shipped browser already declared
 * `sidebar.workspaces.session.menu.item` / `.row.action`, so these cannot be
 * re-declared under their own names. Declaring our own keys gives the renderer
 * a cell it may compose, and the mirror in `mirror.ts` re-registers the shipped
 * and third-party contributions into it.
 */
export const MENU_SLOT = 'sidebar-plus.session.menu.item';
export const ROW_ACTION_SLOT = 'sidebar-plus.session.row.action';
export const ROW_TRAILING_SLOT = 'sidebar-plus.session.row.trailing';
export const ROW_HOVER_SLOT = 'sidebar-plus.session.row.hover';

export interface SessionMenuTarget {
  readonly kind: 'session';
  readonly value: SessionRowOwnerProps;
}

type RowTriggerHandlers = Pick<HTMLAttributes<HTMLDivElement>, 'onContextMenu' | 'onKeyDown'>;
export interface SessionContextMenu {
  getTriggerProps(target: SessionMenuTarget, handlers: RowTriggerHandlers): RowTriggerHandlers;
}
/**
 * Our own copy of the directory-picking hole. The composed picker package fills
 * the shipped one, which only the entry we shadow may render, so "Add
 * workspace" needs its own hole and a mirrored occupant.
 */
export const FLOW_SLOT = 'sidebar-plus.directoryFlow';

/** The newer sidebar shell coordinates wheel scrolling with its active section. */
export type UseSectionScroller = () => { bindScrollerRef(element: HTMLElement | null): void };

/**
 * The slot-level hook factories the shipped menu declares. Entries read
 * `useMenuOpenState()` to dismiss the menu they sit in, and the renderer binds
 * it per occurrence from the `hookContext` passed at the render site — a slot
 * that declares a factory but renders without `hookContext` throws
 * `SlotAssemblyError`, so the two must stay paired.
 */
export const menuOpenStateFactory: SlotHookFactory<typeof MENU_SLOT, UseMenuOpenState> =
  (_standard, hookContext) => () => hookContext;

declare module '@deepseek-ai/dsh-client-ui-slots' {
  // The context-menu factory is supplied by newer hosts at runtime.
  interface SlotFactoryMap {
    'contextMenu.button': {
      scope: 'root';
      props: { target: SessionMenuTarget; label: string; className: string };
    };
  }
  interface SlotMap {
    'sidebar.session.row.trailing': {
      kind: 'list';
      scope: 'root';
      owner: Pick<SessionRowOwnerProps, 'sessionId'>;
    };
    /** Official browser, with its own store and remapped child seats. */
    'sidebar-plus.nativeWorkspaces': {
      kind: 'single';
      scope: 'root';
      owner: { wide: boolean; expandSidebar: () => void; useSectionScroller?: UseSectionScroller };
    };
    /** This plugin's own Session "..." menu: the shipped rows and third-party rows, re-hosted. */
    'sidebar-plus.session.menu.item': {
      kind: 'list';
      scope: 'root';
      owner: SessionRowOwnerProps;
      hookContext: MenuOpenState;
      inject: {
        hooks: {
          menuOpenState: SlotHookFactory<'sidebar-plus.session.menu.item', UseMenuOpenState>;
          shortcuts: HostObservable<readonly ShortcutCatalogEntry[]>;
        };
      };
    };
    /** This plugin's own Session row hover buttons, after the "..." trigger. */
    'sidebar-plus.session.row.action': {
      kind: 'list';
      scope: 'root';
      owner: SessionRowOwnerProps;
    };
    'sidebar-plus.session.row.trailing': {
      kind: 'list';
      scope: 'root';
      owner: Pick<SessionRowOwnerProps, 'sessionId'>;
    };
    'sidebar-plus.session.row.hover': {
      kind: 'list';
      scope: 'root';
      owner: Pick<SessionRowOwnerProps, 'sessionId'>;
    };
    /** This plugin's own directory-picking hole, filled by the mirrored picker occupant. */
    'sidebar-plus.directoryFlow': {
      kind: 'single';
      scope: 'root';
      owner: DirectoryFlowOwnerProps;
    };
  }
}
