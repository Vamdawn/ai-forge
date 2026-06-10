# Project Agent Guide

## Scope

- 本文件约束 `/Users/chen/Repository/ai-forge` 中的 prompt、skill、rule、script 等资产编辑。

## Preferences

- Ask 和 Reply 使用中文。
- 需要库/API 文档、代码生成、安装或配置步骤时，默认使用 `find-docs` skill；除非用户已明确提供文档路径或 URL。
- 需要获取 GitHub 仓库时使用 `gh`；需要获取普通网页时使用 `agent-browser`。

## Coding Rules

### 1. Think Before Coding

- 动手前明确假设；有不确定就说清楚。
- 多种解释并存时先列出，不要静默选择。
- 有更简单方案时说明取舍；需求不清时先停下来问。

### 2. Simplicity First

- 只实现用户要求的最小解。
- 不为单次使用抽象，不添加未请求的灵活性或配置项。
- 写完后检查是否过度复杂；能明显缩短就重写。

### 3. Surgical Changes

- 只改与请求直接相关的行。
- 不顺手重构、格式化或删除无关代码。
- 匹配现有风格；只清理由本次改动造成的 unused import、变量或函数。

### 4. Goal-Driven Execution

- 把任务转成可验证目标。
- 多步骤任务先给简短计划：步骤、验证方式、完成标准。
- 修 bug 或加行为时优先写能复现或约束行为的测试，再让它通过。

## Markdown Asset Rules

1. 编辑含 YAML frontmatter 的 Markdown 文件时，必须把 `---` 包围的元数据和后续正文视为两个不同区域。
   - Rationale: 用户要求修改“正文”时，通常不包含 frontmatter；误删元数据会破坏来源、作者、类型等可检索信息。
   - Verification: 修改后检查 frontmatter 仍完整保留，且正文只包含用户要求保留的内容。

2. 当用户说“只保留”“仅保留”“正文只保留”等范围词时，先按最窄语义执行：只改被点名的区域，不删除未被点名的元数据、索引或维护信息。
   - Rationale: 范围词容易被误解为全文件清理；默认收窄范围能减少返工。
   - Verification: `git diff` 中每个被删除的块都能对应用户明确点名的区域。

## Usage

- 执行文档或提示词资产编辑前，先读取本文件中与任务相关的规则。
- 更新本文件时保持简短，提交前确认 `AGENTS.md` 不超过 200 行。
