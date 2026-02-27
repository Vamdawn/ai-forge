# Repo 笔记模板

GitHub 仓库摘要笔记的标准结构。所有 section 标题在最终笔记中翻译为用户语言。

```markdown
---
tags:
  - <primary-topic>
  - <secondary-topic>
type: repo                      # article | repo | thread
source: <github-url>
authors:
  - <repo-owner-or-org>
publish: <YYYY-MM-DD>             # 仓库创建日期或首次 release 日期
creation: <YYYY-MM-DD HH:MM>
date_saved: <YYYY-MM-DD>            # 收录日期：内容被保存到 vault 的日期
word_count: <number>
reading_time: "<N> min"
difficulty: <入门 | 中级 | 高级>
status: captured
新颖度: <1-5>
质量: <1-5>
可行性: <1-5>
综合评分: <1-5>
建议操作: <精读 | 速览 | 备查 | 归档>
description: <one-line summary>
---

# <项目名称 — 用户语言的描述性标题>

仓库链接: [<owner/repo>](<github-url>)

> [!abstract] TL;DR
> <一句话概括项目的核心价值>

## 项目信息

| 属性 | 值 |
|:-----|:---|
| ⭐ Stars | <stars> |
| 🔤 语言 | <primary-language> |
| 📜 许可证 | <license> |
| 🏷️ Topics | <topic1>, <topic2>, ... |
| 🔄 最后更新 | <YYYY-MM-DD> |

## 项目简介

<1-2 段介绍项目是什么、解决什么问题、目标用户是谁>

---

## 核心功能

### 1. <功能一>
<说明>

### 2. <功能二>
<说明>

> [!tip] 亮点
> <最值得关注的创新点或独特设计>

---

## 技术栈

<列出关键技术依赖和架构选择>

---

## 快速上手

<安装和基本使用命令，保留关键代码块>

---

## 局限性与替代方案

> [!warning] 局限性
> - <已知限制或不足>
> - <适用场景约束>

**替代方案**: <列出同类项目，简述差异>

---

## 个人反思

- **为什么收藏**: <这个项目对我有什么用？>
- **关联**: <与我的项目/知识库中哪些内容相关？用 [[wikilinks]]>
- **行动项**: <具体下一步 — 试用、集成、学习>
```

## 适配规则

- 所有 section 标题翻译为用户语言
- 如果 README 很短，合并"核心功能"和"项目简介"
- 如果项目没有 release 或 README 极简，精简输出
- 使用 `==highlight==` 标记最关键的 1-2 个亮点
- 使用 `[[wikilinks]]` 链接到 vault 中已有的相关笔记
