# Service Detection Guide

优先根据仓库事实推断启动方式，只有在证据不足时才向用户追问。

## Detection Order

1. `package.json` 或 workspace 根配置
2. 应用子目录中的 `package.json`
3. `Makefile`
4. `docker-compose*.yml`
5. `README*` 或 `docs/`

## What To Look For

### Package Scripts

优先查找这些脚本：

- `dev`
- `start`
- `preview`
- `serve`

如果是 monorepo，再查：

- `pnpm --filter`
- `turbo run dev`
- `nx serve`

### Framework Hints

常见目录和配置可帮助判断入口：

- Next.js: `app/`、`pages/`、`next.config.*`
- Vite/React: `src/main.*`、`vite.config.*`
- Nuxt: `pages/`、`nuxt.config.*`
- Remix/React Router: `app/routes`、`routes.ts`

### Runtime Signals

启动后尽量确认：

- 使用了哪个端口
- 首页或目标入口页是否返回正常 HTML
- 是否有明显的 API 前缀或代理配置

## Selection Rules

优先选择：

1. 最接近项目推荐开发方式的命令
2. 启动成本低、可交互验证的命令
3. 范围最贴近 `$ARGUMENTS` 对应应用的命令

避免：

- 同时盲跑多个候选命令
- 无说明地启动整个 monorepo
- 为了生成文档而执行高风险部署或写入性命令

## Fallback Questions

如果必须向用户追问，问题要具体，并带上已发现的候选项。例如：

`我已检查根目录和 apps/web/package.json，发现可疑命令是 pnpm dev 与 pnpm --filter web dev，但无法确认当前应启动哪个应用。请告诉我应该运行的启动命令。`

## Validation Threshold

只要能完成以下任意组合，就可以进入文档沉淀：

- 入口页面可达 + 关键跳转存在
- 关键 API 调用路径与代码分析一致
- 成功态或失败态至少有一类被验证

如果外部依赖阻塞完整验证，也可以先输出 `needs-data` 状态的用例，但必须在 `Preconditions` 中说明缺口。
