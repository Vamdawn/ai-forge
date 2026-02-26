# Content Summarizer 多内容类型扩展 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 将 article-summarizer 扩展为 content-summarizer，支持 GitHub Repo 和帖子/讨论（Reddit/HN/Twitter）内容类型。

**Architecture:** 重命名 skill 目录，新增 Python 路由脚本做 URL 模式匹配（降级给 LLM），新增 content-types.md 注册表和两个笔记模板，重写 SKILL.md 为调度器架构。统一 frontmatter，类型差异只体现在笔记正文和抓取/分析策略。

**Tech Stack:** Python 3 (标准库 only) + `gh` CLI + Claude Code Skill (Markdown)

**Design doc:** `docs/plans/2026-02-26-content-summarizer-expansion-design.md`

---

### Task 1: 重命名 skill 目录

**Files:**
- Rename: `skills/article-summarizer/` → `skills/content-summarizer/`

**Step 1: 重命名目录**

```bash
mv skills/article-summarizer skills/content-summarizer
```

**Step 2: 创建 scripts 目录**

```bash
mkdir -p skills/content-summarizer/scripts
```

**Step 3: 验证目录结构**

```bash
ls -la skills/content-summarizer/
ls -la skills/content-summarizer/references/
```

Expected: SKILL.md, references/ (含 note-template.md, index-template.md), scripts/ (空)

**Step 4: Commit**

```bash
git add -A skills/
git commit -m "♻️ refactor: rename article-summarizer to content-summarizer"
```

---

### Task 2: 创建 URL 路由脚本 detect_content_type.py

**Files:**
- Create: `skills/content-summarizer/scripts/detect_content_type.py`

**Step 1: 编写脚本**

创建 `skills/content-summarizer/scripts/detect_content_type.py`，内容如下：

```python
#!/usr/bin/env python3
"""URL 内容类型检测脚本。

根据 URL 模式匹配确定内容类型，返回 JSON 结果。
匹配失败时返回 type: null，由 LLM 降级判断。

用法: python detect_content_type.py <url>
"""

import json
import re
import subprocess
import sys
from urllib.parse import urlparse, parse_qs


def detect(url: str) -> dict:
    """根据 URL 模式匹配返回内容类型信息。"""
    parsed = urlparse(url)
    host = parsed.hostname or ""
    path = parsed.path.rstrip("/")
    result = {"type": None, "platform": None, "template": None, "metadata": {}}

    # GitHub Repo
    if host in ("github.com", "www.github.com"):
        parts = [p for p in path.split("/") if p]
        # 必须恰好是 /{owner}/{repo}，排除子页面
        sub_pages = {"issues", "pull", "pulls", "blob", "tree", "commit",
                     "commits", "actions", "releases", "wiki", "settings",
                     "discussions", "projects", "security", "network"}
        if len(parts) == 2 and parts[1] not in sub_pages:
            owner, repo = parts
            result.update(
                type="repo",
                platform="github",
                template="references/note-template-repo.md",
                metadata={"owner": owner, "repo": repo},
            )
            # 尝试用 gh CLI 获取仓库元数据
            try:
                gh_out = subprocess.run(
                    ["gh", "api", f"repos/{owner}/{repo}",
                     "--jq", '{stars: .stargazers_count, language, '
                             'license: .license.spdx_id, description, '
                             'topics, updated_at: .updated_at}'],
                    capture_output=True, text=True, timeout=10,
                )
                if gh_out.returncode == 0 and gh_out.stdout.strip():
                    result["metadata"].update(json.loads(gh_out.stdout))
            except (subprocess.TimeoutExpired, FileNotFoundError, json.JSONDecodeError):
                pass
            return result

    # Reddit
    if host in ("reddit.com", "www.reddit.com", "old.reddit.com"):
        m = re.match(r"/r/([^/]+)/comments/([^/]+)", path)
        if m:
            result.update(
                type="thread",
                platform="reddit",
                template="references/note-template-thread.md",
                metadata={"subreddit": m.group(1), "post_id": m.group(2)},
            )
            return result

    # Hacker News
    if host in ("news.ycombinator.com",):
        qs = parse_qs(parsed.query)
        item_id = qs.get("id", [None])[0]
        if item_id and parsed.path in ("/item", "/item/"):
            result.update(
                type="thread",
                platform="hn",
                template="references/note-template-thread.md",
                metadata={"item_id": item_id},
            )
            return result

    # Twitter / X
    if host in ("twitter.com", "www.twitter.com", "x.com", "www.x.com",
                "mobile.twitter.com", "mobile.x.com"):
        m = re.match(r"/([^/]+)/status/(\d+)", path)
        if m:
            result.update(
                type="thread",
                platform="twitter",
                template="references/note-template-thread.md",
                metadata={"author_handle": m.group(1), "tweet_id": m.group(2)},
            )
            return result

    # 未匹配 — 返回 null，降级给 LLM
    return result


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "用法: python detect_content_type.py <url>"}))
        sys.exit(1)
    print(json.dumps(detect(sys.argv[1]), ensure_ascii=False))
```

