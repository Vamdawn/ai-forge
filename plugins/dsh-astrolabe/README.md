# @vamdawn/dsh-astrolabe

**Astrolabe** is a tabbed left sidebar for DeepSeek Harness: one sidebar region, two axes over the same Sessions (**Workspaces** / **Status**). The shipped sidebar devotes its whole browsing region to one view; this plugin takes over that region and puts a tab strip at its top, so a second axis of the same session data — for example grouping sessions by **status** instead of by **Workspace** — becomes one click away without navigating anywhere.

> **Status: experimental (0.1.0).** Tested with DeepSeek Harness client packages `0.2.0-rc.2` and Cordis `4.0.4`. This plugin depends on the shipped workspace browser’s slot contracts; compatibility with other host versions is not guaranteed. Read [Current limitations](#current-limitations) before installing.

Release notes are in [CHANGELOG.md](CHANGELOG.md).

## What it does today

- Replaces `sidebar.workspaces` by registering a lower-priority occupant, so the shipped browser stops rendering in that region while its own registration stays on the ledger.
- Renders a tab strip with two tabs: **Workspaces** (sessions grouped by registered Workspace, then Ungrouped) and **Status** (Needs input / Working / Completed). Both tabs open with a **Pinned** section while anything is pinned, and a pinned Session leaves the section it would otherwise sit in rather than appearing twice.
- Nests the subagent Sessions a running Session spawned, each clickable to open it.
- Collapsible sections: Pinned, Needs input, and Working open by default; Completed stays folded and reveals 20 more rows per press with unseen completions first. Workspace menus show their section counts.
- Labels the three pending-interaction kinds separately (approval, plan review, answer) and badges the Status tab while any Session waits.
- Renders the 56px rail form when the sidebar is collapsed.
- Provides Chinese and English plugin copy.
- Searches titles and Workspace names immediately, then adds debounced conversation-content matches. Results include snippets and archived-session restore actions.
- Reuses the native directory picker to add Workspaces and open a new Session; Workspace menus offer rename and remove.
- Preserves compatible host and third-party Session menu actions, including pin/unpin and archive.
- Animates automatic reordering: 200ms within a group, 240ms for nearby cross-group moves, and 120ms fades for distant or hidden destinations. Consecutive updates replace the active animation; dragging and open menus hold layout stable. Reduced-motion preferences are respected.

Rows open their Session through `ctx.uiWorkspace.openSession`. Status comes from `useSessionStatus` (`running`, `pendingInteraction`, `completionUnread`); the list, subagent projection, and grouping come from `useSessions` and `useWorkspaces`. The region opens no additional Host session-data stream.

## Integration details

The replacement preserves the host services while taking ownership of the browsing region.

1. **A lower `priority` wins a `single` slot.** `sidebar.workspaces` is `single`, and `SlotCore` only rejects a duplicate registration at the *same* priority, so `priority: -1` shadows the shipped browser at `0`. This is a documented, typed option ("Cell shadowing rank (ascending, default 0, lowest renders)").

2. **A replacing entry may not render the child slots the entry it shadows declared.** The renderer authorizes `renderSlot` per declaring entry:

   ```js
   const declared = entry.children?.[key]
   if (declared === void 0) throw new SlotOwnershipError(`slot '${key}' is not declared by this entry's children`)
   ```

   A replacing entry cannot declare those children either, because `SlotCore.register` rejects a child that is already declared. So `renderSlot` is absent from a bare replacing registration, and the shipped per-row actions (`sidebar.workspaces.session.menu.item`, `sidebar.workspaces.session.row.action`, `sidebar.session.row.leading`, `sidebar.session.row.hover`) start out unreachable — **including third-party contributions into them**, such as `@vamdawn/dsh-rename-session`.

   This plugin resolves the two action seats by declaring its own list slots and re-hosting the foreign entries into them (see `src/mirror.ts`): `entriesOfSlot` is a public read that returns the ledger's exported `StoredEntry`, so the shipped rows, their dialogs, and third-party rows all work again. The two remaining seats stay unreachable.

3. **A failed renderer entry abdicates instead of breaking the page.** The first revision called `renderSlot` unconditionally; the resulting throw retired the entry and the shipped browser returned, which is why the failure was visible only as `active: false` in the slot inspector. Replacing UI therefore fails safe.

4. **The region receives the host’s owner props.** `SidebarSectionOwnerProps` is only `wide` and `expandSidebar`; everything else is business data through the framework's global hooks and the plugin's own `inject` face.

## Choosing the trade-off

| Route | How | Third-party row actions | Shipped dialogs and toasts |
|-------|-----|------------------------|----------------------------|
| Shadow the region (this plugin) | `priority: -1`, declare private child slots and mirror compatible entries | Menu and row actions kept; annotation seats unavailable | Keep working: they live in `shell.overlay` |
| Own the region and its child slots | Disable the shipped browser entry, then declare those children here | Kept — they re-register once the declaration exists | Must be reimplemented |

**The second route is not the cheap fix it looks like.** `ui-workspace` is where the shipped browser is registered, but it is *also* the provider of the `uiWorkspace` **service** — and `ui-sidebar` lists `uiWorkspace` in its hard `inject` array:

```js
const inject = ['slots', 'layout', 'uiWorkspace', 'locale', 'shortcuts']
// ...
const workspaceNavigation = ctx.get('uiWorkspace')
startSession: workspaceId => { workspaceNavigation.startSession(workspaceId) }
```

Disabling that entry therefore stops the sidebar shell itself from activating - the brand row, New Session, panel rows, and the Settings seat all go with it. Taking the second route means **reimplementing the `UiWorkspace` service** (twelve methods plus the private main-view reference lifecycle that `openSession`, `openWorkspace`, and `startSession` depend on), not merely declaring five child slots.

So shadowing the region costs the shipped row actions *and* every third-party contribution into `sidebar.workspaces.session.menu.item` / `sidebar.workspaces.session.row.action` **unless they are re-hosted**, which is what the mirror does. The two annotation seats (`sidebar.session.row.leading`, `sidebar.session.row.hover`) are not re-hosted, so the scheduled-task clock mark stays absent.

## Installation

### From npm

With DeepSeek Harness installed, choose your active profile (`desktop` is typical):

```sh
dsh plugin --profile desktop add @vamdawn/dsh-astrolabe@0.1.0
```

Reload the client after installation. Node.js 24 or newer is required for source development.

### From a source checkout

Build the local checkout first. From the repository root:

```sh
cd plugins/dsh-astrolabe
npm install --ignore-scripts
npm run typecheck
npm run build
cd ../..
```

Then replace `<profile>` with your active profile name (typically `desktop` or `web`):

```sh
dsh plugin --profile <profile> add "$PWD/plugins/dsh-astrolabe"
```

Installation links the local directory, so keep it and its `dist/` artifacts available, and rebuild after changing source files. **Reload the client page** after installing or rebuilding: the Host loads the bundle, but the browser only evaluates a Client half on load. If the macOS Desktop CLI is not on PATH, use:

```sh
"/Applications/DeepSeek Harness.app/Contents/Resources/runtime/cli/bin/dsh"
```

To uninstall:

```sh
dsh plugin --profile <profile> remove @vamdawn/dsh-astrolabe
```

## Current limitations

- Session rows carry the re-hosted "..." menu and hover buttons. `sidebar.session.row.leading` and `.hover` are not re-hosted, so the scheduled-task clock mark and the hover-card task section stay absent.
- Archived search results must be restored with their row action before opening. Restore failures are shown inline and can be retried.
- No archived filter, no hover-card copy action, and no workspace-tree nesting. Search follows the host `session.search` binding (default ⌘K / Ctrl+K), including custom keys; this plugin does not register a duplicate fixed shortcut.
- Workspaces can be renamed and removed from their section header; a removal never deletes the directory or its Session logs.
- Sessions and Workspace groups can be dragged to reorder, but the Pinned section follows pin recency and the Status tab is never reordered.
- The nested layer carries subagent Sessions only; the running turn, background jobs, and scheduled reminders stay out of the sidebar by design.
- Workspace groups reveal five idle Sessions at a time; running, pending-input, and selected blank Sessions do not consume that quota. Empty Workspace headers remain available for management.
- A Session drag activates saved manual order; there is currently no control to switch back to recent-activity order. Drops reorder only within the same group.
- The rail uses placeholder glyphs rather than the shipped icon set.

## Verification scope

On macOS DeepSeek Harness Desktop, search focus, repeated search shortcuts, collapsed-sidebar expansion, query replacement, result selection, and native directory selection/cancellation were checked. Pin/unpin was exercised on a real Session and restored.

Cross-status movement and three updates 80ms apart were sampled in the real Desktop WebView using temporary synthetic Sessions and the production animation component: at most one position animation per row, with no remaining animation or visual clone at the end. The temporary UI is not included in the package.

**Full native drag-and-drop remains unverified:** automation triggered `dragstart` but did not complete a reliable `drop`. Regression tests cover same-group ordering, cross-group rejection, cancellation, and stable targets during Host updates. Web and other operating systems have not received the same live validation.

## Development

- `npm run typecheck` — host and client programs.
- `npm test` — builds the actual Client bundle, then runs React interaction tests, pure model and motion tests, and mirror tests against the installed slot registry. These checks do not replace live Desktop pointer, layout, and picker validation.
- `npm run build` — writes `dist/index.js` and `dist/client.js` with esbuild. The Client half is wrapped for the Desktop module loader, so shared packages stay external and React and Cordis resolve to the platform's existing instances.

## Source layout

- `src/client.tsx` — sidebar components, interactions, and plugin registration.
- `src/model.ts` — session projection, grouping, ordering, and search merging.
- `src/motion.ts` — list position snapshots, transitions, cancellation, and reduced-motion handling.
- `src/styles.ts` — sidebar styles, injected and removed with the plugin.
- `src/mirror.ts` / `src/contract.ts` — foreign-entry mirroring and private slot contracts.
- `src/store.ts` / `src/locales.ts` — persisted view state and translations.
- `src/index.ts` — Host entry; `tests/` — regression checks.
