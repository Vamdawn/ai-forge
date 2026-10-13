# Agent Harness

`agents/` 是本仓库 Agent Harness 的维护真源，承载维护 ai-forge 所需的规则、私有流程与校验工具。维护入口为根 [AGENTS.md](../AGENTS.md)。

工具点目录作为运行时 adapter；项目知识维护在 Harness 真源中。

## 职责与文档入口

产品资产由 `skills/`、`prompts/`、`rules/`、`tools/`、`plugins/` 五类目录提供；Harness 服务于本仓库维护。详细分类以 [目录规范](rules/asset-layout.md) 为准。

- 使用产品资产：根 [README.md](../README.md) 的资产索引。
- 维护仓库：根 [AGENTS.md](../AGENTS.md) 的约束摘要与 Rules Index。
- 调整目录或文档入口：[asset-layout.md](rules/asset-layout.md)。
- 调整版本或准备发布：[versioning-and-release.md](rules/versioning-and-release.md)。

## 现有目录

```text
agents/
├── README.md    # Harness 说明
└── rules/       # 按主题维护的仓库规范
```

## 按需扩展

以下目录当前不存在，出现实际维护需求时再创建：

| 目录 | 用途 |
|------|------|
| `skills/` | 只服务于本仓库的私有流程 |
| `hooks/` | 执行边界控制 |
| `evals/` | Harness 自身回归验证 |
| `tools/` | 仅维护本仓库的执行文件，如校验与 lint 工具 |

## 维护原则

- 修改 Harness 时只改 `agents/` 真源，不直接改工具点目录。
- 约束尽可能落为 validator / hook / CI 检查（机器可校验优先于散文规则）。
- 目录、文档入口与规则索引的更新要求以 [目录规范](rules/asset-layout.md) 为准。
