# Changelog

All notable changes to **ai-forge** are documented in this file.

---

## 2026-06-05

### 📝 Documentation

- 新增 HTML PR Review Artifact 提示词模板，用于生成带真实 diff、边注和严重程度标注的 PR 审查 HTML 产物
- 新增 `AGENTS.md` 项目规则文档，沉淀 Markdown frontmatter 与正文编辑边界规则

## 2026-06-03

### ♻️ Refactoring

- **顶层结构收缩**：删除空壳目录 `agents/`、`hooks/`、`mcp-servers/`、`plugins/`、`shared/`、`workflows/`，仅保留当前真实使用的能力资产目录
- **文档与测试目录清理**：删除项目级 `docs/` 与顶层 `tests/`，外部参考资料和局部测试不再作为顶层占位结构保留
- **目录 README 清理**：删除空泛的 `skills/README.md` 与 `prompts/README.md`，由根 README 承担项目总览职责

### 📝 Documentation

- **README 定位更新**：将项目描述收敛为个人 Agent 能力资产库，明确 `skills/`、`prompts/`、`rules/`、`scripts/` 的顶层职责
- **CHANGELOG 恢复维护**：补齐 2026-03-03 之后的主要能力演进记录

### 🔧 Chores

- **Skill Casebook 命名格式调整**：将 casebook 文件名改为以日期开头，便于按时间排序和检索

## 2026-05-18

### ✨ New Features

- **Skill 使用反馈分析模板**：新增用于分析 skill 实际使用反馈、触发质量和改进机会的提示词模板
- **Skill 错误复盘模板**：新增用于记录 skill 失败案例、根因、修复方式和可复用教训的文档模板

## 2026-04-27

### 🔧 Chores

- `.gitignore` 新增临时文件目录排除

### 📝 Documentation

- 删除过时 planning 文档，避免保留失效治理材料

## 2026-04-20

### 📝 Documentation

- 新增 SVPino interview-to-spec 提示词模板，用于通过逐轮访谈收敛规格说明

## 2026-03-29

### ✨ New Features

- **E2E Run**：新增运行现有 e2e 资产、保存执行证据并分析失败原因的 skill

## 2026-03-28

### ✨ New Features

- **E2E Find**：新增基于代码分析 Web 应用交互链路并沉淀 e2e 用例规格的 skill

## 2026-03-23

### ✨ New Features

- **Req Code Review**：新增基于实现方案和当前代码发起系统性代码审查的 skill
- **Ack Code Review**：新增消费审查报告、判断采纳与增量修复 review 问题的 skill

### ♻️ Refactoring

- **Claude Code Status Line**：新增 MiniMax 用量显示、超时保护和脚本清理

## 2026-03-19

### ✨ New Features

- **Retrospect Session 治理流**：补充规则沉淀、体系重整触发条件、治理动作和抽象标准
- **Retrospect Session Evals**：新增复盘规则治理场景的评测样例

### ♻️ Refactoring

- **Review Skill 规范对齐**：优先加载 Agent Skills Specification，并将参考文档迁移到 skill 内部
- **Retrospect Session 重组**：将复盘流程改造为规则治理工作流

### 📝 Documentation

- 补充 retrospect-session 治理设计与实施计划

## 2026-03-17

### 📝 Documentation

- Handoff 会话提示词的输出文件名增加 slug，提升交接文档可读性

## 2026-03-16

### ✨ New Features

- **Handoff Session**：新增面向下一位 AI Agent 的会话交接摘要提示词

### 📝 Documentation

- Retrospect Session 文档强化项目级提示词与规则索引同步要求

## 2026-03-13

### ✨ New Features

- **Retrospect Session**：新增会话复盘 skill，用于提炼可复用教训并沉淀为长期规则

## 2026-03-10

### ✨ New Features

- **Content Summarizer Twitter 支持增强**：新增 Twitter/X mirror 抓取流程及脚本测试

### 📝 Documentation

- Content Summarizer 模板 frontmatter 字段标准化
- Git Commit 文档将 heredoc 示例替换为直接 `-m` 参数示例

## 2026-03-07

### ♻️ Refactoring

- **Git Commit**：移除 `$ARGUMENTS` 模板变量引用，降低误触发和解析歧义

## 2026-03-06

### ✨ New Features

- **Session Summary**：新增会话摘要 skill，支持结构化记录会话概要和逐轮明细

### ♻️ Refactoring

- **Review Skill**：迁移到顶层 `skills/` 并扩展检查表覆盖范围
- **Session Summary**：拆分起止时间和 token 用量，默认输出文件化会话摘要

## 2026-03-03

### ✨ New Features

- **Review Context**：新增 `/review-context` 命令，从 context engineering 角度审查代码、架构文档、Prompt 和设计文档。自动识别内容类型，选择 3-5 个最相关的 CE 维度，生成含严重等级和改进建议的结构化审查报告。蒸馏了 context-engineering-marketplace 全部 13 个 skill 的知识为可操作检查清单
- **Content Summarizer 多 URL 支持**：支持一次性输入多个 URL 并合并处理；文章抓取新增 agent-browser → WebFetch 回退链；Twitter/X 支持 headed 模式绕过 TLS 检测

### ♻️ Refactoring

- **Content Summarizer 架构重组**：将 content-types.md 拆分为独立的 fetcher 文件（common/github-repo/reddit/hn/twitter），模板迁移至 `references/templates/` 并本地化为中文

### 🔧 Chores

- review-skill 修正文档引用路径，简化参数提示

## 2026-03-02

### ✨ New Features

