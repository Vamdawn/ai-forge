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

- **Workspaces** reuses the official browser, including its saved view options, grouping, ordering, archive filter, and Workspace/session controls; **Status** groups them in order: Working (running or waiting for subagent/background work), Waiting (human input or approval), Done (a finished turn with an unseen result), and Idle (no active work or unseen result). Human requests take precedence over active work, and opening a completed Session moves it from Done to Idle.
- Both tabs open with a **Pinned** section while anything is pinned, and a pinned session leaves the section it would otherwise sit in.
- Status group headings use semibold text aligned with the leading Session icon column, with extra space between groups and no heading icons or collapse controls. Only working rows animate; waiting rows use an amber circled exclamation, unseen completed results carry a green dot, and blank/idle rows keep the leading cell empty.
- Workspace expansion, overflow controls, and menus follow the official browser and share its saved viewing state. Status sections always stay open, including Idle; each starts with 50 rows and reveals up to 50 more per press until all rows are visible, without a fold-back action.
- Search matches titles and Workspace names immediately, then adds debounced conversation matches with snippets. It follows the host `session.search` binding (⌘K / Ctrl+K by default, including custom keys); the plugin registers no duplicate shortcut. Archived results restore from their row action.
- In Status, subagent sessions nest under their parent with vertical and elbow connectors, newest activity first. They open on click, use their delegation label, and show their own time.
- That layer appears while a Session is working, waiting on input, or owes a look, and fills up to five rows; running and waiting delegations are always retained.
- In Status, hovering a Session adds its Workspace name, directory, and when that Workspace was created.
- Workspaces renders the official component with its own styles, dialogs, search, directory picker, scheduled-task decorations, and third-party actions. The two view tabs share the toolbar on wider sidebars and sit above it on narrow sidebars. Opening search temporarily hides the tabs when they share the toolbar.
- Sessions and Workspace groups can be dragged to reorder, with automatic reordering animated and reduced-motion preferences respected.
- The 56px rail renders when the sidebar is collapsed.
- Plugin copy ships in Chinese and English.

## Limitations

- Native browser reuse depends on the host registration and toolbar structure. It has automated coverage against `0.2.0-rc.2` and has been exercised in the Web host `0.2.2-rc.2`. Workspaces falls back to the plugin list with fewer view options when the native registration is unavailable or the browser fails to render.
- In Status, an archived search result must be restored before opening, and a failed restore shows inline so it can be retried.
- The fallback Workspace list has no view-options menu; dragging switches to manual order and accepts drops only within the same group. The native browser retains its ordering controls.
- Workspaces uses the host’s five-idle-session quota and resets it on closing a group. Status sections retain their revealed count while mounted.
- The nested layer lists subagent sessions only. Owned running/stopping background jobs affect Working classification without adding rows; scheduled reminders do not affect these buckets. Job state uses one shared roster subscription per listed Session and cataloged direct child, released on removal or unmount.
- A Session shows five nested rows at a time, so delegations beyond them are reachable only from the host's own subagent menu in the session header.
- The rail uses placeholder glyphs rather than the shipped icon set.
- Web on macOS has been verified for search, view options, directory selection, and Workspace group reordering. Session drag-and-drop, the Desktop app and its system directory picker, and non-macOS platforms remain unverified in a live host.

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
