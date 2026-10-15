# @vamdawn/dsh-appearance-plus

Customize the DeepSeek Harness interface font, code font, and window background image. The plugin adds an **Appearance+** page to the official settings panel and layers its changes over the active theme, so the built-in Light, Dark, and System palettes keep working.

Validated with DSH `0.2.0-rc.2`. Supports the Web UI on loopback pages and the Desktop application that uses it; the TUI has no settings panel. Copy is available in the officially shipped Chinese (`zh`) and English (`en`) locales.

## Installation

The plugin is not published to npm yet. Build the local checkout first. From the repository root:

```sh
cd plugins/dsh-appearance-plus
npm ci --ignore-scripts
npm run typecheck
npm run build
cd ../..
```

Then replace `<profile>` with your active profile name (typically `desktop` or `web`):

```sh
dsh plugin --profile <profile> add "$PWD/plugins/dsh-appearance-plus"
```

Installation links the local directory, so keep it and its `dist/` artifacts available, and rebuild after changing source files. For Desktop, refresh the Plugins page and confirm that `@vamdawn/dsh-appearance-plus` is enabled; restart the application if it has not loaded the plugin. If the macOS Desktop CLI is not on PATH, use:

```sh
"/Applications/DeepSeek Harness.app/Contents/Resources/runtime/cli/bin/dsh"
```

To uninstall:

```sh
dsh plugin --profile <profile> remove @vamdawn/dsh-appearance-plus
```

## Usage

Open **Settings** at the bottom of the sidebar, then select **Appearance+** in the left navigation. Changes apply immediately without reloading.

- **Interface font** and **Code font**: the field shows the selected family. Click it to list every family, type to filter by name, and select with the pointer or the arrow keys and Enter. **Default** at the top of the list returns to the host default. The chosen family goes first, followed by the host's shipped font stack as fallbacks.
- **Extra font folder**: one additional folder whose fonts appear in search, marked as *extra folder*. Supported files are `.ttf`, `.otf`, `.ttc`, `.woff`, and `.woff2`; subfolders are included. **Rescan** picks up newly installed fonts.
- **Background image**: an absolute path to a PNG, JPEG, or WebP file. **Fit** selects cover, contain, or tile. **Overlay opacity** (0–100, default 60) places a light or dark layer over the image to keep text readable, matching the current palette.

**Choose…** opens the native file or folder dialog on macOS. On other platforms, enter the path manually. The plugin references the original files and does not copy them.

## Configuration file

Settings are stored in the profile's `cordis.patch.yml` under the plugin entry. Editing the file updates an open settings page, and changes made on the page are written back:

```yaml
- id: dsh-appearance-plus
  name: "@vamdawn/dsh-appearance-plus"
  config:
    uiFont: LXGW WenKai          # empty uses the host default
    codeFont: JetBrains Mono
    fontDir: /Users/<user>/Fonts # optional
    backgroundImage: /Users/<user>/Pictures/background.jpg
    backgroundFit: cover         # cover | contain | tile
    overlayOpacity: 60           # integer 0-100
```

The Host validates every value; an out-of-range opacity or an unknown fit is rejected rather than applied.

## Limits

- Fonts from the extra folder and background images load through the host's authenticated `GET /api/file` route, which has a 20 MiB per-file limit. Larger files fail with a localized error. Installed system fonts load by name and are not affected.
- The background references the original image. Moving or deleting it shows an error on the settings page while the last working background stays in place until reload.
- To show the image, the plugin makes the base window surface transparent and the sidebar translucent. Panels that paint their own opaque fill keep it.
- Paths refer to the machine running the DSH Host. Non-loopback Web pages are not supported and may not persist settings, as with the host's language and theme preferences.
- The native dialog is implemented for macOS only.

## Development and validation

```sh
cd plugins/dsh-appearance-plus
npm ci --ignore-scripts
npm run typecheck
npm test
npm pack --dry-run
```

- `src/index.ts`: declares the settings schema and registers the authenticated `/api/dsh-appearance-plus/fonts` and `/api/dsh-appearance-plus/pick` routes.
- `src/fonts.ts`: scans font folders and reads family, weight, and style from `name` and `OS/2` tables without loading whole files; WOFF containers are decoded with `fontkit`.
- `src/picker.ts`: opens the native macOS dialog through `osascript`.
- `src/client.tsx`: registers the settings page, loads extra-folder faces with `FontFace`, overrides the font and surface tokens through `ctx.theme.overrideTokens`, and injects the background style.
- `src/locales.ts` and `src/protocol.ts`: define the bilingual dictionaries and the Client-Host types.
- `build.mjs`: emits ESM `dist/index.js` and lazy-CJS `dist/client.js` with esbuild, keeping shared DSH and React modules external.

Tests cover family-name selection, font and collection parsing, folder scans, route input validation, schema defaults, applying and reverting fonts and backgrounds, error handling that keeps the last working values, the picker request, and unload cleanup. Development and tests require Node.js 24 or newer.

Before publishing, follow the [repository release rules](https://github.com/Vamdawn/ai-forge/blob/main/agents/rules/versioning-and-release.md); the publishing steps match those in [dsh-rename-session](../dsh-rename-session/README.md#publishing-to-npm) with the package name `@vamdawn/dsh-appearance-plus`.

## Validation record

On 2026-10-15, the linked plugin was exercised in an isolated Web profile through browser automation. The settings page appeared between General and Models. Selecting an installed interface font, an installed code font, and an extra-folder font updated the computed fonts, and the extra-folder faces loaded through `/api/file`. A background image applied with tile placement and overlay changes in both palettes. A missing image showed its error while keeping the previous background. Page edits were written to `cordis.patch.yml`, and a manual file edit updated the open page. Disabling the plugin removed its tokens, style, fonts, and page. Unauthenticated requests to the plugin routes and `/api/file` returned 401. The native dialog and the Desktop application were not exercised.
