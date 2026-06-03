# AI Forge

A personal Agent capability asset library for reusable skills, prompts, rules, and local support scripts.

## Structure

| Directory | Description |
|-----------|-------------|
| `skills/` | Reusable Agent Skills with their own instructions, references, scripts, evals, and related resources |
| `prompts/` | Prompt templates for one-off analysis, planning, review, and documentation tasks |
| `rules/` | Reusable Agent behavior rules and project-rule templates intended for sharing or reuse |
| `scripts/` | Repository-level helper scripts that are not owned by a single skill |

## Usage

Browse into the directory that matches the asset you need and use the relevant skill, prompt, rule, or script directly. Skill-specific scripts, references, evals, and agent metadata stay inside their owning skill directory so each skill remains self-contained.

## Maintenance

- Keep top-level directories tied to real assets. Do not keep placeholder directories for future possibilities.
- Put skill-specific resources inside the owning skill, not in a shared top-level bucket.
- Use top-level `scripts/` only for repository-level tooling.
- Record notable capability and structure changes in `CHANGELOG.md`.

## License

[MIT](LICENSE)