**Step 2: 测试脚本**

```bash
cd skills/content-summarizer
python scripts/detect_content_type.py "https://github.com/anthropics/claude-code" | python -m json.tool
python scripts/detect_content_type.py "https://www.reddit.com/r/ObsidianMD/comments/abc123/some_title" | python -m json.tool
python scripts/detect_content_type.py "https://news.ycombinator.com/item?id=12345" | python -m json.tool
python scripts/detect_content_type.py "https://x.com/elonmusk/status/1234567890" | python -m json.tool
python scripts/detect_content_type.py "https://example.com/some-article" | python -m json.tool
```

Expected:
- GitHub → `{"type": "repo", "platform": "github", "template": "references/note-template-repo.md", ...}`
- Reddit → `{"type": "thread", "platform": "reddit", ...}`
- HN → `{"type": "thread", "platform": "hn", ...}`
- Twitter/X → `{"type": "thread", "platform": "twitter", ...}`
- Unknown → `{"type": null, "platform": null, "template": null, ...}`

Also test edge cases:
```bash
# GitHub 子页面不应匹配为 repo
python scripts/detect_content_type.py "https://github.com/anthropics/claude-code/issues/123" | python -m json.tool
python scripts/detect_content_type.py "https://github.com/anthropics/claude-code/blob/main/README.md" | python -m json.tool
```

Expected: 两者都应返回 `{"type": null, ...}`

**Step 3: Commit**

```bash
git add skills/content-summarizer/scripts/detect_content_type.py
git commit -m "✨ feat(content-summarizer): add URL content type detection script"
```

---

### Task 3: 更新文章笔记模板 note-template.md

**Files:**
- Modify: `skills/content-summarizer/references/note-template.md:10-12`

**Step 1: 移除 aliases 字段**

在 `references/note-template.md` 中，删除 frontmatter 代码块内的这两行：
```yaml
aliases:
  - <short-name>
```

**Step 2: 更新 type 字段注释**

将 `type` 行从：
```yaml
type: <tutorial | opinion | research | news | comparison | other>
```
改为（扩大 article 子类型的说明范围）：
```yaml
type: article                   # article | repo | thread
```

注意：此模板专用于 article 类型，所以 type 直接写 `article`。

**Step 3: 移除 source 注释中的多源示例**

删除以下三行（简化模板）：
```yaml
# source:                       # or multiple sources
#   - <url-1>
#   - <url-2>
```

**Step 4: 验证**

读取文件确认 frontmatter 中无 `aliases`，`type` 行已更新，无多源注释。

**Step 5: Commit**

```bash
git add skills/content-summarizer/references/note-template.md
git commit -m "🔧 chore(content-summarizer): clean up article note template frontmatter"
```

---

### Task 4: 创建 GitHub Repo 笔记模板

**Files:**
- Create: `skills/content-summarizer/references/note-template-repo.md`

**Step 1: 创建模板文件**

创建 `skills/content-summarizer/references/note-template-repo.md`，内容如下：

````markdown
# Repo 笔记模板

GitHub 仓库摘要笔记的标准结构。所有 section 标题在最终笔记中翻译为用户语言。

