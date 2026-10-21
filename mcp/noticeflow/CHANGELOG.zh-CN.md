# Noticeflow 变更记录

[English](CHANGELOG.md) | 简体中文

## [Unreleased]

### Added

- 实验性 Node.js 24 远程 MCP 通知服务。现成 Host 通过 Streamable HTTP 连接，以 `submit_notification(topic, title, content)` 提交准备好的通知。
- OAuth 授权，包含精确 CIMD Client 白名单、PKCE、刷新令牌轮换与授权撤销，连接凭据由 Host 管理。响应式连接面板区分管理员身份验证与权限确认，支持密码显隐、取消连接及重试或过期提示。
- 按 Topic 路由到一个或多个 Target，加密存入 SQLite，并原子接收全部扇出任务。`accepted` 表示持久化入队，重复提交会创建不同通知。
- 异步企业微信 `markdown_v2` 投递，包含内容校验、持久化目的地配额、共享冷却、有限重试及中断任务恢复。投递可能失败或重复，成功接收不保证送达。
- 仅输出元数据的任务查询、最终失败任务人工重试、停服管理员密码重置，以及经过校验的在线备份；恢复过程采用排他锁、支持中断续作并撤销授权。
- 非 root Docker 镜像与可配置的 HTTPS 部署子路径，支持在反向代理后与现有站点共用域名，配置及数据密钥保存在仓库外。

支持范围及尚待完成的部署验收要求见[限制说明](README.zh-CN.md#limitations)。
