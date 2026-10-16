# Claude Statusline

English | [简体中文](README.zh-CN.md)

A two-line status bar for Claude Code showing session and usage information. The executable is [statusline.sh](statusline.sh).

## Install

Requires Bash, `jq`, `curl`, and Git. Copy the script from an ai-forge checkout:

```bash
mkdir -p ~/.claude/scripts
cp tools/claude-statusline/statusline.sh ~/.claude/scripts/statusline.sh
chmod +x ~/.claude/scripts/statusline.sh
```

Merge these fields into `~/.claude/settings.json`, keeping your existing settings:

```json
{
  "statusLine": {
    "type": "command",
    "command": "~/.claude/scripts/statusline.sh"
  }
}
```

Claude Code documents the field in its [status line reference](https://code.claude.com/docs/en/statusline). A configuration that still calls the old repository path `scripts/statusline.sh` needs the new path; an installation already copied to `~/.claude/scripts/statusline.sh` needs no change.

## Links

- [CHANGELOG.md](CHANGELOG.md) — user-visible changes to this tool.
- [versioning-and-release.md](../../docs/versioning-and-release.md) — how this tool is versioned and released.
