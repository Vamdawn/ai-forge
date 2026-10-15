# AI Forge

个人 Agent 能力资产 monorepo，提供可复用的 skills、prompts、rules、CLI 工具与应用插件。资产各自独立，版本化资产分别维护版本、变更记录与发布。

## 目录总览

| 目录 | 内容 |
|-----------|-------------|
| `skills/` | 按需使用的 Agent 能力，以 `SKILL.md` 为入口 |
| `prompts/` | 手动触发的一次性提示词模板 |
| `rules/` | 每次会话常驻加载的规则片段与项目规则模板 |
| `tools/` | 独立 CLI 工具，使用说明见所属 `README.md` |
| `plugins/` | 宿主应用加载的插件，使用说明见所属 `README.md` |
| `agents/` | 维护本仓库的 Agent Harness，职责与结构见 [Harness 说明](agents/README.md) |

## 使用方式

从下方索引选择所需资产，直接阅读使用入口。skill 连同所属目录的资源一起使用；工具与插件按各自 README 安装和运行。

## 资产索引

### Skills

- [ack-code-review](skills/ack-code-review/SKILL.md)：消费审查报告，逐条判断采纳并增量修复。
- [agent-friendly-cli](skills/agent-friendly-cli/SKILL.md)：设计与审查供 Agent 调用的 CLI。
- [content-summarizer](skills/content-summarizer/SKILL.md)：抓取和分析网页内容，保存为 Obsidian 笔记。
- [e2e-find](skills/e2e-find/SKILL.md)：分析 Web 交互链路，生成或更新端到端用例规格。
- [e2e-run](skills/e2e-run/SKILL.md)：运行已有端到端测试资产，保存证据并分析失败。
- [git-commit](skills/git-commit/SKILL.md)：拆分变更并生成原子化 Git 提交。
- [optimize-prompt](skills/optimize-prompt/SKILL.md)：将通用与编码提示词改写为可直接使用的指令。
- [plan-executor](skills/plan-executor/SKILL.md)：通过多 Agent 执行结构化计划，落实测试与审查门禁。
- [req-code-review](skills/req-code-review/SKILL.md)：结合方案与当前实现，发起多角色代码审查。
- [retrospect-session](skills/retrospect-session/SKILL.md)：复盘会话，沉淀可复用规则并同步维护入口。
- [review-context](skills/review-context/SKILL.md)：从上下文工程角度审查代码、文档与提示词。
- [review-doc](skills/review-doc/SKILL.md)：审查文档质量，可对照参考标准提出改进。
- [review-skill](skills/review-skill/SKILL.md)：检查 skill 元数据、指令与资源引用的规范性。
- [semver-release](skills/semver-release/SKILL.md)：通用语义版本发布流程，支持整库与单资产模式。
- [session-summary](skills/session-summary/SKILL.md)：按固定格式记录会话概要与逐轮明细。

### Prompts

- [accept-skill-casebook](prompts/accept-skill-casebook.md)：分析 skill 使用反馈，提出优化建议。
- [handoff-session](prompts/handoff-session.md)：生成供下一次会话使用的交接摘要。
- [html-pr-review-artifact](prompts/html-pr-review-artifact.md)：生成包含 diff 与审查注释的 HTML 报告。
- [interaction-design-review](prompts/interaction-design-review.md)：通过多角色并行审查交互设计。
- [prd-implementation-plan](prompts/prd-implementation-plan.md)：将 PRD 转为包含测试步骤的可执行计划。
- [product-roadmap-analysis](prompts/product-roadmap-analysis.md)：分析产品现状与机会，提出路线图建议。
- [prompt-optimizer](prompts/prompt-optimizer.md)：通过迭代审查优化提示词。
- [svpino-interview-to-spec](prompts/svpino-interview-to-spec.md)：通过逐轮访谈明确需求并形成规格。
- [write-skill-casebook](prompts/write-skill-casebook.md)：记录 skill 失败案例、根因与修复建议。

### Rules

- [CLAUDE-From-Boris](rules/CLAUDE-From-Boris.md)：规划、验证与复盘等工作流规则。
- [deepseek-harness-inspired-agents-md](rules/deepseek-harness-inspired-agents-md.md)：受 DeepSeek Harness 启发的项目 AGENTS.md 模板。

### Tools

- [claude-statusline](tools/claude-statusline/README.md)：展示 Claude Code 会话与用量信息的双行状态栏。

### Plugins

- [@vamdawn/dsh-rename-session](plugins/dsh-rename-session/README.md)：根据会话上下文为 DeepSeek Harness 会话生成名称。
- [@vamdawn/dsh-skin](plugins/dsh-skin/README.md)：自定义 DeepSeek Harness 的界面字体、代码字体与背景图片。

## 版本与发布

- skills、tools 与 plugins 各自独立版本化；prompts 与 rules 以 Git 历史记录变更。
- 发布索引与仓库里程碑见根 [CHANGELOG.md](CHANGELOG.md)，资产的变更细节见其所属 CHANGELOG。
- 本仓库没有全局版本号，维护约定见 [版本与发布规则](agents/rules/versioning-and-release.md)。

## 仓库维护

维护入口为 [AGENTS.md](AGENTS.md)，Harness 说明见 [agents/README.md](agents/README.md)。资产分类、资源归属与文档职责统一维护在 [目录规范](agents/rules/asset-layout.md) 中。

## 许可

[MIT](LICENSE)
