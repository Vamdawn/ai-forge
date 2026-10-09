# Agent Harness

`agents/` 是本仓库 Agent Harness 的 canonical source of truth：维护 ai-forge 仓库所需的规则、流程与校验工具都在这里维护。

`.claude/`、`.agents/` 等工具点目录只是 adapter 或运行时集成点，不承载项目知识。

## 与产品层的边界

ai-forge 有双层身份，勿混淆：

| 层 | 位置 | 内容 |
|----|------|------|
| 产品层 | 顶层 `skills/`、`prompts/`、`rules/`、`tools/` | 仓库出品、对外提供的可复用资产 |
| Harness 层 | `AGENTS.md` + `agents/` | 只服务于维护本仓库的 CodeAgent |

判定规则：

- 对外可复用的资产进产品层；只约束本仓库维护行为的内容进 `agents/`。
- 产品 skill 本仓库自用时直接引用（如发版用 `/semver-release`），不复制进 `agents/`。
- `agents/skills/` 只放纯仓库私有流程（如"新增一个 skill 的标准步骤"）。

## 目录结构

```text
agents/
├── README.md    # 本文件
├── rules/       # 广泛适用的维护规则（AGENTS.md 的 Rules Index 逐一引用）
├── skills/      # 仅"维护本仓库"的流程 skill（按需创建）
├── hooks/       # 执行边界控制（按需创建）
├── evals/       # Harness 自身回归验证（按需创建）
└── tools/       # 仅维护本仓库的执行文件，如 validate-skills / lint（按需创建）
```

按需子目录在出现真实需求时创建，不预建占位。

## 维护原则

- 修改 Harness 时只改 `agents/` 真源，不直接改工具点目录。
- 约束尽可能落为 validator / hook / CI 检查（机器可校验优先于散文规则）。
- 新增 `agents/rules/*.md` 必须同步更新 `AGENTS.md` 的 Rules Index。
- 设计与计划入口见 [docs/README.md](../docs/README.md)；完整架构设计见 [仓库结构与发布工作流](../docs/specs/2026-07-29-repo-structure-and-release-workflow.md)。
