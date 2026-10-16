# Documentation Standard

Read when: writing or restructuring a `README.md` or `CHANGELOG.md`; adding an asset that needs either.

## Rules

1. Keep every README and CHANGELOG as a language pair: `README.md` / `CHANGELOG.md` in English and `README.zh-CN.md` / `CHANGELOG.zh-CN.md` in Simplified Chinese. Both sides carry the same headings in the same order and the same number of list entries, and they change in one commit.
   - Put the switcher directly under the H1: the English side reads `English | [简体中文](README.zh-CN.md)`, the Chinese side `[English](README.md) | 简体中文`; use the same shape for CHANGELOGs.
   - Keep identifiers, paths, commands, config keys, package names, versions, dates, and link targets untranslated, and point a link at the same-language counterpart when the target has one.
   - Review: the checker confirms the pair, the switcher, and the links only; holding both sides to the same headings, entries, and code blocks stays a reading task.
2. Fix the suffix at `.zh-CN.md`. Mixed forms such as `README.zh.md`, `README_CN.md`, or `Readme.md` are errors.
   - Check: `python3 scripts/verify-docs.py` verifies pairing, switcher placement, the fixed suffix, and link locale.
3. Order an asset README by the sections below and omit the ones that do not apply.
   | Section | Content |
   |---------|---------|
   | summary paragraph | What it is, who it is for, which host or runtime version it supports |
   | `## Install` | npm first, then a source checkout; commands in fenced blocks |
   | `## Usage` | What the user does in the interface or terminal |
   | `## Configuration` | Only when the asset has settings |
   | `## Limitations` | User-visible limits and unverified areas |
   | `## Development` | typecheck / test / build commands plus one line on the source layout |
   | `## Links` | CHANGELOG, the rules that govern the asset, and LICENSE when the asset ships one |
4. Order the root README as: summary, repository layout, usage, asset index (one line per asset), versioning and releases, maintenance, license.
5. Stay inside the budget: an asset README takes at most 110 lines per language and the root README 120.
   - Rationale: content over budget is not the README's job — implementation mechanics, trade-off analysis, per-file source maps, dated verification records, and release procedures belong in commit messages, code comments, and CHANGELOGs.
6. Write only what the reader needs: no restating of code, configuration, or `--help` output; no marketing adjectives; no emoji; no section for a one-off fact.

## Anti-Patterns

- Copying the root README's asset index into a directory-level README → keep one index, in the root README.
- Translating a code block's commands → translate the surrounding prose and the comments only.

## Checks

- `python3 scripts/verify-docs.py` — pairs, switchers, suffix, link targets, and budgets.
- Rendering pass: on both sides of a pair the switcher sits directly under the H1, with blank lines around it.
