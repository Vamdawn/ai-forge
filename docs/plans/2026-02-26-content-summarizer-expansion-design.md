# Content Summarizer — 多内容类型扩展设计

> 日期: 2026-02-26
> 状态: approved
> 技能: skills/article-summarizer → skills/content-summarizer（重命名）

## 背景

当前 `article-summarizer` 仅支持网页文章的摘要入库。用户希望将其扩展为通用的内容摘要工具，支持多种内容类型，MVP 阶段覆盖 GitHub Repo 和帖子/讨论（Reddit、HN、Twitter/X），后续可逐步补充更多类型。

## 目标

1. 重命名 `article-summarizer` 为 `content-summarizer`
2. 新增 URL 路由机制（Python 脚本 + LLM 降级）
3. 新增 GitHub Repo 和 帖子/讨论 两种内容类型
4. 统一 frontmatter 结构（所有类型共享相同字段）
5. 各类型有独立的笔记正文模板和抓取/分析策略
6. 全 skill 主要使用中文编写

## 设计

### 方案选择

采用 **URL 路由 + 类型模板分离** 方案，结合官方 skill 最佳实践：

- **Progressive Disclosure**：SKILL.md 保持精简（调度器角色），详细的类型规则和模板放在 `references/` 中按需加载
- **SKILL.md < 500 行**：遵循官方建议
- **Python 脚本路由**：确定性 URL 匹配，匹配失败时降级给 LLM 判断
- **可扩展**：新增类型 = 在 `content-types.md` 追加一节 + 新增笔记模板文件

### 文件结构

```
content-summarizer/
├── SKILL.md                           # 主入口：调度器 + 共享步骤 + 质量清单
├── scripts/
│   └── detect_content_type.py         # URL 模式匹配脚本
├── references/
│   ├── content-types.md               # 内容类型注册表（各类型抓取/分析规则）
│   ├── note-template.md               # 文章笔记模板（已有，更新 frontmatter）
│   ├── note-template-repo.md          # GitHub Repo 笔记模板（新增）
│   ├── note-template-thread.md        # 帖子/讨论笔记模板（新增）
│   └── index-template.md              # 索引模板（已有，不变）
```

### 路由脚本 `detect_content_type.py`

**输入**：URL 字符串（命令行参数）
**输出**：JSON 到 stdout

```json
{
  "type": "repo",
  "platform": "github",
  "template": "references/note-template-repo.md",
  "metadata": {
    "owner": "anthropics",
    "repo": "claude-code",
    "stars": 25000,
    "language": "TypeScript",
    "license": "MIT",
    "description": "CLI for Claude"
  }
}
```

**URL 匹配规则（MVP）：**

| URL Pattern | type | platform | template |
|:-----------|:-----|:---------|:---------|
| `github.com/{owner}/{repo}`（排除 /issues, /pull, /blob 等子页面）| `repo` | `github` | `note-template-repo.md` |
| `reddit.com/r/*/comments/*` | `thread` | `reddit` | `note-template-thread.md` |
| `news.ycombinator.com/item?id=*` | `thread` | `hn` | `note-template-thread.md` |
| `twitter.com/*/status/*` 或 `x.com/*/status/*` | `thread` | `twitter` | `note-template-thread.md` |
| 其他所有 URL | `null` | `null` | `null`（降级给 LLM） |

**额外能力**：
- GitHub repo URL：调用 `gh api` 预提取仓库元数据（stars, language, license, description, topics）
- Reddit：解析出 subreddit 和 post ID
- HN：解析出 item ID

**降级逻辑**：脚本返回 `type: null` 时，SKILL.md 指示 LLM 先抓取页面内容，再根据内容判断类型（有评论/回复结构 → thread；代码仓库页 → repo；默认 → article）。

### 统一 Frontmatter

所有内容类型共享完全相同的 frontmatter 结构：

```yaml
---
tags:
  - <primary-topic>
  - <secondary-topic>
type: <article | repo | thread>
source: <url>
authors:
  - <author-name>
publish: <YYYY-MM-DD>
creation: <YYYY-MM-DD HH:MM>
word_count: <number>
reading_time: "<N> min"
difficulty: <入门 | 中级 | 高级>
status: captured
scores:
  novelty: <1-5>
  quality: <1-5>
  actionability: <1-5>
  overall: <1-5>
recommended_action: <精读 | 速览 | 备查 | 归档>
description: <one-line summary>
---
```

