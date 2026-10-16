# @vamdawn/dsh-rename-session

English | [简体中文](README.zh-CN.md)

[![npm version](https://img.shields.io/npm/v/@vamdawn/dsh-rename-session.svg)](https://www.npmjs.com/package/@vamdawn/dsh-rename-session)

Adds **Rename from context** to the DeepSeek Harness session "..." menu. The plugin combines the user and assistant text of the current conversation, generates a concise title with the model of the session's latest request, and saves it as a pinned name.

Validated with DSH `0.2.0-rc.2`. It supports the Web UI and the Desktop application that uses it; the TUI does not expose this menu. Copy ships in the official Chinese (`zh`) and English (`en`) locales, and switching **Settings → General → Language** updates the menu, the progress notice, and the success and error notices immediately without reloading. Generated titles follow the conversation's predominant language rather than the interface language.

## Install

### From npm

```sh
dsh plugin --profile desktop add @vamdawn/dsh-rename-session
```

Use `--profile web` for a Web profile. The package contains compiled JavaScript and needs no consumer-side build; it targets Node.js 24 or newer and the DSH versions declared in `peerDependencies`.

### From a source checkout

```sh
cd plugins/dsh-rename-session
npm ci --ignore-scripts
npm run typecheck
npm run build
cd ../..
```

Then install the directory into your active profile (typically `desktop` or `web`):

```sh
dsh plugin --profile <profile> add "$PWD/plugins/dsh-rename-session"
```

Installation links the local directory, so keep it and its `dist/` artifacts available and rebuild after changing source files. Refresh the Plugins page and confirm that `@vamdawn/dsh-rename-session` is enabled; restart the application if it has not loaded the plugin. If the macOS Desktop CLI is not on PATH, use:

```sh
"/Applications/DeepSeek Harness.app/Contents/Resources/runtime/cli/bin/dsh"
```

To try the plugin in an independent Web profile:

```sh
dsh --profile rename-demo --from-default-profile web --dump-config
dsh plugin --profile rename-demo add "$PWD/plugins/dsh-rename-session"
dsh --profile rename-demo
```

### Replacing an earlier unscoped installation

If the profile already contains the development package named `dsh-rename-session`, remove it before adding the scoped package: both register the same action and endpoint, so they must not run together.

```sh
dsh plugin --profile <profile> remove dsh-rename-session
```

Then install the scoped package from npm, a built checkout, or a tarball. The repository directory and component ID remain `dsh-rename-session`.

To uninstall the scoped package:

```sh
dsh plugin --profile <profile> remove @vamdawn/dsh-rename-session
```

## Usage

The session must have made at least one model request.

1. Open the session row's "..." menu and select **Rename from context**, between **Rename** and **Fork session**.
2. Wait for completion. The new title appears in the session list and is pinned against automatic regeneration; you can still rename it manually or generate another title.

Each operation makes one auxiliary model request with the host's existing credentials and consumes the corresponding quota. It appends no user message to the main conversation and executes no tools; historical sessions are opened through a temporary host reference and released afterwards, without changing the selected session.

## Limitations

- The plugin uses the host's current conversation projection, including compacted history. It extracts user and assistant text, filters host-marked instructions, catalogs, and environment snapshots, and excludes hidden reasoning, tool output, and image content.
- Inputs exceeding 48,000 UTF-16 code units keep the first 12,000 and the last 36,000 units. Generation has a 60-second deadline and a 256-token output limit, and titles are capped at 60 Unicode characters before host normalization.
- Empty context, missing model routing, model failures, truncated output, and cancellation do not trigger a rename. Only one title request runs per session.
- If the existing title changes during generation, the result does not overwrite the newer name, and unloading the plugin cancels unfinished requests.
- Real title quality depends on the selected model.

## Development

```sh
cd plugins/dsh-rename-session
npm ci --ignore-scripts
npm run typecheck
npm test
npm pack --dry-run
```

`npm test` builds first, then runs `tests/*.test.ts` with Node's native TypeScript support against the compiled Host and Client artifacts. Tests cover context selection, model routing, preserving an existing title on failure, cancellation, concurrent title changes, duplicate requests, unload cleanup, and the Client-to-Host request flow.

Sources: `src/index.ts` the authenticated route, context reading, and rename call; `src/client.tsx` the menu entry and persistent notices; `src/locales.ts` and `src/protocol.ts` the bilingual dictionaries and client-host types; `build.mjs` the esbuild bundle; `cordis.patch.yml` the installable bundle configuration.

## Links

- [CHANGELOG.md](CHANGELOG.md) — release notes.
- [LICENSE](LICENSE) — MIT.
- [Repository release rules](https://github.com/Vamdawn/ai-forge/blob/main/docs/versioning-and-release.md) — how versions, tags, and npm publication are handled.
