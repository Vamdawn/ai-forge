# Noticeflow 初版架构审查

审查日期：2026-10-18。范围为现有产品方案、技术方案、术语表与交付边界；当前目录没有实现代码。本次结论适用于单管理员、单实例、企业微信 Webhook 首发的约束，属于设计审查，不代表运行验收通过。

审查时结论：总体架构适合现阶段，建议保留单进程、SQLite 持久队列和单一 MCP 工具。实施前需要修正 OAuth 回调匹配、数据库恢复、发送限速和目的地冷却四处设计；无需因此引入微服务或外部队列。

修订状态：下文保留审查时的问题及行号作为历史依据。四项设计已同步修正到产品和技术方案，增加了受限 loopback 端口例外、带锁和中断标记的完整文件集合恢复、保留至租约截止后 60 秒的保守配额，以及持久化目的地共享冷却；对应反例已纳入验收要求。状态仅为设计修正完成，真实 Host 接入、文件恢复和投递时序仍待实现验证。

## 审查时发现的设计缺口

### P1 Claude Code 的动态回调端口与精确匹配冲突

位置：[技术方案 OAuth 段落](technical-design.md#oauth-与管理员登录)，审查时第 115 行；[产品方案](product-design.md#端点与授权边界)也要求回调精确匹配。

[Claude Code 官方文档](https://code.claude.com/docs/en/mcp#configure-a-fixed-oauth-callback-port)说明默认选取随机可用回调端口。本次直接读取[官方 CIMD](https://claude.ai/oauth/claude-code-client-metadata)，其 `redirect_uris` 只有 `http://localhost/callback` 和 `http://127.0.0.1/callback`，没有 `application_type`。逐字符匹配会拒绝实际的 `http://localhost:随机端口/callback`；仅固定端口也不能使它匹配不带端口的 CIMD 条目。

[RFC 8252 §7.3](https://www.rfc-editor.org/rfc/rfc8252#section-7.3)要求原生应用的 loopback IP 回调允许动态端口。[oidc-provider v9.12.2 的回调实现](https://github.com/panva/node-oidc-provider/blob/v9.12.2/lib/models/client.js#L486)仅对识别为 `native` 的客户端采用端口例外，所以不能只修改文字后假设库会自动兼容。

建议：保留 HTTPS 回调严格匹配；明确原生 loopback 回调的受限端口例外，并验证 CIMD 到 Provider 的客户端类型处理。`localhost` 的处理须按实际 Host 与库行为单独验证，不能把 RFC 的 IP literal 规则泛化成任意主机或 URI 前缀匹配。若库无法直接支持，再评估最小适配或预注册固定回调客户端；后者会改变当前仅允许 CIMD URL 的接入规则，需要显式决策。

验收：使用真实 Claude Code CIMD 完成随机端口授权；改变回调路径、非 loopback 主机或客户端身份必须拒绝，PKCE `S256` 仍必需。这里确认的是设计规则冲突，尚未运行 Noticeflow 实现。

### P1 恢复流程没有处理遗留 WAL 与并发维护连接

位置：[技术方案维护命令](technical-design.md#备份恢复与维护命令)，审查时第 197 行。

方案规定停服、保存现库、替换数据库，但异常退出后仍可能留下 `-wal`。SQLite 明确把 WAL 视为数据库持久状态的一部分，并把“替换数据库却保留原热日志”列为损坏原因。[WAL 文件说明](https://www.sqlite.org/wal.html#the_wal_file)、[数据库与日志错配](https://www.sqlite.org/howtocorrupt.html#_mispairing_database_files_and_hot_journals)

建议：恢复命令先取得覆盖服务及维护命令的排他维护锁，禁止同时打开旧数据库。对仍可正常打开的旧库，通过 SQLite 完成恢复、checkpoint 和关闭后再替换；旧库已损坏时保全整个旧文件集合再隔离。新备份先在独立路径校验、撤销授权工件并正常关闭，替换时保证旧 `-wal`、`-shm` 不会与新库混用。不能把“删除所有 WAL”作为一般恢复步骤，否则会丢失旧库已提交数据。

验收：分别覆盖正常停服、强制退出后遗留非空 WAL、恢复中途退出和维护命令并发。恢复后内容必须来自指定备份，旧令牌不能复活，原库及其日志仍可用于回退。

### P2 预留时间窗口不等于实际发送时间窗口

位置：[技术方案投递 Worker](technical-design.md#投递-worker-与状态机)，审查时第 142、156 行；`send_slots` 只有 `reserved_at`。

这是时间线推导：在 `t=0` 预留四格，进程调度或其他同步工作使四次请求在 `t=0.2` 才开始；到 `t=60.1`，旧预留已出窗口，可以继续发 17 次。该窗口只计到 17 次预留，却包含 21 次实际请求。最大并发四个不排除快速响应后连续发送这 17 次。当前算法因此不足以证明方案承诺的实际发送每滚动 60 秒不超过 20 次。

建议：区分未发送预留和实际请求开始时间。正常发送按实际启动时刻计数，对未完成或结果未知的预留采用保守有效期；发送前确认租约及预留仍有效，不能用过期预留继续发送。另一可选方案是采用带持久状态的保守间隔调度，但也需要处理重启与结果未知的请求。该推论针对本地请求启动时间，不承诺控制外部网络到达时刻。

验收：在领取与发送之间注入延迟，覆盖 60 秒窗口边界、四并发、请求前退出及重启；按实际请求开始时间断言限额，不能只断言 `send_slots` 行数。

### P2 远端目的地限流只推迟当前任务

位置：[技术方案投递 Worker](technical-design.md#投递-worker-与状态机)，审查时第 156、158 行。

目前退避保存在各任务的 `next_attempt_at`，没有目的地共享冷却状态。当 Webhook A 返回业务限流或适用于该目的地的 `Retry-After` 时，只推迟这一任务，其他指向 A 的任务仍可占本地空位并立刻发送。这可能连续得到限流响应，消耗多条任务的有限重试预算。HTTP 标准定义了 `Retry-After` 的等待含义，但不统一规定服务端按何种范围限流；目的地共享冷却是针对本产品 Webhook 模型的设计建议。[RFC 9110 §10.2.3](https://www.rfc-editor.org/rfc/rfc9110.html#section-10.2.3)、[RFC 6585 §4](https://www.rfc-editor.org/rfc/rfc6585.html#section-4)

建议：为 `destination_digest` 持久化 `blocked_until`。确认属于目的地限流时，原子更新共享冷却；同一 URL 的不同 Target、正常发送、重试和人工重试都检查它。等待冷却不增加尝试次数；其他目的地可继续投递。

验收：两个 Target 共用 A，另一个使用 B；A 返回限流及 120 秒等待后，尚未发出的 A 任务暂停，B 继续；服务重启不丢失冷却。在途请求不作可撤回承诺。

## 复审修订

以下六项已同步修正至方案及相关记录；完成的是文档契约，尚无实现或运行验收结论。

| 复审发现 | 采用的修订及验收要求 |
| --- | --- |
| 刷新令牌缺少签发与 Grant 生命周期策略 | 显式配置 `issueRefreshToken`，仅业务 scope 也签发刷新令牌，持续授权不依赖浏览器会话；Grant 初始 30 天，兑换时同步延长 Payload 与存储截止时间。验证第 13、26、39 天刷新及最后一次刷新后 30 天过期。 |
| 密码重置可能与在途授权写入交错 | 初版只支持停服并持排他维护锁重置，在一个事务中更新密码并清除全部授权工件；验证持锁时拒绝操作、事务中断回滚及重启后旧授权不可用。 |
| 原始 URL 的 HMAC 可能拆散同一机器人的限额 | 严格限制 Webhook 端点及唯一 `key` 参数，拒绝 fragment 和额外参数；规范化后用于快照、发送、配额及冷却，验证等价写法得到同一目的地标识。 |
| 最近 7 份备份与最多额外保留 7 天相矛盾 | 主库终态记录按 90 天清理，在线备份按最近 7 份轮换，失败保留最后可用副本并告警；不承诺固定年龄上限。恢复保全副本由运维确认无需回退后整组删除，仍被恢复标记引用时不得清理。 |
| 目录调研只要求至少一个 Host | 统一要求 Claude Code 与 ChatGPT 自定义 MCP Server 连接分别通过真实接入验收。 |
| 回调实现源码锚点不准确 | 将固定版本源码定位修正为 `client.js#L486`。 |

签发及父授权的依据见 [Provider 默认策略](https://github.com/panva/node-oidc-provider/blob/v9.12.2/lib/helpers/defaults.js)与 [Grant 校验](https://github.com/panva/node-oidc-provider/blob/v9.12.2/lib/helpers/grant_source.js)。其他修订是针对本产品的并发、目的地身份及保留规则作出的工程决策。

## 已成立的架构选择

| 选择 | 评估 |
| --- | --- |
| 一个远程 Server 镜像，不交付专用 Client | 符合 Host 与 Client 的协议角色划分；当前无需增加 CLI、Client 包或 shared 包。 |
| 单实例 SQLite，通知与所有投递任务同事务提交 | 对当前规模足够；持久任务本身承担数据库与外部发送之间的交接，不需要再叠加一套外部队列。 |
| `accepted` 与送达分离，允许重复，有限重试 | 语义清楚，覆盖外部请求成功但本地提交前中断的窗口；幂等键是未来产品取舍，当前明确接受重复不构成缺陷。 |
| 不可变目标与消息计划，租约 ID 条件更新 | 有助于配置变更隔离和旧处理结果隔离；租约无法阻止外部重复副作用，现有方案已承认这一点。 |
| 复用 OAuth Provider，资源服务器逐请求校验 | 方向合理；没有必要因单用户而改为自写 OAuth 协议，两个目标 Host 的接入要求也不能用任意 API key 替代。 |
| 一个 `Channel.prepare/send` 扩展点 | 对明确存在的渠道扩展需求足够；不需要提前建设插件框架。 |

[MCP 架构](https://modelcontextprotocol.io/specification/2026-07-28/architecture/index)、[SDK 授权指南](https://github.com/modelcontextprotocol/typescript-sdk/blob/v2.3.1/docs/serving/authorization.md)及 [SQLite WAL 同步说明](https://www.sqlite.org/pragma.html#pragma_synchronous)支持协议角色、授权职责与提交持久性；表中的规模及模块判断是针对 Noticeflow 约束的工程判断。

## 实施探针与容量验证

以下是验收门禁或改进建议，不作为已经发生的实现故障：

- **协议兼容**：2026-07-28 规范和 SDK v2.3.1 均真实存在。[SDK 双版本指南](https://ts.sdk.modelcontextprotocol.io/v2/protocol-versions#serve-both-eras-from-one-entry-point)给出统一入口的旧协议支持。现有真实 Host 探针应保留，并记录实际版本及结果。
- **ChatGPT 客户端认证**：[官方 CIMD](https://chatgpt.com/oauth/client.json)同时声明 `none` 与 `private_key_jwt`，singular 字段偏好后者。[官方授权文档](https://developers.openai.com/plugins/build/auth#client-registration)说明方法协商。探针需要明确覆盖 Provider 对 plural 字段的选择；若使用 `private_key_jwt`，还需验证 JWKS、签名和断言校验。当前没有证据判定这一链路失败。
- **SQLite 版本**：除锁定 npm 包外，镜像验收应查询实际 SQLite 引擎版本，排除已知 WAL-reset 缺陷版本。官方说明该缺陷修复于 3.51.3，并有 3.44.6、3.50.7 回补；服务和维护命令可以产生多连接场景。[官方缺陷说明](https://www.sqlite.org/wal.html#the_wal_reset_bug)
- **维护耗时**：90 天保留期会积累终态记录，1000 条未终结任务上限不能限制数据库总量。应按预期日量验证全量备份、清理和完整性校验期间的 HTTP 延迟及事件循环停顿。[SQLite 完整性校验](https://www.sqlite.org/pragma.html#pragma_integrity_check)通常扫描全库；[better-sqlite3 备份](https://github.com/WiseLibs/better-sqlite3/blob/master/docs/api.md#backupdestination-options---promise)分批异步推进不等于随后同步执行的检查也不阻塞。只有测出问题后再决定是否把重检查移到同进程工作线程，无需预先拆服务。
- **工具可用性**：可在工具描述或输入 schema 中给出当前合法 Topic，避免调用方猜路由键；可评估输出 schema，但它是协议可选项，当前省略不能算违规。[MCP 工具规范](https://modelcontextprotocol.io/specification/2026-07-28/server/tools)

后续顺序：按修订后的回调规则完成两种 Host 授权探针，再落实恢复与调度不变量，最后实现完整业务链路。新增验收用例应先暴露上述反例，再验证修正有效；文档修订不替代这些实现验收。