```markdown
---
tags:
  - <primary-topic>
  - <secondary-topic>
type: repo
source: <github-url>
authors:
  - <repo-owner-or-org>
publish: <YYYY-MM-DD>             # 仓库创建日期或首次 release 日期
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

# <项目名称 — 用户语言的描述性标题>

仓库链接: [<owner/repo>](<github-url>)

> [!abstract] TL;DR
> <一句话概括项目的核心价值>

## 项目信息

| 属性 | 值 |
|:-----|:---|
| ⭐ Stars | <stars> |
| 🔤 语言 | <primary-language> |
| 📜 许可证 | <license> |
| 🏷️ Topics | <topic1>, <topic2>, ... |
| 🔄 最后更新 | <YYYY-MM-DD> |

## 项目简介

<1-2 段介绍项目是什么、解决什么问题、目标用户是谁>

---

## 核心功能

### 1. <功能一>
<说明>

### 2. <功能二>
<说明>

> [!tip] 亮点
> <最值得关注的创新点或独特设计>

---

## 技术栈

<列出关键技术依赖和架构选择>

---

## 快速上手

<安装和基本使用命令，保留关键代码块>

---

## 局限性与替代方案

> [!warning] 局限性
> - <已知限制或不足>
> - <适用场景约束>

**替代方案**: <列出同类项目，简述差异>

---

## 个人反思

- **为什么收藏**: <这个项目对我有什么用？>
- **关联**: <与我的项目/知识库中哪些内容相关？用 [[wikilinks]]>
- **行动项**: <具体下一步 — 试用、集成、学习>
```

## 适配规则

- 所有 section 标题翻译为用户语言
- 如果 README 很短，合并"核心功能"和"项目简介"
- 如果项目没有 release 或 README 极简，精简输出
- 使用 `==highlight==` 标记最关键的 1-2 个亮点
- 使用 `[[wikilinks]]` 链接到 vault 中已有的相关笔记
````

**Step 2: 验证**

读取文件确认结构完整：frontmatter 与统一格式一致，正文包含项目信息表格、核心功能、技术栈、快速上手、局限性、个人反思。

**Step 3: Commit**

```bash
git add skills/content-summarizer/references/note-template-repo.md
git commit -m "✨ feat(content-summarizer): add GitHub Repo note template"
```

---

### Task 5: 创建帖子/讨论笔记模板

**Files:**
- Create: `skills/content-summarizer/references/note-template-thread.md`

**Step 1: 创建模板文件**

创建 `skills/content-summarizer/references/note-template-thread.md`，内容如下：

````markdown
# Thread 笔记模板

帖子/讨论内容摘要笔记的标准结构。适用于 Reddit、Hacker News、Twitter/X 等平台的讨论帖。所有 section 标题在最终笔记中翻译为用户语言。

```markdown
---
tags:
  - <primary-topic>
  - <secondary-topic>
type: thread
source: <url>
authors:
  - <original-poster>
publish: <YYYY-MM-DD>             # 发帖日期
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

# <讨论标题 — 用户语言的描述性标题>

原帖链接: [<帖子标题>](<url>)

> [!abstract] TL;DR
> <一句话概括讨论的核心结论或争议焦点>

## 帖子信息

| 属性 | 值 |
|:-----|:---|
| 📍 平台 | <Reddit / Hacker News / Twitter / 其他> |
| 👤 原帖作者 | <author> |
| 👍 赞数 | <upvotes/likes> |
| 💬 评论数 | <comment_count> |

## 原帖摘要

<1-2 段概括原帖的核心内容、问题或观点>

---

## 核心讨论观点

> 按主题聚合讨论中的主要观点，标注社区态度。

### 1. <主题/观点一>

<说明，引用关键评论>

> [!tip] 共识
> <社区普遍同意的观点>

### 2. <主题/观点二>

<说明>

> [!warning] 争议
> <社区存在明显分歧的观点，列出正反方>

---

## 高价值评论精选

> [!quote] <评论者名称>
> <高赞或洞见深刻的评论原文/摘要>

> [!quote] <评论者名称>
> <另一条有价值的评论>

---

## 结论与共识

<总结讨论的最终走向、社区共识、未解决的分歧>

---

## 个人反思

- **为什么收藏**: <这个讨论对我有什么启发？>
- **关联**: <与我的项目/知识库中哪些内容相关？用 [[wikilinks]]>
- **行动项**: <具体下一步 — 验证某个观点、尝试某个建议>
```

