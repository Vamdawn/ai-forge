# @vamdawn/dsh-astrolabe

English | [简体中文](README.zh-CN.md)

[![npm version](https://img.shields.io/npm/v/@vamdawn/dsh-astrolabe.svg)](https://www.npmjs.com/package/@vamdawn/dsh-astrolabe)

**Astrolabe** takes over the session region of the DeepSeek Harness sidebar and puts a tab strip on top of it, so one sidebar browses the same sessions along two axes: **Workspaces** or **status**. The shipped sidebar gives that region to a single view; here the second axis is one click away without navigating anywhere.

Experimental (0.1.0), tested with DeepSeek Harness client packages `0.2.0-rc.2` and Cordis `4.0.4`. The plugin depends on the shipped workspace browser's slot contracts, so other host versions are not guaranteed to work.

## Install

### From npm

```sh
dsh plugin --profile desktop add @vamdawn/dsh-astrolabe
```

Use `--profile web` for a Web profile, and reload the client afterwards.

### From a source checkout

```sh
cd plugins/dsh-astrolabe
npm ci --ignore-scripts
npm run typecheck
npm run build
cd ../..
```

Then install the directory into your active profile (typically `desktop` or `web`):

```sh
dsh plugin --profile <profile> add "$PWD/plugins/dsh-astrolabe"
```

Installation links the local directory, so keep it and its `dist/` artifacts available and rebuild after changing source files. **Reload the client page** after installing or rebuilding: the Host loads the bundle, but the browser evaluates a Client half only on load. If the macOS Desktop CLI is not on PATH, use:

```sh
"/Applications/DeepSeek Harness.app/Contents/Resources/runtime/cli/bin/dsh"
```

To uninstall:

```sh
dsh plugin --profile <profile> remove @vamdawn/dsh-astrolabe
```

## Usage

- **Workspaces** groups sessions by registered Workspace, then Ungrouped; **Status** groups them by Needs input, Working, and Completed. Both tabs open with a **Pinned** section while anything is pinned, and a pinned session leaves the section it would otherwise sit in. Each status section carries its own state's mark; Working's arc stays still while its rows carry the animated loader.
- Sections collapse, and Workspace menus show their section counts. Completed stays folded and reveals 20 more rows per press, unseen completions first.
- Search matches titles and Workspace names immediately, then adds debounced conversation matches with snippets. It follows the host `session.search` binding (⌘K / Ctrl+K by default, including custom keys); the plugin registers no duplicate shortcut. Archived results restore from their row action.
- A Session row carries a mark only where it needs attention: waiting on you, working — its own turn or a delegation it started — or a completed turn you have not opened. Blank and idle rows leave the leading cell empty.
- Subagent sessions nest under the session that spawned them and open on click, newest activity first, titled by their delegation label and printing their own time. The layer appears while that Session is working, has a delegation running, or owes a look, and shows five rows at a time — a running delegation is never the one left out.
- Hovering a Session adds its Workspace name, directory, and when that Workspace was created.
- Rows keep the host and third-party session menu actions, including pin, unpin, and archive. The native directory picker adds a Workspace or opens a new session; Workspace menus offer rename and remove.
- Sessions and Workspace groups can be dragged to reorder. Automatic reordering animates (200ms within a group, 240ms for nearby cross-group moves, 120ms fades), and reduced-motion preferences are respected.
- The 56px rail renders when the sidebar is collapsed. Plugin copy ships in Chinese and English.

## Limitations

- `sidebar.session.row.leading` and `sidebar.session.row.hover` are not re-hosted, so the scheduled-task clock mark and the hover card's task section stay absent; there is no archived filter and no copy action.
- An archived search result must be restored before opening, and a failed restore shows inline so it can be retried.
- A session drag switches to a saved manual order with no control to return to recent-activity order, and drops reorder only within the same group.
- Workspace groups reveal five idle sessions at a time; running, pending-input, and selected blank sessions do not consume that quota.
- The nested layer carries subagent sessions only: the running turn, background jobs, and scheduled reminders stay out of the sidebar.
- A Session shows five nested rows at a time, so delegations beyond them are reachable only from the host's own subagent menu in the session header.
- The rail uses placeholder glyphs rather than the shipped icon set.
- Full native drag-and-drop is unverified: automation triggered `dragstart` but never completed a reliable `drop`. Web and non-macOS platforms have not been validated live.

## Development

```sh
cd plugins/dsh-astrolabe
npm ci --ignore-scripts
npm run typecheck
npm test
```

`npm test` builds the real Client bundle, then runs the React interaction, model, motion, and mirror tests against the installed slot registry; live Desktop pointer, layout, and picker behaviour still needs a manual pass.

Sources: `src/client.tsx` components and registration, `src/model.ts` projection and search, `src/motion.ts` animation, `src/mirror.ts` foreign-entry mirroring, `src/store.ts` view state, `src/index.ts` Host entry, `tests/` regression checks.

## Links

- [CHANGELOG.md](CHANGELOG.md) — release notes.
- [LICENSE](LICENSE) — MIT.
- [Repository release rules](https://github.com/Vamdawn/ai-forge/blob/main/docs/versioning-and-release.md) — how versions and tags are cut.
