# Claude Statusline

[English](README.md) | 简体中文

Claude Code 的双行状态栏，展示会话与用量信息。可执行文件为 [statusline.sh](statusline.sh)。

## 安装

需要 Bash、`jq`、`curl` 和 Git。从 ai-forge 仓库复制脚本：

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

字段说明见 Claude Code 的[状态栏文档](https://code.claude.com/docs/en/statusline)。仍按旧仓库路径 `scripts/statusline.sh` 调用的配置需要改成新路径；已复制到 `~/.claude/scripts/statusline.sh` 的安装无需调整。

## 链接

- [CHANGELOG.zh-CN.md](CHANGELOG.zh-CN.md)：本工具面向用户的变更记录。
- [版本与发布规则](../../docs/versioning-and-release.md)：本工具的版本与发布方式。
