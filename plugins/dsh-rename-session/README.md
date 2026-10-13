# @vamdawn/dsh-rename-session

Add **Rename from context** to the DeepSeek Harness session "..." menu. The plugin combines user and assistant text from the current conversation, generates a concise title using the model from the session's latest request, and saves it as a pinned name.

Validated with DSH `0.2.0-rc.2`. Supports the Web UI and Desktop applications that use it; the TUI does not expose this menu.

Supports the officially shipped Chinese (`zh`) and English (`en`) locales. Switching **Settings → General → Language** updates the menu, progress, success, and error notices immediately without reloading. Additional language packs follow the host's locale fallback chain. Generated titles use the conversation's predominant language rather than the interface language.

## Installation

### From npm

Install the public scoped package into your active DSH profile:

```sh
dsh plugin --profile desktop add @vamdawn/dsh-rename-session
```

Use `--profile web` for a Web profile. The npm package contains compiled JavaScript; installation does not require a TypeScript build or Git build authorization. It targets Node.js 24 or newer and the DSH versions declared in `peerDependencies`.

The `@vamdawn` scope identifies the publisher and keeps the package in that publisher's namespace. Public visibility is explicit in `publishConfig`; a scope does not imply that this plugin is private.

### From a source checkout

Build the local checkout first. From the repository root:

```sh
cd plugins/dsh-rename-session
npm ci --ignore-scripts
npm run typecheck
npm run build
cd ../..
```

Then replace `<profile>` with your active profile name (typically `web` for Web or `desktop` for Desktop):

```sh
dsh plugin --profile <profile> add "$PWD/plugins/dsh-rename-session"
```

For Web profiles, inspect the composed configuration:

```sh
dsh --profile web --dump-config
```

For Desktop, refresh the Plugins page and confirm that `@vamdawn/dsh-rename-session` is enabled and its component is running. Restart the corresponding application if it has not loaded the plugin. Installation links the local directory, so keep it and its `dist/` artifacts available. The host loads the compiled JavaScript without compiling TypeScript at runtime or requiring a separate API key. After changing source files, rebuild before refreshing the installed plugin.

If the macOS Desktop CLI is not on PATH, replace `dsh` in these commands with:

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

If the profile already contains the development package named `dsh-rename-session`, remove it before adding the scoped package. Both packages register the same action and endpoint, so they must not run together:

```sh
dsh plugin --profile <profile> remove dsh-rename-session
```

Then install the scoped package from npm, a built checkout, or a tarball. The repository directory and component ID remain `dsh-rename-session`.

To uninstall the scoped package:

```sh
dsh plugin --profile <profile> remove @vamdawn/dsh-rename-session
```

## Usage and limits

1. The session must have made at least one model request.
2. Open the session row's "..." menu and select **Rename from context**, between **Rename** and **Fork session**.
3. Wait for completion. The new title appears in the session list and is pinned against automatic regeneration. You can still rename it manually or generate another title.

Each operation makes one auxiliary model request using the host's existing credentials and consumes the corresponding quota. It does not append a user message to the main conversation or execute tools. Historical sessions are opened through a temporary host reference and released afterward, without changing the selected session.

The plugin uses the host's current conversation projection, including compacted history. It extracts user and assistant text, filters host-marked instructions, catalogs, and environment snapshots, and excludes hidden reasoning, tool output, and image content. Inputs exceeding 48,000 UTF-16 code units retain the first 12,000 and last 36,000 units. Generation has a 60-second deadline and a 256-token output limit. Titles are capped at 60 Unicode characters before host normalization.

Empty context, missing model routing, model failures, truncated output, and cancellation do not trigger a rename. Only one title request may run per session. If the existing title changes during generation, the result does not overwrite the newer name. Unloading the plugin cancels unfinished requests.

## Development and validation

```sh
cd plugins/dsh-rename-session
npm ci --ignore-scripts
npm run typecheck
npm test
npm pack --dry-run
```

- `src/index.ts`: registers the authenticated `/api/dsh-rename-session` POST route, reads context, generates a title, calls `sessionTitle.rename`, and awaits `session/flush`.
- `src/client.tsx`: registers the menu and persistent notices; `sessions.using` waits for history opening and releases the reference.
- `src/locales.ts` and `src/protocol.ts`: define the bilingual dictionaries and client-host response types.
- `tsconfig.host.json` and `tsconfig.client.json`: strictly check each side against the official DSH types without mixing Host and Client service declarations.
- `tsconfig.tests.json`: strictly checks the TypeScript fixtures and tests with syntax supported by Node's native type stripping.
- `build.mjs`: uses esbuild to emit ESM `dist/index.js` and lazy-CJS `dist/client.js`. Shared DSH and React modules remain external. Generated files are ignored by Git and included in the installable package.
- `cordis.patch.yml`: supplies the installable bundle configuration layer.

Tests cover context selection, model routing, preservation of existing titles on failure, cancellation, concurrent title changes, duplicate requests, unload cleanup, and the client-to-host request flow. Real title quality depends on the selected model.