## 适配规则

- 所有 section 标题翻译为用户语言
- 如果讨论很短（<10 条评论），合并"核心讨论观点"和"高价值评论精选"
- Twitter thread 通常没有评论互动，省略"帖子信息"中的评论数，合并为线性叙述
- 标注观点态度时使用 callout：`[!tip]` 表示共识，`[!warning]` 表示争议，`[!note]` 表示少数派观点
- 使用 `==highlight==` 标记最关键的 1-2 个洞见
- 使用 `[[wikilinks]]` 链接到 vault 中已有的相关笔记
````

**Step 2: 验证**

读取文件确认结构完整：frontmatter 与统一格式一致，正文包含帖子信息表格、原帖摘要、核心讨论观点（带共识/争议标注）、高价值评论精选、结论与共识、个人反思。

**Step 3: Commit**

```bash
git add skills/content-summarizer/references/note-template-thread.md
git commit -m "✨ feat(content-summarizer): add thread/discussion note template"
```

---

### Task 6: 创建内容类型注册表 content-types.md

**Files:**
- Create: `skills/content-summarizer/references/content-types.md`

**Step 1: 创建注册表文件**

创建 `skills/content-summarizer/references/content-types.md`，内容如下：

````markdown
# 内容类型注册表

各内容类型的抓取策略、分析策略和评分解读。SKILL.md 在 Step 1 和 Step 2 中引用此文件。

---

## article（文章）

### 抓取策略

1. 使用 `playwright-cli` skill 抓取网页（首选）；否则回退到 `WebFetch` 工具
2. 提取正文文本和发布日期
3. 如果输出超过 30KB，读取持久化的输出文件获取完整内容

### 分析策略

**2a. 分类文章子类型** — 判断最匹配的子类型：`tutorial`、`opinion`、`research`、`news`、`comparison` 或 `other`

**2b. 提取核心信息：**
- 标题、作者、发布日期
- 核心论点（3-7 个；短文章 <500 字时 1-2 个即可）— 捕捉论点之间的逻辑关系
- 按主题组织的支撑细节
- 实践要点（始终尝试提取；纯新闻可标注 N/A）
- 值得保留的引用工具、资源或链接
- 局限性与偏见

**2c. 文章子类型的特定提取策略：**

| 子类型 | 提取重点 |
|:-------|:--------|
| `tutorial` | 保留步骤序列、关键代码/命令、前置条件 |
| `opinion` | 论证链：前提 → 推理 → 结论；记录假设 |
| `research` | 方法论、关键数据、发现、声明的局限性 |
| `news` | 5W1H（谁/什么/何时/何地/为什么/如何）、时间线、影响 |
| `comparison` | 比较维度、构建对比表、记录结论 |

### 评分解读

| 维度 | 在文章语境下的含义 |
|:-----|:----------------|
| novelty | 观点/信息对读者知识库的增量价值 |
| quality | 论证深度、来源可信度、逻辑严密性 |
| actionability | 能否转化为具体行动、代码、工具使用 |

---

## repo（GitHub 仓库）

### 抓取策略

1. 如果 Step 0 的 `metadata` 中已有仓库元数据（stars, language 等），直接使用
2. 使用 `gh api repos/{owner}/{repo}/readme --header "Accept: application/vnd.github.raw"` 获取 README 原文（Markdown 格式）
3. 如果 README 过长（>10000 字），只保留前 5000 字 + 目录结构
4. 如果 `gh` 不可用，回退到 `playwright-cli` 抓取 GitHub 网页

### 分析策略

**提取核心信息：**
- 项目名称、作者/组织、创建日期或首次 release 日期
- 项目用途一句话描述
- 核心功能列表（3-5 个主要功能）
- 技术栈和关键依赖
- 安装和基本使用方法
- 项目亮点/创新点
- 已知局限和同类替代方案

**特别注意：**
- `authors` 填写仓库 owner（组织或个人）
- `publish` 填写仓库创建日期或首个 release 日期
- 将 stars、language、license、topics 等元数据放入笔记正文的"项目信息"表格中

