# Releases

English | [简体中文](CHANGELOG.zh-CN.md)

This file is the global release index: every asset release appends one summary line, and the details of a change live in that asset's own `CHANGELOG.md`. The asset versioning convention is described in [versioning-and-release.md](docs/versioning-and-release.md).

- `dsh-rename-session@0.1.0` (2026-10-13) — first release of `@vamdawn/dsh-rename-session`, which generates session names from the conversation context and works with both Chinese and English interfaces → [Details](plugins/dsh-rename-session/CHANGELOG.md)
- `dsh-appearance-plus@0.1.0` (2026-10-15) — first release of `@vamdawn/dsh-appearance-plus`, which supports custom interface fonts, code fonts, and background images → [Details](plugins/dsh-appearance-plus/CHANGELOG.md)
- `dsh-astrolabe@0.1.0` (2026-10-16) — first release of `@vamdawn/dsh-astrolabe`, which provides a dual-axis workspace/status sidebar, search, directory picking, and session swap animations → [Details](plugins/dsh-astrolabe/CHANGELOG.md)
- `dsh-astrolabe@0.2.0` (2026-10-16) — gives every Session mark one meaning, follows a running delegation into the working status, titles and times the nested subagent rows, adds the Workspace facts to the hover card, and ships Simplified Chinese README and CHANGELOG files → [Details](plugins/dsh-astrolabe/CHANGELOG.md)
- `dsh-astrolabe@0.3.0` (2026-10-16) — marks the Working section with the host's still loading arc, so a section header no longer repeats the animated loader its rows carry → [Details](plugins/dsh-astrolabe/CHANGELOG.md)

## Repository milestones

- 2026-10-16: The release rules gained a Publishing section: npm's two-factor web flow needs an interactive terminal, so `scripts/npm-publish-pty.py` runs `npm publish` under a pseudo-terminal and writes the authentication URL where a human can read it; the section also covers the registry's propagation delay, artifact verification, and the profile reinstall a `0.x` caret requires.
- 2026-10-16: Every README and CHANGELOG gained a Simplified Chinese counterpart and the documentation set now follows [documentation-standard.md](docs/documentation-standard.md); the plugin READMEs were trimmed to user-facing content; `AGENTS.md` and the harness rules were rewritten in English around the DeepSeek Harness template, with the `agents/` layer dissolved into `docs/` (rules) and `scripts/` (checks); `scripts/verify-docs.py` runs the basic checks that `scripts/verify-docs.spec.py` covers.
- 2026-10-13: Unified the directory scope of the five asset types — skills, prompts, rules, tools, and plugins — concentrating ownership and documentation responsibilities in `agents/rules/asset-layout.md`; filled in the plugin versioning convention, added purpose and direct entry points to the asset index, and clarified in the Harness description the difference between current directories and on-demand expansion.
- 2026-10-12: Unified `prompts/` frontmatter (required `title`, `type`, and `language`, with `source` and `author` for third-party sources) and added `agents/rules/prompt-assets.md` to codify that convention (now `docs/markdown-assets.md`).
- 2026-10-12: Added `rules/deepseek-harness-inspired-agents-md.md` (a project rules template inspired by the AGENTS.md of deepseek-ai/deepseek-harness) and made the criteria for `rules/` explicit: rule fragments loaded permanently or whole-file templates, distinguished from `prompts/` (manually triggered one-off prompts) and `skills/` (on-demand or resource-carrying).
- 2026-10-12: Removed `docs/` (design and plan documents) and cleaned up the related references in the README and under `agents/`; versioning and release conventions now follow `agents/rules/versioning-and-release.md`.
- 2026-10-09: Tightened ownership of executable files: statusline moved under `tools/claude-statusline/`, and executable files maintained only for this repository are unified under `agents/tools/`; designs and plans are filed under `docs/specs/` and `docs/plans/` respectively, with an index of product and documentation links added.
- 2026-07-29: Established the target architecture: separation of the product layer from the Harness layer (`agents/` is the Harness source of truth), independent per-asset versioning (tag format `<name>@X.Y.Z`), and the root CHANGELOG turned into a release index.

## Pre-versioning history

The following dated records predate the per-asset versioning convention. They are translated for this pair and no longer updated.

---

## 2026-06-05

### 📝 Documentation

- Added the HTML PR Review Artifact prompt template, used to generate a PR review HTML artifact with the real diff, marginal notes, and severity annotations
- Added the `AGENTS.md` project rules document, capturing the rules for Markdown frontmatter and body editing boundaries

## 2026-06-03

### ♻️ Refactoring

- **Top-level structure shrink**: deleted the empty shell directories `agents/`, `hooks/`, `mcp-servers/`, `plugins/`, `shared/`, and `workflows/`, keeping only the capability asset directories actually in use
- **Documentation and test directory cleanup**: removed the project-level `docs/` and the top-level `tests/`; external reference material and local tests are no longer kept as top-level placeholder structures
- **Directory README cleanup**: deleted the vacuous `skills/README.md` and `prompts/README.md`, leaving the root README to carry the project overview

