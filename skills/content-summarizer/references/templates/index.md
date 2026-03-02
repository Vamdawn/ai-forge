# 分类索引文件模板

分类索引文件的标准结构。索引文件名应遵循从 vault 中发现的命名惯例（见 Step 5.1）。

```markdown
---
tags:
  - index
  - <category-tag>
creation: <YYYY-MM-DD HH:MM>
---

# <分类名称> — 笔记索引

> [!note]
> 本文件为该分类下笔记的自动维护索引。

## 笔记列表

- `YYYY-MM-DD` [[<笔记文件名（不含 .md）>]] - <一行描述>
```

## 条目格式

```markdown
- `YYYY-MM-DD` [[<笔记文件名（不含 .md）>]] - <一行描述>
```

日期使用 frontmatter 中的 `publish` 字段。`publish` 不可用时回退到 `creation` 日期。

按日期降序排列（最新在前）。
