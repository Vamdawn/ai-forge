# Noticeflow Changelog

English | [简体中文](CHANGELOG.zh-CN.md)

## [Unreleased]

### Added

- An experimental Node.js 24 remote MCP notification server. Existing hosts connect over Streamable HTTP and submit prepared notifications through `submit_notification(topic, title, content)`.
- OAuth authorization with exact CIMD client allowlisting, PKCE, rotating refresh tokens, and revocation, keeping connection credentials under host control. A responsive connection panel separates administrator verification from permission consent, with password visibility, cancellation, and retry or expiry guidance.
- Topic-based routing to one or more Targets, with encrypted SQLite storage and atomic acceptance of the complete fanout. `accepted` means durably queued; repeated submissions create distinct notifications.
- Asynchronous WeCom `markdown_v2` delivery with content validation, persistent destination quotas and shared cooldowns, bounded retries, and recovery of interrupted work. Delivery can fail or be duplicated; successful reception does not guarantee arrival.
- Metadata-only task queries, manual retry of final failures, offline administrator password reset, and verified online backups with exclusive, resumable recovery and authorization revocation.
- A non-root Docker image and configurable HTTPS deployment subpaths, allowing Noticeflow to share a reverse-proxied site while keeping configuration and data keys outside the repository. A commit-based image packager produces platform-checked bundles and checksums; the deployment procedure covers backup, an image-only Compose configuration guard, scoped updates, verification, and rollback with private machine records outside Git.

See [Limitations](README.md#limitations) for supported scope and outstanding deployment acceptance requirements.
