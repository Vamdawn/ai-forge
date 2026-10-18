# Noticeflow Changelog

English | [简体中文](CHANGELOG.zh-CN.md)

## [Unreleased]

### Added

- Added the experimental Node.js 24 server with OAuth/CIMD, the notification MCP tool, encrypted SQLite fanout, quota-aware delivery, offline password reset, backup/recovery commands, and a Docker build. Automated public-boundary tests cover local protocol, authorization, delivery, and recovery behavior; real hosts, WeCom, and image execution still require deployment acceptance.
- Defined the initial server-first MCP product boundary and notification model before implementation; existing hosts use their own MCP clients.
- Added the initial technical design for authorization, durable delivery, encrypted storage, operations, and acceptance checks so implementation can proceed against a concrete design.
- Added an architecture review identifying OAuth callback, database recovery, and delivery scheduling gaps before implementation, with primary sources and acceptance cases.

### Changed

- Aligned the product and technical designs on retry accounting, task time filters, log fields, per-client rate limits, and rolling refresh-token expiry so the implementation follows one contract.

### Fixed

- Corrected the design for native OAuth loopback callbacks and exclusive SQLite recovery with preserved WAL files, so default Claude Code sign-in and interrupted restores have explicit acceptance rules.
- Corrected delivery scheduling with conservative quota reservations and persistent destination-wide cooldowns, so delayed sends and retries share the same limits across restarts.
- Completed the design for refresh-token issuance and rolling Grant expiry, and required offline password resets under an exclusive lock so existing authorization cannot be written back by an in-flight request.
- Unified Webhook snapshots, sends, quotas, and cooldowns around a validated canonical destination so equivalent URL spellings cannot create separate limits.
- Clarified backup retention by count and operator cleanup of recovery copies, and aligned the documentation on acceptance by both target hosts without claiming implementation verification.
