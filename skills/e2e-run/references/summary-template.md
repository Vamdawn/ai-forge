# Summary Template

生成 `summary.json` 时使用以下稳定结构：

```json
{
  "run_id": "[run-id]",
  "project_root": "[project-root]",
  "scope": "[scope]",
  "mode": "script",
  "overall_status": "failed",
  "service": {
    "command": "[selected-start-command]",
    "workdir": "[service-workdir]",
    "base_url": "[base-url]",
    "status": "started"
  },
  "discovery": {
    "scripts_found": [
      "[path-or-command]"
    ],
    "specs_found": [
      "[path]"
    ],
    "selected_assets": [
      "[path]"
    ],
    "excluded_assets": [
      {
        "path": "[path]",
        "reason": "[reason]"
      }
    ]
  },
  "cases": [
    {
      "name": "[case-name]",
      "source_type": "script",
      "source_path": "[path]",
      "status": "passed",
      "duration_seconds": 12,
      "evidence": [
        "evidence/traces/login.zip"
      ],
      "notes": "[optional-note]"
    }
  ],
  "issues": [
    {
      "category": "test failure",
      "case": "[case-name]",
      "evidence": [
        "runner.log"
      ],
      "analysis": "[short-analysis]",
      "next_action": "[actionable-next-step]"
    }
  ],
  "next_actions": [
    "[action-1]",
    "[action-2]"
  ]
}
```

## Rules

- `mode` 仅允许 `script` 或 `spec`
- `overall_status` 仅允许 `passed`、`failed`、`blocked`、`needs-cases`、`needs-input`
- `issues[].category` 仅允许 `environment`、`data/auth`、`test failure`、`spec drift`、`unknown`
- 即使只有一个案例，也保留数组结构，便于后续 agent 聚合
