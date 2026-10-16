# AI Forge

English | [简体中文](README.zh-CN.md)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A personal monorepo of reusable agent capability assets: skills, prompts, rules, CLI tools, and host-application plugins. Every asset evolves on its own — version, changelog, and release are per asset, and the repository carries no global version.

## Repository layout

| Directory | Contents | Entry point |
|-----------|----------|-------------|
| `skills/` | Skills an agent loads on demand | `SKILL.md` |
| `prompts/` | Prompt templates you trigger by hand | the `.md` file |
| `rules/` | Rules loaded in every session, or whole-file rule templates | the `.md` file |
| `tools/` | Standalone CLI tools | the asset's `README.md` |
| `plugins/` | Plugins loaded by a host application | the asset's `README.md` |
| `docs/` | Harness rules for this repository, one topic per file | `docs/asset-layout.md` |
| `scripts/` | Checks and repository-only tooling | `scripts/verify-docs.py` |

## Usage

Pick an asset from the index below and open its entry point. Use a skill together with the resources in its directory; install and run a tool or plugin as its own README describes.

## Asset index

### Skills

- [ack-code-review](skills/ack-code-review/SKILL.md) — consume a review report, decide each finding, and incrementally fix the ones you adopt.
- [agent-friendly-cli](skills/agent-friendly-cli/SKILL.md) — design and review CLIs that agents call.
- [content-summarizer](skills/content-summarizer/SKILL.md) — fetch and analyze web content, then save it as an Obsidian note.
- [e2e-find](skills/e2e-find/SKILL.md) — analyze a web app's interaction paths, then generate or update end-to-end case specs.
- [e2e-run](skills/e2e-run/SKILL.md) — run existing end-to-end test assets, save the evidence, and analyze failures.
- [git-commit](skills/git-commit/SKILL.md) — split a change set into atomic Git commits.
- [optimize-prompt](skills/optimize-prompt/SKILL.md) — rewrite general and coding prompts into directly usable instructions.
- [plan-executor](skills/plan-executor/SKILL.md) — execute a structured plan across multiple agents, with test and review gates.
- [req-code-review](skills/req-code-review/SKILL.md) — run a multi-role code review against a design and the current implementation.
- [retrospect-session](skills/retrospect-session/SKILL.md) — review a session, distill reusable rules, and keep the entry points in sync.
- [review-context](skills/review-context/SKILL.md) — review code, documents, and prompts from a context-engineering angle.
- [review-doc](skills/review-doc/SKILL.md) — review a document's quality, optionally against a reference standard.
- [review-skill](skills/review-skill/SKILL.md) — check a skill's metadata, instructions, and resource references against the spec.
- [semver-release](skills/semver-release/SKILL.md) — semantic-version release flow, for the whole repository or for a single asset.
- [session-summary](skills/session-summary/SKILL.md) — record a session summary and turn-by-turn detail in a fixed format.

### Prompts

- [accept-skill-casebook](prompts/accept-skill-casebook.md) — analyze skill usage feedback and propose improvements.
- [handoff-session](prompts/handoff-session.md) — produce a handoff summary for the next session.
- [html-pr-review-artifact](prompts/html-pr-review-artifact.md) — generate an HTML report with the diff and review annotations.
- [interaction-design-review](prompts/interaction-design-review.md) — review an interaction design through parallel multi-role passes.
- [prd-implementation-plan](prompts/prd-implementation-plan.md) — turn a PRD into an executable plan with test steps.
- [product-roadmap-analysis](prompts/product-roadmap-analysis.md) — analyze the product's current state and opportunities, then propose a roadmap.
- [prompt-optimizer](prompts/prompt-optimizer.md) — improve a prompt through iterative review.
- [svpino-interview-to-spec](prompts/svpino-interview-to-spec.md) — pin down requirements through a turn-by-turn interview, then write a spec.
- [write-skill-casebook](prompts/write-skill-casebook.md) — record a skill failure, its root cause, and a fix proposal.

### Rules

- [CLAUDE-From-Boris](rules/CLAUDE-From-Boris.md) — workflow rules for planning, verification, and retrospectives.
- [deepseek-harness-inspired-agents-md](rules/deepseek-harness-inspired-agents-md.md) — a project `AGENTS.md` template inspired by DeepSeek Harness.

### Tools

- [claude-statusline](tools/claude-statusline/README.md) — a two-line status bar showing Claude Code session and usage information.

### Plugins

- [@vamdawn/dsh-appearance-plus](plugins/dsh-appearance-plus/README.md) — customize the DeepSeek Harness interface font, code font, and background image.
- [@vamdawn/dsh-astrolabe](plugins/dsh-astrolabe/README.md) — a two-axis tabbed panel that replaces the session area of the DeepSeek Harness sidebar, with search, pinned groups, and row actions.
- [@vamdawn/dsh-rename-session](plugins/dsh-rename-session/README.md) — generate a DeepSeek Harness session name from the conversation context.

## Versioning and releases

- Skills, tools, and plugins are versioned independently and tagged `<asset-name>@X.Y.Z`; prompts and rules change through Git history.
- [CHANGELOG.md](CHANGELOG.md) indexes every release; details live in the asset's own changelog.
- The repository has no global version. The convention is in [versioning-and-release.md](docs/versioning-and-release.md).

## Repository maintenance

The maintenance entry point is [AGENTS.md](AGENTS.md); the rules it points to live in [docs/](docs/asset-layout.md) and the checks in [scripts/verify-docs.py](scripts/verify-docs.py). Asset classification, resource ownership, and documentation responsibilities live in [asset-layout.md](docs/asset-layout.md).

## License

[MIT](LICENSE)
