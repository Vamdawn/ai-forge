# ai-forge 仓库结构与发布工作流设计

- 日期：2026-07-29
- 状态：Target Design（已评审收敛）

## 1. 定位与原则

ai-forge 是个人 Agent 能力资产 monorepo，包含四类产品资产：skills、prompts、rules、CLI 工具（tools）。仓库主要由 CodeAgent 维护。

三条全局原则：

1. **资产互不相关**：库内资产没有相关性，不存在"整体"这个可交付单元。版本、CHANGELOG、发布全部以单个资产为单位。
2. **产品层与 Harness 层物理分离**：仓库出品的资产（产品）与维护本仓库的知识（Harness）不混放。Harness 遵循 Agent Harness 架构规范（`~/agent-harness-maintenance-guide.md`）：`AGENTS.md` 做短入口、`agents/` 做真源、工具点目录只做 adapter。
3. **机器可校验优先于散文规则**：约束尽可能落为 validator / hook / CI 检查，agent 对 prose 的遵守率远低于对报错的响应率。

## 2. 调研参照

| 仓库 | 借鉴点 |
|------|--------|
| pnpm/pnpm | `AGENTS.md` 开篇声明多产品边界；仓库维护专用 skill 与产品分离；变更描述面向用户、实现理由写 commit message |
| anthropics/claude-code | 扁平 bullet、版本为键的 CHANGELOG 风格 |
| openai/codex、vercel/turborepo | 顶层按产品分目录（不按语言）；多产品独立发版轨道；发布流程文档化 |
| obra/superpowers | pre-commit 机器化校验（lint/format/test）；发布即 annotated tag + GitHub Release |
| changesets 惯例 | `<name>@X.Y.Z` 的 tag 命名空间约定 |

## 3. 架构分层

| 层 | 内容 | 位置 |
|----|------|------|
| 产品层（对外提供） | skills、prompts、rules、CLI 工具 | 顶层 `skills/`、`prompts/`、`rules/`、`tools/` |
| Harness 层（服务于维护本仓库的 CodeAgent） | 维护规则、维护流程 skill、hooks、evals、校验工具 | `AGENTS.md` + `agents/` |
| Adapter 层（工具私有，不承载知识） | 运行时配置 | `.claude/` 等点目录 |

归属判定：

- **产品 skill 本仓库自用不导致复制**：Harness 规则中直接引用（如"发版用 `/semver-release`"），`agents/` 不保留副本。
- **`agents/skills/` 只放纯仓库私有流程**（如"新增一个 skill 的标准步骤"）；对外可复用的进 `skills/`。
- **规则的归属**：可被其他项目复用的规则模板进 `rules/`（产品）；只约束本仓库维护行为的规则进 `agents/rules/`（Harness）。

## 4. 目录结构

```text
ai-forge/
├── AGENTS.md                    # Harness 总入口（真源）：定位、分层边界、红线、指向 agents/
├── CLAUDE.md -> AGENTS.md       # symlink adapter
│
├── agents/                      # Harness 真源
│   ├── README.md                # Harness 定位；产品层 vs Harness 层边界说明
│   ├── rules/                   # 广泛适用的维护规则（含 Markdown Asset Rules、版本/CHANGELOG/commit 约定）
│   ├── skills/                  # 仅"维护本仓库"的流程 skill（按需创建）
│   ├── hooks/                   # 执行边界控制（按需创建）
│   ├── evals/                   # Harness 自身回归验证（按需创建）
│   └── tools/                   # validate-skills / lint 等校验工具（按需创建）
│
├── .claude/                     # adapter：settings.json；需要时 symlink agents/hooks
│
├── skills/                      # 【产品】每个 skill 自包含、独立版本化
│   └── <name>/
│       ├── SKILL.md             # frontmatter 不携带版本号
│       ├── CHANGELOG.md         # 该 skill 的独立 changelog（随首次发版创建）
│       └── references/  scripts/  evals/ ...
│
├── prompts/                     # 【产品】单文件模板，不版本化
├── rules/                       # 【产品】可复用规则模板，不版本化
│
├── tools/                       # 【产品】CLI 工具，每个工具独立成包、独立版本化
│   └── <tool-name>/
│       ├── package.json / pyproject.toml   # 独立 manifest 与版本号
│       ├── CHANGELOG.md
│       ├── src/  tests/  README.md
│
├── scripts/                     # 仓库级散脚本（不属于任何单一资产）
├── docs/                        # 设计文档 / plans
├── CHANGELOG.md                 # 全局发布索引 + 仓库里程碑（见 §6.2）
├── README.md
└── LICENSE
```