### 评分解读

| 维度 | 在 repo 语境下的含义 |
|:-----|:-------------------|
| novelty | 项目解决的问题是否新颖、方法是否独特 |
| quality | 代码质量（stars/维护活跃度作参考）、文档完整性、社区健康度 |
| actionability | 能否快速上手使用或集成到自己的项目中 |

---

## thread（帖子/讨论）

### 抓取策略

根据 `platform` 分发：

**Reddit：**
1. 使用 `playwright-cli` 抓取帖子页面（包含评论）
2. 或使用 Reddit JSON API：在 URL 末尾添加 `.json`，用 `curl` 获取
3. 重点抓取：原帖内容 + 前 20 条高赞评论

**Hacker News：**
1. 使用 HN API：`https://hacker-news.firebaseio.com/v0/item/{id}.json` 获取帖子
2. 递归获取 `kids` 字段中的评论（限前 15 条）
3. 或使用 `playwright-cli` 抓取网页

**Twitter/X：**
1. 使用 `playwright-cli` 抓取推文/线程页面
2. 或尝试 Thread Reader App 中间层：抓取 `threadreaderapp.com/thread/{tweet_id}`
3. Twitter 线程通常只有一个作者的连续推文，按顺序拼接为完整文本

**其他平台（降级）：**
1. 使用 `playwright-cli` 通用抓取
2. LLM 从页面内容中识别帖子正文和评论区

### 分析策略

**提取核心信息：**
- 原帖标题、作者、发帖日期
- 平台统计信息（赞数、评论数）
- 原帖核心内容摘要
- 讨论中的主要观点（按主题聚合）
- 每个观点的社区态度标注（共识/争议/少数派）
- 高价值评论精选（2-5 条最有洞见的评论）
- 讨论的最终结论或共识

**特别注意：**
- `authors` 填写原帖作者
- `publish` 填写发帖日期
- Twitter 线程视为单一作者的长文，不需要观点聚合，改为线性摘要
- 将平台、赞数、评论数等统计信息放入笔记正文的"帖子信息"表格中

### 评分解读

| 维度 | 在 thread 语境下的含义 |
|:-----|:---------------------|
| novelty | 讨论中是否涌现了新颖的观点或独特见解 |
| quality | 讨论深度、论据质量、参与者的专业水平 |
| actionability | 讨论结论能否转化为具体行动或决策 |
````

**Step 2: 验证**

读取文件确认三种类型（article、repo、thread）的抓取策略、分析策略、评分解读都已完整定义。

**Step 3: Commit**

```bash
git add skills/content-summarizer/references/content-types.md
git commit -m "✨ feat(content-summarizer): add content types registry with fetch and analysis strategies"
```

---

### Task 7: 重写 SKILL.md

**Files:**
- Rewrite: `skills/content-summarizer/SKILL.md`

这是最核心的变更。SKILL.md 从"文章专用"重写为"内容类型调度器"。

**Step 1: 重写 SKILL.md 全文**

用以下内容完全替换 `skills/content-summarizer/SKILL.md`：

````yaml
---
name: content-summarizer
description: "抓取、分析、摘要各类网络内容并生成结构化 Obsidian 笔记。支持网页文章、GitHub 仓库、Reddit/HN/Twitter 讨论帖等多种内容类型。自动识别 URL 类型并选择对应的处理流程和笔记模板。触发词：'总结这篇文章'、'summarize this'、'记录下这个'、'take notes on this'、或任何附带 URL 且意图是将其内容保存为 Obsidian 笔记的请求。"
argument-hint: "[url]"
allowed-tools: Read, Write, Edit, Glob, Grep, WebFetch, Bash(python *), Bash(mkdir *), Bash(cp *), Bash(curl *), Bash(gh *), Skill(playwright-cli *)
---

始终按以下六步工作流执行。每一步必须完成后才能进入下一步。

## 工作流

### Step 0: 识别内容类型

运行路由脚本识别 URL 对应的内容类型：

```bash
python <skill-dir>/scripts/detect_content_type.py "$ARGUMENTS"
```

