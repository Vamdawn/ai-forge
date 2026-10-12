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

3. prompt 是用户手动触发、单文件、不附带资源、不做版本管理的提示词。需要 references 或脚本、需要被模型按描述自动触发、或需要版本化时，做成 `skills/<name>/`。
   - Rationale: 触发方式和是否带资源决定资产类别，内容主题不决定。
   - Verification: `prompts/` 下只有单个 `.md` 文件，没有子目录。

## Change Log

- 2026-10-12: 初版，固化 prompts frontmatter 约定与 prompt/skill 边界。
