#!/bin/bash
# Claude Code Status Line
# 双行状态栏：模型 + context 进度条 + 费用 + 耗时 / 目录 + git 分支
# 安装：复制到 ~/.claude/scripts/statusline.sh，配置 settings.json

input=$(cat)

# 提取字段，// 提供 null 回退
eval "$(echo "$input" | jq -r '
  @sh "MODEL=\(.model.display_name // "--")",
  @sh "PCT=\(.context_window.used_percentage // 0 | floor)",
  @sh "COST=\(.cost.total_cost_usd // 0)",
  @sh "DURATION_MS=\(.cost.total_duration_ms // 0)",
  @sh "DIR=\(.workspace.current_dir // .cwd // "--")"
')"

# 用量信息字符串，默认为空
USAGE_INFO=""
# 检测 MiniMax 模型并获取用量（仅当使用 MiniMax API 时）
if [[ "$ANTHROPIC_BASE_URL" == "https://api.minimaxi.com/anthropic" ]]; then
    response=$(curl -s --max-time 5 'https://www.minimaxi.com/v1/api/openplatform/coding_plan/remains' \
        --header "Authorization: Bearer ${ANTHROPIC_AUTH_TOKEN}" \
        --header 'Content-Type: application/json' 2>/dev/null)

    if [ -n "$response" ] && [ "$response" != "null" ]; then
        # 单次 jq 查询获取 5h 和 weekly 百分比
        read -r MINIMAX_5H_PCT MINIMAX_WEEKLY_PCT <<<$(echo "$response" | jq -r --arg model "$MODEL" '
            [.model_remains[] | select(.model_name as $pat | $model | test($pat | gsub("\\*"; ".*"))) |
            ((.current_interval_usage_count * 100 / .current_interval_total_count) | floor | tostring),
            ((.current_weekly_usage_count * 100 / .current_weekly_total_count) | floor | tostring)] |
            join(" ")
        ' 2>/dev/null)

        if [ -n "$MINIMAX_5H_PCT" ] && [ "$MINIMAX_5H_PCT" != "null" ]; then
            if [ -n "$MINIMAX_WEEKLY_PCT" ] && [ "$MINIMAX_WEEKLY_PCT" != "null" ]; then
                USAGE_INFO=" | 5h ${MINIMAX_5H_PCT}% · 1w ${MINIMAX_WEEKLY_PCT}%"
            else
                USAGE_INFO=" | 5h ${MINIMAX_5H_PCT}%"
            fi
        fi
    fi
fi

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

# 格式化耗时（天/时/分，省略为零的高位单位）
TOTAL_MIN=$((DURATION_MS / 60000))
DAYS=$((TOTAL_MIN / 1440))
HOURS=$(((TOTAL_MIN % 1440) / 60))
MINS=$((TOTAL_MIN % 60))
DURATION_FMT="${MINS}m"
[ "$HOURS" -gt 0 ] && DURATION_FMT="${HOURS}h ${DURATION_FMT}"
[ "$DAYS" -gt 0 ] && DURATION_FMT="${DAYS}d ${DURATION_FMT}"

# 第一行：模型 + 进度条 + 费用 + 耗时
LINE1="🌐 ${MODEL} ${BAR_COLOR}${BAR}${RESET} ${PCT}% | 💰 ${COST_FMT} | ⏱️ ${DURATION_FMT}${USAGE_INFO}"
echo -e "$LINE1"

# 第二行：目录 + git 分支
if git -C "$DIR" rev-parse --git-dir > /dev/null 2>&1; then
    BRANCH=$(git -C "$DIR" branch --show-current 2>/dev/null)
    echo -e "📂 ${DIR} (🌿 ${BRANCH})"
else
    echo -e "📂 ${DIR}"
fi
