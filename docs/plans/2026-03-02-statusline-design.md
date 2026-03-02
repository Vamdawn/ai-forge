# Claude Code Status Line 设计

## 概述

为 Claude Code 配置一个双行状态栏脚本，实时展示 context window 用量、模型、费用、耗时、工作目录和 git 分支。

脚本保存在项目仓库中供分享，用户自行复制到 `~/.claude/` 并配置 settings.json 即可使用。

## 输出格式

```
🤖 Opus ▓▓▓░░░░░░░ 25% | 💰 $0.12 | ⏱️ 3m 25s
📂 /Users/chen/Repository/ai-forge (🌿 main)
```

- 第一行：模型 + context 进度条 + 费用 + 耗时
- 第二行：完整工作目录 + git 分支

## 数据源映射

| 显示项 | JSON 字段 | 回退值 |
|--------|-----------|--------|
| 模型名 | `.model.display_name` | `--` |
| Context % | `.context_window.used_percentage` | `0` |
| 费用 | `.cost.total_cost_usd` | `0` |
| 耗时 | `.cost.total_duration_ms` | `0` |
| 目录 | `.workspace.current_dir` | `.cwd` |
| Git 分支 | `git branch --show-current` | 不显示括号 |

## 进度条颜色阈值

| 区间 | 颜色 | ANSI 码 | 含义 |
|------|------|---------|------|
| 0-59% | 绿色 | `\033[32m` | 充裕 |
| 60-83% | 黄色 | `\033[33m` | 接近 auto-compact |
| ≥84% | 红色 | `\033[31m` | auto-compact 触发区（84.5%） |

进度条样式：▓（已用）/ ░（剩余），10 格宽。

## 技术选型

- **语言**：Bash + jq
- **项目路径**：`scripts/statusline.sh`（仓库内，供分享）
- **缓存**：无（仓库规模小，git 查询足够快）

## 安装方式

用户将脚本复制到 `~/.claude/` 后，在 `~/.claude/settings.json` 中添加：

```json
{
  "statusLine": {
    "type": "command",
    "command": "~/.claude/statusline.sh",
    "padding": 2
  }
}
```

## 边界处理

- **会话初始**（首次 API 调用前）：context % 显示 `0%`，费用显示 `$0.00`
- **非 git 目录**：第二行省略 `(🌿 branch)` 部分，只显示目录
- **字段 null**：jq 的 `// 0` 和 `// ""` 提供回退

## 约束

- 脚本频繁执行（每次 assistant 消息后），必须保持轻量
- 终端宽度约 80 列，长路径可能截断但保留完整性
- 不使用 Nerd Font 依赖，只用系统原生 emoji
