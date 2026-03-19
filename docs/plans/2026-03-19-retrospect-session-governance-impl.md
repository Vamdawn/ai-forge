# Retrospect Session Governance Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 将 `skills/retrospect-session/SKILL.md` 从“增量追加式复盘指令”重构为“先盘点、再重整、再同步索引”的结构治理型 skill。

**Architecture:** 只修改 `skills/retrospect-session/SKILL.md`，不引入新的脚本、reference 文件或 eval 资产。实现分三段推进：先重组文档骨架，再补入模式判断与治理动作语义，最后精修模板与输出措辞，确保结构一致且不丢失已有约束。

**Tech Stack:** Markdown, skill authoring, manual verification with `sed`, `rg`

---

### Task 1: 重组 SKILL 文档骨架

**Files:**
- Modify: `skills/retrospect-session/SKILL.md`
- Reference: `docs/plans/2026-03-19-retrospect-session-governance-design.md`

**Step 1: 备份并阅读当前 skill 结构**

Run: `sed -n '1,260p' skills/retrospect-session/SKILL.md`
Expected: 看到当前 frontmatter、目标、强制要求、执行流程、模板和异常章节。

**Step 2: 写出新的一级/二级章节骨架**

使用 `apply_patch` 重排 `SKILL.md` 结构，形成以下章节顺序：

```md
# Retrospect Session
## Overview
## Goals
## Mandatory Outcomes
## Operating Modes
## Restructure Triggers
## Workflow
## Abstraction Standard
## Rule Writing Standard
## 规则文档模板（docs/rules/*.md）
## 项目级提示词模板（最小可用）
## 输出模板（回复用户时）
## 边界与异常
```

要求：
- 保留现有 frontmatter 中的 `name`、`description`、`allowed-tools`
- 保留现有模板内容，但先移动到新骨架下
- 暂不补充详细模式判断与动作语义，只先完成结构迁移

**Step 3: 运行快速检查**

Run: `rg -n "^## " skills/retrospect-session/SKILL.md`
Expected: 新章节顺序完整出现，旧的线性“执行流程”仍在但已移动到 `Workflow` 下。

**Step 4: 提交本任务**

```bash
git add skills/retrospect-session/SKILL.md
git commit -m "refactor(skill): reorganize retrospect-session structure"
```

### Task 2: 引入模式判断与重整触发条件

**Files:**
- Modify: `skills/retrospect-session/SKILL.md`
- Reference: `docs/plans/2026-03-19-retrospect-session-governance-design.md`

**Step 1: 写入 Operating Modes**

使用 `apply_patch` 在 `Operating Modes` 章节中加入两个模式：

```md
### Incremental Update
- 仅在 1-2 个规则文件、无重复冲突、主题边界清晰、索引只需小幅同步时允许

### System Restructure
- 只要出现跨文件重复、职责混杂、主题漂移、索引失真或涉及 3 个以上规则文件，即进入
```

要求：
- 明确写出“默认优先判断是否需要 System Restructure”
- 不要使用模糊表述，如“视情况而定”

**Step 2: 写入 Restructure Triggers**

使用 `apply_patch` 单独列出进入体系重整的触发条件：

```md
- 本次改动涉及 3 个及以上规则文件
- 存在同义规则跨文件重复
- 单个文件承载多个主题
- 现有主题边界已无法容纳新教训
- 项目级索引描述与实际职责不一致
- 本次任务需要决定保留 / 合并 / 迁移 / 删除旧规则
```

**Step 3: 校验模式与触发条件是否可检索**

Run: `rg -n "Incremental Update|System Restructure|涉及 3 个及以上|跨文件重复|索引描述与实际职责不一致" skills/retrospect-session/SKILL.md`
Expected: 能定位到新增模式定义和触发条件。

**Step 4: 提交本任务**

```bash
git add skills/retrospect-session/SKILL.md
git commit -m "feat(skill): add restructure modes and triggers"
```

### Task 3: 把工作流改成治理导向流程

**Files:**
- Modify: `skills/retrospect-session/SKILL.md`
- Reference: `docs/plans/2026-03-19-retrospect-session-governance-design.md`

**Step 1: 重写 Workflow**

使用 `apply_patch` 将当前线性“执行流程”改写为以下顺序：

```md
1. Assess Current System
2. Build Rule Inventory
3. Design Target Structure
4. Apply Rewrite / Merge / Split / Retire / Migrate
5. Sync Project Prompts
6. Run Consistency Checks
7. Report Governance Changes
```

**Step 2: 为每一步补入明确动作**

