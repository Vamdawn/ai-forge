---
name: review-skill
description: >-
  审查 Claude Code Skill 是否符合官方规范并输出结构化报告。
  Use when asked to review, check, validate, or audit a skill.
  触发词：review skill、检查 skill、审查技能、validate skill。
argument-hint: [skill-path]
disable-model-invocation: true
allowed-tools: Read, Glob, Grep
---

审查指定 Skill 的规范合规性，输出结构化报告。不要自动修复，只报告问题。

## 步骤 1 — 加载上下文

1. 解析 `$ARGUMENTS`：
   - 若为目录路径 → 读取该目录下的 `SKILL.md`
   - 若为文件路径 → 直接读取该文件
   - 若路径不存在或无 SKILL.md → 输出错误信息并终止
2. 用 Glob 列出该 Skill 目录下所有文件（含子目录）
3. 读取官方规范：项目根目录下 `docs/Extend Claude with skills.md`
   - 若该文件不存在 → 基于内置知识完成审查，并在报告开头注明「未加载官方规范，结果基于内置知识」

## 步骤 2 — 逐项检查

对照以下检查表逐项判定。每项标记 ✅ 通过、❌ 不通过、⚠️ 建议优化。

### A. Frontmatter 合规性

| # | 检查项 | 判定规则 |
|---|--------|---------|
| A1 | `name` | 仅小写字母、数字、连字符；≤64 字符；省略时目录名须符合同等约束 |
| A2 | `description` | 存在且描述用途和适用时机；包含用户自然语言触发词 |
| A3 | `allowed-tools` | 仅列出 Skill 内容中实际使用的工具；Bash 建议带模式限定（如 `Bash(git *)`） |
| A4 | `disable-model-invocation` | 有副作用操作（部署、提交、发布、发送消息等）建议设为 `true` |
| A5 | `user-invocable` | 不应与 `disable-model-invocation: true` 同时设为 `false` |
| A6 | `context` | 若为 `fork`，Skill 内容须包含可执行任务而非纯指南 |
| A7 | `agent` | 仅在 `context: fork` 时有效；须为 `Explore`、`Plan`、`general-purpose` 或自定义 agent |
| A8 | `argument-hint` | 若内容使用 `$ARGUMENTS` / `$N`，应提供此字段 |
| A9 | `model` | 若存在，须为合法模型标识 |
| A10 | `hooks` | 若存在，格式须符合 Hooks 规范 |
| A11 | 未知字段 | 不应出现规范定义之外的 frontmatter 字段 |

### B. 指令内容质量

| # | 检查项 | 判定规则 |
|---|--------|---------|
| B1 | 步骤链路 | 从输入到输出有完整路径，无断裂步骤 |
| B2 | 分支覆盖 | 条件分支均有处理（成功/失败/空输入/异常数据） |
| B3 | 退出条件 | 明确定义何时结束，无无限循环风险 |
| B4 | 输出格式 | 最终输出的结构和格式有明确定义 |
| B5 | 行为影响 | 每段内容须影响模型执行行为；标记纯解释性或美化性文本 |
| B6 | 行数控制 | SKILL.md ≤500 行；超出建议拆分到支持文件 |

### C. 工具使用合规性

| # | 检查项 | 判定规则 |
|---|--------|---------|
| C1 | 声明一致 | Skill 中使用的工具均已在 `allowed-tools` 中声明（若设置了该字段） |
| C2 | 参数约束 | Bash 命令匹配 `allowed-tools` 中的模式；Read 使用绝对路径 |
| C3 | Task 子代理 | 若使用 Task 工具，`subagent_type` 合法，prompt 自包含（不依赖主会话上下文） |

### D. 文件引用有效性

| # | 检查项 | 判定规则 |
|---|--------|---------|
| D1 | 正向检查 | SKILL.md 引用的所有文件均存在于 Skill 目录中 |
| D2 | 反向检查 | 目录中的支持文件均在 SKILL.md 中被引用（无孤立文件） |
| D3 | 路径格式 | 使用相对路径引用同目录文件 |

### E. 变量与动态内容

| # | 检查项 | 判定规则 |
|---|--------|---------|
| E1 | 标准语法 | 仅使用 `$ARGUMENTS`、`$ARGUMENTS[N]`、`$N`、`${CLAUDE_SESSION_ID}`；不出现 `{{...}}`、`<PLACEHOLDER>` 等非标准占位符 |
| E2 | 索引合理 | `$ARGUMENTS[N]` 的 N 不超过 `argument-hint` 暗示的参数数量 |
| E3 | 参数覆盖 | 若 Skill 需要参数，内容中使用了 `$ARGUMENTS` 或 `$N` |
| E4 | 动态注入 | 若使用动态注入语法（感叹号+反引号包裹的命令），命令须安全且输出可预期 |

## 步骤 3 — 输出报告

### 发现问题时

按严重程度降序排列：

| # | 检查项 | 严重程度 | 位置 | 问题 | 建议修复 |
|---|--------|---------|------|------|---------|

**严重程度定义**：
- **高**：Skill 无法触发、执行报错或产生错误结果
- **中**：不阻断执行但降低可靠性或可维护性
- **低**：最佳实践建议

### 无问题时

输出：`✅ 未发现问题。已检查 A1-A11、B1-B6、C1-C3、D1-D3、E1-E4 共 27 项。`
