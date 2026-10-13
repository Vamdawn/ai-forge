# Asset Layout Rules

## Scope

- 本仓库的资产分类、目录与资源归属、文档入口职责；新增、删除、改名或移动资产，以及调整文档入口时适用。
- 版本、CHANGELOG 与发布细则见 [versioning-and-release.md](versioning-and-release.md)。

## 资产与目录归属

| 位置 | 归属与判定标准 | 使用入口 |
|------|----------------|----------|
| `skills/<name>/` | 按需触发的可复用能力；需要附带资源、按描述自动触发或版本化的一次性提示词也归此类 | `SKILL.md` |
| `prompts/*.md` | 用户手动触发、单文件、不附带资源、不版本化的一次性提示词 | 对应 `.md` 文件 |
| `rules/*.md` | 常驻加载、每次会话生效的可复用规则片段或整文件模板 | 对应 `.md` 文件 |
| `tools/<name>/` | 对外分发的独立 CLI 工具 | `README.md` |
| `plugins/<name>/` | 对外分发、由宿主应用加载的插件 | `README.md` |
| `agents/` | 只服务于维护本仓库的规则、流程与校验工具 | `agents/README.md`，维护入口为根 `AGENTS.md` |
| `.claude/`、`.agents/` 等点目录 | 工具运行时 adapter 与配置 | 对应工具配置 |

1. 按内容的用途与触发方式分类；顶层 `rules/` 是产品资产，`agents/rules/` 是本仓库维护规则。
2. 仅维护本仓库的执行文件归 `agents/tools/`；对外分发的执行文件归所属产品资产。
3. 产品 skill 在本仓库自用时直接引用；仓库私有流程才归 `agents/skills/`。对外资产保持通用，本仓库特有约定放在 Harness 中。
4. 目录随真实资产或维护需求创建；按需目录见 [Harness 说明](../README.md)。

## 资产内部资源

1. 每个资产自包含：参考资料、模板、脚本、测试与其他专属资源留在所属资产内，不引入顶层共享资源桶。
2. skill 以 `SKILL.md` 为入口，按需要附带 `references/`、`scripts/`、`evals/` 等资源；skill 内的 `agents/` 是该 skill 的运行时元数据，与顶层 Harness `agents/` 分开。
3. 子目录按资产的真实需要与生态约定组织；保留已有 `templates/`、`references/templates/` 等有效布局，不强制所有资产具备同一套目录。
4. 移动或改名时同步调整受影响的引用与使用说明；路径若由内部实现使用，须将实现变更单独纳入任务范围后再迁移。

## 文档职责

| 文档 | 职责 |
|------|------|
| 根 `README.md` | 面向使用者的项目总览、完整资产索引与直接使用入口 |
| 根 `AGENTS.md` | 面向维护 Agent 的高频约束摘要、规则索引与读取条件 |
| `agents/README.md` | Harness 的职责、现有结构与按需扩展位置 |
| `agents/rules/*.md` | 按主题维护的仓库规范真源；目录细则在本文件，版本与发布细则在版本规则 |
| 资产 `SKILL.md` / `README.md` | 所属资产的使用说明；工具与插件 README 保留自身生态的安装、开发验证与发布步骤 |
| 资产 `CHANGELOG.md` | 该资产面向用户的变更记录 |
| 根 `CHANGELOG.md` | 资产发布索引、仓库约定里程碑与既有历史 |

- 入口文档只保留必要摘要并链接到规范真源，避免重复维护细则。
- 新增、删除或改名资产时同步根 README 索引：每项提供一句用途说明，skill 直接链接 `SKILL.md`，工具与插件链接所属 `README.md`。
- 新增或删除维护规则时同步 `AGENTS.md` 的 Rules Index。

## Verification

- 根 README 索引覆盖所有产品资产，使用入口与受影响的相对链接存在。
- 维护规则索引覆盖 `agents/rules/*.md`，`AGENTS.md` 不超过 200 行。
- 资产资源留在所属目录，目录树明确区分实际存在与按需创建的目录。

## Change Log

- 2026-10-13: 集中资产分类、资源归属与文档职责约定，补齐应用插件的目录归属。
