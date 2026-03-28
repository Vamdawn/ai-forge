# E2E Case Template

生成或更新 `<selected-case-dir>/<flow-slug>.md` 时使用以下模板。

## Language Adaptation

- 标题语言默认跟随用户语言或仓库现有用例语言
- 下方标题是推荐字段名，可整体替换成等价中文或英文版本
- 无论使用哪种语言，字段语义必须保持一致，避免同一仓库内混用多套不兼容结构

```md
# <Flow Title>

## Metadata
- Flow ID: <stable-flow-id>
- Status: draft | validated | needs-data
- Priority: high | medium | low
- Entry URL: <route-or-path>
- Persona: <primary-user-role>
- Scope: <feature-area>

## User Goal

<一句话说明用户完成这条流程是为了什么。>

## Preconditions

- <账号、权限、实验开关、环境依赖>
- <必要的初始数据>

## State Setup

- <进入流程前需要满足的系统状态>
- <如需种子数据，说明最小数据要求>

## User Steps

1. <用户动作>
2. <关键反馈或下一步动作>
3. <直到主流程闭环>

## Expected Results

- <页面或系统层面的成功结果>
- <关键状态变更>
- <终态断言>

## Network / API Hints

- <涉及的接口、server action、mutation、loader 或 websocket 事件>
- <只记录与流程判断相关的调用，不罗列全部请求>

## Code Anchors

- Route: `<path-or-route-file>`
- Page / Screen: `<component-or-page>`
- Logic: `<hook-action-store-handler>`
- Data: `<api-endpoint-or-server-module>`

## Coverage Tags

- <auth>
- <checkout>
- <critical-path>

## Known Variants

- <重要分支 1：何时应拆成独立流程，何时只保留为变体>
- <重要分支 2>

## Change Log

- YYYY-MM-DD: <创建或更新原因>
```

## Writing Rules

- `Flow ID` 必须稳定，更新旧流程时不要改。
- `Entry URL` 写真实入口，不要写模糊描述。
- `User Steps` 只保留能驱动自动化实现的关键路径。
- `Expected Results` 至少有一个可验证终态。
- `Code Anchors` 尽量覆盖路由、UI 和数据层三种锚点。
- `Known Variants` 只记录重要分支，不把所有失败态都塞进去。
