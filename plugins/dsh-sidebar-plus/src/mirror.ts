import type { Context } from '@deepseek-ai/cordis';
import type { LocaleNamespaceMap, SlotMap, StoredEntry } from '@deepseek-ai/dsh-client-ui-slots';
import type { WorkspaceBrowserInjected } from '@deepseek-ai/dsh-client-ui-workspace/client';
import { createElement, useState } from 'react';
import type { ComponentType, ReactNode } from 'react';

export const NATIVE_SLOT = 'sidebar-plus.nativeWorkspaces';

/**
 * Re-host the shipped browser with its original store handle, inject factory,
 * locale, and component. The renderer reference-counts a root store handle,
 * so both registrations share the host's existing instance. Each child gets
 * a private alias to preserve authorization without redeclaring a host slot.
 */
export function createNativeBrowser(ctx: Context, ready: () => boolean, onReady: (ready: boolean) => void): Mirror {
  let source: StoredEntry | undefined;
  let remove: (() => void) | undefined;
  let mirrors: Mirror[] = [];
  let stops: (() => void)[] = [];
  let available = false;
  const publish = (next: boolean): void => {
    if (available === next) return;
    available = next;
    onReady(next);
  };
  const clear = (): void => {
    for (const stop of stops) stop();
    stops = [];
    for (const mirror of mirrors) mirror.dispose();
    mirrors = [];
    remove?.();
    remove = undefined;
    source = undefined;
    publish(false);
  };
  return {
    sync(): void {
      const next = ready() ? ctx.slots.entries('sidebar.workspaces').find(entry =>
        entry.children?.['sidebar.workspaces.directoryFlow'] !== undefined) : undefined;
      if (next === source) {
        for (const mirror of mirrors) mirror.sync();
        return;
      }
      clear();
      if (next === undefined) return;
      const children = Object.entries(next.children ?? {});
      // The alias registrations and the shared store stay on the root scope.
      if (children.some(([, spec]) => spec.scope !== 'root' || spec.kind === 'chain')) return;
      const aliases = new Map(children.map(([key]) => [key, `sidebar-plus.native.${key}`]));
      type Render = (key: string, owner: unknown, opts?: unknown) => ReactNode;
      type ShortcutState = ReturnType<WorkspaceBrowserInjected['hooks']['workspaceShortcuts']['getSnapshot']>;
      type ShortcutHook = <T>(select: (state: ShortcutState) => T) => T;
      type NativeProps = Record<string, unknown> & { renderSlot: Render; useWorkspaceShortcuts?: ShortcutHook };
      const Native = next.component as ComponentType<NativeProps>;
      const Host = ({ renderSlot, useWorkspaceShortcuts, searchOnMount, ...props }: NativeProps): ReactNode => {
        const shortcuts = useWorkspaceShortcuts?.(state => state);
        // The host treats every nonzero counter as a request on mount. Skip
        // requests already delivered to an earlier view, except a rail request
        // that expanded this view and is still waiting for its search field.
        const [baseline] = useState(() => (shortcuts?.searchRequest ?? 0) - (searchOnMount ? 1 : 0));
        return createElement(Native, {
          ...props,
          useWorkspaceShortcuts: shortcuts && (select => select({
            ...shortcuts, searchRequest: shortcuts.searchRequest - baseline,
          })),
          renderSlot: (key, owner, opts) => {
            const alias = aliases.get(key);
            if (alias === undefined) throw new Error(`Native Workspaces requested an undeclared child: ${key}`);
            return renderSlot(alias, owner, opts);
          },
        });
      };
      // The source is a runtime ledger entry; keep type erasure at this foreign
      // entry boundary. register() still validates every declaration and store.
      const register = ctx.slots.register.bind(ctx.slots) as unknown as (options: object, component: unknown) => () => void;
      try {
        remove = register({
          name: NATIVE_SLOT,
          store: next.store,
          inject: next.inject,
          locale: next.locale,
          children: Object.fromEntries(children.map(([key, spec]) => [aliases.get(key)!, spec])),
        }, Host);
        source = next;
        mirrors = children.map(([key]) => createMirror(ctx,
          key as keyof SlotMap & string, aliases.get(key)! as keyof SlotMap & string, () => ready() && remove !== undefined));
        const sync = (): void => { for (const mirror of mirrors) mirror.sync(); };
        stops = children.map(([key]) => ctx.slots.subscribe(key as keyof SlotMap & string, sync));
        stops.push(ctx.slots.onEntryError((key, entry, _error, info) => {
          if (key !== NATIVE_SLOT || !info.abdicated || entry.component !== Host) return;
          // A child-slot update should not retry the same incompatible browser.
          // Its replacement or the next sidebar declaration can try again.
          publish(false);
        }));
        sync();
        publish(true);
      } catch (error) {
        clear();
        console.warn('Sidebar Plus could not mount native Workspaces:', error);
      }
    },
    dispose: clear,
  };
}

