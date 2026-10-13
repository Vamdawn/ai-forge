# Prompt Asset Rules

## Scope

- 新增或编辑 `prompts/*.md`。frontmatter 与正文的区域边界另见 [markdown-assets.md](markdown-assets.md)。

## Rules

1. 每个 prompt 必须带 YAML frontmatter，必填字段：`title`、`type: prompt-template`、`language`（`zh` 或 `en`，取正文主体语言）。
   - Rationale: 字段统一后才能按类型、语言检索；缺 frontmatter 的文件无法与普通 Markdown 区分。
   - Verification: 每个 `prompts/*.md` 首行为 `---`，闭合前包含三个必填字段。

2. 提示词来自第三方时，必须保留 `source`（原始链接）和 `author`；有对应文章时加 `article`。自行编写的 prompt 不写这三个字段。
   - Rationale: 归属信息一旦丢失无法回溯；给自写内容补虚假来源同样会误导。
   - Verification: 有 `source` 的文件同时有 `author`，且链接与原文一致。

3. prompt 与 skill 的分类以 [asset-layout.md](asset-layout.md) 为准，`prompts/` 仅放单个 `.md` 文件。
   - Verification: `prompts/` 下只有单个 `.md` 文件，没有子目录。

## Change Log

- 2026-10-13: 资产分类改为引用目录规范真源，保留 prompt 文件布局的校验要求。
- 2026-10-12: 初版，固化 prompts frontmatter 约定与 prompt/skill 边界。
