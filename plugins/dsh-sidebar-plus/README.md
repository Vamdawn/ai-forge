# @vamdawn/dsh-sidebar-plus

English | [简体中文](README.zh-CN.md)

[![npm version](https://img.shields.io/npm/v/@vamdawn/dsh-sidebar-plus.svg)](https://www.npmjs.com/package/@vamdawn/dsh-sidebar-plus)

Sidebar Plus — tabbed session sidebar for DeepSeek Harness: a Workspaces tab and a status-grouped Sessions tab

It takes over the session region of the shipped sidebar and puts a tab strip on top, so one sidebar browses the same sessions along two axes — **Workspaces** or **status** — without navigating anywhere. It is for DeepSeek Harness users who want both groupings at once.

Status: experimental (`0.x`), tested against DeepSeek Harness client packages `0.2.0-rc.2` and Cordis `4.0.4`. A `0.x` release carries no stability promise, and the plugin's public surface is the host slot contract it depends on — the shipped workspace browser's own slots — so a host update can break it. Earlier releases shipped as `@vamdawn/dsh-astrolabe`; the commands below use the new package name.

## Install

### From npm

```sh
dsh plugin --profile desktop add @vamdawn/dsh-sidebar-plus
```

Use `--profile web` for a Web profile.

### From a source checkout

```sh
cd plugins/dsh-sidebar-plus
npm ci --ignore-scripts
npm run build
```

Then install that directory into your active profile, typically `desktop` or `web`:

```sh
dsh plugin --profile <profile> add "$PWD/plugins/dsh-sidebar-plus"
```

The install links the directory, so keep it and its `dist/` in place and rebuild after changing source files. If the macOS Desktop CLI is not on PATH, use:

```sh
"/Applications/DeepSeek Harness.app/Contents/Resources/runtime/cli/bin/dsh"
```

### After installing

Reload the client page. The Host loads the bundle, but a browser evaluates a Client half only on load.

### Upgrading

A `0.x` range does not cross the minor, so a profile installed at `0.3.0` keeps running it until the new version is installed explicitly:

```sh
dsh plugin --profile desktop add @vamdawn/dsh-sidebar-plus
```

### Uninstalling

```sh
dsh plugin --profile <profile> remove @vamdawn/dsh-sidebar-plus
```

The earlier `@vamdawn/dsh-astrolabe` install is removed the same way. Remove it before adding this package, because both claim the same sidebar slot.

## Usage

- **Workspaces** groups sessions by registered Workspace, then Ungrouped; **Status** groups them in order: Working (running or waiting for subagent/background work), Waiting (human input or approval), Done (a finished turn with an unseen result), and Idle (no active work or unseen result). Human requests take precedence over active work, and opening a completed Session moves it from Done to Idle.
- Both tabs open with a **Pinned** section while anything is pinned, and a pinned session leaves the section it would otherwise sit in.
- Status groups use semibold text headings aligned with Session titles and extra space between groups, without heading icons or collapse controls. Only working rows animate; waiting rows use an amber circled exclamation, unseen completed results carry a green dot, and blank/idle rows keep the leading cell empty.
- Workspace sections collapse, and their menus show session counts. Their overflow control reveals another batch, then offers to fold back once all rows are visible. Status sections always stay open, including Idle; each starts with 50 rows and reveals up to 50 more per press until all rows are visible, without a fold-back action.
- Search matches titles and Workspace names immediately, then adds debounced conversation matches with snippets. It follows the host `session.search` binding (⌘K / Ctrl+K by default, including custom keys); the plugin registers no duplicate shortcut. Archived results restore from their row action.
- Subagent sessions nest under their parent with vertical and elbow connectors, newest activity first. They open on click, use their delegation label, and show their own time.
- That layer appears while a Session is working, waiting on input, or owes a look, and fills up to five rows; running and waiting delegations are always retained.
- Hovering a Session adds its Workspace name, directory, and when that Workspace was created.
- Workspaces follows the shipped browser’s 34px Workspace headers and 32px Session rows, single-line titles, hover chevrons/actions, and selected-row fill. Rows keep host and third-party menu actions; the native directory picker adds Workspaces, and Workspace removal uses the host’s modal instead of inserting a confirmation into the list.
- Sessions and Workspace groups can be dragged to reorder, with automatic reordering animated and reduced-motion preferences respected.
- The 56px rail renders when the sidebar is collapsed.
- Plugin copy ships in Chinese and English.

## Limitations

- Workspaces uses a separate renderer matched to host package `0.2.0-rc.2`; the host exposes the entire browser as one slot, so it cannot embed just the native Workspace list. The shipped browser's view options are not re-hosted: its grouping modes are gone, there is no archived filter, and there is no copy action. The scheduled-task clock mark and the hover card's task section are absent too.
- An archived search result must be restored before opening, and a failed restore shows inline so it can be retried.
- A session drag switches to a saved manual order with no control to return to recent-activity order, and drops reorder only within the same group.
- Workspace groups fold to five idle sessions; running, pending-input, and selected blank sessions do not consume the quota. Closing a Workspace resets that quota, as in the shipped browser; Status sections retain their revealed count while mounted.
- The nested layer lists subagent sessions only. Owned running/stopping background jobs affect Working classification without adding rows; scheduled reminders do not affect these buckets. Job state uses one shared roster subscription per listed Session and cataloged direct child, released on removal or unmount.
- A Session shows five nested rows at a time, so delegations beyond them are reachable only from the host's own subagent menu in the session header.
- The rail uses placeholder glyphs rather than the shipped icon set.
- Full native drag-and-drop is unverified: automation triggered `dragstart` but never completed a reliable `drop`. Live Desktop pointer, layout, and directory-picker behaviour has not had a manual pass either, and Web and non-macOS platforms have not been validated live.

## Development

```sh
cd plugins/dsh-sidebar-plus
npm ci --ignore-scripts
npm run typecheck
npm test
npm run build
```

`npm test` builds the real Client bundle and runs the interaction, model, motion, and mirror suites. Sources: the Client half in `src/client.tsx` with its projection, motion, and mirror helpers beside it, and regression checks in `tests/`.

## Links

- [CHANGELOG.md](CHANGELOG.md) — release notes.
- [Issues](https://github.com/Vamdawn/ai-forge/issues) — bug reports and questions.
- [Repository release rules](https://github.com/Vamdawn/ai-forge/blob/main/docs/versioning-and-release.md) — how versions and tags are cut.
- [LICENSE](LICENSE) — MIT.