**与现有文章模板的差异：**
- 移除 `aliases` 字段
- `type` 新增 `repo` 和 `thread` 合法值
- `difficulty` 值改为中文：`入门 | 中级 | 高级`
- `recommended_action` 值改为中文：`精读 | 速览 | 备查 | 归档`

**类型特有的元数据**（如 repo 的 stars/language，thread 的 upvotes）不放 frontmatter，自然地出现在笔记正文中。

### 工作流重构

从 5 步变为 6 步：

```
Step 0: 识别内容类型 (新增)
  ↓
Step 1: 抓取内容 (按类型分发)
  ↓
Step 2: 分析与摘要 (按类型分发)
  ↓
Step 3: 确定输出路径 (共享)
  ↓
Step 4: 写入 Obsidian 笔记 (按类型选模板)
  ↓
Step 5: 构建索引 (共享)
```

#### Step 0: 识别内容类型（新增）

运行 `python <skill-dir>/scripts/detect_content_type.py "$ARGUMENTS"`。

- 脚本返回有效类型 → 使用返回的 `type`、`platform`、`template` 和 `metadata`
- 脚本返回 `null` → 先用 Step 1 通用抓取获取页面内容，再由 LLM 判断类型

#### Step 1/2: 按类型分发

SKILL.md 引用 `references/content-types.md` 中各类型的具体抓取和分析策略，不在 SKILL.md 中重复写。

#### Step 3: 确定输出路径（共享，微调）

保持不变，但 category discovery 需考虑不同内容类型可能存放在不同子目录中。

#### Step 4: 写入笔记（按类型选模板）

按 Step 0 返回的 `template` 字段选择对应的笔记模板文件。

#### Step 5: 构建索引（共享，不变）

### 笔记正文结构（各类型差异）

#### article（已有，不变）

TL;DR → 原文链接 → 金句 → 文章概述 → 核心观点 → 批判性笔记 → 推荐资源 → 个人反思

#### repo（新增）

TL;DR → 仓库链接 → 项目信息表格（stars/language/license/topics）→ 项目简介 → 核心功能 → 技术栈 → 快速上手 → 关键亮点/创新点 → 局限性与替代方案 → 个人反思

#### thread（新增）

TL;DR → 原帖链接 → 帖子统计（平台/赞数/评论数）→ 原帖摘要 → 核心讨论观点（按主题聚合，标注共识/争议/少数派观点）→ 高价值评论精选 → 结论与共识 → 个人反思

### `content-types.md` 结构

按类型组织，每种类型包含：
- 抓取策略（使用什么工具，如何获取内容）
- 分析策略（关注什么，提取什么）
- 评分维度说明（三维评分在不同类型下的解读）

### Quality Checklist 更新

现有检查项保持不变，新增：
- `[ ] 内容类型正确识别（article / repo / thread）`
- `[ ] 笔记正文结构匹配内容类型的模板`

### `difficulty` 和 `recommended_action` 值映射

**difficulty（之前的评分设计也需同步更新）：**

| 英文值（旧） | 中文值（新） |
|:------------|:-----------|
| `beginner` | `入门` |
| `intermediate` | `中级` |
| `advanced` | `高级` |

**recommended_action（之前的评分设计也需同步更新）：**

| 英文值（旧） | 中文值（新） | 触发条件 |
|:------------|:-----------|:---------|
| `deep-read` | `精读` | overall ≥ 4 |
| `skim` | `速览` | overall = 3 |
| `reference` | `备查` | overall = 2 |
| `archive` | `归档` | overall ≤ 1 |

## 涉及文件

| 文件 | 变更类型 |
|:-----|:---------|
| `skills/article-summarizer/` | 重命名为 `skills/content-summarizer/` |
| `skills/content-summarizer/SKILL.md` | 重写：新增 Step 0、引用 content-types.md、更新 frontmatter/description |
| `skills/content-summarizer/scripts/detect_content_type.py` | 新建：URL 路由脚本 |
| `skills/content-summarizer/references/content-types.md` | 新建：内容类型注册表 |
| `skills/content-summarizer/references/note-template.md` | 编辑：移除 aliases、difficulty/recommended_action 改中文值 |
| `skills/content-summarizer/references/note-template-repo.md` | 新建：GitHub Repo 笔记模板 |
| `skills/content-summarizer/references/note-template-thread.md` | 新建：帖子/讨论笔记模板 |
| `skills/content-summarizer/references/index-template.md` | 不变 |

## 不涉及的内容

- 不改变 index-template.md
- 不引入外部依赖（Python 脚本仅使用标准库 + `gh` CLI）
- 不改变 Step 3（输出路径）和 Step 5（索引构建）的核心逻辑
