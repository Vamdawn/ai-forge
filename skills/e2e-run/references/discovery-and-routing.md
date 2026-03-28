# Discovery And Routing

按“先发现、后路由、再执行”的顺序处理。

## 1. Discover scripts

优先检查：

1. `playwright.config.*`
2. `cypress.config.*`
3. 根目录和子包 `package.json`
4. 常见测试目录：
   - `tests/e2e/`
   - `e2e/`
   - `apps/*/tests/e2e/`
   - `packages/*/e2e/`

重点匹配：

- 脚本名：`e2e`、`test:e2e`、`playwright`、`cypress`
- 文件名或标签：`smoke`、`critical`、`main`、`main-path`
- 用户传入 `$ARGUMENTS` 相关的路径、文件名、describe 标题或 grep 关键字

如果发现多个 runner：

- 优先选与目标应用最接近的 runner
- 若范围无法缩小，优先 Playwright/Cypress 中仓库推荐的默认 runner
- 仍不明确时停止并解释证据，不要盲跑多个 runner

## 2. Discover specs

把以下目录视为规格目录候选：

1. `specs/e2e/`
2. `docs/e2e/`
3. `tests/e2e/specs/`
4. 项目内已经存在的等价目录

规格文件应至少包含：

- 入口或 `Entry URL`
- 主流程步骤
- 终态断言或 `Expected Results`

如果目录中存在多个相似规格，优先选：

1. 与 `$ARGUMENTS` 最接近的文件
2. 标记为主流程、主链路、critical path 的文件
3. 最近仍被维护、结构最完整的文件

## 3. Infer service startup

检测顺序：

1. workspace 根配置
2. 应用子目录 `package.json`
3. `Makefile`
4. `docker-compose*.yml`
5. `README*`

优先选择：

- `pnpm dev`
- `npm run dev`
- `yarn dev`
- `pnpm --filter [app] dev`
- `make dev`

只有当仓库明确推荐时才使用更重的启动方式，例如 `docker compose up`。

## 4. Route to execution mode

### Route A: `script`

满足以下任一条件即可进入：

- 有可执行 runner 配置和目标测试文件
- 有脚本命令可直接执行，且能明确限定到目标范围

### Route B: `spec`

仅在以下条件成立时进入：

- 没有可执行脚本，或脚本范围明显不适配当前需求
- 存在结构完整的 Markdown 规格

## 5. Default scope policy

当用户未给范围时：

1. 优先只跑 `smoke`、`critical`、`main-path`
2. 若没有标签，则选择主链路最清晰的一组脚本或一个规格文件
3. 若仍无法安全收敛，返回 `needs-input`

## 6. Evidence collection

### Script mode

- 保留 runner 原生退出码
- 保存标准输出、错误输出和关键失败栈
- 索引 runner 生成的截图、视频、trace、xml、html 报告

### Spec mode

- 优先使用 `agent-browser`
- 若无 `agent-browser` 或环境不稳定，则退化为：
  - 使用 `curl` 和有限重试等待入口可达
  - `curl` 验证入口 HTML
  - 验证关键 URL 跳转或 API 返回
- 对不能可靠证明的步骤标记为 `blocked`
