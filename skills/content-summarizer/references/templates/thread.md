# Thread 笔记模板

帖子/讨论内容摘要笔记的标准结构。适用于 Reddit、Hacker News、Twitter/X 等平台的讨论帖。

## 语言适配（必须）

- 模板中的章节标题与说明文字仅为结构示例；生成最终笔记时按用户当前语言渲染。
- frontmatter 字段键保持固定，不做翻译：`tags`、`type`、`source`、`authors`、`publish`、`creation`、`date_saved`、`word_count`、`reading_time`、`difficulty`、`status`、`novelty`、`quality`、`actionability`、`overall_score`、`recommended_action`、`description`。
- 占位符 `<...>` 可按语义本地化填充，但结构顺序保持不变。

```markdown
---
tags:
  - <primary-topic>
  - <secondary-topic>
type: thread                    # article | repo | thread
source: <url>
authors:
  - <original-poster>
publish: <YYYY-MM-DD>             # thread publish date
creation: <YYYY-MM-DD HH:MM>
date_saved: <YYYY-MM-DD>            # date when content is saved to the vault
word_count: <number>
reading_time: "<N> min"
difficulty: <beginner | intermediate | advanced>
status: captured
novelty: <1-5>
quality: <1-5>
actionability: <1-5>
overall_score: <1-5>
recommended_action: <deep_read | skim | reference | archive>
description: <one-line summary>
---

# <讨论标题 — 用户语言的描述性标题>

原帖链接: [<帖子标题>](<url>)

> [!abstract] TL;DR
> <一句话概括讨论的核心结论或争议焦点>

## 帖子信息

| 属性 | 值 |
|:-----|:---|
| 📍 平台 | <Reddit / Hacker News / Twitter / 其他> |
| 👤 原帖作者 | <author> |
| 👍 赞数 | <upvotes/likes> |
| 💬 评论数 | <comment_count> |

## 原帖摘要

<1-2 段概括原帖的核心内容、问题或观点>

---

## 核心讨论观点

> 按主题聚合讨论中的主要观点，标注社区态度。

### 1. <主题/观点一>

<说明，引用关键评论>

> [!tip] 共识
> <社区普遍同意的观点>

### 2. <主题/观点二>

<说明>

> [!warning] 争议
> <社区存在明显分歧的观点，列出正反方>

---

## 高价值评论精选

> [!quote] <评论者名称>
> <高赞或洞见深刻的评论原文/摘要>

> [!quote] <评论者名称>
> <另一条有价值的评论>

---

## 结论与共识

<总结讨论的最终走向、社区共识、未解决的分歧>

---

## 个人反思

- **为什么收藏**: <这个讨论对我有什么启发？>
- **关联**: <与我的项目/知识库中哪些内容相关？用 [[wikilinks]]>
- **行动项**: <具体下一步 — 验证某个观点、尝试某个建议>
```

## 适配规则

- 如果讨论很短（<10 条评论），合并"核心讨论观点"和"高价值评论精选"
- Twitter thread 通常没有评论互动，省略"帖子信息"中的评论数，合并为线性叙述
- 标注观点态度时使用 callout：`[!tip]` 表示共识，`[!warning]` 表示争议，`[!note]` 表示少数派观点
- 使用 `==highlight==` 标记最关键的 1-2 个洞见
- 使用 `[[wikilinks]]` 链接到 vault 中已有的相关笔记
