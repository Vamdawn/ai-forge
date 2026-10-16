# Changelog

English | [简体中文](CHANGELOG.zh-CN.md)

## [Unreleased]

### Added

- Publish a Simplified Chinese README (`README.zh-CN.md`) next to the English one, and ship it in the package.
- Publish a Simplified Chinese changelog (`CHANGELOG.zh-CN.md`) next to the English one, and ship it in the package.

### Changed

- Rewrite the README around install, usage, limitations, and development. The npm publishing procedure and the dated validation records are no longer part of it; `package.json` keeps the publish-time checks.

## [0.1.0] - 2026-10-13

### Added

- Add `@vamdawn/dsh-rename-session` with a "Rename from context" action and edit icon in the Web and Desktop session menus. Reuse the session's model and credentials without a separate API key.
- Generate concise titles from user and assistant conversation text, retaining compaction summaries while filtering auxiliary instructions, catalogs, and environment snapshots. Use the conversation's predominant language and pin the saved title against automatic regeneration.
- Provide progress, success, and error notices in the officially shipped Chinese and English locales, updating immediately when the interface language changes.
- Preserve the existing name when context or model routing is unavailable, generation fails, or the operation is cancelled. Handle timeouts, duplicate requests, concurrent renames, and cancellation on unload; rename historical sessions without changing the selected conversation.
- Provide TypeScript Host and TSX Client sources with strict, separate type checks and a self-contained build for Desktop-compatible JavaScript artifacts. Include English documentation, model instructions, installation and publication guidance, automated tests against the built plugin, and the MIT license notice in the distribution.
