# Changelog

All notable changes to this asset are documented in this file. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Experimental tabbed sidebar for DeepSeek Harness, grouping Sessions by Workspace or status (Needs input, Working, Completed), with a shared Pinned section and nested subagent Sessions.
- Collapsible sections, persisted viewing preferences, five-idle-session Workspace quotas, and incremental reveal of completed Sessions. Empty Workspace headers remain available for management.
- Inline search across Session titles, Workspace names, and conversation content, with snippets, capped results, loading states, and archived-session restoration. Search uses the host’s configured shortcut and expands a collapsed sidebar before focusing.
- Native directory picking to add Workspaces and start a Session, plus Workspace rename and remove actions. Removing a Workspace registration retains its directory and Session logs.
- Compatible host and third-party Session menu actions are mirrored into the sidebar, including pin/unpin and archive.
- Same-group Session drag ordering and Workspace drag ordering, with persisted manual order. Pinned and status sections retain their own ordering rules.
- Short automatic position transitions, including nearby cross-group moves and fades for distant or hidden destinations. Consecutive updates replace the active animation; dragging and open menus hold ordering and visible rows stable. Scrolling and reduced-motion preferences cancel movement.
- Current-session highlighting, pending-input indicators, title hover cards, relative times, a collapsed rail, keyboard navigation, and Chinese/English copy.

### Fixed

- Replaced menu and directory-picker registrations are mirrored even when their IDs and order remain unchanged; released hosts clean up mirrored entries.
- New search queries immediately discard old content matches. Metadata matches retain snippets and sort by recent activity; restore failures remain actionable and show an inline error.
- Row action keyboard events no longer open their parent Session; rename ignores Enter during IME composition.
- Cross-group Session drops are rejected, and Ungrouped does not attempt to reorder a nonexistent Workspace.
- Hover controls retain row height and timestamp alignment. Reordering dismisses outdated hover cards, and interrupted animations leave no interactive visual clones.
- Workspace grouping indexes Session rows and reuses projections instead of repeatedly scanning all Sessions.

See [README.md](README.md#current-limitations) for known limitations and live-validation scope.