脚本返回 JSON，包含 `type`、`platform`、`template`、`metadata` 字段。

- **脚本返回有效类型**（`type` 不为 null）→ 记录 `type`、`platform`、`template`、`metadata`，进入 Step 1
- **脚本返回 null** → 先用 Step 1 通用方式抓取页面内容，然后根据内容特征判断类型：
  - 有评论/回复结构 → `thread`，使用 `references/note-template-thread.md`
  - 是代码仓库页面 → `repo`，使用 `references/note-template-repo.md`
  - 其他 → `article`（默认），使用 `references/note-template.md`

### Step 1: 抓取内容

按检测到的 `type` 和 `platform`，遵循 [references/content-types.md](references/content-types.md) 中对应类型的**抓取策略**获取内容。

所有类型均需估算阅读元数据：
- `word_count` — 大致字数（中文按字数，英文按 word count）
- `reading_time` — 预估阅读时长（中文 300 字/分钟，英文 200 words/min，向上取整，格式 `"N min"`）
- `difficulty` — 内容难度：`入门`（无需背景知识）、`中级`（需要一定领域了解）、`高级`（需要深度专业知识）

**抓取失败时**（URL 不可达、404、paywall、内容为空）：
- 告知用户失败原因
- 请用户手动提供内容（粘贴文本或提供替代 URL）
- 获得内容后继续 Step 2

### Step 2: 分析与摘要

按检测到的 `type`，遵循 [references/content-types.md](references/content-types.md) 中对应类型的**分析策略**处理内容。

所有类型均需完成：

**2a. 提取核心信息** — 按类型特定的策略提取

**2b. 生成一行摘要**（`description` 字段）— 用于 frontmatter、索引条目和快速浏览的单句摘要

**2c. 评分** — 按三个维度（1-5 分）评估内容：

| 维度 | 1（低） | 3（中） | 5（高） |
|:-----|:--------|:--------|:--------|
| **novelty** | 广为人知的常见知识 | 有部分新角度或新组合 | 全新观点或鲜为人知的信息 |
| **quality** | 缺乏论据、逻辑松散 | 论证基本完整但不算深入 | 论证严密、证据充分、来源权威 |
| **actionability** | 纯理论/纯新闻，无可执行要点 | 有一些可参考的建议 | 提供具体步骤/代码/工具可直接应用 |

各维度在不同内容类型下的具体解读见 [references/content-types.md](references/content-types.md) 的"评分解读"。

计算 `overall` 为三项评分的四舍五入均值。根据 overall 确定 `recommended_action`：
- `精读`: overall ≥ 4
- `速览`: overall = 3
- `备查`: overall = 2
- `归档`: overall ≤ 1

以用户语言输出摘要（用户使用中文时默认中文）。

### Step 3: 确定输出路径

**发现输出根目录** — 扫描 vault 目录树，定位存放笔记的目录（查找 frontmatter 中含 `source:` 的 Markdown 文件所在目录，或名称暗示内容集合的目录）。如有多个候选或找不到，询问用户。

**分类目录发现（动态推断）：**

1. 扫描输出根目录下的现有子目录，推断命名惯例
2. 将内容匹配到现有分类子目录
3. 需要时创建新分类，遵循现有命名惯例
4. 用户显式指定路径时优先使用

### Step 4: 写入 Obsidian 笔记

按 Step 0 确定的 `template` 选择笔记模板：
- `article` → [references/note-template.md](references/note-template.md)
- `repo` → [references/note-template-repo.md](references/note-template-repo.md)
- `thread` → [references/note-template-thread.md](references/note-template-thread.md)

遵循所选模板的结构、callout 用法和适配规则。如果项目的 CLAUDE.md 要求使用 `obsidian-markdown` skill，该 skill 提供基础格式规范，笔记模板在其上叠加内容特定结构。

**个人反思 section**：用对话上下文（用户为什么分享此内容、正在做什么）草拟初始条目。上下文不足时留占位提示。

**多媒体处理**：遵循 note-template.md 中的"Multimedia Handling"指南。

保存笔记到 Step 3 确定的分类子目录。

### Step 5: 构建索引

将新笔记整合到 vault 的索引系统：

