# GitHub 仓库（repo）— 抓取与分析策略

## 抓取策略

1. 如果 Step 0 的 `metadata` 中已有仓库元数据（stars, language 等），直接使用
2. 使用 `gh api repos/{owner}/{repo}/readme --header "Accept: application/vnd.github.raw"` 获取 README 原文（Markdown 格式）
3. 如果 README 过长（>10000 字），只保留前 5000 字 + 目录结构
4. 如果 `gh` 不可用，回退到 `agent-browser` 抓取 GitHub 网页

## 分析策略

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

## 评分解读

| 维度 | 在 repo 语境下的含义 |
|:-----|:-------------------|
| novelty | 项目解决的问题是否新颖、方法是否独特 |
| quality | 代码质量（stars/维护活跃度作参考）、文档完整性、社区健康度 |
| actionability | 能否快速上手使用或集成到自己的项目中 |