- **Claude Code Status Line 脚本**：双行状态栏，实时展示模型名称、context window 用量进度条（三色阈值：绿 <60%、黄 60-83%、红 ≥84% 对齐 auto-compact）、API 费用和会话耗时、完整工作目录及 Git 分支

### ♻️ Refactoring

- **Content Summarizer**：MOC 索引列表长度改为遵循文档定义的限制，而非硬编码

### 📝 Documentation

- 参考文档重组至 `docs/references/` 子目录
- Status Line 设计文档及实施计划

## 2026-02-28

- **Content Summarizer**：网页抓取工具从 playwright-cli 迁移至 agent-browser，移除 WebFetch 回退逻辑

## 2026-02-27

- **Content Summarizer**：笔记模板新增 `date_saved` 属性，便于追踪内容归档时间

## 2026-02-26

### ✨ New Features

- **Content Summarizer 多内容类型支持**：从单一文章摘要扩展为支持文章、GitHub Repo、论坛讨论/Thread 三种内容类型，每种类型有独立的笔记模板和分析策略
- **URL 内容类型自动检测**：新增检测脚本，根据 URL 自动判断内容类型并路由到对应处理流程
- **内容类型注册表**：新增 content types registry，定义各类型的抓取与分析策略
- **SKILL.md 重写为多类型调度器**：将 content-summarizer 的主指令改写为多内容类型分发架构
- **GitHub Repo 笔记模板**：新增针对 GitHub 仓库的结构化笔记模板
- **Thread/Discussion 笔记模板**：新增针对论坛讨论的结构化笔记模板
- **MOC 索引维护**：在 Step 5 中自动维护 Obsidian 的 Map of Content 索引文件
- **护栏与工作流优化**：增加内容处理的质量保障机制，细化各步骤执行规范
- **PRD 实施计划模板**：4 维并行 SubAgent 分析（架构、数据/API、风险、代码审计），输出符合 TDD 的细粒度任务
- **AI 多维评分**（article-summarizer）：对内容从新颖性、质量、可操作性三个维度进行 AI 打分
- **阅读元数据估算**（article-summarizer）：自动估算字数、阅读时间和难度等级，给出建议阅读方式
- **评分质量检查清单**（article-summarizer）：更新质量检查项，覆盖评分和元数据校验

### ♻️ Refactoring

- 将 article-summarizer 重命名为 content-summarizer，反映其更广泛的内容处理能力
- 评分字段从嵌套结构扁平化为顶层中文属性，提升 Obsidian 兼容性

### 📝 Documentation

- Content Summarizer 扩展设计文档，字段值本地化为中文（难度等级、推荐操作等）
- Content Summarizer 扩展实施计划（8 项任务）
- Article Summarizer 评分与阅读元数据设计文档及实施计划

### 🐛 Bug Fixes

- 修复 content-summarizer 的 review-skill 合规问题

### 🔧 Chores

- 清理 article 笔记模板的 frontmatter 格式
- .gitignore 新增 playwright-cli 目录排除

## 2026-02-25

- **大文档并行审查模式**：超过 300 行的文档自动按标题拆分为 2-5 个分块，由并行 Agent 分别审查后合并去重
- 新增 Boris 工作流编排规则

## 2026-02-23

- **产品路线图分析提示词**：从 PM 视角进行多维并行审计，覆盖成熟度、用户价值、竞争定位和生态可扩展性

## 2026-02-22

### ✨ New Features

- **article-summarizer**：将网页文章转化为 Obsidian Markdown 结构化笔记，支持教程/观点/研究/新闻/对比等类型识别，含双向 Wikilink 和分类索引自动维护
- **semver-release**：自动化语义版本管理技能，包含预检查、BREAKING CHANGE 检测、语义化标签创建和失败恢复

### 🔧 Improvements

- review-skill 提取 30 项检查清单为独立引用文件，增加歧义场景的判断原则和示例
- review-doc 增加参数提示、工具声明和错误处理（文件未找到、SubAgent 失败等）
- plan-executor 增加空参数处理、模板变量语法修正和触发词补充
- semver-release 补充具体命令示例、失败恢复文件清单和生态发布命令
- 统一 review-skill 和 article-summarizer 的 YAML frontmatter 格式

### 📝 Documentation

- 添加 Claude Skill 构建指南（从 PDF 转换为 LLM 友好的 Markdown 格式）

## 2026-02-21

- 添加 Claude Code 权限配置指南，覆盖权限层级、模式、通配符规则、工具配置和 Hooks 集成
- git-commit 启用模型调用能力

## 2026-02-20

### ✨ New Features

- **review-doc**：结构化文档审查技能，支持对照参考标准（PRD、设计文档、风格指南）进行系统化审查
- **plan-executor**：多 Agent 编排执行技能，将实施计划拆解为并行子任务分发执行
- **git-commit**：原子化 Git 提交技能，含 5 步结构化工作流、60+ Emoji 映射和变更集拆分决策规则
- **review-skill**：Skill 合规审查技能，对照 27 项检查清单审查 SKILL.md，输出含严重程度分级的结构化报告

### 📝 Documentation

- 添加 Claude Code Skills 官方文档
- 添加交互设计审查提示词模板
- 添加提示词优化模板（带迭代审查工作流）

### 🐛 Bug Fixes

- 修复 plan-executor 缺少 Edit 和 Write 工具权限，导致并行 SubAgent 执行失败的问题

## 2026-02-18

- **review-doc**：新增结构化文档审查技能

## 2026-02-17

- 🎉 **仓库初始化**：搭建 ai-forge 项目结构，包含 agents、skills、hooks、plugins、prompts、mcp-servers、workflows 和 shared utilities 目录
