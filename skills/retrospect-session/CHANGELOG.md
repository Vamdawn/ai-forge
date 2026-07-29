# Changelog

本文件遵循 [Keep a Changelog](https://keepachangelog.com/) 格式，记录 `retrospect-session` skill 的用户可见变更。

## [Unreleased]

### Changed

- 规则沉淀目录不再硬编码为 `docs/rules/`：新增 Rules Home Resolution 步骤，项目存在 `agents/rules/` 时优先沉淀至该目录（对齐 Agent Harness 规范"`agents/` 为 Harness 真源"），否则回退 `docs/rules/`，均不存在时按项目形态创建。
