# Review Skill 检查表

> 本文件由 review-skill 在审查时加载。每项标记 ✅ 通过、❌ 不通过、⚠️ 建议优化。

## A. Frontmatter 合规性

| # | 检查项 | 判定规则 |
|---|--------|---------|
| A1 | `name` | 仅小写字母、数字、连字符；≤64 字符；不得以 `claude` 或 `anthropic` 开头；省略时目录名须符合同等约束 |
| A2 | `description` | 存在；≤1024 字符；不含 XML 尖括号 (`<` `>`)；描述用途和适用时机；包含用户自然语言触发词；**格式**：须为 YAML 单行字符串（引号包裹），不得使用 `>`/`>-`/`|` 等块标量格式（会导致 Claude Code 截断或显示异常） |
| A3 | `allowed-tools` | 仅列出 Skill 内容中实际使用的工具；Bash 建议带模式限定（如 `Bash(git *)`）；**间接引用例外**：若工具仅在 SKILL.md 显式引用的子文件中调用（如 `references/fetchers/article.md`），仍须声明在 `allowed-tools` 中，但不应报告为"正文无使用指令"的不一致——有子文件引用说明即视为合规 |
| A4 | `disable-model-invocation` | 有副作用操作（部署、提交、发布、发送消息等）建议设为 `true`；**注意**：设为 `true` 同时阻止通过 `Skill` 工具的程序化调用（包括其他 skill 的 invoke 和 subagent 自动链路）；若该 skill 需要被工具链调用，不应设置此字段 |
| A5 | `user-invocable` | 不应与 `disable-model-invocation: true` 同时设为 `false`（会导致 Skill 不可达） |
| A6 | `context` | 若为 `fork`，Skill 内容须包含可执行任务而非纯指南 |
| A7 | `agent` | 仅在 `context: fork` 时有效；须为 `Explore`、`Plan`、`general-purpose` 或 `.claude/agents/` 下的自定义 agent |
| A8 | `argument-hint` | 若内容使用 `$ARGUMENTS` / `$N`，应提供此字段 |
| A9 | `model` | 若存在，须为合法模型标识 |
| A10 | `hooks` | 若存在，格式须符合 Hooks 规范 |
| A11 | 未知字段 | 不应出现以下合法字段之外的 frontmatter 字段。合法字段并集：Agent Skills 标准字段（`name`、`description`、`license`、`compatibility`、`metadata`）+ Claude Code 扩展字段（`argument-hint`、`disable-model-invocation`、`user-invocable`、`allowed-tools`、`model`、`context`、`agent`、`hooks`） |
| A12 | `description` 结构质量 | 建议符合 `[做什么] + [何时使用/触发词] + [关键能力]` 结构；避免过于笼统（如"帮助处理项目"）或缺少触发条件 |
| A13 | 目录卫生 | Skill 目录内不应包含 `README.md`（文档应放在 `SKILL.md` 或 `references/` 中） |

## B. 指令内容质量

| # | 检查项 | 判定规则 |
|---|--------|---------|
| B1 | 步骤链路完整性 | (1) 有明确的输入来源（`$ARGUMENTS`、用户对话或固定来源）；(2) 步骤间有数据传递关系，无断裂；(3) 有明确的最终输出定义 |
| B2 | 分支覆盖 | 条件分支均有处理（成功/失败/空输入/异常数据） |
| B3 | 退出条件 | 明确定义何时结束，无无限循环风险 |
| B4 | 输出格式 | 最终输出的结构和格式有明确定义 |
| B5 | 行为影响 | 每段内容须影响模型执行行为；标记纯解释性或美化性文本 |
| B6 | 行数控制 | SKILL.md ≤500 行；超出建议拆分到 `references/` 等支持文件 |

## C. 工具使用合规性

| # | 检查项 | 判定规则 |
|---|--------|---------|
| C1 | 声明一致 | Skill 中使用的工具均已在 `allowed-tools` 中声明（若设置了该字段） |
| C2 | 参数约束 | Bash 命令匹配 `allowed-tools` 中的模式；Read 使用绝对路径 |
| C3 | Task 子代理 | 若使用 Task 工具，`subagent_type` 合法，prompt 自包含（不依赖主会话上下文） |

## D. 文件引用有效性

| # | 检查项 | 判定规则 |
|---|--------|---------|
| D1 | 正向检查 | SKILL.md 引用的所有文件均存在于 Skill 目录中 |
| D2 | 反向检查 | 目录中的支持文件均在 SKILL.md 中被引用（无孤立文件） |
| D3 | 路径格式 | 使用相对路径引用同目录文件 |

## E. 变量与动态内容

| # | 检查项 | 判定规则 |
|---|--------|---------|
| E1 | 标准语法 | 仅使用 `$ARGUMENTS`、`$ARGUMENTS[N]`、`$N`、`${CLAUDE_SESSION_ID}`；不出现 `{{...}}`、`<PLACEHOLDER>` 等非标准占位符 |
| E2 | 索引合理 | `$ARGUMENTS[N]` 的 N 不超过 `argument-hint` 暗示的参数数量 |
| E3 | 参数覆盖 | 若 Skill 需要参数，内容中使用了 `$ARGUMENTS` 或 `$N` |
| E4 | 动态注入 | 若使用 `!`command`` 动态注入语法：命令须安全（无 `rm`、`sudo`、网络请求等破坏性操作）且输出可预期（命令存在且有确定输出） |
| E5 | argument-hint 一致性 | 若 frontmatter 中有 `argument-hint` 但内容未使用 `$ARGUMENTS` 或 `$N`，标记为不一致；反之亦然 |

## F. 可移植性

| # | 检查项 | 判定规则 |
|---|--------|---------|
| F1 | 硬编码路径 | 不应包含特定项目路径、目录名或文件名常量（如 `/Users/xxx/`、`3_Resources_资源库/`）；输出位置应通过 `$ARGUMENTS`、动态推断或询问用户确定 |
| F2 | 语言/文化硬编码 | 模板标题、分类名称等结构性文本不应硬编码为单一语言；应使用语言中性占位符，或通过 Adaptation Rules 指导按用户语言填充 |
| F3 | 工具链硬绑定 | 若依赖特定 plugin 或 skill（如 `agent-browser`、`playwright-cli`），须提供降级方案（如 `prefer X if available; otherwise fall back to Y`）；无降级方案则至多标记为 ⚠️ |
