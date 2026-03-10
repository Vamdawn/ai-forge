# 文章（article）— 抓取与分析策略

## 抓取策略

按优先级依次尝试，首选方案失败后再用下一个：

1. **首选 — `agent-browser`**：`agent-browser open <url> && agent-browser wait --load networkidle && agent-browser get text body`。如果页面超时或被反爬阻断（如 `ERR_CONNECTION_RESET`），尝试 `agent-browser --headed open <url>`
2. **降级 — `WebFetch`**：当 agent-browser 不可用或持续失败时使用
3. 提取正文文本和发布日期
4. 如果输出超过 30KB，读取持久化的输出文件获取完整内容

## 分析策略

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

## 评分解读

| 维度 | 在文章语境下的含义 |
|:-----|:----------------|
| novelty | 观点/信息对读者知识库的增量价值 |
| quality | 论证深度、来源可信度、逻辑严密性 |
| actionability | 能否转化为具体行动、代码、工具使用 |