结构决策依据：

- **`tools/` 而非 `packages/`**：`packages/` 暗示被 import 的库，本仓库场景是独立可运行的 CLI。顶层按产品划分、不按语言划分；工具语言可混杂（Node/Python/shell），每个工具自带 manifest、测试、CHANGELOG，互不感知。
- **skill 不设 version 字段**：版本真源是 git tag + 该 skill CHANGELOG 的版本节标题，SKILL.md frontmatter 不携带版本号，避免多处声明漂移。CLI 工具因生态要求必须有 manifest 版本，由发版流程保证与 tag 一致。
- **AGENTS.md 保持精简**（200 行以内），只放：一句话定位、分层边界声明、必守红线、构建/校验/提交的最小执行方式、指向 `agents/` 的入口。
- **不预建空目录**：`agents/` 子目录、`tools/`、各资产 CHANGELOG 均在出现真实需求时创建。

## 5. 版本与发布

### 5.1 版本化单位

| 资产类型 | 是否版本化 | 理由 |
|----------|-----------|------|
| `skills/<name>/` | 是 | 有内部结构，行为语义随演进变化，使用方需要可引用的版本锚点 |
| `tools/<name>/` | 是 | 独立可运行软件，天然需要 semver |
| `prompts/*.md`、`rules/*.md` | 否 | 单文件资产，git 历史即完整变更记录 |
| 仓库整体 | **否** | 见 §8 |

### 5.2 统一约定（skill 与 tool 相同）

- **每资产独立 semver**，互不联动。
- **tag**：`<asset-name>@X.Y.Z`（如 `content-summarizer@1.2.0`），annotated。资产名即目录名，全仓库唯一。
- **semver 语义（skill）**：
  - MAJOR：不兼容的行为/接口变化——触发条件（frontmatter description）、输入约定、输出格式的破坏性调整；删除子能力。
  - MINOR：新增子能力、新增 references/scripts。
  - PATCH：修 bug、文案修正、references 内容修订。
- **semver 语义（tool）**：标准 semver，CLI flag / 输出格式 / 退出码为兼容面。
- **起始版本**：已稳定使用的资产首发 `1.0.0`；实验性资产从 `0.1.0` 起。
- **发布粒度**：一次发布只针对一个资产；同时改动多个资产则各自发 tag。

### 5.3 发布流程

发布是**显式动作**，由 `semver-release` skill 的资产模式驱动（接受资产名参数，commit 分析范围限定 `git log <name>@<last>..HEAD -- <asset-path>/`，版本文件探测限定资产目录内）。不随 merge 自动触发，CI 不做发布。

步骤：

1. 将资产 CHANGELOG 的 `[Unreleased]` 挪至 `## [X.Y.Z] - YYYY-MM-DD`。
2. （tool 类）同步 manifest 版本号。
3. 在根 `CHANGELOG.md` 发布索引追加一行（§6.2）。
4. commit：`🔖 release: <name>@X.Y.Z`。
5. annotated tag + `git push --follow-tags`。
6. 可选 `gh release create <name>@X.Y.Z`，notes 取自资产 CHANGELOG 对应节。

## 6. CHANGELOG 体系

### 6.1 资产级 CHANGELOG（细节层）

- 每个版本化资产维护自己的 `CHANGELOG.md`，Keep a Changelog 格式（`[Unreleased]` + 版本节 + Added/Changed/Fixed 分类）。
- **变更随改动写入 `[Unreleased]` 节，与代码同 commit 提交**；发版时由 release 流程归档到版本节。
- 条目面向最终用户，每条 1–3 句写清"改了什么 + 为什么"；实现理由写在 commit message，不写在 CHANGELOG。
- 纯内部变更（重构、typo、Harness 调整）不需要条目。
- 并行会话安全：不同资产写不同文件；同一资产的并行修改本身就是实质冲突，CHANGELOG 不引入额外冲突面。

### 6.2 根 CHANGELOG：全局发布索引 + 仓库里程碑（概览层）

根 `CHANGELOG.md` 不记录变更细节，承担两个低频、串行写入的职责：