要求至少覆盖这些要点：
- `Assess Current System`：读取会话、规则文件、项目级提示词，并先判断模式
- `Build Rule Inventory`：盘点职责、重复、冲突、漂移、索引失真
- `Design Target Structure`：先决定保留、新增、合并、拆分、迁移、废弃
- `Sync Project Prompts`：在结构定稿后再改 `AGENTS.md` / `CLAUDE.md`
- `Report Governance Changes`：汇报模式判断和治理动作，不只列文件

**Step 3: 校验旧流程残留**

Run: `rg -n "收集输入|统一提炼教训|主题分类|写入规则文件|一致性检查|对用户汇报" skills/retrospect-session/SKILL.md`
Expected: 旧术语要么已删除，要么只以被新流程吸收后的形式存在。

**Step 4: 提交本任务**

```bash
git add skills/retrospect-session/SKILL.md
git commit -m "refactor(skill): switch retrospect workflow to governance flow"
```

### Task 4: 补入治理动作语义与抽象标准

**Files:**
- Modify: `skills/retrospect-session/SKILL.md`

**Step 1: 新增 Abstraction Standard**

使用 `apply_patch` 写入以下约束：

```md
- 不要把本次会话中的具体事件原样写成长期规则
- 先识别可重复失败模式，再提炼为触发条件、动作和验证方式
- 仅适用于当前一次会话的经验，不进入长期规则库
```

**Step 2: 在 Workflow 中明确定义治理动作**

为 `Rewrite / Merge / Split / Retire / Migrate` 加定义：

```md
- Rewrite: 文件职责混杂或局部 patch 无法恢复结构时整体重写
- Merge: 两个文件约束同类决策时合并
- Split: 一个文件覆盖多个独立场景时拆分
- Retire: 被更高质量规则完全覆盖时删除旧条目
- Migrate: 规则有效但当前归属主题错误时迁移
```

**Step 3: 校验“允许删除旧结构”的授权已写入**

Run: `rg -n "Retire|删除旧条目|迁移|整体重写|局部 patch" skills/retrospect-session/SKILL.md`
Expected: 能看到明确授权删除、迁移和整体重写的语义。

**Step 4: 提交本任务**

```bash
git add skills/retrospect-session/SKILL.md
git commit -m "feat(skill): define governance actions and abstraction standard"
```

### Task 5: 精修模板与输出，使其反映治理结果

**Files:**
- Modify: `skills/retrospect-session/SKILL.md`

**Step 1: 更新输出模板**

使用 `apply_patch` 调整“回复用户时”模板，确保新增以下信息：

```md
### 治理模式判断
1. 本次属于增量更新 / 体系重整
2. 判断依据：...

### 关键结构调整
1. 合并：...
2. 拆分：...
3. 迁移：...
4. 废弃：...
```

**Step 2: 保持已有模板和硬性要求不丢失**

检查并保留：
- `docs/rules/*.md`
- `AGENTS.md`
- `CLAUDE.md`
- `Rules Index`
- `200 行分片策略`

**Step 3: 通读全文做一致性清理**

Run: `sed -n '1,260p' skills/retrospect-session/SKILL.md`
Expected: 文档从头到尾都以“治理规则体系”为主线，没有明显回退到“机械追加”的措辞。

**Step 4: 提交本任务**

```bash
git add skills/retrospect-session/SKILL.md
git commit -m "docs(skill): align retrospect outputs with governance workflow"
```

### Task 6: 最终验证与收尾

**Files:**
- Verify: `skills/retrospect-session/SKILL.md`
- Verify: `docs/plans/2026-03-19-retrospect-session-governance-design.md`

**Step 1: 运行关键文案检查**

Run: `rg -n "System Restructure|Build Rule Inventory|Design Target Structure|Retire|Abstraction Standard|Rules Index" skills/retrospect-session/SKILL.md`
Expected: 关键治理概念都存在。

**Step 2: 对照设计文档抽查一致性**

Run: `sed -n '1,260p' docs/plans/2026-03-19-retrospect-session-governance-design.md`
Expected: 实现后的 `SKILL.md` 覆盖设计文档中的核心决策点。

**Step 3: 查看最终 diff**

Run: `git diff -- skills/retrospect-session/SKILL.md`
Expected: 变更聚焦于章节结构、模式判断、治理流程和输出模板，没有无关改动。

**Step 4: 最终提交**

```bash
git add skills/retrospect-session/SKILL.md
git commit -m "refactor(skill): make retrospect-session governance-first"
```