/** One target slot's mirrored entries, reconciled against its source slot. */
export interface Mirror {
  /** Re-read the source slot's projected entries and reconcile the target. */
  sync(): void;
  /** Drop every mirrored entry. */
  dispose(): void;
}

/** Bookkeeping key for a single-slot occupant, which carries no id. */
const SINGLE_ENTRY_KEY = '__single__';

/**
 * Re-host another entry's list contributions into a slot this plugin declares.
 *
 * A replacing registration may not render the child slots the entry it shadows
 * declared, so the shipped Session menu and its third-party rows are
 * unreachable from our own components. `entriesOfSlot` is a public read whose
 * `StoredEntry` type is exported, so the supported way back is to re-register
 * those components into a slot we declare: the renderer then composes their
 * props, entry inject face, slot-level hook context, and error boundary exactly
 * as it does for the original slot.
 *
 * Entries that declare `children` or a `store` are skipped — re-registering
 * them would either collide with a declaration that already exists or move a
 * store seat onto a different lifecycle.
 *
 * @param ctx - client root context.
 * @param source - the slot owned by the shadowed entry.
 * @param target - the slot this plugin declared in its own `children`.
 * @param ready - whether the target is declared yet; registration before that throws.
 * @param onSynced - notified with the mirrored count after every sync, so the
 *   owner can publish occupancy (a `single` hole decides whether its trigger
 *   renders at all).
 * @param exclude - source entry ids this target must not host: an action that
 *   belongs in the row's menu instead of beside its title is dropped here and
 *   stays reachable as its own menu row.
 * @returns the mirror handle.
 */
export function createMirror<
  Source extends keyof SlotMap & string,
  Target extends keyof SlotMap & string,
>(
  ctx: Context,
  source: Source,
  target: Target,
  ready: () => boolean,
  onSynced?: (count: number) => void,
  exclude?: readonly string[],
): Mirror {
  const blocked = new Set(exclude ?? []);
  const live = new Map<string, { readonly source: StoredEntry; readonly dispose: () => void }>();
  /**
   * `register`'s option type resolves through conditional branches on the target
   * key, which cannot be satisfied while that key is still a type parameter.
   * The mirror is already a foreign-entry boundary, so it widens the call here
   * and lets the runtime `register` — which validates its own options — do the
   * checking.
   */
  const registerUntyped = ctx.slots.register.bind(ctx.slots) as unknown as (
    options: object,
    component: unknown,
  ) => () => void;
  const clear = (): void => {
    for (const entry of live.values()) {
      entry.dispose();
    }
    live.clear();
    onSynced?.(0);
  };
  return {
    sync(): void {
      if (!ready()) {
        clear();
        return;
      }
      let entries: readonly StoredEntry[];
      try {
        entries = ctx.slots.entriesOfSlot(source);
      } catch {
        clear();
        return;
      }
      const seen = new Set<string>();
      try {
        for (const entry of entries) {
          const id = entry.options.id;
          const order = entry.options.order ?? 0;
          // A single slot's occupant carries no id; a list entry without one
          // cannot name a cell, and an entry with children or a store seat
          // would either collide with a declaration or move a lifecycle.
          if (entry.children !== undefined || entry.store !== undefined) {
            continue;
          }
          if (id !== undefined && blocked.has(id)) {
            continue;
          }
          const key = id ?? SINGLE_ENTRY_KEY;
          seen.add(key);
          const current = live.get(key);
          if (current !== undefined && current.source === entry) {
            continue;
          }
          current?.dispose();
          live.set(key, {
            source: entry,
            dispose: registerUntyped({
              name: target,
              order,
              ...entry.options.label === undefined ? {} : { label: entry.options.label },
              ...id === undefined ? {} : { id },
              // `locale` is read back as a plain string, so it narrows to the
              // merged namespace union by assertion; `inject` is already typed
              // as the erasure the ledger stores, and an entry that declared
              // none still needs the mandatory factory.
              ...entry.locale === undefined
                ? {}
                : { locale: entry.locale as keyof LocaleNamespaceMap & string },
              inject: entry.inject ?? (() => ({})),
            }, entry.component),
          });
        }
        for (const [key, entry] of [...live]) {
          if (!seen.has(key)) {
            entry.dispose();
            live.delete(key);
          }
        }
      } catch {
        // A ledger shape change must degrade to "no mirrored rows" rather than
        // take the whole region down with it.
        clear();
      }
      onSynced?.(live.size);
    },
    dispose: clear,
  };
}
