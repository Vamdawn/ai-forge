# @vamdawn/dsh-appearance-plus

English | [简体中文](README.zh-CN.md)

[![npm version](https://img.shields.io/npm/v/@vamdawn/dsh-appearance-plus.svg)](https://www.npmjs.com/package/@vamdawn/dsh-appearance-plus)

Customize the DeepSeek Harness interface font, code font, and window background image. The plugin adds an **Appearance+** page to the official settings panel and layers its changes over the active theme, so the built-in Light, Dark, and System palettes keep working.

Validated with DSH `0.2.0-rc.2`. It supports the Web UI on loopback pages and the Desktop application that uses it; the TUI has no settings panel. Copy ships in the official Chinese (`zh`) and English (`en`) locales.

## Install

### From npm

```sh
dsh plugin --profile desktop add @vamdawn/dsh-appearance-plus
```

Use `--profile web` for a Web profile. The package contains compiled JavaScript and needs no consumer-side build; it targets Node.js 24 or newer and the DSH versions declared in `peerDependencies`.

### From a source checkout

```sh
cd plugins/dsh-appearance-plus
npm ci --ignore-scripts
npm run typecheck
npm run build
cd ../..
```

Then install the directory into your active profile (typically `desktop` or `web`):

```sh
dsh plugin --profile <profile> add "$PWD/plugins/dsh-appearance-plus"
```

Installation links the local directory, so keep it and its `dist/` artifacts available and rebuild after changing source files. Refresh the Plugins page and confirm that `@vamdawn/dsh-appearance-plus` is enabled; restart the application if it has not loaded the plugin. If the macOS Desktop CLI is not on PATH, use:

```sh
"/Applications/DeepSeek Harness.app/Contents/Resources/runtime/cli/bin/dsh"
```

To uninstall:

```sh
dsh plugin --profile <profile> remove @vamdawn/dsh-appearance-plus
```

## Usage

Open **Settings** at the bottom of the sidebar, then select **Appearance+** in the left navigation. Changes apply immediately without reloading.

- **Interface font** and **Code font**: the field shows the selected family. Click it to list every family, type to filter by name, and select with the pointer or with the arrow keys and Enter. **Default** at the top of the list returns to the host default. The chosen family goes first, followed by the host's shipped font stack as fallbacks.
- **Extra font folder**: one additional folder whose fonts appear in search, marked as *extra folder*. Supported files are `.ttf`, `.otf`, `.ttc`, `.woff`, and `.woff2`, and subfolders are included. **Rescan** picks up newly installed fonts.
- **Background image**: an absolute path to a PNG, JPEG, or WebP file. **Fit** selects cover, contain, or tile. **Overlay opacity** (0–100, default 60) places a light or dark layer over the image to keep text readable, matching the current palette.

**Choose…** opens the native file or folder dialog on macOS; on other platforms, enter the path manually. The plugin references the original files and does not copy them.

## Configuration

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

The Host validates every value: an out-of-range opacity or an unknown fit is rejected rather than applied.

## Limitations

- Extra-folder fonts and background images load through the host's authenticated `GET /api/file` route, which allows 20 MiB per file; larger files fail with a localized error. Installed system fonts load by name and are not affected.
- The background references the original image. Moving or deleting it shows an error on the settings page while the last working background stays in place until reload.
- To show the image, the plugin makes the base window surface transparent and the sidebar translucent. Panels that paint their own opaque fill keep it.
- Paths refer to the machine running the DSH Host. Non-loopback Web pages are not supported and may not persist settings, as with the host's language and theme preferences.
- The native file and folder dialog is implemented for macOS only.

## Development

```sh
cd plugins/dsh-appearance-plus
npm ci --ignore-scripts
npm run typecheck
npm test
```

Tests cover family-name selection, font and collection parsing, folder scans, route input validation, schema defaults, applying and reverting fonts and backgrounds, error handling that keeps the last working values, the picker request, and unload cleanup.

Sources: `src/index.ts` settings schema and authenticated routes, `src/fonts.ts` folder scans and font metadata, `src/picker.ts` native dialog, `src/client.tsx` settings page and theme overrides, `src/locales.ts` the bilingual dictionaries, `build.mjs` the esbuild bundle.

## Links

- [CHANGELOG.md](CHANGELOG.md) — release notes.
- [LICENSE](LICENSE) — MIT.
- [Repository release rules](https://github.com/Vamdawn/ai-forge/blob/main/docs/versioning-and-release.md) — how versions, tags, and npm publication are handled.
