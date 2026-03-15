---
name: retrospect-session
description: "基于当前会话进行复盘，提炼可复用教训并沉淀到 docs/rules/，并同步更新项目级 AGENTS.md / CLAUDE.md 的规则索引与说明。当用户提到“反思”“复盘”“沉淀规则”“lessons learned”“把经验写进规则”时都应触发。"
allowed-tools: Read, Write, Edit, Glob, Grep
---

# Retrospect Session

将会话经验沉淀为长期可执行规则，统一维护在 `docs/rules/`，并让项目级提示词始终引用最新规则。

## 目标

1. 从当前会话中提炼“可迁移、可执行”的教训。
2. 合并并反思 `docs/rules/` 既有内容，而不是只追加新条目。
3. 更新（或创建）项目级提示词 `AGENTS.md` 与 `CLAUDE.md`，建立 `docs/rules/*.md` 引用并说明规则范围。
4. 按最佳实践规范规则文档格式，控制规模，保证可执行性与可维护性。

## 强制要求

1. 本技能完成时，必须同时检查并同步：
- `docs/rules/*.md`
- `AGENTS.md`
- `CLAUDE.md`
2. 若 `AGENTS.md` 或 `CLAUDE.md` 不存在，必须创建最小可用版本（见下方模板）。
3. 若发现新增规则文件未被项目级提示词引用，必须补齐引用与一句话摘要。
4. 不允许只更新 `docs/rules/` 而跳过项目级提示词同步。

## 执行流程

1. **收集输入**
- 回顾当前会话：用户目标、关键决策、失败尝试、返工点、有效做法。
- 扫描已有规则文件：读取 `docs/rules/**/*.md`。
- 扫描项目级提示词：读取 `AGENTS.md`、`CLAUDE.md`（若不存在，记录为待创建）。

2. **统一提炼教训**
- 将“本次会话教训”与“历史规则要点”放到同一候选池。
- 去重与冲突处理：
  - 语义重复：合并为一条更通用规则。
  - 表述冲突：保留约束更明确、可验证性更强的版本，并在“变更记录”中说明取舍。
- 规则必须是可执行句式（建议用“当...时，必须/应当...”）。

3. **主题分类**
- 先用已有主题；没有合适主题时再新增。
- 推荐主题（按需选用，不强制全建）：
  - `requirements-and-scope.md`
  - `planning-and-decomposition.md`
  - `implementation-and-quality.md`
  - `testing-and-verification.md`
  - `communication-and-collaboration.md`
  - `tools-and-automation.md`
- 文件名使用 kebab-case，主题稳定优先，避免频繁改名。

4. **写入规则文件**
- 目标目录：`docs/rules/`。
- 每个主题文件必须采用统一结构（见“规则文档模板”）。
- 更新方式：优先“重整后覆盖写入”，避免无序追加导致漂移。

5. **200 行分片策略（硬性）**
- 任一主题文件预计超过 **200 行** 时，必须拆分：
  - 按子主题或场景拆分为 `topic-part-1.md`、`topic-part-2.md`...
- 在原主题主文件保留目录索引和适用说明。
- 拆分后每个分片文件也应尽量低于 200 行。

6. **同步项目级提示词（AGENTS.md / CLAUDE.md）**
- 在两个文件中维护统一小节：`## Rules Index`（若不存在则新增）。
- `Rules Index` 至少包含：
  - `docs/rules/*.md` 文件路径
  - 每个文件 1 句用途说明（该文件约束什么）
  - 使用约定：执行相关任务前先读取对应规则文件
- 发现新增规则文件时，必须在 `Rules Index` 增加对应条目。
- 若两个文件描述冲突，以更具体、可执行版本为准，并同步改写另一份。

7. **一致性检查**
- 检查是否遗漏历史规则中的有效内容。
- 检查是否存在跨文件重复规则。
- 检查规则措辞是否可执行、可验证。
- 检查 `AGENTS.md` 与 `CLAUDE.md` 中的 `Rules Index` 是否与 `docs/rules/*.md` 一致。

8. **对用户汇报**
- 给出：
  - 新增/更新了哪些 `docs/rules/*.md` 文件
  - 是否创建/更新了 `AGENTS.md`、`CLAUDE.md`
  - 新增了哪些 `Rules Index` 引用与摘要
  - 合并了哪些重复规则
  - 解决了哪些冲突
  - 是否触发了 200 行拆分

## 规则文档模板（docs/rules/*.md）

```markdown
# <主题名称>

## Scope
- 该文件适用的任务范围与边界。

## Rules
1. 当 <触发条件> 时，必须/应当 <动作>。
   - Rationale: <为什么这样做>
   - Verification: <如何判断已满足>
2. ...

## Anti-Patterns
- <常见错误> -> <正确做法>

## Change Log
- YYYY-MM-DD: <新增/合并/冲突取舍摘要>
```

格式要求：
- 标题使用 `#` 一级标题；固定二级标题：`Scope`、`Rules`、`Anti-Patterns`、`Change Log`。
- `Rules` 必须编号；每条规则必须可验证。
- 禁止空泛表述（如“注意质量”“尽量优化”）。
- 文件名必须为 kebab-case，且与主题一致。

## 项目级提示词模板（最小可用）

当 `AGENTS.md` 或 `CLAUDE.md` 缺失时，创建包含以下最小结构：

```markdown
# Project Agent Guide

## Rules Index
- [docs/rules/<file>.md](docs/rules/<file>.md): <该规则文件约束范围的一句话说明>

## Usage
- 执行任务前，先读取与任务最相关的规则文件。
- 若新增 `docs/rules/*.md`，必须同步更新本文件的 `Rules Index`。
```

## 写作规范（最佳实践）

- 优先写“原则 + 触发条件 + 执行动作 + 验证方式”。
- 主文件保持简洁：仅保留高频、稳定规则；细分规则放在 `docs/rules/*.md` 并在项目级提示词引用。
- 规则避免空话：避免“注意代码质量”这类不可验证表述。
- 语言简洁，避免同义反复。
- 若信息不足，先写最小可用规则，后续迭代补充。

## 输出模板（回复用户时）

```markdown
## 规则沉淀结果

### 本次更新文件
1. docs/rules/xxx.md（新增/更新）
2. docs/rules/yyy.md（新增/更新）
3. AGENTS.md（新增/更新）
4. CLAUDE.md（新增/更新）

### 项目级提示词同步
1. 新增/更新引用：docs/rules/aaa.md -> <一句话摘要>
2. 新增/更新引用：docs/rules/bbb.md -> <一句话摘要>

### 关键合并与冲突处理
1. 合并：A + B -> C（原因）
2. 冲突：旧规则 X vs 新规则 Y，最终采用 Y（原因）

### 拆分情况
1. 是否超过 200 行：是/否
2. 若是，拆分为：docs/rules/topic-part-1.md, docs/rules/topic-part-2.md

### 新增/强化的规则摘要
1. ...
2. ...
3. ...
```

## 边界与异常

- `docs/rules/` 不存在：先创建目录，再继续写入。
- `AGENTS.md` 或 `CLAUDE.md` 不存在：按“项目级提示词模板（最小可用）”创建。
- 历史规则格式混乱：先归一化结构，再分类重写。
- 主题不明确：先放入最接近主题，并在变更记录里标注“待后续重构”。
