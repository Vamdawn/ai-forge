# Twitter/X 帖子 — 抓取与分析策略

## 抓取策略

> [!IMPORTANT] 优先使用镜像 API（无需登录，稳定性更高），浏览器抓取仅作为兜底方案。

**适用范围与前置条件（必须）**：
- 仅当 Step 0 检测结果 `platform=twitter` 时适用本文件。
- `metadata` 至少包含：`tweet_id`、`author_handle`（可空）、`source_host`、`canonical_url`。
- 本文件是 Twitter/X 的唯一抓取规则来源；不得在主 `SKILL.md` 重复或覆盖。

按优先级依次尝试，首选方案失败后再用下一个：

1. **首选 — 运行脚本 `scripts/fetch_twitter_status.py`**（输入为原始 URL 或 `metadata.tweet_id`）：
   ```
   python3 scripts/fetch_twitter_status.py "https://x.com/<user>/status/<tweet_id>"
   ```
   脚本内部按以下顺序自动降级：
   - `https://api.fxtwitter.com/status/<tweet_id>`（主路径）
   - `https://api.vxtwitter.com/status/<tweet_id>`（降级）
   - `https://api.xfxtwitter.com/status/<tweet_id>`（可选降级，短超时快速跳过）
   仅当脚本返回 `ok=true` 时，才视为抓取成功；使用标准字段：`text`、`author`、`published_at`、`stats`、`media`、`canonical_url`。
2. **仅在用户明确要求且 API 全部失败时**，再尝试 `agent-browser --headed` 手动抓取。
3. **最终降级 — 请求用户粘贴**：当脚本返回 `ok=false` 且浏览器抓取不可用时，告知失败原因并请用户粘贴原文（需记录完整失败尝试）。
4. Twitter 线程通常只有一个作者的连续推文，按顺序拼接为完整文本。

**验证门（必须满足）**：
- `text` 非空
- `author`（name 或 handle）存在
- `tweet_id` 与目标一致
- 原帖链接优先使用 `canonical_url`

**字段映射约定**：
- 正文：`text`
- 作者：`author.name` / `author.handle`
- 发布时间：`published_at`
- 互动数据：`stats.likes` / `stats.replies` / `stats.retweets` / `stats.views`
- 多媒体：`media`（无则 `[]`）

## 分析策略

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

## 评分解读

| 维度 | 在 thread 语境下的含义 |
|:-----|:---------------------|
| novelty | 讨论中是否涌现了新颖的观点或独特见解 |
| quality | 讨论深度、论据质量、参与者的专业水平 |
| actionability | 讨论结论能否转化为具体行动或决策 |
