---
name: e2e-find
description: "运行当前 Web 服务，基于代码分析系统交互链路，生成或迭代端到端测试用例 Markdown 规格。Use when the user asks to analyze a web app flow, discover e2e scenarios, generate test cases from code, update existing e2e case docs, or derive user journeys before writing Playwright/Cypress tests. 触发词：e2e 用例、端到端测试、用户流程、交互链路、测试场景、生成测试用例、更新 e2e 文档。"
argument-hint: "[feature-or-entry]"
disable-model-invocation: true
allowed-tools: Read, Glob, Grep, Edit, Write, Bash
---

# E2E Case Discovery

为当前项目生成或更新 Markdown e2e 用例规格。先理解代码，再验证服务，最后沉淀可复用的流程文档。

## Goals

1. 先分析代码，再设计用例，避免只靠页面试错。
2. 一条完整业务流程只保留一个稳定文件，避免重复沉淀。
3. 旧用例过时时，在原文件基础上迭代，而不是制造散落版本。
4. 输出既能给人阅读，也能给后续 Agent 直接转换成自动化脚本。

## Output Location Policy

为当前仓库选择一个规范且稳定的用例目录，优先级如下：

1. 若项目已存在用于 e2e 规格的目录，优先沿用，例如 `specs/e2e/`、`docs/e2e/`、`tests/e2e/specs/`
2. 若存在多个候选目录，优先选择最接近“规格文档”而非“自动化脚本”的目录
3. 若未发现现成约定，则创建 `specs/e2e/`

一旦为当前仓库选定目录，本次执行中应保持一致。每个完整流程对应一个文件：`<selected-case-dir>/<flow-slug>.md`

## Additional Resources

- 用例结构模板见 [references/case-template.md](references/case-template.md)
- 去重与迭代规则见 [references/dedup-and-evolution.md](references/dedup-and-evolution.md)
- 启动服务与入口探测规则见 [references/service-detection.md](references/service-detection.md)

## Evaluation Assets

- `evals/evals.json` 提供该 skill 的触发测试样例，用于后续评估“是否先分析代码、是否避免重复、是否正确迭代旧用例”

## Workflow

### Step 1: Gather project context

优先读取与应用结构最相关的文件：

- 根目录和子包中的 `package.json`
- `pnpm-workspace.yaml`、`turbo.json`、`nx.json`
- `vite.config.*`、`next.config.*`、`nuxt.config.*`
- `Makefile`、`docker-compose*.yml`、`README*`
- 路由和页面目录，如 `src/pages`、`src/app`、`pages`、`app`、`src/routes`

如果用户传入 `$ARGUMENTS`，将其视为范围提示：

- 路由，例如 `/login`
- 功能，例如 `checkout`
- 页面入口，例如 `settings profile`

先缩小分析范围，再扩展到相关依赖链路。

### Step 2: Extract candidate flows from code

从代码而不是页面截图出发，提炼候选流程。重点寻找：

- 页面入口和导航路径
- 表单提交、按钮点击和关键用户动作
- 路由跳转和守卫逻辑
- 关键状态切换，如未登录 -> 已登录、购物车空 -> 下单成功
- 页面调用的 API、server action、mutation、loader、fetcher
- 影响流程成败的校验、错误态和成功态

只保留“有明确用户目标和终态断言”的流程。不要把纯浏览型页面或无闭环的局部交互写成完整 e2e 用例。

### Step 3: Infer how to run the service

按照 [references/service-detection.md](references/service-detection.md) 的顺序推断启动方式：

1. 先看 monorepo 和 workspace 配置
2. 再看常见脚本，如 `dev`、`start`、`preview`
3. 再看 `Makefile`、`docker-compose`、README 中的推荐命令

优先选择开发成本最低且最接近本地预览的命令。常见候选包括：

- `pnpm dev`
- `npm run dev`
- `yarn dev`
- `pnpm --filter <app> dev`
- `make dev`
- `docker compose up <service>`

