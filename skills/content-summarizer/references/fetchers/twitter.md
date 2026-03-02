# Twitter/X 帖子 — 抓取与分析策略

## 抓取策略

> [!CAUTION] X.com 会在 TLS 层主动检测并阻断 headless 浏览器（返回 `ERR_CONNECTION_RESET`/`ERR_CONNECTION_CLOSED`）。必须使用 `--headed` 模式。

按优先级依次尝试，首选方案失败后再用下一个：

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
| 新颖度 | 讨论中是否涌现了新颖的观点或独特见解 |
| 质量 | 讨论深度、论据质量、参与者的专业水平 |
| 可行性 | 讨论结论能否转化为具体行动或决策 |
