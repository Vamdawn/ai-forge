# Claude Code Status Line 实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 创建一个双行 Bash 状态栏脚本，展示模型、context 进度条、费用、耗时、工作目录和 git 分支。

**Architecture:** 单个 Bash 脚本从 stdin 读取 Claude Code 提供的 JSON，用 jq 提取字段，组装双行输出到 stdout。进度条根据 context 用量百分比切换绿/黄/红三色 ANSI 码。

**Tech Stack:** Bash, jq

---

### Task 1: 创建脚本目录和基础脚本

**Files:**
- Create: `scripts/statusline.sh`

**Step 1: 创建 scripts 目录**

Run: `mkdir -p scripts`

**Step 2: 编写完整脚本**

创建 `scripts/statusline.sh`：

```bash
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
```

**Step 3: 设置可执行权限**

Run: `chmod +x scripts/statusline.sh`

**Step 4: 提交**

```bash
git add scripts/statusline.sh
git commit -m "feat: add Claude Code status line script"
```

---

### Task 2: 验证脚本正确性

**Files:**
- Read: `scripts/statusline.sh`

**Step 1: 用模拟数据测试正常输出（绿色区间）**

Run:
```bash
echo '{"model":{"display_name":"Opus"},"context_window":{"used_percentage":25},"cost":{"total_cost_usd":0.12,"total_duration_ms":205000},"workspace":{"current_dir":"/Users/chen/Repository/ai-forge"},"cwd":"/Users/chen/Repository/ai-forge"}' | ./scripts/statusline.sh
```

Expected 输出两行：
- 第一行包含 `🤖 Opus`、`▓▓░░░░░░░░`、`25%`、`$0.12`、`3m 25s`
- 第二行包含 `📂 /Users/chen/Repository/ai-forge (🌿 main)`

**Step 2: 测试黄色区间（60-83%）**

Run:
```bash
echo '{"model":{"display_name":"Opus"},"context_window":{"used_percentage":72},"cost":{"total_cost_usd":1.45,"total_duration_ms":728000},"workspace":{"current_dir":"/Users/chen/Repository/ai-forge"},"cwd":"/Users/chen/Repository/ai-forge"}' | ./scripts/statusline.sh
```

Expected: 进度条显示黄色 ANSI 码（`\033[33m`），`▓▓▓▓▓▓▓░░░ 72%`

**Step 3: 测试红色区间（≥84%）**

Run:
```bash
echo '{"model":{"display_name":"Opus"},"context_window":{"used_percentage":90},"cost":{"total_cost_usd":2.30,"total_duration_ms":1082000},"workspace":{"current_dir":"/Users/chen/Repository/ai-forge"},"cwd":"/Users/chen/Repository/ai-forge"}' | ./scripts/statusline.sh
```

Expected: 进度条显示红色 ANSI 码（`\033[31m`），`▓▓▓▓▓▓▓▓▓░ 90%`

**Step 4: 测试 null 字段回退（会话初始状态）**

Run:
```bash
echo '{"model":{"display_name":"Opus"},"context_window":{"used_percentage":null},"cost":{"total_cost_usd":null,"total_duration_ms":null},"workspace":{"current_dir":"/tmp"},"cwd":"/tmp"}' | ./scripts/statusline.sh
```

Expected: `0%`、`$0.00`、`0m 0s`，第二行无 git 分支括号

**Step 5: 语法检查**

Run: `bash -n scripts/statusline.sh`

Expected: 无输出（无语法错误）

---

### Task 3: 更新设计文档中的项目路径引用

**Files:**
- Modify: `docs/plans/2026-03-02-statusline-design.md`

**Step 1: 确认设计文档路径引用正确**

设计文档中 `scripts/statusline.sh` 路径已正确，无需修改。

**Step 2: 提交验证通过**

```bash
git add docs/plans/2026-03-02-statusline-design.md docs/plans/2026-03-02-statusline-impl.md
git commit -m "docs: add statusline design and implementation plan"
```
