# AI Forge

A personal Agent capability asset monorepo: reusable skills, prompts, rules, CLI tools, and application plugins. Assets are unrelated to each other and are versioned, changelogged, and released independently.

## Structure

| Directory | Description |
|-----------|-------------|
| `skills/` | Reusable Agent Skills, each self-contained (instructions, references, scripts, evals) and independently versioned |
| `prompts/` | Prompt templates for one-off analysis, planning, review, and documentation tasks (not versioned) |
| `rules/` | Always-loaded Agent context meant for reuse: rule fragments and whole-file project-rule templates such as AGENTS.md (loaded every session, not on demand; not versioned) |
| `tools/` | Standalone tool assets, each with its own usage documentation and changelog; manifests follow the tool's ecosystem |
| `plugins/` | Installable application plugins, each self-contained with its own manifest and usage documentation |
| `agents/` | Agent Harness for maintaining this repository — not a distributable asset ([details](agents/README.md)) |

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
- [deepseek-harness-inspired-agents-md](rules/deepseek-harness-inspired-agents-md.md)

### Tools

- [claude-statusline](tools/claude-statusline/README.md)

### Plugins

- [dsh-rename-session](plugins/dsh-rename-session/README.md)

## Versioning & Releases

- Versioned assets (skills and tools) each follow independent semver with annotated tags named `<asset-name>@X.Y.Z`.
- Each versioned asset keeps its own `CHANGELOG.md`; the root [CHANGELOG.md](CHANGELOG.md) is a release index plus repository milestones.
- There is no repository-wide version number.
- Conventions: [agents/rules/versioning-and-release.md](agents/rules/versioning-and-release.md).

## Maintenance

- Keep top-level directories tied to real assets. Do not keep placeholder directories for future possibilities.
- Put asset-specific resources inside the owning asset, not in a shared top-level bucket.
- Repository maintenance rules live in `agents/` (entry point: [AGENTS.md](AGENTS.md)).
- Executable files used only to maintain this repository belong in `agents/tools/`; distributable tools belong in `tools/<name>/`.
- Keep the asset directory above in sync when adding, removing, or renaming assets.

## License

[MIT](LICENSE)
