---
name: e2e-run
description: "运行当前项目的 e2e 资产，保存执行结果，并输出问题分析与后续建议。Use when the user asks to run e2e tests, execute Playwright/Cypress cases, validate an existing e2e spec against a running service, save test results, investigate e2e failures, or summarize end-to-end execution evidence. 触发词：运行 e2e、执行端到端测试、跑 Playwright、跑 Cypress、验证 e2e 用例、保存测试结果、分析 e2e 失败。"
argument-hint: "[feature-or-path]"
disable-model-invocation: true
allowed-tools: Read, Glob, Grep, Write, Bash(rg *), Bash(find *), Bash(ls *), Bash(cat *), Bash(sed *), Bash(test *), Bash(pnpm *), Bash(npm *), Bash(yarn *), Bash(make *), Bash(docker compose *), Bash(turbo *), Bash(nx *), Bash(npx *), Bash(node *), Bash(bun *), Bash(curl *), Bash(agent-browser *), Bash(mkdir *), Bash(cp *), Bash(ln *), Bash(tee *), Bash(date *), Bash(kill *), Bash(sleep *)
---

# E2E Run

运行当前项目中已经存在的 e2e 资产，并把执行证据、问题分类和下一步建议沉淀为稳定产物。该 skill 不是用来生成新用例；如果仓库里没有 e2e 脚本或规格，应明确建议使用 `/e2e-find`。该 skill 仅面向用户显式触发，不用于其他 skill 链式调用。

## Goals

1. 先发现已有 e2e 资产，再决定执行路径，不盲跑命令。
2. 优先复用项目原生测试框架；只有在缺少脚本时才走规格驱动验证。
3. 每次执行都保存一份可追溯快照，包含人类可读报告和机器可读摘要。
4. 问题分析必须可操作，区分环境、数据、脚本失败、规格漂移与未知问题。

## Additional Resources

- 发现规则与双路径路由见 [references/discovery-and-routing.md](references/discovery-and-routing.md)
- 结果目录与落盘策略见 [references/output-policy.md](references/output-policy.md)
- Markdown 报告结构见 [references/report-template.md](references/report-template.md)
- JSON 摘要结构见 [references/summary-template.md](references/summary-template.md)

## Evaluation Assets

- `evals/evals.json` 提供触发与行为样例，用于验证是否先发现资产、是否正确路由到脚本执行或规格验证、以及是否在缺失用例时回退到 `/e2e-find`
- `agents/openai.yaml` 提供该 skill 的 UI 元数据，应与本文件中的定位和触发词保持一致

## Workflow

### Step 1: Gather project context

优先读取以下事实来源：

- 根目录和子包中的 `package.json`
- `pnpm-workspace.yaml`、`turbo.json`、`nx.json`
- `playwright.config.*`、`cypress.config.*`
- `Makefile`、`docker-compose*.yml`
- `README*`、`docs/`

如果用户传入 `$ARGUMENTS`，将其视为范围提示，例如：

- 路由或页面：`/login`
- 功能：`checkout`
- 用例路径或目录：`tests/e2e/auth`

### Step 2: Discover e2e assets

按照 [references/discovery-and-routing.md](references/discovery-and-routing.md) 发现并分类资产：

- `script`：可直接运行的 Playwright/Cypress/项目原生 e2e 脚本
- `spec`：Markdown 规格，通常来自 `specs/e2e/`、`docs/e2e/`、`tests/e2e/specs/`

记录以下事实：

- 发现了哪些 runner、脚本命令、测试目录和规格文件
- 默认运行范围是 `smoke`、`critical`、`main-path` 还是用户显式指定范围
- 哪些候选资产被排除，以及排除原因

如果既没有 `script` 也没有 `spec`，立即停止，并明确建议用户先使用 `/e2e-find` 生成或补齐用例。

### Step 3: Infer how to run the service

根据 [references/discovery-and-routing.md](references/discovery-and-routing.md) 推断被测服务的启动命令与入口地址。

优先选择：

1. 最接近项目推荐开发方式的命令
2. 能支撑当前 `$ARGUMENTS` 范围验证的目标应用
3. 启动成本最低、最容易获得稳定证据的命令

不要无说明地同时盲跑多个候选命令。
如果推断出的正确启动或执行命令超出当前 allowlist，可返回 `needs-input`，并明确说明发现了什么、为什么当前 skill 不应盲跑。

### Step 4: Select execution mode

按以下顺序路由：

1. 若发现可执行脚本，则以 `script` 模式为主
2. 若没有脚本，但存在 Markdown 规格，则进入 `spec` 模式
3. 若两类都存在，可用规格辅助限定范围、命名产物和补充问题分析，但不要让规格覆盖脚本真实结果

