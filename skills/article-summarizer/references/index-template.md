# Index File Template

Template for category index files. All text labels below are shown in English as structural placeholders — **translate them to the user's language** in the final file. The index file name should follow the naming convention discovered from the vault (see Step 5.1).

```markdown
---
tags:
  - index
  - <category-tag>
creation: <YYYY-MM-DD HH:MM>
---

# <Category Display Name> - Article Index

> [!note]
> This file is an auto-maintained index of article notes in this category.

## Article List

- `YYYY-MM-DD` [[<Article Note Title>]] - <one-line description>
```

## Entry Format

```markdown
- `YYYY-MM-DD` [[<Note File Name (without .md)>]] - <one-line description>
```

Date is the article's **publish date** from frontmatter (`publish` field). If `publish` is unavailable, fall back to `creation` date.

Sort entries by date (newest first).
