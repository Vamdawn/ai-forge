# Changelog

English | [简体中文](CHANGELOG.zh-CN.md)

All notable changes to this asset are documented in this file. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.3.0] - 2026-10-16

### Changed

- Mark the Working section with the host's own still loading arc instead of a second copy of the animated loader its rows carry, so a collapsed section no longer keeps spinning.

## [0.2.0] - 2026-10-16

### Added

- Publish a Simplified Chinese README (`README.zh-CN.md`) next to the English one, and ship it in the package.
- Publish a Simplified Chinese changelog (`CHANGELOG.zh-CN.md`) next to the English one, and ship it in the package.

### Changed

- Rewrite the README around install, usage, limitations, and development. The slot-contract implementation notes, the route trade-off analysis, the source map, and the dated verification narrative are no longer part of it.
- Mark a Session row only where it needs attention: waiting on you, working — its own turn or a delegation it started — or a completed turn you have not opened. The working marks use the shipped ongoing loader, blank and idle rows keep the leading cell empty, and the separate unread dot beside the title is gone.
- Show the nested subagent layer while a Session is working, has a delegation running, or owes a look, instead of leaving it listed once everything stopped. Each row is titled by its delegation label, prints its own last-activity time, and carries the loader only while it runs; five rows show at a time, and a running delegation is never the one left out.
- Add the Workspace name, directory, and creation time to a Session's hover card: the three facts the shipped sidebar prints for a Workspace.

## [0.1.0] - 2026-10-16

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

See [README.md](README.md#limitations) for known limitations.
