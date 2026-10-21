# Noticeflow

[English](README.md) | 简体中文

Noticeflow 是基于 Node.js 24 的实验性远程 MCP 通知服务。现成 MCP Host 通过 Streamable HTTP 与 OAuth 提交准备好的通知，持久化 SQLite 队列将其路由到配置的企业微信群机器人。本地自动化检查覆盖两代 MCP 协议和 OAuth 流程；Linux/arm64 Docker 镜像已通过构建、启动、运行时配置的健康检查及持久卷重启验证；Codex CLI 0.155.1 已在禁用投递的条件下通过本地 HTTPS OAuth 和真实 Agent 提交验收；真实 Claude Code、ChatGPT 及企业微信验收仍待完成。

## Install

从本仓库构建服务端镜像：

```sh
cd mcp/noticeflow
docker build -t noticeflow:local .
```

镜像以 `node` 用户（UID 1000）运行。准备可写的 `/data`、`/backup` 卷，并只读挂载配置和数据密钥。凭据保存在仓库外。本资产尚未发布到 npm。

## Usage

在 Nginx HTTPS 代理后运行单个实例：

```sh
docker run --rm --name noticeflow \
  -p 127.0.0.1:3000:3000 \
  -v /srv/noticeflow/data:/data \
  -v /srv/noticeflow/backup:/backup \
  -v /srv/noticeflow/config.yaml:/run/noticeflow/config.yaml:ro \
  -v /srv/noticeflow/data-key:/run/noticeflow/data-key:ro \
  noticeflow:local
```

让 Host 的通用 MCP Client 连接 `${publicBaseUrl}/mcp`，完成管理员 OAuth 授权，再以 `topic`、`title`、`content` 调用 `submit_notification`。`accepted` 表示全部扇出任务已提交，投递异步进行，重复调用会创建不同通知。初版只暴露该工具，使用官方 SDK 同时处理 2025 无状态握手和 2026-07-28 协议。

同一镜像支持维护命令。所有命令须使用相同挂载和 `--config /run/noticeflow/config.yaml`；查询、重试及在线备份可通过 `docker exec` 执行。密码重置和恢复前先停服，再使用相同挂载运行临时容器；密码重置还需 `-it`。

```text
noticeflow tasks list [--status <status>] [--received-from <UTC-time>] [--received-before <UTC-time>] [--notification <id>]
noticeflow tasks show <delivery-id>
noticeflow tasks retry <delivery-id>
noticeflow auth reset-password
noticeflow backup create
noticeflow backup list
noticeflow backup restore <backup-file>
```

对运行中的容器，将 `noticeflow` 替换为 `docker exec noticeflow node dist/main.js`；对临时容器，将子命令放在镜像名后。任务时间筛选使用通知接收时间，起点包含、终点不包含。维护输出只含元数据。密码重置无回显地读取并确认新密码，同时撤销全部已存授权。

## Configuration

将 [config.example.yaml](config.example.yaml) 复制到仓库外并替换占位值。单独生成 32 字节 Base64 数据密钥：

```sh
umask 077
openssl rand -base64 32 > /srv/noticeflow/data-key
```

配置不含查询、片段或尾随斜线的 HTTPS 基础 URL，例如 `https://noticeflow.example.com/noticeflow`，以及内部监听地址、精确的 HTTPS CIMD URL 白名单、绝对存储路径、Target 和 Topic。可选基础路径使用字母、数字、`.`、`_`、`~`、`-` 构成的非空段，拒绝编码或规范化后改变的路径别名；原有仅 Origin 的配置仍然可用。更改基础 URL 后，Host 须为新的 MCP 资源重新授权。示例包含 Claude Code 与 ChatGPT 官方 CIMD URL。接入 Codex 时须添加登录时显示的完整 CIMD URL，其中可能包含按服务生成的回调 ID。Webhook 只接受官方企业微信 HTTPS 端点及唯一非空 `key` 参数。未知字段、重复 YAML 键、缺失 Target 及无效端点会阻止启动。修改配置后须重启；已接收任务保留原消息和目的地。

首次初始化后删除 `auth.initialAdminPassword`。密钥与数据库备份分开保存；丢失密钥将无法恢复通知内容及授权。密钥和 YAML 只允许服务用户读取。备份包含密文记录和密码哈希，也须限制卷权限。

Nginx 必须覆盖转发 Host、协议和来源 IP 头，并限制其他客户端直接访问容器端口。保留原路径转发所配置的基础路径及其 MCP、OAuth、交互和 Provider 授权恢复路由。使用 `/noticeflow` 时，还须精确转发域名根部的 `/.well-known/oauth-protected-resource/noticeflow/mcp` 和 `/.well-known/oauth-authorization-server/noticeflow`；不要将现有站点整个 `/` 转发给 Noticeflow。容器根路径 `/healthz` 保持私有。`/healthz` 返回进程、数据库和 Worker 状态，不含凭据。

## Limitations

- 只支持单管理员、单个运行实例和本地 SQLite；不含 API key 模式、专用 Client、SMTP、附件或 MCP 管理工具。
- Markdown 加上转义标题后不超过 4096 个 UTF-8 字节；图片、HTML、提及、任务复选框、脚注和删除线会被拒绝，不截断或拆分内容。
- 最多 1000 条未终结任务、4 个并发发送；每 Client 每滚动分钟最多 120 次工具调用，每 Webhook 每滚动分钟最多发起 20 次请求。保守预留可能降低吞吐，自动重试和人工重试共用持久化配额及冷却。
- 可重试错误最多记录 4 次尝试，退避为 1/5/15 分钟。中断的尝试可能重复且不消耗预算。终态任务保留 90 天，未终结任务一直保留到终结。
- 每日及手动在线备份共用最近 7 份的上限，失败不删除既有副本。恢复须取得排他锁，保全旧主文件及 WAL/SHM、撤销授权并暂停发送 60 秒。恢复中断会阻止启动，再次执行恢复命令可继续。恢复验收前保留保全目录；确认无需回退且无恢复标记引用时，再整组删除。
- 公网 HTTPS Host 互操作、一次受控真实企业微信发送、其他镜像平台及与数据规模有关的维护延迟，仍需部署验收；本地夹具不代表这些验收已通过。

## Development

```sh
cd mcp/noticeflow
npm ci --ignore-scripts
npm run typecheck
npm test
npm run build
node dist/main.js serve --config /absolute/path/config.yaml
```

`pretest` 会重建锁定的 SQLite、文件锁及测试转换原生依赖。`src/` 包含服务和维护命令；`test/` 使用临时数据及可控时钟，验证 HTTP、接收、Worker/Webhook 和维护公共边界。

## Links

- [架构说明（英文）](docs/architecture.md)
- [术语表](GLOSSARY.md)
- [变更记录](CHANGELOG.zh-CN.md)
- [仓库许可证](../../LICENSE)