1. **确保索引文件存在** — 在分类子目录中查找已有的 `*INDEX*` 或 `*index*` 文件确定命名模式。如不存在，按 [references/index-template.md](references/index-template.md) 创建。

2. **添加索引条目** — 格式：`` - `YYYY-MM-DD` [[Title]] - description ``。按发布日期排序（最新在前）。`publish` 不可用时回退到 `creation` 日期。

3. **正向链接** — 如果摘要引用了 vault 中已有的概念笔记，用 `[[wikilinks]]` 链接。

4. **反向链接** — 在 1-3 个最相关的已有笔记中添加指向新笔记的 wikilink。

## 质量清单

- [ ] Frontmatter 完整：tags, type, source, authors, publish, creation, word_count, reading_time, difficulty, status, scores, recommended_action, description
- [ ] 阅读元数据存在：word_count, reading_time, difficulty
- [ ] AI 评分存在：scores (novelty, quality, actionability, overall), recommended_action
- [ ] 内容类型正确识别（article / repo / thread）
- [ ] 笔记正文结构匹配内容类型的模板
- [ ] Tags 与 vault 已有标签对齐（创建新标签前先搜索）
- [ ] TL;DR 紧跟标题下方，与 frontmatter 的 `description` 一致
- [ ] 原始链接存在于 TL;DR 下方
- [ ] 核心观点捕捉了逻辑关系，而非孤立要点
- [ ] 个人反思 section 已填充或有可操作的占位提示
- [ ] 有效的 Obsidian 语法（callouts, wikilinks, highlights）
- [ ] 语言与用户语言一致
- [ ] 笔记保存在正确的分类子目录
- [ ] 索引条目已添加
- [ ] 正向 wikilinks 指向 vault 中已有笔记
- [ ] 反向链接已添加到 1-3 个最相关的已有笔记
````

**Step 2: 验证**

读取 SKILL.md 完整内容，确认：
- frontmatter 的 name 为 `content-summarizer`，description 涵盖多种内容类型
- allowed-tools 包含 `Bash(python *)` 和 `Bash(gh *)`
- 工作流为 6 步（Step 0 到 Step 5）
- Step 0 调用 detect_content_type.py
- Step 1/2 引用 content-types.md
- Step 4 按类型选模板
- 质量清单包含 16 条（含 2 条新增的类型相关检查）
- 总行数 < 500

**Step 3: Commit**

```bash
git add skills/content-summarizer/SKILL.md
git commit -m "✨ feat(content-summarizer): rewrite SKILL.md as multi-content-type dispatcher"
```

---

### Task 8: 最终验证

**Step 1: 验证完整目录结构**

```bash
find skills/content-summarizer -type f | sort
```

Expected:
```
skills/content-summarizer/SKILL.md
skills/content-summarizer/references/content-types.md
skills/content-summarizer/references/index-template.md
skills/content-summarizer/references/note-template-repo.md
skills/content-summarizer/references/note-template-thread.md
skills/content-summarizer/references/note-template.md
skills/content-summarizer/scripts/detect_content_type.py
```

**Step 2: 验证旧目录已移除**

```bash
ls skills/article-summarizer 2>&1
```

Expected: `No such file or directory`

**Step 3: 验证路由脚本仍可运行**

```bash
python skills/content-summarizer/scripts/detect_content_type.py "https://github.com/anthropics/claude-code" | python -m json.tool
python skills/content-summarizer/scripts/detect_content_type.py "https://example.com/article" | python -m json.tool
```

**Step 4: 检查所有文件中的 frontmatter 一致性**

用 grep 确认三个模板的 frontmatter 结构一致（都包含 scores、recommended_action、difficulty 等统一字段）：

```bash
grep -n "difficulty\|recommended_action\|scores:" skills/content-summarizer/references/note-template*.md
```

**Step 5: 统计 SKILL.md 行数**

```bash
wc -l skills/content-summarizer/SKILL.md
```

Expected: < 500 行

**Step 6: 查看完整 commit 历史**

```bash
git log --oneline -10
```

Expected: 7 个新 commit（1 重命名 + 1 脚本 + 1 模板更新 + 2 新模板 + 1 注册表 + 1 SKILL.md 重写）
