# MCP 项目目录与交付方式调研

调研日期：2026-10-18。以下案例来自协议规范、项目方仓库和项目方文档；目录建议是针对 ai-forge 的推论，并非 MCP 规定的目录格式。

| 案例 | 一方证据 | 对 Noticeflow 的启示 |
| --- | --- | --- |
| MCP [架构规范](https://modelcontextprotocol.io/specification/2026-07-28/architecture/index) | host 创建 client；client 与一个 server 通信；server 可为本地进程或远程服务。 | “client”是协议角色，不规定它必须作为库或独立程序分发。 |
| [官方 TypeScript SDK](https://ts.sdk.modelcontextprotocol.io/v2/get-started/packages) | `@modelcontextprotocol/client` 和 `@modelcontextprotocol/server` 是供开发者安装的通用 SDK 包；[Client 教程](https://ts.sdk.modelcontextprotocol.io/v2/get-started/first-client.html)说明现成 Host 可直接连接 Server。 | SDK 需要同时提供两种协议角色的库，不意味着每个 MCP 产品都须交付专用 Client。 |
| [Sentry Toolkit](https://github.com/getsentry/toolkit/blob/main/docs/architecture/overview.md) | `mcp-server` 是发布到 npm 的 stdio 服务端，`mcp-test-client` 是交互式测试客户端；核心实现与部署入口分开。 | 测试客户端是验证工具，不构成生产 Client 交付要求；服务端放 `packages/` 与其 npm 分发方式有关。 |
| [GitHub MCP Server](https://github.com/github/github-mcp-server/blob/main/README.md) | 同一服务有 GitHub 托管的远程 MCP 地址，也提供本地运行的容器镜像。 | MCP server 的交付方式取决于运行形态；远程服务端可以作为镜像部署。 |
| [Playwright MCP](https://github.com/microsoft/playwright-mcp/blob/main/README.md) | 同一服务既能由 `npx @playwright/mcp` 启动，也提供容器镜像和长期运行模式。 | npm 与镜像并非互斥，但没有必要为初版同时维护两种服务端分发途径。 |
| [Cloudflare Agents SDK](https://github.com/cloudflare/agents/blob/main/packages/agents/AGENTS.md) | 同一包公开 `agents/mcp/client` 和 `agents/mcp/server` 入口。 | 同时构建 Host 与 Server 的框架需要两侧能力；单一 MCP Server 产品不因此需要 Client 包。 |

Noticeflow 选 `mcp/noticeflow/` 作为产品目录，初版唯一运行交付物放在 `apps/server/`：它作为远程服务镜像提供 MCP 工具，并持有 SQLite、投递任务和渠道组件。完整链路使用标准 MCP Client SDK 验证，并要求 Claude Code 与 ChatGPT 自定义 MCP Server 连接分别通过真实接入验收；Host 自行管理与 Noticeflow 的连接。初版无独立 Client 程序或库，是否增加取决于后续是否存在脚本或程序调用需求。
