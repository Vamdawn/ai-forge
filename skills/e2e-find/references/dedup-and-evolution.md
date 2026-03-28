# Dedup And Evolution Rules

用以下规则判断候选流程是新建、更新还是跳过。

## Stable Identity

同一流程的身份由以下四个维度共同决定：

1. `entry route`
2. `primary user goal`
3. `critical state transition`
4. `terminal assertion`

四项同时基本一致，视为同一流程。

## Create New File

新建 `<selected-case-dir>/<flow-slug>.md` 的条件：

- 用户主目标不同
- 主入口不同且导致流程语义改变
- 关键状态切换不同
- 终态断言不同，已经属于另一条业务闭环

示例：

- `login-with-password` 和 `reset-password-by-email` 不是同一流程
- `guest-checkout` 和 `checkout-with-saved-address` 若终态与状态机显著不同，应拆开

## Update Existing File

命中已有流程并更新原文件的条件：

- UI 文案变化
- 页面结构或组件重构
- selector 或 DOM 层级变化
- API 位置变化但业务闭环不变
- 主流程增加或删除少量步骤，但用户目标与终态未变

更新时：

- 保留原文件名
- 保留原 `Flow ID`
- 更新受影响 section
- 在 `Change Log` 记录变化原因

## Skip

候选流程应跳过的情况：

- 只是已有流程中的局部页面
- 只是无闭环的只读浏览
- 只是失败态碎片，没有独立业务目标
- 已有文档完整覆盖且本次未发现有效变化

## Slug Rules

文件名使用稳定的 kebab-case slug：

- 优先 `<goal>-<key-mode>`
- 避免 `new`、`latest`、`v2`、`final`
- 避免把实现细节写进文件名

示例：

- `login-with-password.md`
- `signup-with-email.md`
- `checkout-with-coupon.md`

## Change Log Format

建议格式：

- `YYYY-MM-DD: 初次创建，基于代码分析和本地运行验证沉淀主流程。`
- `YYYY-MM-DD: 结账页新增优惠券步骤，主目标不变，更新 User Steps 与 Expected Results。`
- `YYYY-MM-DD: 登录成功后跳转由 dashboard 改为 workspace picker，更新终态断言与代码锚点。`
