---
name: content-summarizer
description: "抓取、分析、摘要各类网络内容并生成结构化 Obsidian 笔记。支持网页文章、GitHub 仓库、Reddit/HN/Twitter 讨论帖等多种内容类型。自动识别 URL 类型并选择对应的处理流程和笔记模板。触发词：'总结这篇文章'、'summarize this'、'记录下这个'、'take notes on this'、'记录这个仓库'、'save this repo'、'总结这个讨论'、'summarize this thread'、或任何附带 URL 且意图是将其内容保存为 Obsidian 笔记的请求。"
argument-hint: "[url]"
allowed-tools: Read, Write, Edit, Glob, Grep, WebFetch, Bash(python *), Bash(mkdir *), Bash(curl *), Bash(gh *), Skill(playwright-cli *)
---

始终按以下六步工作流执行。每一步必须完成后才能进入下一步。

## 工作流

### Step 0: 识别内容类型

若 `$ARGUMENTS` 为空（用户未提供 URL），询问用户提供 URL 后再继续。

使用 Glob 定位本 skill 目录下的 `scripts/detect_content_type.py`，然后运行该脚本并传入 `$ARGUMENTS` 作为参数。脚本返回 JSON，包含 `type`、`platform`、`template`、`metadata` 字段。

- **脚本返回有效类型**（`type` 不为 null）→ 记录 `type`、`platform`、`template`、`metadata`，进入 Step 1
- **脚本返回 null** → 先用 Step 1 通用方式抓取页面内容，然后根据内容特征判断类型：
  - 有评论/回复结构 → `thread`，使用 `references/note-template-thread.md`
  - 是代码仓库页面 → `repo`，使用 `references/note-template-repo.md`
  - 其他 → `article`（默认），使用 `references/note-template.md`

### Step 1: 抓取内容

按检测到的 `type` 和 `platform`，遵循 [references/content-types.md](references/content-types.md) 中对应类型的**抓取策略**获取内容。

所有类型均需估算阅读元数据：
- `word_count` — 大致字数（中文按字数，英文按 word count）
- `reading_time` — 预估阅读时长（中文 300 字/分钟，英文 200 words/min，向上取整，格式 `"N min"`）
- `difficulty` — 内容难度：`入门`（无需背景知识）、`中级`（需要一定领域了解）、`高级`（需要深度专业知识）

**抓取失败时**（URL 不可达、404、paywall、内容为空）：
- 告知用户失败原因
- 请用户手动提供内容（粘贴文本或提供替代 URL）
- 获得内容后继续 Step 2

### Step 2: 分析与摘要

按检测到的 `type`，遵循 [references/content-types.md](references/content-types.md) 中对应类型的**分析策略**处理内容。

所有类型均需完成：

**2a. 提取核心信息** — 按类型特定的策略提取

**2b. 生成一行摘要**（`description` 字段）— 用于 frontmatter、索引条目和快速浏览的单句摘要

**2c. 评分** — 按三个维度（1-5 分）评估内容：

| 维度 | 1（低） | 3（中） | 5（高） |
|:-----|:--------|:--------|:--------|
| **novelty** | 广为人知的常见知识 | 有部分新角度或新组合 | 全新观点或鲜为人知的信息 |
| **quality** | 缺乏论据、逻辑松散 | 论证基本完整但不算深入 | 论证严密、证据充分、来源权威 |
| **actionability** | 纯理论/纯新闻，无可执行要点 | 有一些可参考的建议 | 提供具体步骤/代码/工具可直接应用 |

各维度在不同内容类型下的具体解读见 [references/content-types.md](references/content-types.md) 的"评分解读"。

计算 `overall` 为三项评分的四舍五入均值。根据 overall 确定 `recommended_action`：
- `精读`: overall ≥ 4
- `速览`: overall = 3
- `备查`: overall = 2
- `归档`: overall ≤ 1

以用户语言输出摘要（用户使用中文时默认中文）。

### Step 3: 确定输出路径

**发现输出根目录** — 扫描 vault 目录树，定位存放笔记的目录（查找 frontmatter 中含 `source:` 的 Markdown 文件所在目录，或名称暗示内容集合的目录）。如有多个候选或找不到，询问用户。

**分类目录发现（动态推断）：**

1. 扫描输出根目录下的现有子目录，推断命名惯例
2. 将内容匹配到现有分类子目录
3. 需要时创建新分类，遵循现有命名惯例
4. 用户显式指定路径时优先使用

### Step 4: 写入 Obsidian 笔记

按 Step 0 确定的 `template` 选择笔记模板：
- `article` → [references/note-template.md](references/note-template.md)
- `repo` → [references/note-template-repo.md](references/note-template-repo.md)
- `thread` → [references/note-template-thread.md](references/note-template-thread.md)

遵循所选模板的结构、callout 用法和适配规则。如果项目的 CLAUDE.md 要求使用 `obsidian-markdown` skill，该 skill 提供基础格式规范，笔记模板在其上叠加内容特定结构。

**个人反思 section**：用对话上下文（用户为什么分享此内容、正在做什么）草拟初始条目。上下文不足时留占位提示。

**多媒体处理**：遵循 note-template.md 中的"Multimedia Handling"指南。

保存笔记到 Step 3 确定的分类子目录。

### Step 5: 构建索引

将新笔记整合到 vault 的索引系统：

1. **确保索引文件存在** — 在分类子目录中查找已有的 `*INDEX*` 或 `*index*` 文件确定命名模式。如不存在，按 [references/index-template.md](references/index-template.md) 创建。

2. **添加索引条目** — 格式：`` - `YYYY-MM-DD` [[Title]] - description ``。按发布日期排序（最新在前）。`publish` 不可用时回退到 `creation` 日期。

3. **正向链接** — 如果摘要引用了 vault 中已有的概念笔记，用 `[[wikilinks]]` 链接。

4. **反向链接** — 在 1-3 个最相关的已有笔记中添加指向新笔记的 wikilink。

## 质量清单

- [ ] Frontmatter 完整：tags, type, source, authors, publish, creation, word_count, reading_time, difficulty, status, scores, recommended_action, description
- [ ] 阅读元数据存在：word_count, reading_time, difficulty
- [ ] AI 评分存在：scores (novelty, quality, actionability, overall), recommended_action
- [ ] 内容类型正确识别（article / repo / thread）
- [ ] 笔记正文结构匹配内容类型的模板
- [ ] Tags 与 vault 已有标签对齐（创建新标签前先搜索）
- [ ] TL;DR 紧跟标题下方，与 frontmatter 的 `description` 一致
- [ ] 原始链接存在于 TL;DR 下方
- [ ] 核心观点捕捉了逻辑关系，而非孤立要点
- [ ] 个人反思 section 已填充或有可操作的占位提示
- [ ] 有效的 Obsidian 语法（callouts, wikilinks, highlights）
- [ ] 语言与用户语言一致
- [ ] 笔记保存在正确的分类子目录
- [ ] 索引条目已添加
- [ ] 正向 wikilinks 指向 vault 中已有笔记
- [ ] 反向链接已添加到 1-3 个最相关的已有笔记