### 📝 Documentation

- **README positioning update**: narrowed the project description to a personal agent capability asset library and made the top-level responsibilities of `skills/`, `prompts/`, `rules/`, and `scripts/` explicit
- **CHANGELOG maintenance resumed**: filled in the main capability evolution records after 2026-03-03

### 🔧 Chores

- **Skill Casebook naming format change**: casebook file names now start with a date, making chronological sorting and retrieval easier

## 2026-05-18

### ✨ New Features

- **Skill usage feedback analysis template**: added a prompt template for analyzing actual skill usage feedback, trigger quality, and improvement opportunities
- **Skill failure retrospective template**: added a document template for recording skill failure cases, root causes, fixes, and reusable lessons

## 2026-04-27

### 🔧 Chores

- Added temporary file directory exclusions to `.gitignore`

### 📝 Documentation

- Deleted outdated planning documents so that stale governance material is not kept

## 2026-04-20

### 📝 Documentation

- Added the SVPino interview-to-spec prompt template, used to converge on a specification through round-by-round interviews

## 2026-03-29

### ✨ New Features

- **E2E Run**: added a skill that runs existing e2e assets, saves execution evidence, and analyzes the causes of failures

## 2026-03-28

### ✨ New Features

- **E2E Find**: added a skill that analyzes a web application's interaction paths from the code and captures e2e case specifications

## 2026-03-23

### ✨ New Features

- **Req Code Review**: added a skill that starts a systematic code review based on the implementation plan and the current code
- **Ack Code Review**: added a skill that consumes review reports, decides what to adopt, and incrementally fixes the reviewed issues

### ♻️ Refactoring

- **Claude Code Status Line**: added MiniMax usage display and timeout protection, and cleaned up the script

## 2026-03-19

### ✨ New Features

- **Retrospect Session governance flow**: added rule capture, triggers for restructuring the system, governance actions, and abstraction criteria
- **Retrospect Session Evals**: added evaluation samples for the rule-governance scenarios of retrospectives

### ♻️ Refactoring

- **Review Skill specification alignment**: loads the Agent Skills Specification first and moved the reference documents inside the skill
- **Retrospect Session restructuring**: reworked the retrospective process into a rule-governance workflow

### 📝 Documentation

- Added the retrospect-session governance design and implementation plan

## 2026-03-17

### 📝 Documentation

- Added a slug to the output file name of the Handoff session prompt, improving the readability of handoff documents

## 2026-03-16

### ✨ New Features

- **Handoff Session**: added a session handoff summary prompt aimed at the next AI agent

### 📝 Documentation

- The Retrospect Session documentation now enforces keeping project-level prompts and the rules index in sync

## 2026-03-13

### ✨ New Features

- **Retrospect Session**: added a session retrospective skill for distilling reusable lessons into long-term rules

## 2026-03-10

### ✨ New Features

- **Content Summarizer Twitter support enhanced**: added a Twitter/X mirror fetching flow and script tests

### 📝 Documentation

- Standardized the frontmatter fields of the Content Summarizer templates
- Replaced the heredoc example in the Git Commit documentation with a direct `-m` argument example

## 2026-03-07

### ♻️ Refactoring

- **Git Commit**: removed the `$ARGUMENTS` template variable reference to reduce accidental triggering and parsing ambiguity

## 2026-03-06

### ✨ New Features

- **Session Summary**: added a session summary skill that records a structured session overview and per-turn details

### ♻️ Refactoring

- **Review Skill**: moved to the top-level `skills/` and expanded the checklist coverage
- **Session Summary**: split start and end times from token usage, and made a file-based session summary the default output

## 2026-03-03

### ✨ New Features

- **Review Context**: added the `/review-context` command, which reviews code, architecture documents, prompts, and design documents from a context engineering perspective. It identifies the content type automatically, selects the 3-5 most relevant CE dimensions, and produces a structured review report with severity levels and improvement suggestions. It distilled the knowledge of all 13 skills in context-engineering-marketplace into an actionable checklist
- **Content Summarizer multi-URL support**: accepts several URLs at once and merges their processing; article fetching gained an agent-browser → WebFetch fallback chain; Twitter/X supports headed mode to bypass TLS detection

### ♻️ Refactoring

- **Content Summarizer architecture reorganized**: split content-types.md into separate fetcher files (common/github-repo/reddit/hn/twitter), and moved the templates to `references/templates/` with Chinese localization

### 🔧 Chores

- review-skill: fixed documentation reference paths and simplified the argument hints

## 2026-03-02

### ✨ New Features

- **Claude Code Status Line script**: a two-line status bar showing the model name, a context window usage bar (three-color thresholds: green <60%, yellow 60-83%, red ≥84% to align with auto-compact), API cost and session elapsed time, the full working directory, and the Git branch in real time

### ♻️ Refactoring

- **Content Summarizer**: the MOC index list length now follows the limit defined by the document instead of being hard-coded

### 📝 Documentation

- Reorganized the reference documents into the `docs/references/` subdirectory
- Status Line design document and implementation plan

