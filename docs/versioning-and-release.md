# Versioning and Release

Read when: changing `skills/<name>/`, `tools/<name>/`, or `plugins/<name>/`; cutting or publishing a version.

## Rules

1. Version each asset on its own semver line and tag it `<asset-name>@X.Y.Z` (annotated), where the asset name is the directory name. An ecosystem package name may carry a scope, so the directory `dsh-rename-session` corresponds to the tag `dsh-rename-session@X.Y.Z` and the npm package `@vamdawn/dsh-rename-session`.
   - Check: `git tag -l '<name>@*'` lists that asset's complete version history.
2. Read semver for a skill as behavior, not as a code signature: MAJOR when the trigger, the input contract, or the output format changes incompatibly, or when a sub-capability is removed; MINOR for a new sub-capability or new `references/` and `scripts/`; PATCH for bug fixes, wording, and reference revisions. Tools and plugins follow standard semver with their compatibility surface — a tool's CLI flags, output format, and exit codes; a plugin's host compatibility, configuration, and public exports.
3. Write a user-visible change to a versioned asset into the `[Unreleased]` section of both `CHANGELOG.md` and `CHANGELOG.zh-CN.md` in the same commit; internal refactors, typos, and harness edits are exempt. Create the pair with the change when the asset has no CHANGELOG yet.
   - Rationale: a change record is most accurate when the change happens, and rebuilding it from `git log` at release time loses the intent.
   - Review: a diff that touches an asset's real content changes both of that asset's CHANGELOGs in the same commit.
4. Write every entry for the end user in one to three sentences covering what changed and why, and keep implementation reasoning in the commit message. Follow Keep a Changelog: `[Unreleased]`, then `## [X.Y.Z] - YYYY-MM-DD` with Added, Changed, and Fixed categories. Category headings, emoji, versions, and identifiers stay identical on both sides; translate the entries and the explanatory prose only.
5. Use the asset name as the commit scope, as in `feat(content-summarizer): ...`, and `repo` for a repository-level change that spans assets.
   - Review: every scope in `git log --oneline` maps to an asset directory.
6. Release explicitly, one asset at a time, through the asset mode of `/semver-release`, naming the target asset and its directory. Never release from CI or as a side effect of a merge. `/semver-release` is a generic published skill: this repository calls it as it is, without copying or customizing it, and does not use its whole-repository mode.
   - Rationale: automatic releases turn intermediate commits of an agent-maintained repository into published versions.
7. Append one line per side to the root CHANGELOG pair at release time: the English side reads `` `name@X.Y.Z` (date) — summary → [Details](<asset-path>/CHANGELOG.md) ``, and the Chinese side repeats it with a Chinese summary and `→ [详情](<asset-path>/CHANGELOG.zh-CN.md)`. Keep the `# Releases` heading on both sides, because the release flow locates the index by it.
8. Start an asset already in steady use at `1.0.0` and an experimental one at `0.1.0`. `SKILL.md` frontmatter carries no version field: the tag and the CHANGELOG are the source of truth.

## Anti-Patterns

- A version number for the repository → versions belong to assets, and repository-level evolution goes to Repository milestones in the root CHANGELOG.
- One tag for several assets → each asset gets its own `<name>@X.Y.Z`.
- Updating one language of a CHANGELOG → both sides change in the same commit, entry for entry.
- A `version` field in `SKILL.md` frontmatter → a second declaration drifts from the tag.

## Checks

- `git tag -l '<name>@*'` — the version history of one asset.
- `python3 scripts/verify-docs.py` — CHANGELOG pairs, their switchers, and their relative links.
