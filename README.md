# AI Forge

A personal Agent capability asset monorepo: reusable skills, prompts, rules, and CLI tools. Assets are unrelated to each other and are versioned, changelogged, and released independently.

## Structure

| Directory | Description |
|-----------|-------------|
| `skills/` | Reusable Agent Skills, each self-contained (instructions, references, scripts, evals) and independently versioned |
| `prompts/` | Prompt templates for one-off analysis, planning, review, and documentation tasks (not versioned) |
| `rules/` | Reusable Agent behavior rules and project-rule templates intended for sharing or reuse (not versioned) |
| `tools/` | Standalone tool assets, each with its own usage documentation and changelog; manifests follow the tool's ecosystem |
| `agents/` | Agent Harness for maintaining this repository — not a distributable asset ([details](agents/README.md)) |
| `docs/` | Design specifications and implementation plans, organized by purpose ([index](docs/README.md)) |

## Usage

Browse into the directory that matches the asset you need and use the relevant skill, prompt, rule, or tool directly. Asset-specific resources stay inside their owning asset directory so each asset remains self-contained.

## Asset Directory

### Skills

- [ack-code-review](skills/ack-code-review/)
- [agent-friendly-cli](skills/agent-friendly-cli/)
- [content-summarizer](skills/content-summarizer/)
- [e2e-find](skills/e2e-find/)
- [e2e-run](skills/e2e-run/)
- [git-commit](skills/git-commit/)
- [optimize-prompt](skills/optimize-prompt/)
- [plan-executor](skills/plan-executor/)
- [req-code-review](skills/req-code-review/)
- [retrospect-session](skills/retrospect-session/)
- [review-context](skills/review-context/)
- [review-doc](skills/review-doc/)
- [review-skill](skills/review-skill/)
- [semver-release](skills/semver-release/)
- [session-summary](skills/session-summary/)

### Prompts

- [accept-skill-casebook](prompts/accept-skill-casebook.md)
- [handoff-session](prompts/handoff-session.md)
- [html-pr-review-artifact](prompts/html-pr-review-artifact.md)
- [interaction-design-review](prompts/interaction-design-review.md)
- [prd-implementation-plan](prompts/prd-implementation-plan.md)
- [product-roadmap-analysis](prompts/product-roadmap-analysis.md)
- [prompt-optimizer](prompts/prompt-optimizer.md)
- [svpino-interview-to-spec](prompts/svpino-interview-to-spec.md)
- [write-skill-casebook](prompts/write-skill-casebook.md)

### Rules

- [CLAUDE-From-Boris](rules/CLAUDE-From-Boris.md)

### Tools

- [claude-statusline](tools/claude-statusline/README.md)

## Versioning & Releases

- Versioned assets (skills and tools) each follow independent semver with annotated tags named `<asset-name>@X.Y.Z`.
- Each versioned asset keeps its own `CHANGELOG.md`; the root [CHANGELOG.md](CHANGELOG.md) is a release index plus repository milestones.
- There is no repository-wide version number.
- Conventions: [agents/rules/versioning-and-release.md](agents/rules/versioning-and-release.md). Design: [docs/specs/2026-07-29-repo-structure-and-release-workflow.md](docs/specs/2026-07-29-repo-structure-and-release-workflow.md).

## Maintenance

- Keep top-level directories tied to real assets. Do not keep placeholder directories for future possibilities.
- Put asset-specific resources inside the owning asset, not in a shared top-level bucket.
- Repository maintenance rules live in `agents/` (entry point: [AGENTS.md](AGENTS.md)).
- Executable files used only to maintain this repository belong in `agents/tools/`; distributable tools belong in `tools/<name>/`.
- Keep the asset directory above in sync when adding, removing, or renaming assets.

## License

[MIT](LICENSE)