Development and test execution require Node.js 24 or newer. `npm run typecheck` checks the Host, Client, and tests independently. `npm test` builds first and runs `tests/*.test.ts` with Node's native TypeScript support, exercising the compiled Host and Client artifacts through the scoped Host export and Desktop loader ID. `npm pack` checks types and builds before packaging. `prepare` builds a Git checkout during installation; Git installs require the package's build to be allowlisted in pnpm. A packed tarball contains ready-to-load JavaScript and needs no consumer-side build. Publishing a directory also runs the tests through `prepublishOnly`.

## Publishing to npm

For each release, follow the [repository release rules](https://github.com/Vamdawn/ai-forge/blob/main/agents/rules/versioning-and-release.md) for the asset version, changelog, annotated tag, and root release index. The repository asset name is `dsh-rename-session`; npm uses the scoped package name `@vamdawn/dsh-rename-session`.

Publishing to npm is a separate, explicit action; committing changes, creating a tag, or running validation does not publish the package. The steps below apply to the next authorized version and reuse the same shell from the plugin directory.

1. Sign in to an npm account with permission to publish under `@vamdawn`. A personal scope must match the npm username; ownership of the GitHub account alone does not grant npm permissions. Enable npm's required two-factor authentication for interactive publishing.
2. Once the asset release is authorized, ensure `package.json` and `package-lock.json` both contain the approved version. Complete the repository release records according to the shared rules above; the following commands read the finalized version from `package.json`.
3. From the plugin directory, validate and pack the exact artifact to publish:

   ```sh
   npm ci --ignore-scripts --registry=https://registry.npmjs.org/
   npm run typecheck
   npm test
   release_version=$(node -p "require('./package.json').version")
   release_tarball="vamdawn-dsh-rename-session-${release_version}.tgz"
   npm pack
   tar -tzf "./${release_tarball}"
   ```

   The archive should contain `package.json`, `dist/index.js`, `dist/client.js`, `cordis.patch.yml`, `README.md`, `CHANGELOG.md`, and `LICENSE`. Source files, tests, build tools, and `node_modules` are excluded. The plugin-local LICENSE preserves the repository's MIT notice.
4. Install that tarball into an independent Web profile and verify the actual menu and rename operation before publishing:

   ```sh
   dsh --profile rename-publish-test --from-default-profile web --dump-config
   dsh plugin --profile rename-publish-test add "$PWD/${release_tarball}"
   dsh --profile rename-publish-test
   ```

5. After reviewing the artifact, log in and publish it to the public registry:

   ```sh
   npm login --registry=https://registry.npmjs.org/
   npm whoami --registry=https://registry.npmjs.org/
   npm publish "./${release_tarball}" \
     --registry=https://registry.npmjs.org/ --access public
   ```

   Follow npm's authentication prompts. A tarball publish uploads the already built artifact and does not run the directory's validation hooks, so complete the checks above first. `publishConfig` fixes the destination and public access in the package itself.
6. Check the registry entry and install the released version into DSH:

   ```sh
   npm view "@vamdawn/dsh-rename-session@${release_version}" \
     version dist.integrity --registry=https://registry.npmjs.org/
   dsh plugin --profile <profile> add "@vamdawn/dsh-rename-session@${release_version}"
   ```

   Refresh the Plugins page and restart the profile if needed. A published name/version pair cannot be overwritten; subsequent changes require a new version.

For each release, keep npm publishing tied to explicit authorization. See npm's [scoped public package guide](https://docs.npmjs.com/creating-and-publishing-scoped-public-packages/), [pack reference](https://docs.npmjs.com/cli/v11/commands/npm-pack/), and [publish reference](https://docs.npmjs.com/cli/v11/commands/npm-publish/).

## Historical validation records

Scoped-package validation on 2026-10-13: Host, Client, and test type checks passed, along with all seven tests against compiled artifacts. The tarball contained exactly the seven distribution files listed above. It was installed from the tarball into a clean Node.js 24 consumer using the public registry with lifecycle scripts disabled; the scoped Host export loaded successfully, and all seven behavioral tests passed against the installed Host and Client artifacts.

The i18n checks cover matching Chinese and English dictionary keys, language changes during progress and success notices, bilingual rendering of every plugin error code, and localized fallback for unknown backend errors. Chinese conversation fixtures and the `zh` UI dictionary remain intentionally bilingual test data and translations.

The official language selector was also exercised in an isolated DSH UI to verify menu updates without reloading. An HTTP response stub with a fixed error code confirmed that errors render in the selected language rather than exposing fixed-language backend messages.

Desktop validation before the npm scope change, on 2026-10-13: strict Host and Client type checks, the build, all seven tests against compiled artifacts, and tarball packaging passed. The local Desktop profile was reinstalled and its plugin component reported `Running`. A separate smoke-test conversation using the Desktop's selected model was renamed to `TypeScript plugin smoke test: login timeouts` through the actual menu. Its compressed log confirmed a persisted `source.kind: user` title, one human message, and no tool results.

Earlier checks with an isolated `DSH_HOME` and deterministic model stub also verified renaming of unselected historical sessions, context filtering, unchanged session selection, and persistence after restarting. The bilingual UI checks used the official language selector and a fixed-error HTTP response stub.
