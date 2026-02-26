---
name: article-summarizer
description: "Fetch, analyze, and summarize web articles into structured Obsidian Markdown notes. Creates a new note and may back-link into 1-3 existing related notes. Use when the user provides a URL and asks to summarize, record, or take notes on an article/blog post/README. Triggers on phrases like: '总结这篇文章', 'summarize this article', '记录下这篇文章', 'take notes on this', or when a URL is given with intent to capture its content as an Obsidian note."
argument-hint: "[url]"
allowed-tools: Read, Write, Edit, Glob, Grep, WebFetch, Bash(mkdir *), Bash(cp *), Bash(curl *), Skill(playwright-cli *)
---

Always follow the five-step workflow below. Each step must complete before proceeding to the next.

## Workflow

### Step 1: Fetch Article Content and Publish Date

Retrieve the full article content and publish date from `$ARGUMENTS`:

1. Use any available web fetching method — prefer `playwright-cli` skill if available; otherwise fall back to `WebFetch` tool or other means.
2. Extract the article body text and publish date from the page.
3. If the output is large (>30KB), read the persisted output file for full content.
4. **Estimate reading metadata** from the fetched content:
   - `word_count` — approximate word count (中文按字数，英文按 word count)
   - `reading_time` — estimated reading time (中文 300 字/分钟，英文 200 words/min, round up to whole minutes, format: `"N min"`)
   - `difficulty` — content difficulty based on vocabulary complexity, assumed background knowledge, and concept abstraction level: `入门` (no prior knowledge needed), `中级` (some domain familiarity), `高级` (deep domain expertise required)

**If fetch fails** (URL unreachable, 404, paywall, empty content):
- Inform the user of the failure reason.
- Ask the user to provide the article content manually (paste text or provide an alternative URL).
- Continue from Step 2 once content is available.

### Step 2: Analyze and Summarize

**2a. Classify article type** — determine which type best fits: `tutorial`, `opinion`, `research`, `news`, `comparison`, or `other`. This classification drives the extraction strategy below and is recorded in frontmatter `type` field.

**2b. Extract core information:**

- **Title**, **author(s)**, and **publish date**
- **Core thesis / key arguments** (3-7 points; for short articles <500 words, 1-2 points is acceptable) — capture not only each point, but the **logical relationships** between them (causation, progression, dependency)
- **Supporting details** organized by theme
- **Practical takeaways** (always attempt to extract; mark N/A only for pure news)
- **Referenced tools, resources, or links** worth preserving
- **Limitations & bias** — what the article omits, author's potential conflicts of interest, weak points in argumentation

**2c. Apply type-specific extraction strategy** (see note-template.md "Type-Specific Adaptations" table):

| Type | Extraction Focus |
|:-----|:----------------|
| `tutorial` | Preserve step sequence, key code/commands, prerequisites |
| `opinion` | Map argument chain: premise → reasoning → conclusion; note assumptions |
| `research` | Capture methodology, key data, findings, and stated limitations |
| `news` | Focus on 5W1H (who/what/when/where/why/how), timeline, impact |
| `comparison` | Extract comparison dimensions, build comparison table, note verdict |

**2d. Draft one-line summary** (`description` field) — a single sentence for frontmatter, index entry, and quick scanning.

Summarize in the user's language (default Chinese if user communicates in Chinese).

**2e. Score the article** — Evaluate the article on three dimensions (1-5 scale):

| Dimension | 1 (Low) | 3 (Medium) | 5 (High) |
|:----------|:--------|:-----------|:---------|
| **novelty** | 广为人知的常见知识 | 有部分新角度或新组合 | 全新观点或鲜为人知的信息 |
| **quality** | 缺乏论据、逻辑松散 | 论证基本完整但不算深入 | 论证严密、证据充分、来源权威 |
| **actionability** | 纯理论/纯新闻，无可执行要点 | 有一些可参考的建议 | 提供具体步骤/代码/工具可直接应用 |

Calculate `overall` as the rounded average of the three scores. Determine `recommended_action`:
- `精读`: overall ≥ 4 — worth careful reading and note-taking
- `速览`: overall = 3 — scan key points, keep for reference
- `备查`: overall = 2 — low priority, keep as reference only
- `归档`: overall ≤ 1 — minimal value, archive

