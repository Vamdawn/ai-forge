# Versioning and Release

Read when: changing `skills/<name>/`, `tools/<name>/`, or `plugins/<name>/`; cutting or publishing a version.

## Rules

1. Version each asset on its own semver line and tag it `<asset-name>@X.Y.Z` (annotated), where the asset name is the directory name. An ecosystem package name may carry a scope, so the directory `dsh-rename-session` corresponds to the tag `dsh-rename-session@X.Y.Z` and the npm package `@vamdawn/dsh-rename-session`.
   - Check: `git tag -l '<name>@*'` lists that asset's complete version history.
2. Read semver for a skill as behavior, not as a code signature: MAJOR when the trigger, the input contract, or the output format changes incompatibly, or when a sub-capability is removed; MINOR for a new sub-capability or new `references/` and `scripts/`; PATCH for bug fixes, wording, and reference revisions. Tools and plugins follow standard semver with their compatibility surface — a tool's CLI flags, output format, and exit codes; a plugin's host compatibility, configuration, and public exports.
   - For a plugin, a user-visible addition or behavior change that leaves that surface intact is MINOR: the narrow surface decides what is breaking, not what is noticeable. PATCH stays for defects, wording, and documentation-only releases.
3. Write a user-visible change to a versioned asset into the `[Unreleased]` section of both `CHANGELOG.md` and `CHANGELOG.zh-CN.md` in the same commit; internal refactors, typos, and harness edits are exempt. Create the pair with the change when the asset has no CHANGELOG yet.
   - Rationale: a change record is most accurate when the change happens, and rebuilding it from `git log` at release time loses the intent.
   - Review: a diff that touches an asset's real content changes both of that asset's CHANGELOGs in the same commit.
4. Write every entry for the end user in one to three sentences covering what changed and why, and keep implementation reasoning in the commit message. Follow Keep a Changelog: `[Unreleased]`, then `## [X.Y.Z] - YYYY-MM-DD` with Added, Changed, and Fixed categories. Category headings, emoji, versions, and identifiers stay identical on both sides; translate the entries and the explanatory prose only.
5. Use the asset name as the commit scope, as in `feat(content-summarizer): ...`, and `repo` for a repository-level change that spans assets.
   - Review: every scope in `git log --oneline` maps to an asset directory.
6. Release explicitly, one asset at a time, through the asset mode of `/semver-release`, naming the target asset and its directory. Never release from CI or as a side effect of a merge. `/semver-release` is a generic published skill: this repository calls it as it is, without copying or customizing it, and does not use its whole-repository mode.
   - Rationale: automatic releases turn intermediate commits of an agent-maintained repository into published versions.
   - Fallback: when the skill is not installed in the environment, perform the same sequence by hand — bump the version, move the entries under the dated heading, append the root CHANGELOG line, tag the release commit, publish, then push.
7. Append one line per side to the root CHANGELOG pair at release time: the English side reads `` `name@X.Y.Z` (date) — summary → [Details](<asset-path>/CHANGELOG.md) ``, and the Chinese side repeats it with a Chinese summary and `→ [详情](<asset-path>/CHANGELOG.zh-CN.md)`. Keep the `# Releases` heading on both sides, because the release flow locates the index by it.
8. Start an asset already in steady use at `1.0.0` and an experimental one at `0.1.0`. `SKILL.md` frontmatter carries no version field: the tag and the CHANGELOG are the source of truth.

## Publishing

Publishing is the last step and the only irreversible one. Run it from the asset directory: `prepare` rebuilds `dist/`, and `files` decides what ships.

1. Split the work in three: the feature commit (code, tests, and both CHANGELOGs' `[Unreleased]` entries), one release commit (version bump, those entries moved under `## [X.Y.Z] - YYYY-MM-DD`, the root CHANGELOG line), and the annotated tag on that release commit. Publish before pushing, so a failed publish never leaves a remote tag for a version nobody can install.
2. npm's two-factor web authentication needs an interactive terminal. Piped stdin and stdout make `npm publish` exit immediately with `EOTP`, and the authentication URL is not reliably readable from captured output. Run `python3 scripts/npm-publish-pty.py <asset-directory>` instead: it gives npm a pseudo-terminal, writes that URL into a log file the human can open, and answers the browser prompt. The URL is single-use and belongs to that run, so keep the process alive until the human has authenticated.
3. A successful publish is not readable at once: for a few minutes the registry may answer 404 or keep reporting the previous `latest`. Read the registry document and wait it out instead of re-publishing, because the accepted version number is already taken.
4. Verify the artifact, not the console line: `npm pack <name>@<version>` into a scratch directory, then compare the tarball's shasum with the publish output and the unpacked `dist/*` hashes with the local build.
5. Moving an installation onto the release is a separate step. A `0.x` caret does not cross the minor, so a profile pinned to `^0.1.0` keeps running the old version until `dsh plugin --profile <profile> add <name>`.

## Anti-Patterns

- A version number for the repository → versions belong to assets, and repository-level evolution goes to Repository milestones in the root CHANGELOG.
- One tag for several assets → each asset gets its own `<name>@X.Y.Z`.
- Updating one language of a CHANGELOG → both sides change in the same commit, entry for entry.
- A `version` field in `SKILL.md` frontmatter → a second declaration drifts from the tag.
- Publishing again because the registry still shows the previous version → the first publish is propagating; the second collides with a version that is already accepted.
- Tagging or pushing ahead of the registry → a remote tag for a version nobody can install.

## Checks

- `git tag -l '<name>@*'` — the version history of one asset.
- `npm ci --ignore-scripts && npm run typecheck && npm test` in the asset directory — the gates before the release commit; `python3 scripts/verify-docs.py` covers documentation.
- `npm pack --dry-run` — the file list that will ship, where a missing bilingual README or CHANGELOG shows up.
- `python3 scripts/npm-publish-pty.py <asset-directory>` — publishing through npm's web authentication when no interactive terminal is available.
- `curl -s https://registry.npmjs.org/<scope>%2F<name>` — the registry document, which shows a published version before `npm view` does.
- `npm pack <name>@<version>` — the published tarball, to compare against the local build.