如果无法稳定判断，不要盲目执行。此时应明确告诉用户：

- 已检查过哪些文件
- 有哪些可疑入口
- 还缺哪条启动信息

### Step 4: Run the service and validate the main path

启动服务后，确认可访问地址和实际入口。优先从代码中推断的关键入口验证：

- 首页或功能入口页是否可达
- 关键导航是否闭环
- 提交流程是否有成功态和失败态
- API 调用和 UI 反馈是否与代码分析一致

如果环境中可用浏览器自动化能力，优先用它验证真实交互。否则最少验证：

- 端口监听成功
- 入口页面返回正常内容
- 关键 API 或重定向链存在

验证的目的不是穷举点击，而是校准代码分析得到的流程边界。

### Step 5: Load and compare existing cases

读取 `<selected-case-dir>/*.md`。按 [references/dedup-and-evolution.md](references/dedup-and-evolution.md) 判断每个候选流程是：

- `new`：尚无对应流程，创建新文件
- `update`：已有同一流程，更新原文件
- `skip`：已有文档已覆盖，且本次没有有效变化

不要仅凭标题判断是否重复。必须综合以下稳定键：

- `entry route`
- `primary user goal`
- `critical state transition`
- `terminal assertion`

### Step 6: Write or update case files

写入时严格遵循 [references/case-template.md](references/case-template.md) 的结构。

具体要求：

- 一个文件只描述一条完整流程
- `User Steps` 只保留关键动作和关键反馈
- `Expected Results` 必须包含终态断言
- `Code Anchors` 必须能回溯到路由、页面、组件、hook、action 或 API handler
- `Known Variants` 只记录值得后续扩展的分支，不把所有分支塞进主流程
- 更新旧文件时保留稳定的 `Flow ID` 和文件名，并追加 `Change Log`

### Step 7: Report results

向用户汇报：

- 新增了哪些流程文件
- 更新了哪些旧流程
- 跳过了哪些候选流程及原因
- 启动服务和验证过程中采用了什么入口与证据
- 哪些流程仍需用户补充账号、种子数据或外部依赖

## Case Quality Bar

每条用例必须同时满足：

1. 有明确用户目标
2. 有清晰入口
3. 有关键步骤而不是页面堆砌
4. 有终态断言
5. 有代码锚点
6. 能解释为什么它是新流程、旧流程迭代或应跳过

## Guardrails

- 不要先跑服务再猜流程；先读代码。
- 不要创建按页面切碎的“伪流程”文档。
- 不要为同一流程生成 `v2`、`new`、`latest` 一类散乱文件名。
- 不要把一次性的本地异常写进主流程；放进 `Known Variants` 或 `Change Log`。
- 不要把 selector 细节写成主叙述，除非它对后续自动化实现至关重要。

## Examples

### Example 1: 登录流程

用户说：`为这个项目生成登录相关的 e2e 用例`

你应当：

1. 先定位登录入口、表单提交和鉴权状态切换
2. 确认登录成功后的跳转或 session 建立逻辑
3. 启动服务验证入口可达和成功态
4. 将流程写成 `<selected-case-dir>/login-with-password.md`

### Example 2: 已有结账流程需要更新

用户说：`checkout 流程改了，更新现有 e2e 用例`

你应当：

1. 读取当前用例目录中与 checkout 相关的文件
2. 对照当前代码中的步骤、状态切换和终态
3. 命中同一流程时就地更新原文件
4. 在 `Change Log` 说明为何更新，而不是新建重复文件

## Troubleshooting

### 无法判断启动命令

先列出已检查的文件和候选命令，再向用户请求缺失信息。不要盲跑多个命令污染环境。

### 需要账号、验证码或外部服务

保留流程文档，但在 `Preconditions` 和 `Known Variants` 中明确缺口，并说明哪些验证只完成了静态链路确认。

### 代码里有多个相似入口

优先保留用户目标最清晰、终态最稳定的主流程。其余入口写入 `Known Variants`，除非它们对应不同主目标。