## 2026-02-28

- **Content Summarizer**: migrated the web scraping tool from playwright-cli to agent-browser and removed the WebFetch fallback logic

## 2026-02-27

- **Content Summarizer**: added a `date_saved` property to the note template to make it easier to track when content was archived

## 2026-02-26

### ✨ New Features

- **Content Summarizer multi-content-type support**: expanded from article summarization alone to supporting three content types — articles, GitHub repos, and forum discussions/threads — each with its own note template and analysis strategy
- **Automatic URL content type detection**: added a detection script that determines the content type from the URL and routes it to the matching processing flow
- **Content type registry**: added a content types registry defining the fetching and analysis strategy of each type
- **SKILL.md rewritten as a multi-type dispatcher**: rewrote the main instructions of content-summarizer into a multi-content-type dispatch architecture
- **GitHub Repo note template**: added a structured note template for GitHub repositories
- **Thread/Discussion note template**: added a structured note template for forum discussions
- **MOC index maintenance**: automatically maintains Obsidian's Map of Content index file in Step 5
- **Guardrails and workflow optimization**: added quality assurance mechanisms for content processing and refined the execution rules of each step
- **PRD implementation plan template**: 4-dimensional parallel SubAgent analysis (architecture, data/API, risks, code audit) that outputs fine-grained tasks conforming to TDD
- **AI multi-dimensional scoring** (article-summarizer): scores content with AI along the three dimensions of novelty, quality, and actionability
- **Reading metadata estimation** (article-summarizer): automatically estimates word count, reading time, and difficulty level, and suggests how to read it
- **Scoring quality checklist** (article-summarizer): updated the quality check items to cover scoring and metadata validation

### ♻️ Refactoring

- Renamed article-summarizer to content-summarizer to reflect its broader content handling capabilities
- Flattened the scoring fields from a nested structure into top-level Chinese properties to improve Obsidian compatibility

### 📝 Documentation

- Content Summarizer extension design document, with field values localized to Chinese (difficulty levels, recommended actions, and so on)
- Content Summarizer extension implementation plan (8 tasks)
- Article Summarizer scoring and reading metadata design document and implementation plan

### 🐛 Bug Fixes

- Fixed the review-skill compliance issues of content-summarizer

### 🔧 Chores

- Cleaned up the frontmatter format of the article note template
- Added a playwright-cli directory exclusion to .gitignore

## 2026-02-25

- **Large document parallel review mode**: documents longer than 300 lines are automatically split by heading into 2-5 chunks, reviewed by parallel agents, and then merged with duplicates removed
- Added the Boris workflow orchestration rules

## 2026-02-23

- **Product roadmap analysis prompt**: a multi-dimensional parallel audit from the PM perspective, covering maturity, user value, competitive positioning, and ecosystem extensibility

## 2026-02-22

### ✨ New Features

- **article-summarizer**: turns web articles into structured Obsidian Markdown notes, recognizes types such as tutorial/opinion/research/news/comparison, and maintains bidirectional Wikilinks and category indexes automatically
- **semver-release**: an automated semantic version management skill covering pre-checks, BREAKING CHANGE detection, semantic tag creation, and failure recovery

### 🔧 Improvements

- review-skill: extracted the 30-item checklist into a separate reference file, and added judgment principles and examples for ambiguous scenarios
- review-doc: added argument hints, tool declarations, and error handling (file not found, SubAgent failure, and so on)
- plan-executor: added empty-argument handling, fixed the template variable syntax, and added more trigger words
- semver-release: added concrete command examples, a failure recovery file list, and ecosystem publishing commands
- Unified the YAML frontmatter format of review-skill and article-summarizer

### 📝 Documentation

- Added the Claude Skill build guide (converting PDF into LLM-friendly Markdown)

## 2026-02-21

- Added the Claude Code permissions configuration guide, covering permission levels, modes, wildcard rules, tool configuration, and Hooks integration
- git-commit: enabled model invocation capability

## 2026-02-20

### ✨ New Features

- **review-doc**: a structured document review skill that systematically reviews documents against reference standards (PRD, design documents, style guides)
- **plan-executor**: a multi-agent orchestration skill that breaks an implementation plan into parallel subtasks and dispatches them
- **git-commit**: an atomic Git commit skill with a 5-step structured workflow, a 60+ emoji mapping, and decision rules for splitting changesets
- **review-skill**: a skill compliance review skill that checks SKILL.md against a 27-item checklist and outputs a structured report with severity grading

### 📝 Documentation

- Added the official Claude Code Skills documentation
- Added the interaction design review prompt template
- Added the prompt optimization template (with an iterative review workflow)

### 🐛 Bug Fixes

- Fixed plan-executor missing the Edit and Write tool permissions, which caused parallel SubAgent execution to fail

## 2026-02-18

- **review-doc**: added a structured document review skill

## 2026-02-17

- 🎉 **Repository initialized**: set up the ai-forge project structure, including the agents, skills, hooks, plugins, prompts, mcp-servers, workflows, and shared utilities directories
