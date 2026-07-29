# AI Forge

A personal Agent capability asset monorepo: reusable skills, prompts, rules, and CLI tools. Assets are unrelated to each other and are versioned, changelogged, and released independently.

## Structure

| Directory | Description |
|-----------|-------------|
| `skills/` | Reusable Agent Skills, each self-contained (instructions, references, scripts, evals) and independently versioned |
| `prompts/` | Prompt templates for one-off analysis, planning, review, and documentation tasks (not versioned) |
| `rules/` | Reusable Agent behavior rules and project-rule templates intended for sharing or reuse (not versioned) |
| `tools/` | Standalone CLI tools, each an independent package with its own manifest, tests, and changelog (created when the first tool lands) |
| `agents/` | Agent Harness for maintaining this repository — not a distributable asset ([details](agents/README.md)) |
| `scripts/` | Repository-level helper scripts that are not owned by a single asset |

## Usage

Browse into the directory that matches the asset you need and use the relevant skill, prompt, rule, or tool directly. Asset-specific resources stay inside their owning asset directory so each asset remains self-contained.

## Versioning & Releases

- Versioned assets (skills and tools) each follow independent semver with annotated tags named `<asset-name>@X.Y.Z`.
- Each versioned asset keeps its own `CHANGELOG.md`; the root [CHANGELOG.md](CHANGELOG.md) is a release index plus repository milestones.
- There is no repository-wide version number.
- Conventions: [agents/rules/versioning-and-release.md](agents/rules/versioning-and-release.md). Design: [docs/specs/2026-07-29-repo-structure-and-release-workflow.md](docs/specs/2026-07-29-repo-structure-and-release-workflow.md).

## Maintenance

- Keep top-level directories tied to real assets. Do not keep placeholder directories for future possibilities.
- Put asset-specific resources inside the owning asset, not in a shared top-level bucket.
- Repository maintenance rules live in `agents/` (entry point: [AGENTS.md](AGENTS.md)).

## License

[MIT](LICENSE)
