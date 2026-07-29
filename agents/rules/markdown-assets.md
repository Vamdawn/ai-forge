# Markdown Asset Rules

## Scope

- 编辑本仓库中含 YAML frontmatter 的 Markdown 资产（prompts、skills、rules 等）。

## Rules

1. 编辑含 YAML frontmatter 的 Markdown 文件时，必须把 `---` 包围的元数据和后续正文视为两个不同区域。
   - Rationale: 用户要求修改"正文"时，通常不包含 frontmatter；误删元数据会破坏来源、作者、类型等可检索信息。
   - Verification: 修改后检查 frontmatter 仍完整保留，且正文只包含用户要求保留的内容。

2. 当用户说"只保留""仅保留""正文只保留"等范围词时，先按最窄语义执行：只改被点名的区域，不删除未被点名的元数据、索引或维护信息。
   - Rationale: 范围词容易被误解为全文件清理；默认收窄范围能减少返工。
   - Verification: `git diff` 中每个被删除的块都能对应用户明确点名的区域。

## Change Log

- 2026-07-29: 自 AGENTS.md 下沉至本文件，内容不变。
