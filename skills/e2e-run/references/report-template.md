# Report Template

生成 `report.md` 时使用以下结构。标题语言可本地化，但章节语义必须保持一致。

```md
# [Run Title]

## Run Metadata
- Run ID: [run-id]
- Mode: script | spec
- Scope: [user-scope-or-default-scope]
- Started At: [iso-datetime]
- Project Root: [absolute-or-repo-relative-path]
- Overall Status: passed | failed | blocked | needs-cases | needs-input

## Service Boot
- Command: `[selected-start-command]`
- Working Directory: `[service-workdir]`
- Base URL: `[base-url]`
- Status: started | failed | partial
- Evidence: `[service.log or port check result]`

## Case Discovery
- Scripts: [count and summary]
- Specs: [count and summary]
- Selected Assets:
  - `[path]`
- Excluded Assets:
  - `[path]: [reason]`

## Execution Strategy
- Default Scope Policy: smoke | critical | main-path | user-specified
- Why This Mode: [why script or spec was chosen]
- Validation Method: agent-browser | runner-native | http-fallback

## Case Results
| Case | Source Type | Source Path | Status | Duration | Evidence | Notes |
|------|-------------|-------------|--------|----------|----------|-------|
| [login-smoke] | script | `tests/e2e/login.spec.ts` | failed | 18s | `evidence/traces/login.zip` | timeout after submit |
| [checkout-main] | spec | `specs/e2e/checkout.md` | blocked | 0s | `service.log` | requires seeded payment account |

## Issues Analysis
| Category | Case | Evidence | Analysis | Next Action |
|----------|------|----------|----------|-------------|
| test failure | [login-smoke] | `runner.log` | submit 后等待 dashboard 超时，说明脚本断言或页面状态可能漂移 | 检查登录成功后的跳转与 selector |

## Evidence
- `service.log`
- `runner.log`
- `evidence/screenshots/...`
- `evidence/traces/...`

## Next Actions
1. [最重要的下一步]
2. [次要下一步]
```

## Writing rules

- `Overall Status` 以实际结果为准，不要掩盖失败或阻塞。
- `Case Results` 至少覆盖所有被执行或被判定为阻塞的案例。
- `Issues Analysis` 只使用允许的分类：`environment`、`data/auth`、`test failure`、`spec drift`、`unknown`
- `Next Actions` 必须可执行，避免空泛表述。
