import type { Context } from '@deepseek-ai/cordis';
import type { LocaleNamespaceMap, SlotMap, StoredEntry } from '@deepseek-ai/dsh-client-ui-slots';

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
