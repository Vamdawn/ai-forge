# @vamdawn/dsh-astrolabe

English | [简体中文](README.zh-CN.md)

[![npm version](https://img.shields.io/npm/v/@vamdawn/dsh-astrolabe.svg)](https://www.npmjs.com/package/@vamdawn/dsh-astrolabe)

Astrolabe — tabbed left sidebar for DeepSeek Harness: a Workspaces tab and a status-grouped Sessions tab

It takes over the session region of the shipped sidebar and puts a tab strip on top, so one sidebar browses the same sessions along two axes — **Workspaces** or **status** — without navigating anywhere. It is for DeepSeek Harness users who want both groupings at once.

Status: experimental (`0.x`), tested against DeepSeek Harness client packages `0.2.0-rc.2` and Cordis `4.0.4`. A `0.x` release carries no stability promise, and the plugin's public surface is the host slot contract it depends on — the shipped workspace browser's own slots — so a host update can break it.

## Install

### From npm

```sh
dsh plugin --profile desktop add @vamdawn/dsh-astrolabe
```

Use `--profile web` for a Web profile.

### From a source checkout

```sh
cd plugins/dsh-astrolabe
npm ci --ignore-scripts
npm run build
```

Then install that directory into your active profile, typically `desktop` or `web`:

```sh
dsh plugin --profile <profile> add "$PWD/plugins/dsh-astrolabe"
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
dsh plugin --profile desktop add @vamdawn/dsh-astrolabe
```

### Uninstalling

```sh
dsh plugin --profile <profile> remove @vamdawn/dsh-astrolabe
```

## Usage

- **Workspaces** groups sessions by registered Workspace, then Ungrouped; **Status** groups them by Needs input, Working, and Completed.
- Both tabs open with a **Pinned** section while anything is pinned, and a pinned session leaves the section it would otherwise sit in.
- Each status section carries its own state's mark, and Working's arc stays still while its rows carry the animated loader. A Session row is marked only where it needs attention: waiting on you, working — its own turn or a delegation it started — or a completed turn you have not opened. Blank and idle rows leave the leading cell empty.
- Sections collapse, and Workspace menus show their section counts. A section with more rows than one fold step carries one fold control: its label promises the rows that press will reveal, its last press takes the remainder whole, and only a fully revealed section offers to fold back. Completed stays folded at 20 rows, unseen completions first.
- Search matches titles and Workspace names immediately, then adds debounced conversation matches with snippets. It follows the host `session.search` binding (⌘K / Ctrl+K by default, including custom keys); the plugin registers no duplicate shortcut. Archived results restore from their row action.
- Subagent sessions nest under the session that spawned them and open on click, newest activity first, titled by their delegation label and printing their own time.
- That layer appears while a Session is working, has a delegation running, or owes a look, and shows five rows at a time; a running delegation is never the one left out.
- Hovering a Session adds its Workspace name, directory, and when that Workspace was created.
- Rows keep the host and third-party session menu actions, including pin, unpin, and archive. The native directory picker adds a Workspace or opens a new session; Workspace menus offer rename and remove.
- Sessions and Workspace groups can be dragged to reorder, with automatic reordering animated and reduced-motion preferences respected.
- The 56px rail renders when the sidebar is collapsed.
- Plugin copy ships in Chinese and English.

## Limitations

- The shipped browser's view options are not re-hosted: its grouping modes are gone, there is no archived filter, and there is no copy action. The scheduled-task clock mark and the hover card's task section are absent too.
- An archived search result must be restored before opening, and a failed restore shows inline so it can be retried.
- A session drag switches to a saved manual order with no control to return to recent-activity order, and drops reorder only within the same group.
- Workspace groups fold to five idle sessions and Completed to 20 rows; running, pending-input, and selected blank sessions do not consume the Workspace quota. Both folds keep their revealed rows when their section is collapsed and reopened, where the shipped browser resets to the first batch.
- The nested layer carries subagent sessions only: the running turn, background jobs, and scheduled reminders stay out of the sidebar.
- A Session shows five nested rows at a time, so delegations beyond them are reachable only from the host's own subagent menu in the session header.
- The rail uses placeholder glyphs rather than the shipped icon set.
- Full native drag-and-drop is unverified: automation triggered `dragstart` but never completed a reliable `drop`. Live Desktop pointer, layout, and directory-picker behaviour has not had a manual pass either, and Web and non-macOS platforms have not been validated live.

## Development

```sh
cd plugins/dsh-astrolabe
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
