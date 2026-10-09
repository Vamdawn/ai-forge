# Claude Statusline

Claude Code 双行状态栏。可执行文件为 [statusline.sh](statusline.sh)，变更记录见 [CHANGELOG.md](CHANGELOG.md)。

## 使用

需要 Bash、jq、curl 和 Git。从 ai-forge 仓库根目录复制脚本：

```bash
mkdir -p ~/.claude/scripts
cp tools/claude-statusline/statusline.sh ~/.claude/scripts/statusline.sh
chmod +x ~/.claude/scripts/statusline.sh
```

将以下字段合并到 `~/.claude/settings.json`，保留已有配置：

```json
{
  "statusLine": {
    "type": "command",
    "command": "~/.claude/scripts/statusline.sh"
  }
}
```

配置方式见 [Claude Code 官方状态栏文档](https://code.claude.com/docs/en/statusline)。

## 路径迁移

仓库中的脚本由 `scripts/statusline.sh` 迁至 `tools/claude-statusline/statusline.sh`，内容与执行权限保持不变。直接调用旧仓库路径的配置需要更新为新路径；已复制到 `~/.claude/scripts/statusline.sh` 的安装仍使用原位置。
