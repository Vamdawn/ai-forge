# Article Summarizer Scoring & Reading Metadata — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add AI-powered multi-dimensional scoring and reading metadata to article-summarizer's existing workflow.

**Architecture:** Embed scoring and metadata estimation directly into the existing Step 1 (fetch) and Step 2 (analyze) — no new workflow steps. Update the note template frontmatter and quality checklist accordingly.

**Tech Stack:** Claude Code Skill (Markdown/YAML configuration only — no runtime code)

**Design doc:** `docs/plans/2026-02-26-article-summarizer-scoring-design.md`

---

### Task 1: Update note-template.md frontmatter

**Files:**
- Modify: `skills/article-summarizer/references/note-template.md:5-24` (frontmatter block inside the code fence)

**Step 1: Remove `rating:` field**

In `references/note-template.md`, delete line 22:
```yaml
rating:                         # 1-5, fill in after reading
```

**Step 2: Add reading metadata fields after `creation:`**

Insert these 3 lines after `creation: <YYYY-MM-DD HH:MM>` (currently line 20), before `status:`:
```yaml
word_count: <number>              # approximate word count
reading_time: "<N> min"           # estimated reading time
difficulty: <beginner | intermediate | advanced>
```

**Step 3: Add scoring fields after `status:`**

Insert these 7 lines after `status: captured` (currently line 21), before `description:`:
```yaml
scores:
  novelty: <1-5>                # originality of ideas relative to common knowledge
  quality: <1-5>                # argument depth, source credibility, logical rigor
  actionability: <1-5>          # can this be turned into concrete action?
  overall: <1-5>                # rounded average of the three above
recommended_action: <deep-read | skim | reference | archive>
```

**Step 4: Verify the resulting frontmatter block**

Read `references/note-template.md` and confirm the frontmatter inside the code fence now looks like:
```yaml
---
tags:
  - <primary-topic>
  - <secondary-topic>
aliases:
  - <short-name>
type: <tutorial | opinion | research | news | comparison | other>
source: <original-url>
authors:
  - <author-name>
publish: <YYYY-MM-DD>
creation: <YYYY-MM-DD HH:MM>
word_count: <number>
reading_time: "<N> min"
difficulty: <beginner | intermediate | advanced>
status: captured
scores:
  novelty: <1-5>
  quality: <1-5>
  actionability: <1-5>
  overall: <1-5>
recommended_action: <deep-read | skim | reference | archive>
description: <one-line summary for search and Dataview queries>
---
```

**Step 5: Commit**

```bash
git add skills/article-summarizer/references/note-template.md
git commit -m "✨ feat(article-summarizer): update note template with scoring and reading metadata fields"
```

---

### Task 2: Update SKILL.md Step 1 — add reading metadata estimation

**Files:**
- Modify: `skills/article-summarizer/SKILL.md:12-23` (Step 1 section)

**Step 1: Add point 4 to Step 1**

In `SKILL.md`, after the existing point 3 ("If the output is large...") at line 18, and before the "**If fetch fails**" block at line 20, insert:

```markdown
4. **Estimate reading metadata** from the fetched content:
   - `word_count` — approximate word count (中文按字数，英文按 word count)
   - `reading_time` — estimated reading time (中文 300 字/分钟，英文 200 words/min, round up to whole minutes, format: `"N min"`)
   - `difficulty` — content difficulty based on vocabulary complexity, assumed background knowledge, and concept abstraction level: `beginner` (no prior knowledge needed), `intermediate` (some domain familiarity), `advanced` (deep domain expertise required)
```

**Step 2: Verify**

Read `SKILL.md` lines 12-28 and confirm Step 1 now has 4 numbered points followed by the "If fetch fails" block.

**Step 3: Commit**

```bash
git add skills/article-summarizer/SKILL.md
git commit -m "✨ feat(article-summarizer): add reading metadata estimation to Step 1"
```

---

### Task 3: Update SKILL.md Step 2 — add AI scoring step 2e

**Files:**
- Modify: `skills/article-summarizer/SKILL.md:25-50` (Step 2 section)

**Step 1: Add Step 2e after Step 2d**

After the existing Step 2d paragraph ("**2d. Draft one-line summary**...") ending at line 50, and before "### Step 3:", insert:

```markdown

**2e. Score the article** — Evaluate the article on three dimensions (1-5 scale):

| Dimension | 1 (Low) | 3 (Medium) | 5 (High) |
|:----------|:--------|:-----------|:---------|
| **novelty** | 广为人知的常见知识 | 有部分新角度或新组合 | 全新观点或鲜为人知的信息 |
| **quality** | 缺乏论据、逻辑松散 | 论证基本完整但不算深入 | 论证严密、证据充分、来源权威 |
| **actionability** | 纯理论/纯新闻，无可执行要点 | 有一些可参考的建议 | 提供具体步骤/代码/工具可直接应用 |

Calculate `overall` as the rounded average of the three scores. Determine `recommended_action`:
- `deep-read`: overall ≥ 4 — worth careful reading and note-taking
- `skim`: overall = 3 — scan key points, keep for reference
- `reference`: overall = 2 — low priority, keep as reference only
- `archive`: overall ≤ 1 — minimal value, archive
```

**Step 2: Verify**

Read the updated Step 2 section and confirm it now has sub-steps 2a through 2e.

**Step 3: Commit**

```bash
git add skills/article-summarizer/SKILL.md
git commit -m "✨ feat(article-summarizer): add AI multi-dimensional scoring to Step 2"
```

---

### Task 4: Update SKILL.md Quality Checklist

**Files:**
- Modify: `skills/article-summarizer/SKILL.md:85-101` (Quality Checklist section)

**Step 1: Update first checklist item to include new fields**

Replace line 87:
```markdown
- [ ] Frontmatter complete: tags, type, source, authors, publish, creation, status, description
```
with:
```markdown
- [ ] Frontmatter complete: tags, type, source, authors, publish, creation, word_count, reading_time, difficulty, status, scores, recommended_action, description
```

**Step 2: Add 2 new checklist items**

After the updated first checklist item, insert:
```markdown
- [ ] Reading metadata present: word_count, reading_time, difficulty
- [ ] AI scores present: scores (novelty, quality, actionability, overall), recommended_action
```

**Step 3: Verify**

Read the Quality Checklist section and confirm it now has 16 items (was 14).

**Step 4: Commit**

```bash
git add skills/article-summarizer/SKILL.md
git commit -m "✨ feat(article-summarizer): update quality checklist with scoring and metadata checks"
```

---

### Task 5: Final verification

**Step 1: Read both files end-to-end**

Read `skills/article-summarizer/SKILL.md` and `skills/article-summarizer/references/note-template.md` in full to verify:
- No broken Markdown formatting
- Frontmatter template fields match the fields referenced in Step 1, Step 2, and Quality Checklist
- No stale references to removed `rating:` field anywhere

**Step 2: Search for stale `rating` references**

```bash
grep -r "rating" skills/article-summarizer/
```

Ensure no references to the old `rating:` field remain (the word "rating" should not appear unless in a different context).

**Step 3: Confirm clean state**

```bash
git status
git log --oneline -5
```

Expect: clean working tree, 4 new commits on top of the design doc commit.
