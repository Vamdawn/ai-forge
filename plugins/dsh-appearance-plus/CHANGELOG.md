# Changelog

## [Unreleased]

### Added

- Add `@vamdawn/dsh-appearance-plus` with an **Appearance+** page in the official Web and Desktop settings panel. Customize the interface font, code font, and window background without editing host stylesheets.
- Search installed system fonts and one optional extra folder by family name. Extra-folder fonts load from their original files through the host's authenticated file route, and each failed font keeps the last working family.
- Set a PNG, JPEG, or WebP background image by absolute path, with cover, contain, or tile placement and an adjustable overlay that follows the light or dark palette. Missing, oversized, or unsupported images show a localized error and keep the previous background.
- Choose the background image or extra font folder through the native macOS dialog, or enter the path manually on any platform.
- Store settings in the profile's `cordis.patch.yml`, so edits in the settings page and in the file stay in sync. Disabling the plugin removes every token override, style, and font it added.
- Provide Chinese and English copy, strict Host and Client type checks, automated tests against the built plugin, and the MIT license notice in the distribution.
