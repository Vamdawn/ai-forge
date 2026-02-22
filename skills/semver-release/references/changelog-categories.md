# CHANGELOG Categories Reference

Based on [Keep a Changelog](https://keepachangelog.com/) specification.

## Commit Type → Category Mapping

| Commit Type | Emoji | Category |
|-------------|-------|----------|
| `feat` | ✨ | **Added** |
| `feat` (breaking) | 💥 | **Changed** |
| `fix` | 🐛 | **Fixed** |
| `fix` (security) | 🔒️ | **Security** |
| `perf` | ⚡️ | **Changed** |
| `refactor` | ♻️ | **Changed** |
| `revert` | 🗑️ | **Removed** |
| `deprecate` | 🗃️ | **Deprecated** |
| `BREAKING CHANGE` | 💥 | **Changed** (with ⚠️ prefix) |

Commit types that are **excluded** from CHANGELOG by default:
- `docs` — documentation only
- `style` — formatting, no logic change
- `test` — test additions/changes
- `chore` — tooling, CI, dependencies
- `ci` — CI/CD pipeline changes

> If a `docs` / `chore` / `ci` commit has notable user-facing impact, the user may choose to include it manually.

## CHANGELOG File Structure Template

```markdown
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [x.y.z] - YYYY-MM-DD

### Added
- ✨ Description of new feature

### Changed
- ♻️ Description of change
- ⚡️ Description of performance improvement
- ⚠️ 💥 Description of breaking change

### Deprecated
- Description of deprecated feature

### Removed
- 🗑️ Description of removed feature

### Fixed
- 🐛 Description of bug fix

### Security
- 🔒️ Description of security fix
```

**Rules:**
- Only include categories that have entries (omit empty categories)
- Categories appear in the order: Added → Changed → Deprecated → Removed → Fixed → Security
- Each entry starts with the relevant emoji prefix
- Breaking changes use `⚠️ 💥` prefix under **Changed**
- `[Unreleased]` section is always present at the top

## Multilingual CHANGELOG Detection

### File Name Patterns

Detect all CHANGELOG variants in the project root using these patterns:

| Pattern | Example | Language |
|---------|---------|----------|
| `CHANGELOG.md` | `CHANGELOG.md` | English (default) |
| `CHANGELOG-<lang>.md` | `CHANGELOG-zh.md` | Hyphen-separated |
| `CHANGELOG.<lang>.md` | `CHANGELOG.ja.md` | Dot-separated |
| `CHANGELOG.<lang>-<region>.md` | `CHANGELOG.zh-CN.md` | With region code |
| `CHANGELOG-<lang>-<region>.md` | `CHANGELOG-pt-BR.md` | Hyphen with region |

### Common Language Codes

| Code | Language | Native Name |
|------|----------|-------------|
| `zh-CN` / `zh` | Chinese (Simplified) | 简体中文 |
| `zh-TW` | Chinese (Traditional) | 繁體中文 |
| `ja` | Japanese | 日本語 |
| `ko` | Korean | 한국어 |
| `es` | Spanish | Español |
| `fr` | French | Français |
| `de` | German | Deutsch |
| `pt-BR` / `pt` | Portuguese | Português |
| `ru` | Russian | Русский |
| `ar` | Arabic | العربية |
| `it` | Italian | Italiano |

### Discovery Logic

1. `CHANGELOG.md` is always the primary file (create if it doesn't exist)
2. Glob for `CHANGELOG-*.md` and `CHANGELOG.*.md` in the project root
3. Parse the language code from the filename
4. Include ALL discovered files in the update process

## Translation Rules

When generating multilingual CHANGELOG entries:

1. **Emoji prefixes** — Keep identical across all languages
2. **Category headings** — Keep in English (`### Added`, `### Fixed`, etc.) for consistency and tooling compatibility
3. **Entry descriptions** — Translate to the target language
4. **Version numbers and dates** — Keep identical
5. **Technical terms** — Preserve as-is (API names, CLI flags, file names, package names)
6. **Proper nouns** — Keep original form (GitHub, npm, Docker, etc.)

### Translation Example

English (`CHANGELOG.md`):
```markdown
### Added
- ✨ Add user authentication with OAuth 2.0 support
```

Chinese (`CHANGELOG.zh-CN.md`):
```markdown
### Added
- ✨ 添加支持 OAuth 2.0 的用户认证功能
```

Japanese (`CHANGELOG.ja.md`):
```markdown
### Added
- ✨ OAuth 2.0 対応のユーザー認証を追加
```

## Merging Git History with Existing [Unreleased]

When both git commits and an existing `[Unreleased]` section contain entries:

1. **Read** the current `[Unreleased]` content from each CHANGELOG file
2. **Generate** new entries from git commit analysis
3. **Deduplicate** — if a git commit clearly matches an existing entry (by semantic meaning, not exact text), skip it
4. **Merge** — add new entries to the appropriate categories, preserving existing entries
5. **Sort** — within each category, existing entries come first, then new entries

This ensures manually curated entries are preserved while git-derived entries fill in gaps.
