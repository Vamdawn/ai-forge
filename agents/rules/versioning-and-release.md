# Versioning and Release Rules

## Scope

- 本仓库产品资产（`skills/<name>/`、`tools/<name>/`）的版本、CHANGELOG、commit 与发布约定。
- 完整设计与理由见 [docs/specs/2026-07-29-repo-structure-and-release-workflow.md](../../docs/specs/2026-07-29-repo-structure-and-release-workflow.md)。

## 版本化单位

| 资产类型 | 是否版本化 |
|----------|-----------|
| `skills/<name>/` | 是 |
| `tools/<name>/` | 是 |
| `prompts/*.md`、`rules/*.md` | 否（git 历史即变更记录） |
| 仓库整体 | 否（无全局版本号；仓库级约定演进记入根 CHANGELOG 的 Repository milestones） |

## Rules

1. 每个版本化资产独立 semver，互不联动；tag 格式为 `<asset-name>@X.Y.Z`（annotated），资产名即目录名。
   - Verification: `git tag -l '<name>@*'` 能列出该资产的完整版本历史。

2. skill 的 semver 语义：MAJOR = 触发条件（frontmatter description）、输入约定、输出格式的破坏性调整或删除子能力；MINOR = 新增子能力、新增 references/scripts；PATCH = 修 bug、文案修正、references 内容修订。tool 遵循标准 semver（CLI flag / 输出格式 / 退出码为兼容面）。
   - Rationale: skill 的"接口"是其行为语义，不是代码签名。

3. 对 `skills/<name>/` 或 `tools/<name>/` 的用户可见变更，必须在同一 commit 中更新该资产 `CHANGELOG.md` 的 `[Unreleased]` 节；纯内部变更（重构、typo、Harness 调整）豁免。资产 CHANGELOG 不存在时随本次变更创建。
   - Rationale: 变更记录在改动发生时最准确；发版时靠 git log 重建容易失真。
   - Verification: diff 触及资产实质内容时，该资产 CHANGELOG 同 commit 有对应条目。

4. CHANGELOG 条目面向最终用户，每条 1–3 句写清"改了什么 + 为什么"；实现理由写在 commit message，不写在 CHANGELOG。格式遵循 Keep a Changelog（`[Unreleased]` + `## [X.Y.Z] - YYYY-MM-DD` + Added/Changed/Fixed 分类）。

5. commit scope 必须为资产名，如 `feat(content-summarizer): ...`；跨资产的仓库级变更用 `repo` scope。
   - Verification: `git log --oneline` 中每个产品资产变更的 scope 可直接映射到资产目录。

6. 发布是显式动作：由 `/semver-release` 的资产模式执行，一次发布只针对一个资产；不随 merge 自动触发，CI 不做发布。
   - Rationale: agent 维护的仓库中，自动发布会让中间提交意外成为对外版本。

7. 发版时由发布流程在根 `CHANGELOG.md` 的 Releases 节追加一行：`` `<name>@X.Y.Z` (日期) — 摘要 → [详情](<asset-path>/CHANGELOG.md) ``。

8. 起始版本：已稳定使用的资产首发 `1.0.0`；实验性资产从 `0.1.0` 起。SKILL.md frontmatter 不携带版本号（版本真源是 tag + CHANGELOG）。

## Anti-Patterns

- 给仓库整体编版本号 -> 版本只属于单个资产；仓库级演进写 Repository milestones。
- 发版时从 git log 重建 CHANGELOG -> 变更随改动写入 `[Unreleased]`，发版只做归档。
- 多个资产联合发布一个 tag -> 各自发 `<name>@X.Y.Z`。
- 在 SKILL.md frontmatter 里加 version 字段 -> 版本声明多处必漂移。

## Change Log

- 2026-07-29: 初版，依据目标设计方案确立。
