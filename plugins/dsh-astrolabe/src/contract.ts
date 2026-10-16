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
export const MENU_SLOT = 'astrolabe.session.menu.item';
export const ROW_ACTION_SLOT = 'astrolabe.session.row.action';
/**
 * Our own copy of the directory-picking hole. The composed picker package fills
 * the shipped one, which only the entry we shadow may render, so "Add
 * workspace" needs its own hole and a mirrored occupant.
 */
export const FLOW_SLOT = 'astrolabe.directoryFlow';

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
  interface SlotMap {
    /** This plugin's own Session "..." menu: the shipped rows and third-party rows, re-hosted. */
    'astrolabe.session.menu.item': {
      kind: 'list';
      scope: 'root';
      owner: SessionRowOwnerProps;
      hookContext: MenuOpenState;
      inject: {
        hooks: {
          menuOpenState: SlotHookFactory<'astrolabe.session.menu.item', UseMenuOpenState>;
          shortcuts: HostObservable<readonly ShortcutCatalogEntry[]>;
        };
      };
    };
    /** This plugin's own Session row hover buttons, after the "..." trigger. */
    'astrolabe.session.row.action': {
      kind: 'list';
      scope: 'root';
      owner: SessionRowOwnerProps;
    };
    /** This plugin's own directory-picking hole, filled by the mirrored picker occupant. */
    'astrolabe.directoryFlow': {
      kind: 'single';
      scope: 'root';
      owner: DirectoryFlowOwnerProps;
    };
  }
}
