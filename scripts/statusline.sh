#!/bin/bash
# Claude Code Status Line
# 双行状态栏：模型 + context 进度条 + 费用 + 耗时 / 目录 + git 分支
# 安装：复制到 ~/.claude/statusline.sh，配置 settings.json

input=$(cat)

# 提取字段，// 提供 null 回退
MODEL=$(echo "$input" | jq -r '.model.display_name // "--"')
PCT=$(echo "$input" | jq -r '.context_window.used_percentage // 0' | cut -d. -f1)
COST=$(echo "$input" | jq -r '.cost.total_cost_usd // 0')
DURATION_MS=$(echo "$input" | jq -r '.cost.total_duration_ms // 0')
DIR=$(echo "$input" | jq -r '.workspace.current_dir // .cwd // "--"')

# ANSI 颜色
GREEN='\033[32m'
YELLOW='\033[33m'
RED='\033[31m'
RESET='\033[0m'

# 进度条颜色阈值：绿 <60%，黄 60-83%，红 ≥84%（auto-compact 84.5%）
if [ "$PCT" -ge 84 ]; then
    BAR_COLOR="$RED"
elif [ "$PCT" -ge 60 ]; then
    BAR_COLOR="$YELLOW"
else
    BAR_COLOR="$GREEN"
fi

# 构建 10 格进度条
FILLED=$((PCT * 10 / 100))
EMPTY=$((10 - FILLED))
BAR=""
[ "$FILLED" -gt 0 ] && BAR=$(printf "%${FILLED}s" | tr ' ' '▓')
[ "$EMPTY" -gt 0 ] && BAR="${BAR}$(printf "%${EMPTY}s" | tr ' ' '░')"

# 格式化费用
COST_FMT=$(printf '$%.2f' "$COST")

# 格式化耗时
MINS=$((DURATION_MS / 60000))
SECS=$(((DURATION_MS % 60000) / 1000))

# 第一行：模型 + 进度条 + 费用 + 耗时
echo -e "🤖 ${MODEL} ${BAR_COLOR}${BAR}${RESET} ${PCT}% | 💰 ${COST_FMT} | ⏱️ ${MINS}m ${SECS}s"

# 第二行：目录 + git 分支
if git rev-parse --git-dir > /dev/null 2>&1; then
    BRANCH=$(git branch --show-current 2>/dev/null)
    echo -e "📂 ${DIR} (🌿 ${BRANCH})"
else
    echo -e "📂 ${DIR}"
fi
