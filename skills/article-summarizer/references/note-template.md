# Note Template

Standard structure for article summary notes. All section headers and text labels below are shown in English as structural placeholders — **translate them to the user's language** in the final note.

```markdown
---
tags:
  - <primary-topic>
  - <secondary-topic>
aliases:
  - <short-name>
type: <tutorial | opinion | research | news | comparison | other>
source: <original-url>          # single source
# source:                       # or multiple sources
#   - <url-1>
#   - <url-2>
authors:
  - <author-name>
publish: <YYYY-MM-DD>
creation: <YYYY-MM-DD HH:MM>
status: captured                # captured → read → reviewed
rating:                         # 1-5, fill in after reading
description: <one-line summary for search and Dataview queries>
---

# <Article Title - localized or descriptive title in user's language>

Original link: [<Article Title>](<url>)

> [!abstract] TL;DR
> <Single sentence capturing the article's essence>

> [!quote]
> <Key quote or tagline from the article>

## Article Overview

<1-2 paragraph overview of what the article is about, who it targets, and why it matters>

---

## Key Ideas

> Capture 3-7 key ideas. Where ideas have logical relationships (causation, progression, dependency), make the connections explicit with transition phrases or a brief relationship note at the top.

### 1. <First key idea>

<Explanation with highlights, callouts, tables as needed>

> [!important] <Optional callout title>
> <Key insight worth calling out>

### 2. <Second key idea>

<Continue pattern for 3-7 key ideas>

---

## <Optional: Tool/Resource/Comparison Section>

| Column 1 | Column 2 |
|:---------|:---------|
| Item     | Detail   |

---

## Critical Notes

> [!warning] Limitations & Bias
> - <What the article does NOT cover or intentionally omits>
> - <Author's potential bias, sponsorship, or conflicts of interest>
> - <Weak points in the argumentation or evidence>

_(Omit this section only if the article is purely factual/tutorial with no notable bias or gaps.)_

---

## Recommended Resources

- [Resource Title](url) - Author/Description
- [Resource Title](url) - Author/Description

---

## Personal Reflections

- **Why I saved this**: <What problem does this solve for me? What triggered my interest?>
- **Connections**: <How does this relate to my existing knowledge, projects, or other notes? Use [[wikilinks]]>
- **Action items**: <Concrete next steps — things to try, investigate, or apply>
```

## Callout Usage Guide

| Callout | Use for |
|:--------|:--------|
| `[!abstract]` | TL;DR summary — always placed immediately below the title |
| `[!quote]` | Article's own tagline or key quote |
| `[!important]` | Critical insight the reader must not miss |
| `[!tip]` | Practical advice or best practice |
| `[!warning]` | Limitations, bias, caution, common pitfall, or counterpoint |
| `[!note]` | Supplementary context or background |

## Adaptation Rules

- **Language**: Translate all section headers and text labels to the user's language
- Adjust section count to match article depth (short article = fewer sections)
- Omit the recommended-resources section if article has no notable external links
- Add comparison tables when article compares tools/approaches
- Use `==highlight==` sparingly for the most critical 2-3 phrases
- Use wikilinks `[[Term]]` for concepts that may exist as other notes in the vault

### Type-Specific Adaptations

| Article Type | Key Ideas Focus | Special Sections |
|:-------------|:---------------|:-----------------|
| `tutorial` | Step-by-step procedure; preserve key code snippets and commands | Add "Prerequisites" and "Steps" subsections; keep code blocks |
| `opinion` | Argument chain: premise → reasoning → conclusion | Emphasize Critical Notes; capture author's core assumptions |
| `research` | Methodology, key findings, data highlights | Add "Methodology" and "Limitations" subsections |
| `news` | Who/what/when/where/why; factual timeline | Keep concise; emphasize timeline and impact |
| `comparison` | Comparison dimensions and verdict | Must include comparison table; highlight winner/trade-offs |

### Multimedia Handling

- **Key diagrams/architecture charts**: Save screenshot to vault attachment folder, embed with `![[filename.png]]`, add a text caption explaining the diagram
- **Code blocks**: Preserve essential code snippets (core logic, key config) directly in the note; summarize boilerplate with a description instead of copying
- **Data visualizations**: Extract underlying data into a Markdown table when possible; otherwise save as image
