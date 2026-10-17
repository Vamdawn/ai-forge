# Asset Layout

Read when: adding, deleting, renaming, or moving an asset; changing a documentation entry point; adding or editing a file in `docs/`.

## Rules

1. Place content by its purpose and trigger, using this table as the test.
   | Location | What belongs there | Test |
   |----------|--------------------|------|
   | `skills/<name>/` | Reusable capability triggered on demand | Does it need resources, a description trigger, or a version? |
   | `prompts/*.md` | One-off prompt the user triggers by hand | Single file, no resources, not versioned |
   | `rules/*.md` | Rule loaded every session, or a whole-file template | Does it apply to every session of a consuming project? |
   | `tools/<name>/` | Standalone CLI tool | Does it ship an executable of its own? |
   | `plugins/<name>/` | Plugin a host application loads | Is it loaded by a host at runtime? |
   | `docs/` | Harness rule for this repository, one topic per file | Does it govern how the repository is maintained? |
   | `scripts/` | Check or tool that only maintains this repository | Does it serve repository maintenance rather than a consumer? |
   | `.claude/`, `.agents/` | Runtime adapters and tool configuration | Is it tool runtime state? |
2. Keep every asset self-contained: reference material, templates, scripts, and tests live inside the asset, and no shared top-level resource directory exists.
3. Take `SKILL.md` as a skill's entry point and add `references/`, `scripts/`, or `evals/` as that skill needs them. A skill's own `agents/` directory is its runtime metadata, separate from this repository's harness.
4. Organize subdirectories by the asset's real needs and keep working layouts (`templates/`, `references/templates/`) as they are.
5. Update every referrer in the same change when moving or renaming something; when an implementation path depends on the location, include that code change in the task.
6. Give harness rules one topic per file, named after the topic, and open the file with a `Read when:` line so it states its own trigger. A `README.md` or `CHANGELOG.md` inside `docs/` is a document rather than a rule, and follows the documentation standard.
7. Prefer a check over prose: label a runnable command `Check:` and a judgement call `Review:`. Keep history in git and `CHANGELOG.md`, so rule files carry no change log of their own.

## Documentation responsibilities

| Document | Owns |
|----------|------|
| root `README.md` (+ `.zh-CN.md`) | Project overview, complete asset index, entry points |
| root `AGENTS.md` | Always-loaded conventions and the trigger for each rule |
| `docs/*.md` | Rule source of truth, one topic per file |
| `scripts/*` | Checks that only maintain this repository |
| asset `SKILL.md` / `README.md` | That asset's usage |
| asset `CHANGELOG.md` (+ `.zh-CN.md`) | That asset's user-visible changes |
| root `CHANGELOG.md` (+ `.zh-CN.md`) | Release index, repository milestones, history |

- Keep entry documents short and link to the source of truth; each rule lives in exactly one file.
- Adding, removing, or renaming an asset updates the root README index with one line per asset: link `SKILL.md` for a skill, `README.md` for a tool or plugin.
- Adding or removing a file in `docs/` updates the matching bullet in `AGENTS.md`, and rule files open with a `Read when:` line, stay under 60 lines, and keep no change log of their own.

## Checks

- `python3 scripts/verify-docs.py` — asset index coverage, rule index coverage, rule file trigger and budget, relative links across `AGENTS.md`, `docs/`, and the paired documents, and each pair's heading levels, list entries per section, and code blocks.
- `python3 scripts/verify-docs.spec.py` — self-test: every basic check fires, and the repository itself passes.
- `git config core.hooksPath scripts/hooks` — installs the pre-commit guardrail, which runs the two checks above plus each staged asset's `typecheck` and `test`.
- Assets keep their own resources: no shared top-level resource directory exists.