```markdown
# Releases

## 2026-08

- `content-summarizer@1.1.0` (2026-08-14) — 新增 Reddit 抓取回退链 → [详情](skills/content-summarizer/CHANGELOG.md)
- `forge-lint@0.2.0` (2026-08-03) — 支持 frontmatter 校验 → [详情](tools/forge-lint/CHANGELOG.md)

## Repository milestones

- 2026-08：引入资产级版本化约定，tag 格式 `<name>@X.Y.Z`
```

- **发布索引**：每次资产发版由 release 流程追加一行摘要 + 指向资产 CHANGELOG 的链接。
- **仓库里程碑**：仓库级约定/结构发生实质变化时（tag 格式、目录布局、CHANGELOG 约定、Harness 规则的破坏性调整）追加一行叙事记录。里程碑是叙事性、低频的，不需要版本号的比较语义。

### 6.3 全局变更可见性

| 时间轴 | 载体 |
|--------|------|
| 已发布（仓库内） | 根 `CHANGELOG.md` 发布索引 |
| 已发布（对外） | GitHub Releases 页（每个 `name@X.Y.Z` tag 一条） |
| 未发布 | `git log` + commit scope 约定（scope 必须为资产名，如 `feat(content-summarizer): ...`） |
| 仓库约定演进 | 根 `CHANGELOG.md` 的 Repository milestones 节 |

## 7. CodeAgent 维护工作流

### 变更进入

1. Agent 读 `AGENTS.md` → 按任务加载 `agents/rules/` 或相应 skill → 修改产品资产 → 同 commit 更新该资产 CHANGELOG 的 `[Unreleased]` 节。
2. 两条规则写入 `agents/rules/` 并由 validator 强制：
   - **CHANGELOG 同步**：diff 触及 `skills/<name>/` 或 `tools/<name>/` 实质内容但该资产 CHANGELOG 未更新 → 报错（允许 `internal` 豁免标记）。
   - **commit scope 必须为资产名**。

### 提交前验证（`agents/tools/` + pre-commit）

- `validate-skills`：每个 skill 有 `SKILL.md`，`name`/`description` 合法（从 review-skill 检查清单蒸馏出机器可查子集）。
- Markdown / frontmatter lint。
- 禁止提交 `__pycache__/`、`.DS_Store`（hook 拦截 + `.gitignore`）。
- `tools/` 内各工具运行自己的测试。

### CI

- 单个 validate workflow 运行上述全部检查，PR 必绿。不做 CI 发布。

### 发布

- 人（或被明确授权的 agent 会话）调用 `semver-release` skill 资产模式，按 §5.3 执行。

### Harness 自身演进

Agent 反复犯同一类错时，按规范落位：

| 性质 | 落位 |
|------|------|
| 每次任务都需要 | `AGENTS.md` |
| 广泛适用但非每次需要 | `agents/rules/` |
| 深度领域知识 / 固定流程 | `agents/skills/` |
| 工具行为硬约束 | `agents/hooks/` |
| 质量回归验证 | `agents/evals/` |

`retrospect-session` skill 是该闭环入口，其治理落位目标对齐上表。

## 8. 明确不做的事（Non-goals）

| 不做 | 理由 |
|------|------|
| **全局版本号** | 版本号必须标识一个可交付单元；资产互不相关且无整体分发物，"ai-forge vX" 没有指称对象，且每次资产发版都会产生"全局要不要 bump"的无原则决定点。仓库级约定演进由 Repository milestones 承担。若未来恢复 plugin 分发，plugin version 即天然的全局版本，届时再引入 |
| **plugin / marketplace 分发** | 当前使用方式为直接引用仓库内资产；出现真实分发需求时再设计 |
| **`.changes/` 变更条目目录** | 该机制解决的是多会话并行写同一全局 `[Unreleased]` 的冲突；每资产独立 CHANGELOG 后冲突面已消除，发版前的待发布聚合由各资产 `[Unreleased]` 节承担 |
| **CI 自动发布**（release-please 等） | 发布由 skill 驱动已是自动化；显式发布避免 agent 中间提交意外成为对外版本 |
| **prompts / rules 版本化** | 单文件资产，git 历史即变更记录，版本化成本超过收益 |
| **预建目录 / 占位文件** | 所有按需目录在真实需求出现时创建 |