### Step 3: Determine Output Path

**Discover output root** — scan the vault's directory tree to locate the directory used for article notes (look for directories that contain article-style Markdown files with `source:` in frontmatter, or directories whose name suggests an articles collection). If multiple candidates exist or none is found, ask the user to specify.

**Category discovery (dynamic — infer all conventions from the vault):**

1. **Scan existing subdirectories** under the output root. Examine directory names to infer the naming convention actually in use (e.g., `English_中文`, `kebab-case`, flat names, etc.).
2. **Match article to existing category** — if the article's topic fits an existing subdirectory, use it.
3. **Create new category if needed** — follow the same naming convention as the existing subdirectories. If no subdirectories exist yet, ask the user for the desired convention.
4. **User override** — if the user explicitly specifies a different path, use that instead.

### Step 4: Write Obsidian Markdown Note

Follow [references/note-template.md](references/note-template.md) for note structure, callout usage, adaptation rules, and type-specific adaptations. If the project's CLAUDE.md requires using `obsidian-markdown` skill for Markdown editing, that skill provides base formatting conventions; note-template.md layers the article-specific structure on top — the two are complementary.

**Personal Reflections section**: After writing the objective summary, populate the "Personal Reflections" section. Use context from the conversation (why the user shared this article, what they're working on) to draft initial entries for "Why I saved this", "Connections", and "Action items". If context is insufficient, leave placeholder prompts for the user to fill in.

**Multimedia handling**: Follow the "Multimedia Handling" guide in note-template.md. If the article contains critical diagrams or architecture charts, save them to the vault's attachment folder and embed in the note.

Save the note into the category subdirectory determined in Step 3.

### Step 5: Build Index

Integrate the new note into the vault's index system:

1. **Ensure index file exists** in the category subdirectory. Look for an existing `*INDEX*` or `*index*` file to determine the naming pattern in use (e.g., `AI_人工智能_INDEX.md`, `index.md`, `README.md`). If no index exists in this or sibling categories, create one per [references/index-template.md](references/index-template.md) and follow the naming convention inferred from the vault.

2. **Add index entry** under the article-list section of the index file with the article's publish date, wikilink, and one-line description. Format: `` - `YYYY-MM-DD` [[Title]] - description ``. Sort all entries by publish date (newest first). If `publish` is unavailable, fall back to `creation` date.

3. **Add wikilinks to existing notes (forward linking)** — if the summary references concepts that exist as standalone notes in the vault (scan knowledge-area directories and other notes in the same category first), link to them with `[[wikilinks]]` to strengthen the knowledge graph.

4. **Back-link into related notes (reverse linking)** — for the most relevant existing notes discovered in step 5.3 (limit to 1-3 notes to avoid noise), append a wikilink to the new article note in their "Related" / "See also" / "Recommended Resources" section (whichever exists). If no such section exists, add a `## Related Notes` section at the end. This ensures the knowledge graph is bidirectional.

## Quality Checklist

- [ ] Frontmatter complete: tags, type, source, authors, publish, creation, word_count, reading_time, difficulty, status, scores, recommended_action, description
- [ ] Reading metadata present: word_count, reading_time, difficulty
- [ ] AI scores present: scores (novelty, quality, actionability, overall), recommended_action
- [ ] Tags aligned with existing vault tags (search before creating new ones)
- [ ] Article type correctly classified and type-specific extraction applied
- [ ] TL;DR present immediately below title, matches `description` in frontmatter
- [ ] Original article link present below TL;DR
- [ ] Core ideas capture logical relationships, not just isolated points
- [ ] Critical Notes section included (limitations, bias) — omitted only for purely factual tutorials
- [ ] Personal Reflections section populated or has actionable placeholders
- [ ] Valid Obsidian syntax (callouts, wikilinks, highlights)
- [ ] Language matches user's language
- [ ] Note saved in correct category subdirectory
- [ ] Index entry added in index file
- [ ] Forward wikilinks to existing vault notes where appropriate
- [ ] Back-links added to 1-3 most relevant existing notes
