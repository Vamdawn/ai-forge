# Git Conventions

Read when: starting repository changes; creating or merging branches; committing, pushing, or preparing a release.

## Daily workflow

1. Inspect the current branch and working tree before editing. Account for existing changes and preserve work outside the task. Start new work from `main` synchronized with `origin/main`; finish or isolate existing work before switching branches or updating the checkout.
2. Use `main` as the sole long-lived branch. Make small, well-understood changes directly on `main`. For experiments, large refactors, work that spans sessions, or parallel tasks, create a short-lived `codex/<topic>` branch from synchronized `main`; use separate worktrees for concurrent tasks.
3. Complete one logical change at a time. Keep each commit focused on one asset or one repository-level concern, with its tests and affected documentation. Follow [versioning-and-release.md](versioning-and-release.md) for asset change records.
4. Review the diff, stage only the intended changes, and run the applicable asset and documentation checks before committing. Use `type(scope): summary`, such as `feat(dsh-sidebar-plus): add session grouping`; the scope is the asset directory name, or `repo` for harness changes and repository-level work spanning assets.
5. For a topic branch, consolidate temporary local commits into logical changes before integration. Fast-forward `main` when possible. If `main` has advanced, integrate its changes into the topic branch, resolve conflicts, re-run the checks, and merge the result into `main`. Delete the topic branch after its work is integrated.
6. A pull request is optional: use one when remote CI, a focused diff review, or a discussion record helps. Reviewing the final diff and passing the applicable checks are required with or without a PR.
7. Push completed work on `main` to `origin/main` to preserve progress. Ordinary feature commits may be pushed before an asset is released; pushing them does not trigger a release.

## Release boundary

1. Prepare releases on `main` with a clean working tree, after integrating the target asset's feature work and synchronizing with `origin/main`. Review all changes to that asset since its last release, including changes from earlier tasks.
2. Follow [versioning-and-release.md](versioning-and-release.md) for the release commit, annotated tag, distribution, and artifact verification. The publish-before-push requirement for registry packages applies to the release commit and its tag; it does not block earlier feature pushes.
3. Push only the target asset's release tag for that run. Preserve published release commits and tags; deliver corrections through new commits and new versions.
4. Preserve pushed `main` history. Correct mistakes with follow-up or revert commits; limit commit rewriting to unpublished work.

## Checks

- `git diff --check` — whitespace errors in the working diff.
- `python3 scripts/verify-docs.py` — documentation gates before committing.
- Review: each commit contains one logical change, its staged diff excludes unrelated work, and the applicable asset checks pass.
- Review: before releasing, `main` is clean and synchronized; after releasing, the remote asset tag resolves to the intended release commit.
