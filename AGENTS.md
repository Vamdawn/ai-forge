# AGENTS.md

ai-forge is a personal monorepo of agent capability assets — skills, prompts, rules, CLI tools, and host-application plugins. Assets are Markdown-first; tools and plugins are Node.js 24 + TypeScript. Each asset is independent: version, changelog, and release are per asset, and there is no repository-wide version.

## Repository layout

```text
skills/<name>/     On-demand skills; entry point SKILL.md; versioned
prompts/*.md       Manually triggered one-off prompts; single files; not versioned
rules/*.md         Rules loaded every session, or whole-file rule templates; not versioned
tools/<name>/      Standalone CLI tools distributed to users; entry point README.md; versioned
plugins/<name>/    Plugins loaded by a host application; entry point README.md; versioned
docs/              Harness rules for this repository, one topic per file
scripts/           Checks and repository-only tooling
.claude/ .agents/  Runtime adapters and tool configuration; hold no project knowledge
```

Harness rules live in `docs/*.md`, and Conventions lists which one to read before which change. Add a nested `AGENTS.md` only when a subdirectory needs different commands from this file.

## Commands

```sh
# Per-asset checks. There is no repository-wide install, build, test, or lint.
cd tools/<name>   && npm ci --ignore-scripts && npm run typecheck && npm test
cd plugins/<name> && npm ci --ignore-scripts && npm run typecheck && npm test

python3 scripts/verify-docs.py        # pairs, pair shape, links, budgets, indexes
python3 scripts/verify-docs.spec.py   # self-test: every basic check fires
git tag -l '<name>@*'                 # release history of one asset
```

## Conventions

- **Assets are self-contained.** Reference material, templates, scripts, and tests stay inside the asset directory; there is no shared top-level bucket ([asset-layout.md](docs/asset-layout.md)).
- **Version per asset.** Bump, changelog, and tag one asset at a time as `<asset-name>@X.Y.Z`; user-visible changes get an `[Unreleased]` entry in the same commit ([versioning-and-release.md](docs/versioning-and-release.md)).
- **Docs ship with the change.** A behavior change and the README or CHANGELOG it affects land in one commit; every README and CHANGELOG is a bilingual pair (`README.md` or `CHANGELOG.md` plus `.zh-CN.md`) with the same heading structure ([documentation-standard.md](docs/documentation-standard.md), [versioning-and-release.md](docs/versioning-and-release.md)).
- **Machine-checkable first.** A constraint a script can enforce becomes a check, not prose; run `python3 scripts/verify-docs.py` before committing documentation changes.
- **Asset layout.** Read [asset-layout.md](docs/asset-layout.md) before adding, deleting, renaming, or moving an asset, changing a documentation entry point, or editing a rule file.
- **Markdown assets.** Read [markdown-assets.md](docs/markdown-assets.md) before editing frontmatter-bearing Markdown or a file under `prompts/`; frontmatter and body are separate regions, and scope words such as "keep only" mean the narrowest reading.
- **README and CHANGELOG.** Read [documentation-standard.md](docs/documentation-standard.md) before writing or restructuring either (sections, length budgets, the bilingual pair).
- **Versioned assets and releases.** Read [versioning-and-release.md](docs/versioning-and-release.md) before changing `skills/<name>/`, `tools/<name>/`, or `plugins/<name>/`, or preparing a release (semver meaning, CHANGELOG entries, tags).
- **Keep this list current.** Adding or removing a file in `docs/` requires a bullet here, and this file stays under 200 lines; `python3 scripts/verify-docs.py` verifies both.
- **Finish with evidence.** Turn the task into a checkable goal and prove it holds: for a behavior change, write the failing test first and make it pass; for a documentation change, run the documentation check.
