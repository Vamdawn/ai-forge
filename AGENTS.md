# Project Agent Guide

## Positioning

- ai-forge 是个人 Agent 能力资产 monorepo，出品五类产品资产：`skills/`、`prompts/`、`rules/`、`tools/`（CLI 工具）、`plugins/`（应用插件）。
- 资产互不相关：版本、CHANGELOG、发布全部以单个资产为单位，没有全局版本号。
- 本文件约束本仓库中所有资产的编辑与维护行为。

## Layering

| 层 | 位置 | 内容 |
|----|------|------|
| 产品层 | `skills/`、`prompts/`、`rules/`、`tools/`、`plugins/` | 对外提供的可复用资产 |
| Harness 层 | 本文件 + `agents/` | 维护本仓库的规则、流程与校验工具 |
| Adapter 层 | `.claude/` 等点目录 | 工具运行时配置，不承载项目知识 |

- Harness 真源与现有结构见 [agents/README.md](agents/README.md)；目录归属与文档职责以 [asset-layout.md](agents/rules/asset-layout.md) 为准。

## Rules Index

- [agents/rules/asset-layout.md](agents/rules/asset-layout.md): 新增、删除、改名或移动资产，以及调整文档入口时必读；规定资产分类、资源归属与文档职责。
- [agents/rules/markdown-assets.md](agents/rules/markdown-assets.md): 编辑含 YAML frontmatter 的 Markdown 资产时的区域边界与范围词语义。
- [agents/rules/prompt-assets.md](agents/rules/prompt-assets.md): 新增或编辑 `prompts/*.md` 时的 frontmatter 字段、来源标注与文件布局。
- [agents/rules/versioning-and-release.md](agents/rules/versioning-and-release.md): 资产级版本、CHANGELOG、commit scope 与发布约定；改动 `skills/<name>/`、`tools/<name>/` 或 `plugins/<name>/` 前必读。

执行任务前，先读取与任务最相关的规则文件；新增 `agents/rules/*.md` 必须同步更新本索引。

## Preferences

- Ask 和 Reply 使用中文。
- 需要库/API 文档、代码生成、安装或配置步骤时，默认使用 `find-docs` skill；除非用户已明确提供文档路径或 URL。
- 需要获取 GitHub 仓库时使用 `gh`；需要获取普通网页时使用 `agent-browser`。

## Coding Rules

### 1. Think Before Coding

- 动手前明确假设；有不确定就说清楚。
- 多种解释并存时先列出，不要静默选择。
- 有更简单方案时说明取舍；需求不清时先停下来问。

### 2. Simplicity First

- 只实现用户要求的最小解。
- 不为单次使用抽象，不添加未请求的灵活性或配置项。
- 写完后检查是否过度复杂；能明显缩短就重写。

### 3. Surgical Changes

- 只改与请求直接相关的行。
- 不顺手重构、格式化或删除无关代码。
- 匹配现有风格；只清理由本次改动造成的 unused import、变量或函数。

### 4. Goal-Driven Execution

- 把任务转成可验证目标。
- 多步骤任务先给简短计划：步骤、验证方式、完成标准。
- 修 bug 或加行为时优先写能复现或约束行为的测试，再让它通过。

## Usage

- 更新本文件时保持简短，提交前确认 `AGENTS.md` 不超过 200 行。
- 发布资产版本前读取 [版本与发布规则](agents/rules/versioning-and-release.md)。
