---
name: review-skill
description: >-
  审查 Claude Code Skill 的 YAML frontmatter、指令质量、工具声明、文件引用和变量语法是否符合官方规范，输出含严重程度分级的结构化报告。
  Use when asked to review, check, validate, audit, or lint a skill.
  触发词：review skill、检查 skill、审查技能、validate skill、lint skill、skill 审查、skill 合规检查。
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
3. 读取官方规范（按优先级尝试）：
   - 项目根目录下 `docs/Extend Claude with skills.md`（Claude Code 官方文档）
   - 项目根目录下 `docs/The-Complete-Guide-to-Building-Skill-for-Claude.md`（完整构建指南）
   - 若两份均不存在 → 基于内置知识完成审查，并在报告开头注明「未加载官方规范，结果基于内置知识」
4. 读取完整检查表：本 Skill 目录下的 `references/checklist.md`

## 步骤 2 — 逐项检查

对照 `references/checklist.md` 中的检查表逐项判定。每项标记 ✅ 通过、❌ 不通过、⚠️ 建议优化。
使用 Grep 在目标 SKILL.md 中检索关键模式（如 `$ARGUMENTS`、工具名称、`{{`、`<PLACEHOLDER>` 等）以辅助 C1、E1-E5 等项的判定。

检查覆盖 5 个类别共 30 项：

| 类别 | 编号范围 | 检查要点 |
|------|----------|----------|
| A. Frontmatter 合规性 | A1-A13 | name/description 格式与内容、字段合法性、安全限制、目录卫生 |
| B. 指令内容质量 | B1-B6 | 步骤完整性、分支覆盖、退出条件、输出格式、行数控制 |
| C. 工具使用合规性 | C1-C3 | 声明一致性、参数约束、Task 子代理 |
| D. 文件引用有效性 | D1-D3 | 正向/反向引用检查、路径格式 |
| E. 变量与动态内容 | E1-E5 | 标准语法、索引合理性、动态注入安全性、argument-hint 一致性 |

**判定原则**：
- 规范文档中有明确规则的项 → 严格判定（❌ 或 ✅）
- 属于最佳实践建议的项 → 标记为 ⚠️ 而非 ❌
- 不确定是否违规时 → 标记为 ⚠️ 并说明疑点

## 步骤 3 — 输出报告

### 发现问题时

按严重程度降序排列：

| # | 检查项 | 严重程度 | 位置 | 问题 | 建议修复 |
|---|--------|---------|------|------|---------|

**严重程度定义**：
- **高**：Skill 无法触发、执行报错或产生错误结果
- **中**：不阻断执行但降低可靠性或可维护性
- **低**：最佳实践建议

**建议修复要求**：
- 高/中严重程度项：须提供可直接采用的修改内容（如修正后的 YAML 片段、修改后的文本）
- 低严重程度项：说明改进方向即可

### 无问题时

输出：`✅ 未发现问题。已检查 A1-A13、B1-B6、C1-C3、D1-D3、E1-E5 共 30 项。`

## 示例

### 示例 1：典型问题报告

输入：`/review-skill .claude/skills/my-deploy/`

输出片段：

| # | 检查项 | 严重程度 | 位置 | 问题 | 建议修复 |
|---|--------|---------|------|------|---------|
| A2 | `description` | 中 | frontmatter | 仅 15 字符"部署应用"，缺少触发词和使用时机 | 扩展为：`description: 部署应用到生产环境。Use when asked to deploy, release, or push to production.` |
| A4 | `disable-model-invocation` | 中 | frontmatter | 含部署操作但未设为 true | 添加 `disable-model-invocation: true` |
| C1 | 声明一致 | 高 | 步骤 3 | 使用了 Bash 但 allowed-tools 未声明 | 在 allowed-tools 中添加 `Bash(deploy *)` |

### 示例 2：全部通过

输入：`/review-skill .claude/skills/explain-code/`

输出：`✅ 未发现问题。已检查 A1-A13、B1-B6、C1-C3、D1-D3、E1-E5 共 30 项。`

## 判定模糊时的处理

某些检查项（如 B1 步骤链路、B5 行为影响）需要主观判断。此时标记为 ⚠️ 并在「问题」列详细说明疑点，供用户自行判断。
