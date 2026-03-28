# Output Policy

每次执行必须落盘为一个独立快照，避免覆盖历史结果。

## Result directory selection

优先级如下：

1. 项目已存在用于 e2e 运行产物的目录，例如 `playwright-report/`、`test-results/`、`reports/e2e/`
2. 项目已有通用产物目录，可稳定承载 e2e 结果，例如 `artifacts/`
3. 若无现成约定，则创建 `[project-root]/artifacts/e2e-runs/`

选择目录后，本次执行保持一致，不在多个目录之间切换。

## Snapshot naming

单次运行目录命名：

`[selected-dir]/[YYYYMMDD-HHMMSS]-[scope-slug]/`

要求：

- `scope-slug` 取用户范围、用例名或 `smoke`
- 仅使用小写字母、数字、连字符

## Required files

每个快照目录至少包含：

- `report.md`
- `summary.json`
- `service.log`
- `runner.log`
- `evidence/`

如果某类文件不适用，也保留文件位并说明原因，例如在 `runner.log` 中写明“spec mode without native runner”。

## Evidence layout

`evidence/` 下建议保留：

- `screenshots/`
- `traces/`
- `videos/`
- `raw/`

如果 runner 产物不便移动，可在 `raw/` 中写索引文件，指向原始路径。

## Latest pointer

在结果根目录维护一个轻量 `latest.json` 或 `latest.md` 索引，内容仅包括：

- 最新 `run_id`
- 目录路径
- 模式
- 总体状态

不要删除旧快照。

## Language adaptation

- 报告标题语言默认跟随用户语言
- 若项目已有稳定英文或中文报告格式，沿用该语言
- `summary.json` 字段名保持英文稳定，不随语言变化
