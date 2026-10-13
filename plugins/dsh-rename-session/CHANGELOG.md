# Changelog

## [Unreleased]

### Added

- Add the public npm-ready package `@vamdawn/dsh-rename-session` with a "Rename from context" action and edit icon in the Web and Desktop session menus. Reuse the session's model and credentials without a separate API key.
- Generate concise titles from user and assistant conversation text, retaining compaction summaries while filtering auxiliary instructions, catalogs, and environment snapshots. Use the conversation's predominant language and pin the saved title against automatic regeneration.
- Provide progress, success, and error notices in the officially shipped Chinese and English locales, updating immediately when the interface language changes.
- Preserve the existing name when context or model routing is unavailable, generation fails, or the operation is cancelled. Handle timeouts, duplicate requests, concurrent renames, and cancellation on unload; rename historical sessions without changing the selected conversation.
- Provide TypeScript Host and TSX Client sources with strict, separate type checks and a self-contained build for Desktop-compatible JavaScript artifacts. Include English documentation, model instructions, installation and publication guidance, automated tests against the built plugin, and the MIT license notice in the distribution.