如果用户没有指定范围，默认只跑 `smoke`、`critical`、`main-path` 小集合；若项目内没有这些标记，则选择主链路最清晰的一组案例。无法安全收敛时，停止并说明原因。

### Step 5: Execute and collect evidence

#### Script mode

- 启动服务
- 记录本次启动进程的 PID 或等价标识，只允许清理由本次运行启动的进程
- 运行项目原生 e2e 命令或最小必要的 runner 命令
- 将标准输出、错误输出和关键失败片段写入快照目录
- 尽可能保留 runner 自带的报告、trace、截图、视频或 junit/xml 文件

#### Spec mode

- 启动服务
- 记录本次启动进程的 PID 或等价标识，只允许清理由本次运行启动的进程
- 读取目标规格中的主流程、前置条件、终态断言与代码锚点
- 优先使用 `agent-browser` 执行真实交互验证
- 若不可用或不稳定，则降级到带重试的 HTTP 可达性检查、入口 HTML、关键 URL 跳转、关键 API 返回等最小证据
- 不要把规格伪装成已自动化脚本；无法可靠验证的步骤标记为 `blocked`

### Step 6: Save outputs

严格遵循 [references/output-policy.md](references/output-policy.md)：

- 为本次运行选择一个稳定的项目内结果目录
- 为单次执行创建独立快照目录
- 至少写入 `report.md`、`summary.json`、`service.log`、`runner.log`
- 若有截图、trace、视频或 HAR，统一放到 `evidence/`
- 在收尾阶段停止本次 skill 启动的服务进程；如果服务不是本次启动，只记录现状，不主动终止

`report.md` 和 `summary.json` 的字段必须分别遵循：

- [references/report-template.md](references/report-template.md)
- [references/summary-template.md](references/summary-template.md)

### Step 7: Analyze issues

对每个失败、阻塞或可疑结果做归因，分类仅限：

- `environment`
- `data/auth`
- `test failure`
- `spec drift`
- `unknown`

分析中必须包含：

- 触发该问题的用例或规格
- 证据来源
- 为什么归到该类别
- 最小下一步建议

### Step 8: Report results to the user

汇报时至少说明：

- 本次采用了 `script` 还是 `spec` 模式
- 选择了哪个启动命令和入口地址
- 执行了哪些用例或规格
- 通过、失败、阻塞各有多少
- 结果目录和关键证据文件位置
- 如果无用例，为什么建议转到 `/e2e-find`

## Guardrails

- 不要先跑服务再猜用例。
- 不要默认跑全量 e2e，除非用户明确要求。
- 不要覆盖上一次结果；每次执行必须保留独立快照。
- 不要把日志直接堆进最终回复；把日志写入文件，在回复中给出结论和路径。
- 不要把规格驱动验证描述成“测试已全部自动化通过”。
- 不要省略失败证据和下一步建议。

## Examples

### Example 1: 执行现有 Playwright 用例

用户说：`运行这个项目的登录 e2e，并把失败原因记下来`

你应当：

1. 先找 Playwright 配置、测试目录和登录相关标签或文件
2. 判断服务启动命令和登录入口
3. 跑最小必要的登录用例
4. 把结果保存为一次快照，并输出失败归因

### Example 2: 只有规格，没有脚本

用户说：`根据现有 e2e 规格验证 checkout 主流程，并保存结果`

你应当：

1. 找到 checkout 规格文件
2. 启动目标服务
3. 优先用 `agent-browser` 验证主流程，否则退化到 HTTP 和入口证据
4. 把结果标记为 `spec` 模式，并说明哪些步骤仍需真实自动化脚本

### Example 3: 没有任何 e2e 资产

用户说：`帮我跑一下这个项目的 e2e`

你应当：

1. 发现仓库里既无 e2e 脚本也无 e2e 规格
2. 明确给出已检查的目录和配置
3. 建议用户改用 `/e2e-find` 先生成或补齐用例

## Troubleshooting

### 无法判断启动命令

列出已检查的文件、候选命令和缺失信息。不要盲跑多个服务。

### 需要账号、验证码或外部依赖

允许继续收集最小证据，但将受影响用例标记为 `blocked` 或 `needs-input`，并在报告中说明缺口。

### runner 自带报告目录不稳定

优先保留原始 runner 产物路径，同时在本次快照目录内建立索引或拷贝必要证据，不要强行改写项目现有配置。

### 服务可能遗留后台进程

仅允许终止本次 skill 显式启动并记录了 PID 的进程。若端口已被已有服务占用，只记录并复用或返回 `needs-input`，不要杀掉未知来源的进程。
