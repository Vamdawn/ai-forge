# Changelog

本文件遵循 [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) 格式，记录 `agent-friendly-cli` skill 的用户可见变更。

## [Unreleased]

### Added

- 新增用于设计和审查 Agent-friendly CLI 的 skill，覆盖发现、参数、机器输出、错误、幂等、安全、副作用和可组合性检查。

### Changed

- 在 skill 元数据中明确禁止模型主动调用，保留显式调用入口。
