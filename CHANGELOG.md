# Changelog

All notable changes to **ai-forge** are documented in this file.

---

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
