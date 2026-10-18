# AI Forge

[English](README.md) | 简体中文

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

个人 Agent 能力资产 monorepo：提供可复用的 skills、prompts、rules、CLI 工具、宿主应用插件与 MCP 产品。每个资产独立演进——版本、变更记录与发布都以单个资产为单位，仓库没有全局版本号。

## 仓库结构

| 目录 | 内容 | 使用入口 |
|------|------|----------|
| `skills/` | 按需加载的 Agent 能力 | `SKILL.md` |
| `prompts/` | 手动触发的一次性提示词模板 | 对应 `.md` 文件 |
| `rules/` | 每次会话常驻加载的规则片段或整文件模板 | 对应 `.md` 文件 |
| `tools/` | 独立 CLI 工具 | 所属资产的 `README.md` |
| `plugins/` | 宿主应用加载的插件 | 所属资产的 `README.md` |
| `mcp/` | MCP 产品及其相关组件 | 所属资产的 `README.md` |
| `docs/` | 维护本仓库的规则，一个主题一个文件 | `docs/asset-layout.md` |
| `scripts/` | 校验脚本与仅服务本仓库的工具 | `scripts/verify-docs.py` |

## 使用方式

从下方索引选择所需资产，打开对应入口。skill 连同所属目录的资源一起使用；工具、插件与 MCP 产品按各自 README 了解状态和用法。

## 资产索引

### Skills

- [ack-code-review](skills/ack-code-review/SKILL.md)：消费审查报告，逐条判断并增量修复采纳的问题。
- [agent-friendly-cli](skills/agent-friendly-cli/SKILL.md)：设计与审查供 Agent 调用的 CLI。
- [content-summarizer](skills/content-summarizer/SKILL.md)：抓取与分析网页内容，保存为 Obsidian 笔记。
- [e2e-find](skills/e2e-find/SKILL.md)：分析 Web 交互链路，生成或更新端到端用例规格。
- [e2e-run](skills/e2e-run/SKILL.md)：运行已有端到端测试资产，保存证据并分析失败。
- [git-commit](skills/git-commit/SKILL.md)：把变更集拆分为原子化 Git 提交。
- [optimize-prompt](skills/optimize-prompt/SKILL.md)：把通用与编码提示词改写为可直接使用的指令。
- [plan-executor](skills/plan-executor/SKILL.md)：通过多 Agent 执行结构化计划，落实测试与审查门禁。
- [req-code-review](skills/req-code-review/SKILL.md)：结合方案与当前实现发起多角色代码审查。
- [retrospect-session](skills/retrospect-session/SKILL.md)：复盘会话，沉淀可复用规则并同步维护入口。
- [review-context](skills/review-context/SKILL.md)：从上下文工程角度审查代码、文档与提示词。
- [review-doc](skills/review-doc/SKILL.md)：审查文档质量，可对照参考标准提出改进。
- [review-skill](skills/review-skill/SKILL.md)：检查 skill 的元数据、指令与资源引用是否合规。
- [semver-release](skills/semver-release/SKILL.md)：语义版本发布流程，支持整库与单资产模式。
- [session-summary](skills/session-summary/SKILL.md)：按固定格式记录会话概要与逐轮明细。

### Prompts

- [accept-skill-casebook](prompts/accept-skill-casebook.md)：分析 skill 使用反馈并提出优化建议。
- [handoff-session](prompts/handoff-session.md)：生成供下一次会话使用的交接摘要。
- [html-pr-review-artifact](prompts/html-pr-review-artifact.md)：生成包含 diff 与审查注释的 HTML 报告。
- [interaction-design-review](prompts/interaction-design-review.md)：通过多角色并行审查交互设计。
- [prd-implementation-plan](prompts/prd-implementation-plan.md)：把 PRD 转为包含测试步骤的可执行计划。
- [product-roadmap-analysis](prompts/product-roadmap-analysis.md)：分析产品现状与机会并提出路线图建议。
- [prompt-optimizer](prompts/prompt-optimizer.md)：通过迭代审查优化提示词。
- [svpino-interview-to-spec](prompts/svpino-interview-to-spec.md)：通过逐轮访谈明确需求并形成规格。
- [write-skill-casebook](prompts/write-skill-casebook.md)：记录 skill 失败案例、根因与修复建议。

### Rules

- [CLAUDE-From-Boris](rules/CLAUDE-From-Boris.md)：规划、验证与复盘等工作流规则。
- [deepseek-harness-inspired-agents-md](rules/deepseek-harness-inspired-agents-md.md)：受 DeepSeek Harness 启发的项目 `AGENTS.md` 模板。

### Tools

- [claude-statusline](tools/claude-statusline/README.zh-CN.md)：展示 Claude Code 会话与用量信息的双行状态栏。

### Plugins

- [@vamdawn/dsh-appearance-plus](plugins/dsh-appearance-plus/README.zh-CN.md)：自定义 DeepSeek Harness 的界面字体、代码字体与背景图片。
- [@vamdawn/dsh-astrolabe](plugins/dsh-astrolabe/README.zh-CN.md)：接管 DeepSeek Harness 侧边栏会话区域的双轴标签页面板，含搜索、置顶分组与行内会话动作。
- [@vamdawn/dsh-rename-session](plugins/dsh-rename-session/README.zh-CN.md)：根据会话上下文生成 DeepSeek Harness 会话名称。

### MCP 产品

- [noticeflow](mcp/noticeflow/README.zh-CN.md)：实验性远程 MCP 通知服务，支持持久投递和 OAuth。

## 版本与发布

- skills、tools、plugins 与 MCP 产品各自独立版本化，tag 格式为 `<asset-name>@X.Y.Z`；prompts 与 rules 以 Git 历史记录变更。
- [CHANGELOG.zh-CN.md](CHANGELOG.zh-CN.md) 索引每次发布，变更细节见资产自己的 CHANGELOG。
- 仓库没有全局版本号，约定见[版本与发布规则](docs/versioning-and-release.md)。

## 仓库维护

维护入口为 [AGENTS.md](AGENTS.md)；它指向的规则在 [docs/](docs/asset-layout.md)，校验脚本在 [scripts/verify-docs.py](scripts/verify-docs.py)。资产分类、资源归属与文档职责统一维护在[目录规范](docs/asset-layout.md)中。

## 许可

[MIT](LICENSE)
