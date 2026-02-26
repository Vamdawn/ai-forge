# Article Summarizer - AI 评分与阅读元数据增强

> 日期: 2026-02-26
> 状态: approved
> 技能: skills/article-summarizer

## 背景

当前 article-summarizer 已具备完整的"文章 → Obsidian 笔记"处理流程，但缺少对文章本身的质量评估能力。用户希望在文章入库时自动获得客观的质量评分和阅读元数据，以便在 Dataview 中筛选、排序和管理阅读库。

## 目标

1. 文章入库时自动计算**阅读分析元数据**（字数、阅读时长、难度）
2. 文章入库时由 AI 自动生成**多维质量评分**（新颖性、质量、可操作性）
3. 移除原有的用户手动 `rating` 字段，改为全自动 AI 评估
4. 遵循 obsidian-markdown skill 的 Markdown/frontmatter 规范

## 设计

### 方案选择

采用**轻量嵌入**方案：将评分和元数据计算直接融入现有 Step 1 和 Step 2，不新增工作流步骤。

理由：改动最小，不增加处理时间，不需要额外的 LLM 调用。

### 新增 Frontmatter 字段

```yaml
# === 阅读分析元数据（Step 1 中估算） ===
word_count: 2340                # Number: 文章大致字数
reading_time: "8 min"           # Text: 预估阅读时长
difficulty: intermediate        # Text: beginner | intermediate | advanced

# === AI 评分（Step 2 中评估，1-5 分） ===
scores:
  novelty: 4                    # Number: 新颖性 — 观点/信息对知识库的增量价值
  quality: 4                    # Number: 内容质量 — 论证深度、来源可信度、逻辑严密性
  actionability: 3              # Number: 可操作性 — 能否转化为具体行动或实践
  overall: 4                    # Number: 综合评价 — 三维加权均值（四舍五入取整）
recommended_action: deep-read   # Text: deep-read | skim | reference | archive
```

**移除的字段：**
- `rating:` — 原为用户阅读后手动填写（1-5），现由 AI `scores.overall` 替代

### 工作流变更

#### Step 1 变更：增加阅读元数据估算

在现有 "Extract the article body text and publish date" 后追加第 3 点：

> 3. **Estimate reading metadata**: From the fetched content, estimate:
>    - `word_count` — approximate word count (中文按字数，英文按 word 数)
>    - `reading_time` — estimated reading time (中文 300 字/分钟，英文 200 words/min，向上取整到整分钟，格式如 "8 min")
>    - `difficulty` — content difficulty level based on vocabulary complexity, assumed background knowledge, and concept abstraction level: `beginner` (no prior knowledge needed), `intermediate` (some domain familiarity), `advanced` (deep domain expertise required)

#### Step 2 变更：增加 AI 评分（新增 2e）

在现有 Step 2d (Draft one-line summary) 后追加 Step 2e：

> **2e. Score the article** — Evaluate the article on three dimensions (1-5 scale):
>
> | Dimension | 1 (Low) | 3 (Medium) | 5 (High) |
> |:----------|:--------|:-----------|:---------|
> | **novelty** | 广为人知的常见知识 | 有部分新角度或新组合 | 全新观点或鲜为人知的信息 |
> | **quality** | 缺乏论据、逻辑松散 | 论证基本完整但不算深入 | 论证严密、证据充分、来源权威 |
> | **actionability** | 纯理论/纯新闻，无可执行要点 | 有一些可参考的建议 | 提供具体步骤/代码/工具可直接应用 |
>
> Calculate `overall` as the rounded average of the three scores.
>
> Based on the scores, determine `recommended_action`:
> - `deep-read`: overall ≥ 4 — worth careful reading
> - `skim`: overall = 3 — scan key points
> - `reference`: overall = 2 — keep as reference only
> - `archive`: overall ≤ 1 — low value, archive

#### Step 3-5：不变

### Note Template 变更

在 `references/note-template.md` 的 frontmatter 模板中：
- **移除** `rating:` 及其注释行
- **新增** `word_count`、`reading_time`、`difficulty` 字段（在 `publish` 之后）
- **新增** `scores:` 嵌套块（含 novelty / quality / actionability / overall）
- **新增** `recommended_action` 字段

### Quality Checklist 变更

新增 2 条检查项：
- `[ ] Reading metadata present: word_count, reading_time, difficulty`
- `[ ] AI scores present: scores (novelty, quality, actionability, overall), recommended_action`

## 涉及文件

| 文件 | 变更类型 |
|:-----|:---------|
| `skills/article-summarizer/SKILL.md` | 编辑 Step 1, Step 2, Quality Checklist |
| `skills/article-summarizer/references/note-template.md` | 编辑 frontmatter 模板 |

## 不涉及的内容

- 不改变 Step 3 (Output Path)、Step 4 (Write Note)、Step 5 (Build Index) 的流程
- 不改变 `references/index-template.md`
- 不新增文件
- 不引入新的 allowed-tools
