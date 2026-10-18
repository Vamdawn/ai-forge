# 以远程 MCP Server 作为初版运行交付物

Noticeflow 初版只交付远程 MCP Server 镜像；现成 Host 使用自己的通用 MCP Client 连接并调用通知工具。MCP 的 Client 是 Host 内的协议角色，单独开发 Noticeflow Client CLI 并非打通协议链路的必要条件；互操作性由标准 Client SDK 和现成 Host 验证。服务端路由、持久化、重试与可插拔渠道留在 `mcp/noticeflow/apps/server/`，渠道组件不归入仓库顶层的宿主插件目录；独立 CLI 或 Client 库仅在出现对应调用需求时再添加。
