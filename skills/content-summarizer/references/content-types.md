# 内容类型注册表

各内容类型的抓取策略、分析策略和评分解读。SKILL.md 在 Step 1 和 Step 2 中引用此文件。

---

## article（文章）

### 抓取策略

按优先级依次尝试，首选方案失败后再用下一个：

1. **首选 — `agent-browser`**：`agent-browser open <url> && agent-browser wait --load networkidle && agent-browser get text body`。如果页面超时或被反爬阻断（如 `ERR_CONNECTION_RESET`），尝试 `agent-browser --headed open <url>`
2. **降级 — `WebFetch`**：当 agent-browser 不可用或持续失败时使用
3. 提取正文文本和发布日期
4. 如果输出超过 30KB，读取持久化的输出文件获取完整内容

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
| 新颖度 | 观点/信息对读者知识库的增量价值 |
| 质量 | 论证深度、来源可信度、逻辑严密性 |
| 可行性 | 能否转化为具体行动、代码、工具使用 |

---

## repo（GitHub 仓库）

### 抓取策略

1. 如果 Step 0 的 `metadata` 中已有仓库元数据（stars, language 等），直接使用
2. 使用 `gh api repos/{owner}/{repo}/readme --header "Accept: application/vnd.github.raw"` 获取 README 原文（Markdown 格式）
3. 如果 README 过长（>10000 字），只保留前 5000 字 + 目录结构
4. 如果 `gh` 不可用，回退到 `agent-browser` 抓取 GitHub 网页

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
| 新颖度 | 项目解决的问题是否新颖、方法是否独特 |
| 质量 | 代码质量（stars/维护活跃度作参考）、文档完整性、社区健康度 |
| 可行性 | 能否快速上手使用或集成到自己的项目中 |

---

## thread（帖子/讨论）

### 抓取策略

根据 `platform` 分发。每个平台的方案按优先级排列，首选方案失败后再尝试下一个。

**Reddit：**
1. **首选 — JSON API**：将 URL 域名替换为 `old.reddit.com`，在路径末尾添加 `.json`，用 `curl -s -L -H "User-Agent: Mozilla/5.0"` 获取，再用 `python3` 解析 JSON 提取原帖和评论（`agent-browser` 访问 Reddit 大概率遇到 CAPTCHA 拦截，不推荐作为首选）
2. **降级 — `agent-browser`**：仅在 JSON API 失败时使用
3. 重点抓取：原帖内容 + 前 20 条高赞评论

**Hacker News：**
1. **首选 — HN API**：`https://hacker-news.firebaseio.com/v0/item/{id}.json` 获取帖子，递归获取 `kids` 字段中的评论（限前 15 条）
2. **降级 — `agent-browser`** 抓取网页

**Twitter/X：**

> [!CAUTION] X.com 会在 TLS 层主动检测并阻断 headless 浏览器（返回 `ERR_CONNECTION_RESET`/`ERR_CONNECTION_CLOSED`）。必须使用 `--headed` 模式。

1. **首选 — `agent-browser --headed`**：
   ```
   agent-browser --headed open "https://x.com/..."
   agent-browser wait --load networkidle
   agent-browser snapshot          # 必须用 snapshot，不要用 get text body（后者返回 JS fallback 页面）
   agent-browser close
   ```
   `snapshot` 返回 accessibility tree，包含推文正文、作者、日期、统计数据（赞/转发/评论/阅读量）。
   注意：未登录状态下无法获取评论区回复内容。
2. **降级 — Thread Reader App**：抓取 `threadreaderapp.com/thread/{tweet_id}`（不稳定，经常超时）
3. **最终降级 — 请求用户粘贴**：如果以上方案均失败，告知用户 X.com 反爬限制并请求手动粘贴推文内容
4. Twitter 线程通常只有一个作者的连续推文，按顺序拼接为完整文本

**其他平台（降级）：**
1. 使用 `agent-browser` 通用抓取
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
| 新颖度 | 讨论中是否涌现了新颖的观点或独特见解 |
| 质量 | 讨论深度、论据质量、参与者的专业水平 |
| 可行性 | 讨论结论能否转化为具体行动或决策 |
