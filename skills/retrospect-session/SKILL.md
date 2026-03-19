---
name: retrospect-session
description: "基于当前会话进行复盘，提炼可复用教训并沉淀到 docs/rules/，并同步更新项目级 AGENTS.md / CLAUDE.md 的规则索引与说明。当用户提到“反思”“复盘”“沉淀规则”“lessons learned”“把经验写进规则”时都应触发。"
allowed-tools: Read, Write, Edit, Glob, Grep
---

# Retrospect Session

## Overview

将会话经验沉淀为长期可执行规则，统一维护在 `docs/rules/`，并让项目级提示词始终引用最新规则。

## Goals

1. 从当前会话中提炼“可迁移、可执行”的教训。
2. 合并并反思 `docs/rules/` 既有内容，而不是只追加新条目。
3. 更新（或创建）项目级提示词 `AGENTS.md` 与 `CLAUDE.md`，建立 `docs/rules/*.md` 引用并说明规则范围。
4. 按最佳实践规范规则文档格式，控制规模，保证可执行性与可维护性。

## Mandatory Outcomes

1. 本技能完成时，必须同时检查并同步：
   - `docs/rules/*.md`
   - `AGENTS.md`
   - `CLAUDE.md`
2. 若 `AGENTS.md` 或 `CLAUDE.md` 不存在，必须创建最小可用版本（见下方模板）。
3. 若发现新增规则文件未被项目级提示词引用，必须补齐引用与一句话摘要。
4. 不允许只更新 `docs/rules/` 而跳过项目级提示词同步。

## Operating Modes

### Incremental Update

- 仅在本次改动涉及 `1-2` 个 `docs/rules/*.md` 文件，且未发现跨文件重复、职责冲突或明显主题漂移时使用。
- 仅在现有主题边界仍然清晰，且 `AGENTS.md` / `CLAUDE.md` 只需要小幅同步引用或摘要时使用。
- 以局部补充、轻量合并和小范围修订为主，不引入结构重排。

### System Restructure

- 以完整盘点、目标结构定稿和治理动作重写为主，不再依赖局部补丁式追加。
- 适用于需要重写、合并、拆分、`Retire` 或 `Migrate` 规则的场景。
- 默认优先判断是否需要 `System Restructure`，而不是默认走 `Incremental Update`。

## Restructure Triggers

- 涉及 `3` 个及以上规则文件。
- 同义规则跨文件重复。
- 单个文件承载多个主题。
- 现有主题边界已无法容纳新教训。
- 项目级索引描述与实际职责不一致。
- 需要决定保留、合并、迁移或 `Retire` 旧规则。

## Workflow

1. **Assess Current System**
   - 回顾当前会话中的目标、关键决策、失败尝试、返工点和有效做法，明确本次要治理的结构问题。
   - 读取 `docs/rules/**/*.md`、`AGENTS.md`、`CLAUDE.md`，先判断是否满足 `Restructure Triggers`；满足则进入 `System Restructure`，否则走 `Incremental Update`。
   - `Incremental Update` 以局部更新、轻量合并和小范围修订为主；`System Restructure` 才进入完整的目标结构设计与重整动作。

2. **Build Rule Inventory**
   - `Incremental Update` 下，只盘点与本次局部更新直接相关的规则文件；`System Restructure` 下，盘点全部相关规则文件的职责边界、覆盖范围与文件间关系。
   - 标注重复规则、表述冲突、主题漂移、职责交叉，以及项目级索引与真实结构不一致的地方。
   - 不只记录文件名，而是形成“哪些规则在管什么、哪里已经失真”的结构视图。

3. **Design Target Structure**
   - `System Restructure` 下，在动手改写之前，先决定哪些内容应保留、新增、合并、拆分、迁移或 `Retire`。
   - `Incremental Update` 下，只对本次局部范围内需要调整的条目做最小结构决策，不展开全局重整。
   - 明确每个主题文件的最终职责边界，再确定写入顺序和落盘方式。
   - 如果目标结构需要调整项目级提示词的索引范围，先完成结构定稿，再进入同步步骤。

4. **Apply Rewrite / Merge / Split / Retire / Migrate**
   - 按目标结构执行重写、合并、拆分、`Retire` 与 `Migrate`，优先处理结构性问题，而不是在原文件上无序追加。
   - 当单文件职责已经混杂时，允许整体重写；当多个文件表达同类约束时，允许合并；当一个文件承载多个独立场景时，允许拆分。
   - 对已被更稳定规则完全覆盖的内容执行 `Retire`，对仍有效但归属不当的内容执行 `Migrate`。
   - 当主题文件预计超过 `200` 行时，提前拆分为 `topic-part-1.md`、`topic-part-2.md` 等分片，主文件保留目录索引和适用说明。

5. **Sync Project Prompts**
   - 在规则结构定稿后，再同步 `AGENTS.md` / `CLAUDE.md`。
   - 更新 `## Rules Index` 的文件路径、用途摘要和读取约定，确保索引反映当前真实结构。
   - 如果两份项目级提示词存在描述差异，统一改成与当前治理结果一致的版本。

6. **Run Consistency Checks**
   - 检查是否仍有跨文件重复、职责边界不清、规则漂移，或一次性经验被误写成长期规则。
   - 检查 `AGENTS.md` 与 `CLAUDE.md` 中的 `Rules Index` 是否与 `docs/rules/*.md` 保持一致。
   - 检查规则措辞是否仍然支持可执行、可验证的长期维护。

7. **Report Governance Changes**
   - 汇报本次模式判断结果：是 `Incremental Update` 还是 `System Restructure`，以及做出该判断的依据。
   - 汇报实际执行的治理动作，而不只是列出修改过的文件，例如合并、拆分、迁移、`Retire` 和重写了什么。
   - 说明这次治理如何消除了重复、冲突、漂移或索引失真，并保留了哪些稳定规则。

## Abstraction Standard

当前仅保留骨架，后续任务再补充经验抽象方式。

## Rule Writing Standard

- 优先写“原则 + 触发条件 + 执行动作 + 验证方式”。
- 主文件保持简洁：仅保留高频、稳定规则；细分规则放在 `docs/rules/*.md` 并在项目级提示词引用。
- 规则避免空话：避免“注意代码质量”这类不可验证表述。
- 语言简洁，避免同义反复。
- 若信息不足，先写最小可用规则，后续迭代补充。

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
