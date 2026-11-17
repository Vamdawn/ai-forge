# Versioning and Release

Read when: changing `skills/<name>/`, `tools/<name>/`, `plugins/<name>/`, or `mcp/<name>/`; cutting or publishing a version.

## Rules

1. Version each asset on its own semver line and tag it `<asset-name>@X.Y.Z` (annotated), where the asset name is the directory name. An ecosystem package name may carry a scope, so the directory `dsh-rename-session` corresponds to the tag `dsh-rename-session@X.Y.Z` and the npm package `@vamdawn/dsh-rename-session`.
   - Check: `git tag -l '<name>@*'` lists that asset's complete version history.
2. Read semver for a skill as behavior, not as a code signature: MAJOR when the trigger, the input contract, or the output format changes incompatibly, or when a sub-capability is removed; MINOR for a new sub-capability or new `references/` and `scripts/`; PATCH for bug fixes, wording, and reference revisions. Tools, plugins, and MCP products follow standard semver with their compatibility surface — a tool's CLI flags, output format, and exit codes; a plugin's host compatibility, configuration, and public exports; an MCP product's advertised tool contract and any separately shipped CLI interface.
   - For a plugin, a user-visible addition or behavior change that leaves that surface intact is MINOR: the narrow surface decides what is breaking, not what is noticeable. PATCH stays for defects, wording, and documentation-only releases.
3. Write a user-visible change to a versioned asset into the `[Unreleased]` section of both `CHANGELOG.md` and `CHANGELOG.zh-CN.md` in the same commit; internal refactors, typos, and harness edits are exempt. Create the pair with the change when the asset has no CHANGELOG yet.
   - Rationale: a change record is most accurate when the change happens, and rebuilding it from `git log` at release time loses the intent.
   - Review: a diff that touches an asset's real content changes both of that asset's CHANGELOGs in the same commit.
4. Write every entry for the end user in one to three sentences covering what changed and why, and keep implementation reasoning in the commit message. Follow Keep a Changelog: `[Unreleased]`, then `## [X.Y.Z] - YYYY-MM-DD` with Added, Changed, and Fixed categories. Category headings, emoji, versions, and identifiers stay identical on both sides; translate the entries and the explanatory prose only.
5. Follow [git-conventions.md](git-conventions.md) for branches, commit format and scope, synchronization, and release readiness on `main`.
6. Release only on an explicit request, one asset at a time, naming the target asset and its directory. For npm, use the manual dispatch in Publishing below.
7. Append one line per side to the root CHANGELOG pair at release time: the English side reads `` `name@X.Y.Z` (date) — summary → [Details](<asset-path>/CHANGELOG.md) ``, and the Chinese side repeats it with a Chinese summary and `→ [详情](<asset-path>/CHANGELOG.zh-CN.md)`. Keep the `# Releases` heading on both sides as the release index entry point.
8. Start an asset already in steady use at `1.0.0` and an experimental one at `0.1.0`. `SKILL.md` frontmatter carries no version field: the tag and the CHANGELOG are the source of truth.

## Release workflow

1. Start from release-ready `main` as defined in [git-conventions.md](git-conventions.md). Identify the asset name, directory, and distribution channel. Read its latest release tag, changes since that tag, and both `[Unreleased]` sections; select the next version using the rules above, or the initial version for an unreleased asset.
2. Complete the feature commit with the implementation, tests, affected usage docs, and both CHANGELOGs' `[Unreleased]` entries. Run the applicable asset checks and the documentation check below before committing; proceed only when they pass.
3. For an npm package, run `python3 scripts/prepare-release.py <package-or-asset> <X.Y.Z>` with the exact target version. The script updates `package.json` and `package-lock.json`, files the pending entries under the new version in both CHANGELOGs, retains empty `[Unreleased]` sections, and appends the root release index entries. Each index summary starts from the first pending entry in that language, with generic wording for an empty section. For other distribution channels, update declared versions and lockfiles where present, move the pending entries in both CHANGELOGs, and append the index entries by hand.
4. The npm preparation script runs the documentation check, `npm ci --ignore-scripts`, type checks, tests, and `npm pack --dry-run`. A failed check rolls back the script's release edits. Review the package file list and the working-tree diff, including both index summaries. For other distribution channels, re-run the applicable checks. Commit the reviewed changes in a separate release commit.
5. For npm packages, push the release commit to `main` and follow Publishing below. For assets distributed directly from Git, create the annotated tag on the release commit, push the commit and tag, and verify that the remote tag resolves to that commit and exposes the asset files.

## Publishing

1. Use the GitHub environment `npm-publish` with deployments limited to `main`. When adding a plugin, include its directory name in the workflow's choices and allowlist, and create the package's registry entry before binding it. In the package's npm Settings, add a GitHub Actions Trusted Publisher with owner `Vamdawn`, repository `ai-forge`, filename `publish-npm.yml`, and environment `npm-publish`. Enable **Allow npm publish** and complete the first successful publish within 48 hours of creating the configuration. [npm Trusted Publishing](https://docs.npmjs.com/trusted-publishers/) · [First publish with staging](https://docs.npmjs.com/staged-publishing/)
2. Run [Publish npm package](../.github/workflows/publish-npm.yml) on `main` with the asset directory name and exact `X.Y.Z` from `package.json`. Use `gh workflow run publish-npm.yml --ref main -f asset=<asset> -f version=<version>` or the Actions tab. The workflow tests and packs one plugin, then directly publishes the archive from that run via OIDC.
3. The `verify` job downloads the exact npm version and compares its SHA-512 with the digest of the archive passed to `npm publish`. It retries while npm is scanning or propagating the upload. If publishing succeeded and verification failed, use **Re-run failed jobs** on the same run to retry verification and its dependent tag job with the original digest. [GitHub Actions reruns](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/re-run-workflows-and-jobs)
4. Only after verification succeeds, the `tag` job pushes the annotated tag `<asset>@X.Y.Z` on the workflow's commit and checks the remote tag. An existing annotated tag on that commit counts as success. If the tag exists in another form or points elsewhere, the job fails and leaves it in place.
5. Moving an installation onto the release is a separate step. A `0.x` caret does not cross the minor, so a profile pinned to `^0.1.0` keeps running the old version until `dsh plugin --profile <profile> add <name>`.

## Anti-Patterns

- A version number for the repository → versions belong to assets, and repository-level evolution goes to Repository milestones in the root CHANGELOG.
- One tag for several assets → each asset gets its own `<name>@X.Y.Z`.
- Updating one language of a CHANGELOG → both sides change in the same commit, entry for entry.
- A `version` field in `SKILL.md` frontmatter → a second declaration drifts from the tag.
- Publishing again because the registry still shows the previous version → the first publish is propagating; the second collides with a version that is already accepted.

## Checks

- `git tag -l '<name>@*'` — the version history of one asset.
- `npm ci --ignore-scripts && npm run typecheck && npm test` in the asset directory — the gates before the release commit; `python3 scripts/verify-docs.py` covers documentation.
- `npm pack --dry-run` — the file list that will ship, where a missing bilingual README or CHANGELOG shows up.
- `python3 scripts/prepare-release.spec.py` — test version changes, both release indexes, and rollback after failed checks when modifying the preparation script.
- `actionlint .github/workflows/publish-npm.yml` — validate the workflow when changing it.
- Review: the `verify` and `tag` job logs should show the matched SHA-512 and remote tag commit.
