# Noticeflow 初版技术方案

状态：首版服务端实现及本地自动化验证已加入仓库，真实接入与容器运行验收仍待完成。以[已确认的产品方案](product-design.md)为约束；本文给出模块接口、数据模型、运行时流程和验证门槛。涉及具体依赖的配置在编码时以锁定版本和真实 Host 接入测试为准。

## 设计基线

- 交付一个 Node.js 24 + TypeScript 的远程 MCP Server 镜像；唯一常驻进程同时处理 MCP、OAuth 和投递任务。现成 Host 自带 MCP Client，仓库不交付专用 Client。
- 公网 HTTPS 由外部 Nginx 终止；进程监听容器内 HTTP。单实例、单管理员、单 SQLite 数据卷。首次仅有企业微信机器人 Webhook 渠道。
- `submit_notification(topic,title,content)` 在通知及全部投递任务的 SQLite 事务提交后返回 `accepted`；发送异步执行，允许重复投递。成功和最终失败任务均在进入终态 90 天后清理。
- 配置及 Webhook URL、管理员初始密码来自仓库外 YAML；数据密钥来自单独挂载文件。不得把明文通知、Webhook URL、密码和令牌写入数据库可读列或日志。

技术选择及原因：

| 位置 | 选择 | 约束与验证点 |
| --- | --- | --- |
| MCP HTTP | `@modelcontextprotocol/server`、`@modelcontextprotocol/express` v2 | 使用官方工具注册、Streamable HTTP 处理和资源服务器鉴权辅助；先用目标 Host 验证协议版本互通。 |
| OAuth 授权服务器 | `oidc-provider` | 复用授权码、PKCE、刷新令牌、资源指示符和 CIMD 处理；禁用不需要的注册及授权方式。CIMD 在该库中仍是实验特性，须先完成兼容性探针。 |
| SQLite | `better-sqlite3` | 同步短事务便于原子扇出和租约领取，提供在线备份；固定 Node 24 镜像中原生扩展的构建与运行版本。 |
| Markdown 校验 | `remark-parse` + `remark-gfm` | 解析语法树并逐节点做白名单校验，避免靠正则猜测表格、代码与链接的边界。 |
| 加密与密码 | Node `crypto` | AES-256-GCM 加密记录，HKDF 派生用途隔离的子密钥，`scrypt` 哈希管理员密码。 |

[MCP SDK v2 的 HTTP 与鉴权示例](https://github.com/modelcontextprotocol/typescript-sdk/blob/v2.3.1/docs/serving/authorization.md)、[oidc-provider 配置参考](https://github.com/panva/node-oidc-provider/blob/main/docs/README.md)、[better-sqlite3 的事务与备份接口](https://github.com/WiseLibs/better-sqlite3/blob/master/docs/api.md)分别支持上述选择。最终依赖版本在实施时锁进 `package-lock.json`，不依赖浮动的 `latest`。

## 进程与模块

```text
Nginx HTTPS
    │
    ▼
Express HTTP 进程
    ├─ /mcp ─ Bearer 校验 ─ MCP SDK ─ submitNotification
    ├─ /.well-known/*, /auth, /token, /interaction/* ─ OAuth Provider + 管理员登录
    ├─ /healthz
    ├─ SQLite Store ◄── 投递 Worker ── Channel Registry ── 企业微信 Webhook
    └─ 每日备份与清理调度

同一镜像的临时维护命令 ── SQLite Store / 数据密钥
```

模块接口保持较小，调用者无需了解其内部事务、加密或渠道协议：

| 模块 | 对内接口 | 持有的实现细节 |
| --- | --- | --- |
| `submitNotification` | `submit(input) -> Accepted | SubmitError` | 输入校验、Topic 路由、渠道预处理、容量校验、加密与原子入库。 |
| `Channel` | `prepare(input,target) -> DeliveryPlan`；`send(plan) -> SendOutcome` | 渠道能力校验、目标快照、最终消息格式、HTTP 调用和渠道错误分类。初版只有 WeCom Adapter。 |
| `DeliveryWorker` | `start()`、`stop()` | 领取租约、限速预留、超时、重试、过期租约恢复及终态更新。 |
| `Store` | 领域操作及 OAuth 持久化操作 | SQL、事务、迁移、保留期清理和在线备份；不暴露通用 SQL 给其他模块。 |
| `Authorization` | `verifyAccessToken(raw) -> AuthInfo` | `oidc-provider`、SQLite Adapter、管理员登录与令牌撤销。 |

`Channel.prepare` 不执行外部请求。它返回含渠道类型、目的地和已排版消息的不可变计划；接收时加密保存该计划，后续部署变更不会改变已接收任务的投递内容。新增渠道时注册一个新 Adapter、扩充 YAML 的渠道配置解析和验收用例，不修改 MCP 工具字段。当前只有一个渠道，但这一接口是产品明确要求的扩展点；其他模块不再按渠道拆出空泛的接口层。

## 代码与构建目录

```text
mcp/noticeflow/
├── README.md / README.zh-CN.md
├── CHANGELOG.md / CHANGELOG.zh-CN.md
├── docs/
│   ├── product-design.md
│   └── technical-design.md
├── apps/server/
│   ├── package.json
│   ├── package-lock.json
│   ├── tsconfig.json
│   ├── Dockerfile
│   ├── src/
│   │   ├── main.ts                 # serve 与维护命令分派
│   │   ├── config.ts               # YAML 加载、验证与冻结
│   │   ├── http.ts                 # Express、MCP 路由与元数据
│   │   ├── auth.ts                 # OAuth Provider、登录与令牌校验
│   │   ├── submit.ts               # 唯一 MCP 工具的业务入口
│   │   ├── channel.ts              # Channel 接口与注册
│   │   ├── wecom.ts                # 企业微信 Adapter
│   │   ├── worker.ts               # 租约、限速、重试
│   │   ├── store.ts                # SQLite 事务与 OAuth Adapter
│   │   ├── crypto.ts               # 加密、HMAC、密码哈希
│   │   ├── maintenance.ts          # 服务端维护命令
│   │   └── migrations/            # 有序 SQL 迁移
│   └── test/                       # 模块测试
└── tests/e2e/                       # 标准 MCP Client 和容器验收
```

这是预期文件分工，编码时可在不改变模块接口的前提下合并或拆分文件。只在 `apps/server` 建立 npm 包；`tests/e2e` 使用该包的开发依赖运行，不发布 Client 库或第二个应用。

## HTTP、MCP 与工具结果

`publicBaseUrl` 必须是无路径、无尾随斜线的 HTTPS Origin。MCP 资源 URI 固定为 `${publicBaseUrl}/mcp`，OAuth `issuer` 为 `publicBaseUrl`。外部需要转发 `/mcp`、`/.well-known/oauth-protected-resource/mcp`、`/.well-known/oauth-authorization-server`、`/auth`、`/token` 和登录交互路径；实际由授权服务器发布的其他必需路径也应可达。Nginx 配置不在本仓库实现。

按照 [2026-07-28 Streamable HTTP 规范](https://modelcontextprotocol.io/specification/2026-07-28/basic/transports/streamable-http)，`/mcp` 接受逐请求 POST；每个请求带协议版本与请求元数据，不依赖 MCP Session ID、GET SSE 或持久连接状态。HTTP `Origin` 存在时只接受与 `publicBaseUrl` 相同的 Origin，否则返回 403；目标 Host 的实际 Origin 行为须由接入探针确认。无授权时返回带 `resource_metadata` 和 `scope="notification:submit"` 的 Bearer 挑战。官方 SDK 负责 JSON-RPC、版本协商和工具发现，服务端代码不自行解析 MCP 帧。目标 Host 若仍使用旧版握手，需在兼容性探针中确认 SDK 的双版本行为；不能以自行忽略协议头的方式兼容。

`tools/list` 只公开 `submit_notification`，描述应明确它会向外部群机器人推送、`accepted` 仅表示持久接收、重复调用会产生重复通知。工具声明为有外部副作用且非幂等。输入是对象，三个非空字符串必填，拒绝额外字段；`topic` 精确匹配配置键，`title` 不允许换行。`content` 经 Markdown 校验后形成每个渠道的发送计划。服务端按已验证的 Client ID 对该工具实施每滚动 60 秒最多 120 次调用的进程内限流，业务校验失败的调用也计入；它保护接收入口，重启后计数重置，投递的每 Webhook 限速则持久化。

成功结果同时返回 `structuredContent: {"status":"accepted","notificationId":"<UUID>"}` 和等价的 JSON 文本 `content`，方便不同 Host 读取。初版不声明 `outputSchema`，以免执行错误的 `isError` 结果与仅描述成功结构的 schema 冲突；这不影响实际结果形状。业务错误返回 `isError: true` 和不含输入内容的稳定错误码：`INVALID_INPUT`、`UNKNOWN_TOPIC`、`UNSUPPORTED_CONTENT`、`QUEUE_FULL`、`RATE_LIMITED`。后两者标记为可重试，其余不可重试。认证失败是 HTTP 401/403，未知工具与畸形 MCP 请求交给 SDK 形成协议错误；数据库故障返回无敏感细节的服务端错误。响应可能在事务提交后丢失，所以重试仍可能创建第二条通知。[MCP 工具错误与结构化内容规范](https://modelcontextprotocol.io/specification/2026-07-28/server/tools)支持这两类错误区分。

提交顺序为：按已认证 Client ID 检查并计入入口限流 → 校验输入 → 解析 Topic 的全部 Target → 对每个 Target 调用 `prepare` 并检查内容能力 → 生成通知和任务 ID、加密标题/正文/计划 → `BEGIN IMMEDIATE` 中检查未终结任务数及本次扇出数 → 插入通知和全部任务 → 提交事务 → 返回 `accepted`。任何 Target 失败或容量不足均回滚整条通知；入口超限不写入通知和任务。前置校验不访问 Webhook；数据库事务内不做网络调用。

Markdown 使用语法树白名单：段落、标题、强调、列表、引用、链接、分隔线、行内/块代码与表格及其必要子节点；拒绝图片、原始 HTML、脚注、任务复选框、删除线、自动提及及颜色语法。链接仅允许 `https:` 和 `http:`。在代码之外检测并拒绝 `@提及`。纯文本标题先转义 Markdown 特殊字符，再作为 `# 标题` 前缀；最终传给 WeCom 的 UTF-8 字节长度不得超过 4096。包含不支持语法时不做截断或自动降级。

## OAuth 与管理员登录

MCP SDK 的 `mcpAuthMetadataRouter` 发布受保护资源元数据，`requireBearerAuth` 对每个 `/mcp` 请求校验访问令牌、`notification:submit` 权限和资源 URI；令牌校验器通过 `oidc-provider` 查找不透明访问令牌，再映射为 SDK 的 `AuthInfo`。[SDK 鉴权指南](https://github.com/modelcontextprotocol/typescript-sdk/blob/v2.3.1/docs/serving/authorization.md)明确资源服务器辅助不会签发令牌，签发、轮换和授权页由 `oidc-provider` 负责。

| HTTP 路径 | 处理者 |
| --- | --- |
| `/.well-known/oauth-protected-resource/mcp` | MCP SDK 发布资源 URI、授权服务器 URI 与 scope。 |
| `/.well-known/oauth-authorization-server` | MCP SDK 镜像同进程 Provider 的授权服务器元数据。 |
| `/auth`, `/token` | `oidc-provider` 处理授权码、PKCE 和令牌刷新。 |
| `/interaction/:uid` | 本服务的管理员登录与授权确认页，完成 Provider 交互。 |
| `/mcp` | SDK 的 Streamable HTTP Handler，前置 Bearer 鉴权。 |

Provider 的元数据与 SDK 镜像必须同源且对外使用相同 `issuer`。不开放动态注册路由；若 Provider 发布其他支持路径，Nginx 也需转发，路由列表以实际元数据为准。

`oidc-provider` 只启用授权码与刷新令牌，强制 PKCE `S256`；仅允许 `notification:submit`，且 `resource` 必须是精确的 MCP URI。资源指示符返回不透明访问令牌，访问令牌有效期 15 分钟。刷新令牌每次使用都轮换，新令牌从该次轮换起有效 30 天；连续 30 天不刷新则需重新登录。实现需显式设置访问/刷新令牌 TTL、每次轮换策略及会话绑定策略，并测试浏览器会话过期后刷新仍符合 30 天规则；不能依赖 Provider 默认的 14 天 TTL。禁止 DCR、隐式授权和客户端凭据授权。`issuer` 由配置给出，不从请求 `Host` 或转发头拼接。

显式配置 `issueRefreshToken`：仅当 Client 允许刷新授权、管理员已授予 `notification:submit` 且资源 URI 正确时，授权码兑换签发刷新令牌，不依赖也不额外开放 `offline_access` scope。此持续授权的 `expiresWithSession` 明确为 `false`，避免浏览器会话过期提前终结刷新能力；它仍受密码重置、授权撤销及自身过期约束。库的[默认签发和会话绑定策略](https://github.com/panva/node-oidc-provider/blob/v9.12.2/lib/helpers/defaults.js#L301)不能直接用于本契约。

Grant 初始有效期为 30 天；授权码兑换及每次成功刷新时，先把对应 Grant 的有效期延长到不早于本次新访问令牌和刷新令牌的最晚过期时间，再完成新令牌持久化及返回。续期采用新旧截止时间的最大值，事务中同步更新加密 Payload 的 `exp` 与 Adapter 的 `expires_at`，分别按 Provider 的 UTC 秒与数据库的 UTC 毫秒换算，不能只延长数据库清理时间。Grant 续期失败时本次兑换失败，不返回父授权提前过期的新令牌。已过期、已消费或已撤销的刷新令牌不能因 Grant 续期而恢复；必须先验证当前令牌和 Grant 仍有效。库的[Grant 默认 TTL](https://github.com/panva/node-oidc-provider/blob/v9.12.2/lib/helpers/defaults.js#L407)与[刷新时的 Grant 校验](https://github.com/panva/node-oidc-provider/blob/v9.12.2/lib/helpers/grant_source.js#L32)要求显式实现这项续期，不能保留默认 14 天截止。

CIMD 只接受 YAML `allowedClientIds` 中完整匹配的 HTTPS Client ID URL。`allowFetch` 在发起远端请求前过滤白名单，`allowClient` 对缓存命中的 Client 再过滤；使用库内 SSRF 防护，验证元数据 `client_id` 与 URL 一致。仅为实际接入的 Claude Code、ChatGPT Client ID 配置白名单。由于 `oidc-provider` 的 [CIMD 功能仍是实验特性](https://github.com/panva/node-oidc-provider/blob/main/docs/README.md)，先运行真实元数据、回调、刷新令牌互操作探针，版本升级也须重跑。

回调验证分两类：HTTPS 地址与 CIMD 条目逐字符精确匹配；已确认的原生客户端 HTTP loopback 地址可按 [RFC 8252 §7.3](https://www.rfc-editor.org/rfc/rfc8252#section-7.3)忽略端口比较，其余字符仍须与同一条元数据地址一致。只接受 `127.0.0.1`、`[::1]` 中实际列出的主机；`localhost` 例外仅用于固定官方 Client ID `https://claude.ai/oauth/claude-code-client-metadata` 且 CIMD 明确列有该主机的情况。端口必须有效，不接受用户信息或片段，不在主机之间替换，不接受子域名、任意 loopback 地址或 URI 前缀匹配。授权码兑换时，`redirect_uri` 必须与该次授权请求的完整 URI 一致，包括实际端口，不能再次忽略端口。

客户端原生类型由服务端对已核验身份的限定适配确定，不能仅因 Client ID 在白名单中就把客户端视为原生。Claude Code 的官方 CIMD 未声明 `application_type` 时，在 Provider 校验前仅为上述固定身份补充 `native` 类型，保留抓取到的 Client ID 与回调列表；其他身份不套用该适配。[Provider 的回调实现](https://github.com/panva/node-oidc-provider/blob/v9.12.2/lib/models/client.js#L486)依赖原生类型，不能假定默认配置已兼容。接入探针必须验证所锁版本的公共扩展能完成此受限适配及 `localhost` 处理；未通过前不能宣称 Claude Code 接入可用，也不通过关闭回调校验或静默改为预注册客户端绕过。

管理员固定为一个账号。首次建库时从 YAML 读取初始密码，随机 16 字节盐、异步 `scrypt` 哈希后只保存哈希及参数；之后有该账号时忽略 YAML 密码并提示部署人员删除该字段。登录页只在授权交互中出现，显示 Client 名称、回调和 `notification:submit` 权限；自定义表单必须验证绑定该交互的 CSRF token，Cookie 设为 Secure、HttpOnly、SameSite=Lax。错误凭据使用统一提示，并按经 Nginx 校验的来源 IP 限制为每 15 分钟最多 5 次失败尝试。密码重置仅支持停服后的交互式维护命令：在打开数据库前取得排他维护锁，服务或其他数据库命令仍持锁时直接拒绝。取得锁后读入并确认新密码，在一个事务中换哈希并删除所有 OAuth 授权工件和登录会话，提交并关闭连接后才释放锁。重新启动后旧密码和旧授权均不可用；初版不支持在线重置，从而避免进行中的旧授权请求在删除之后重新写入令牌。

OAuth 的会话、授权码、Grant 与令牌状态由自定义 SQLite Adapter 实现 `oidc-provider` 所需的查找、写入、消费、撤销与过期接口。Adapter 的查找键用 HMAC 摘要保存，Payload 加密保存，辅助索引也使用 HMAC；数据库不出现原始授权码或令牌。访问令牌验证每次查 SQLite，不仅校验格式与过期时间，还校验 Client、scope、resource 与撤销状态。数据密钥派生独立的加密、查找和 Cookie 密钥，防止不同用途直接共用同一密钥材料。

## SQLite 数据模型与事务

时间以 UTC 毫秒保存；ID 使用随机 UUID。结构以下列关键字段为准，具体 SQL 由有序迁移文件给出。所有表启用外键约束；连接设置 WAL、`synchronous=FULL` 和有限 busy timeout。数据库文件位于本地持久化卷，单实例持有常驻连接；HTTP 和 Worker 只进行短事务。[SQLite 同步模式说明](https://www.sqlite.org/pragma.html#pragma_synchronous)解释了 WAL 下 `FULL` 的断电持久性权衡。

| 表 | 关键字段 | 索引 / 不变量 |
| --- | --- | --- |
| `schema_migrations` | `version`, `applied_at` | 启动时按序升级；不自动降级。 |
| `admin` | 固定 ID、`password_hash`, `salt`, `scrypt_params`, `updated_at` | 仅一行；首次初始化后不受 YAML 密码覆盖。 |
| `notifications` | `id`, `topic`, `title_cipher`, `content_cipher`, `created_at` | 一个工具成功调用只插入一行；密文带密钥版本。 |
| `deliveries` | `id`, `notification_id`, `target_id`, `channel`, `plan_cipher`, `status`, `attempts`, `next_attempt_at`, `lease_id`, `lease_until`, `finished_at`, `last_error_code`, `last_http_status`, `last_remote_code` | 外键到通知；按状态与到期时间索引；每个目标一行，错误字段只含脱敏代码。 |
| `send_slots` | `destination_digest`, `delivery_id`, `lease_id`, `reserved_at`, `hold_until` | 按目的地和截止时间索引；`hold_until = 该次 lease_until + 60000`，不随任务后续租约变化；同一 Webhook 共用最多 20 格。 |
| `destination_cooldowns` | `destination_digest`, `blocked_until` | 目的地唯一；截止时间只取新旧最大值，所有 Target、自动及人工重试共用。 |
| `oauth_artifacts` | `model`, `id_digest`, `payload_cipher`, `expires_at`, `grant_digest`, `uid_digest`, `user_code_digest`, `consumed` | 实现 Provider Adapter；原始令牌及授权码不明文入库。 |
| `maintenance_state` | `name`, `value` | 记录上次成功备份日。 |
| `key_check` | `cipher` | 启动和恢复前验证当前数据密钥能解密本数据库。 |

`deliveries.status` 只取 `pending`、`processing`、`waiting_retry`、`succeeded`、`failed_final`。`pending`、`processing`、`waiting_retry` 计入 1000 条未终结任务上限。`attempts` 只统计已记录结果的发送尝试，网络超时计一次；租约过期的结果未知不计入。`finished_at` 只对终态非空；从终态人工重试时清空它、重置尝试次数并转为 `pending`，保留原任务 ID 和目标快照，并输出脱敏操作日志。成功和最终失败均按本次 `finished_at + 90 天` 清理；未终结任务不按接收时间清理。没有任何投递任务的通知随之删除。

提交和人工重试使用 `BEGIN IMMEDIATE`，使容量计算与插入/状态切换不可被维护命令并发穿插。达到容量时不写通知。`oidc-provider` Adapter 写入、消费刷新令牌及 Grant 续期通过所需的事务/原子更新保证单次使用与截止时间不回退；不能把“查找再更新”留在无事务的两次调用中。密码重置在停服并持排他维护锁时，以单个事务更新密码并清除授权工件。数据库忙超时或写入失败时不返回 `accepted`。

## 投递 Worker 与状态机

一个进程内的 Worker 按数据库中的 `next_attempt_at` 领取任务，定时器只负责唤醒，SQLite 是状态来源。最多同时进行 4 个 Webhook HTTP 请求；每次请求超时 10 秒，处理租约 30 秒。领取时用事务检查目的地冷却及配额，赋予随机 `lease_id`、设置租约截止时间并预留一格。在真正调用发送 Adapter 前再次检查租约归属、严格超过 10 秒的剩余租约、预留有效性和共享冷却；检查通过后立即在事务外开始请求，中间不插入异步等待。条件失效则不发送，仍属本租约的任务转为 `waiting_retry`，不增加 `attempts`，旧预留仍按原截止时间保留。取得 HTTP 结果或网络超时后，仅在 `lease_id` 仍匹配的事务中增加 `attempts` 并更新任务状态。服务停止时不领取新任务，给在途请求有限完成时间，未完成的由过期租约恢复。

```text
pending ──领取──▶ processing ──成功──▶ succeeded
                        │
                        ├─可重试且尚有预算──▶ waiting_retry ──到期──▶ processing
                        └─永久错误或预算耗尽──▶ failed_final

processing ──租约过期──▶ waiting_retry
failed_final ──维护命令重试──▶ pending
```

首次取得可重试失败结果后最多再取得三次结果，共最多四次有结果的发送尝试；第 1、2、3 次可重试失败后的基础等待分别为 1、5、15 分钟。租约过期只表示结果未知，转为可立即领取的 `waiting_retry`，保留原 `attempts`，不因此进入 `failed_final`。如果请求已被渠道接收但结果尚未提交，后续仍可能再次发送；中断恢复产生的实际 HTTP 请求次数可超过四次。只有明确的永久错误或已记录的可重试失败达到四次才进入 `failed_final`；人工重试会开启新一轮最多四次有结果的发送尝试。

同一 Webhook 的限速键是其规范化 URL 的 HMAC 摘要，避免以明文地址作为索引。领取事务统计 `hold_until > 当前时间` 的 `send_slots`，少于 20 格且目的地不在冷却才预留并进入 `processing`；无空位则把 `next_attempt_at` 至少推后到最早空位时间，不增加 `attempts`。每格固定保留至该次租约截止后的完整 60 秒，即当前参数下从领取起保留 90 秒；未发出、已完成、结果未知或进程退出均不提前释放。一个预留最多发一次请求，租约过期不能继续使用；恢复领取必须新建预留。Worker 只清理 `hold_until <= 当前时间` 的格，重启不能清空它们。

该保守规则覆盖领取与发送之间的延迟：发送必须在租约内开始，因此从任何实际请求开始到其后 60 秒，该请求对应的格始终有效；同时最多 20 格，故任意滚动 60 秒本地开始的 HTTP 请求最多 20 次。验收按 Adapter 实际调用时刻计数，不能用预留时间代替。它限制的是本地发起请求，不能控制网络到达远端的时间；保守占用也意味着吞吐可能低于 20 次/分钟。

收到 HTTP 429、`45009` 或带有效 `Retry-After` 的可重试响应时，以响应接收时间计算目的地共享冷却。429 和 `45009` 的最早截止为接收时间加 60 秒；`Retry-After` 的秒数相对接收时间计算，HTTP 日期按绝对时间解析，取有效要求与既有 `blocked_until` 的最大值后事务写入 `destination_cooldowns`。可重试的其他响应仅在确有有效 `Retry-After` 时增加共享冷却；不推断企业微信必有该头。冷却观测即使来自过期租约，也只能延长目的地冷却，不能据此覆盖新租约的任务结果。同一 URL 的全部 Target、首次发送、自动重试及人工重试都受冷却约束，重启继续读取；已在途请求可完成，其他目的地不等待它。

各任务的最早重试时间为基础退避和本次有效 `Retry-After` 要求的最大值；领取及发送前再应用共享冷却和配额。冷却被其他任务延长时也必须生效，不能只在最初失败时写一次 `next_attempt_at`。只因等待而未发出的任务不增加 `attempts`，已经收到限流响应的实际发送仍计一次失败尝试。人工重试不删除配额或缩短共享冷却。

WeCom Adapter 发 `markdown_v2` 请求，只有 HTTP 2xx 且 JSON `errcode === 0` 才返回成功。先识别响应体中的已知业务码：`-1` 可重试，`45009` 按限流处理且至少等待一分钟；目标失效或群配置错误（如 `93000`、`93001`、`93004`）及确定的参数错误（如 `40008`、`45002`）直接失败。其余情形中，网络超时、429、5xx 以及 2xx 但响应体缺失/无效可重试；其他 4xx 直接失败，2xx 中的未知非零业务码在预算内重试。`Retry-After` 只有确实收到且解析有效才生效，不假设企业微信会发送 HTTP 429。错误类别、HTTP 状态和数字业务码记录在 SQLite 中；应用日志中的错误信息只输出类别，不保存或输出响应体 `errmsg`。[企业微信机器人说明](https://developer.work.weixin.qq.com/document/path/91770)及[全局错误码](https://developer.work.weixin.qq.com/document/path/90313)是分类依据；具体机器人响应需在接入验收时核对。

## 数据保护与配置

部署文件按[产品方案的 YAML 结构](product-design.md#路由与投递语义)解析；所有命令通过 `--config <绝对路径>` 指定同一文件。正式字段约束如下：

| 字段 | 启动校验 |
| --- | --- |
| `server.publicBaseUrl` | 必填 HTTPS Origin，无用户名、查询、片段、路径或尾随斜线；决定 `issuer` 和 MCP 资源 URI。 |
| `server.listen` | 必填 `host:port`，只用于容器内 HTTP；不作为对外 URL 来源。 |
| `auth.initialAdminPassword` | 仅首次建库必填且非空；管理员已存在时忽略，并提示从 YAML 删除。 |
| `auth.allowedClientIds` | 非空、无重复的完整 HTTPS CIMD URL 列表；只允许这些 Client ID。 |
| `storage.sqlitePath`, `storage.encryptionKeyFile`, `storage.backupDir` | 必填绝对路径；数据库和备份目录可写，密钥文件可读且格式正确。 |
| `targets.<id>` | ID 唯一；初版 `channel` 只允许 `wecom-webhook`，`webhookUrl` 经以下规则验证并规范化为唯一的企业微信机器人 HTTPS 发送端点。 |
| `topics.<id>.targets` | Topic 与 Target ID 唯一；每个列表非空、不重复，且全部引用存在的 Target。 |

Webhook URL 先解析、验证再规范化：协议只允许 `https:`，主机只允许 `qyapi.weixin.qq.com`，路径必须为 `/cgi-bin/webhook/send`，端口只允许省略或显式 `443`。拒绝用户信息、fragment、无效百分号编码、重复或额外查询参数；解码后只能有一个名为 `key` 的非空参数，值不得包含空白或控制字符。规范形式固定为 `https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=<规范编码的值>`：使用统一 URL 查询编码器对解码后的值编码，主机小写且省略默认端口。同一 `key` 的可接受写法因此得到同一地址；含 fragment 的写法直接拒绝，不靠发送时自动丢弃。配置冻结、`Channel.prepare`、目的地快照和实际 HTTP 请求使用同一规范形式，`send_slots` 与 `destination_cooldowns` 的 `destination_digest` 也只由该值计算 HMAC。[Node URL 到 HTTP 选项的转换](https://nodejs.org/download/release/latest-v24.x/docs/api/url.html#urlurltohttpoptionsurl)说明不能把原始 URL 的所有字符视为请求目的地。

启动时一次性验证并冻结配置，未知字段也拒绝。新配置只在重启后生效；路由快照使旧任务不受配置变动影响。YAML 在仓库外只读挂载，初始密码成功建库后由部署人员从文件删除。测试通过注入 HTTP 发送 Adapter 指向本地假 Webhook，不在生产 YAML 中放开任意 Webhook 主机。

数据密钥文件是仅含 32 字节随机值的 Base64 文本，权限限制为服务端用户可读。启动后用 HKDF 按固定用途标签派生 AES-GCM 密钥、OAuth Adapter 索引 HMAC 密钥、Webhook 限速键 HMAC 密钥和 Cookie 密钥。每个字段加密使用新的 96 位随机 nonce，并把表名、记录 ID、字段名作为 AAD；密文格式含版本、nonce、认证标签。解密或 `key_check` 验证失败时停止相关操作，不以空内容继续发送。密钥轮换初版不提供在线命令，但密文版本为后续迁移留下识别能力。含凭据的 YAML 和密钥文件须与数据库备份分别安全保存。

应用日志只写通知/任务 ID、Topic、状态、尝试次数、人工重试操作时间与白名单错误类别，不输出 HTTP 状态码或远端业务码。HTTP 请求日志应屏蔽 `/token`、登录表单参数、Authorization Header 与 Webhook 请求 URL；OAuth Provider 自带错误页也不能回显凭据。维护命令输出只显示元数据，不解密消息内容。服务端对外通用错误不暴露 SQLite 路径、密钥文件路径或原始异常消息。

## 备份、恢复与维护命令

服务进程每天执行一次 SQLite 在线备份：先写备份目录的临时文件，完成后校验 SQLite `integrity_check` 和 `key_check`，再原子改名为带 UTC 时间与唯一 ID 的文件，不覆盖已有备份；自动与手动在线备份共用此规则，新备份成功后才清理旧备份，仅保留最近 7 份。`maintenance_state` 记录上次成功日期，重启后补做遗漏的当日备份。备份失败只产生脱敏的结构化告警，不删除既有备份。主库的 90 天保留期清理每日运行；备份按份数保留，不保证主库清理后固定 7 天内删除历史密文，连续备份失败或停服可延长副本年龄。恢复时保全的旧文件集合不参与自动备份轮换；运维确认恢复验收通过且无需回退后，整组删除保全目录。持久化恢复标记仍引用该目录时不得清理；清理副本不能影响当前数据库及配套数据密钥。

镜像入口支持以下短暂执行的服务端维护命令，不提供远程 MCP 管理工具：

```text
noticeflow serve
noticeflow tasks list [--status <status>] [--received-from <UTC-time>] [--received-before <UTC-time>] [--notification <id>]
noticeflow tasks show <delivery-id>
noticeflow tasks retry <delivery-id>
noticeflow auth reset-password
noticeflow backup create
noticeflow backup list
noticeflow backup restore <backup-file>
```

`tasks list` 的时间参数按通知接收时间筛选，使用 ISO 8601 UTC；起点包含、终点不包含，可与状态或通知 ID 条件组合。`tasks retry` 只接受仍存在的 `failed_final` 任务，原子检查容量并重新入队；不会同步发送。`auth reset-password` 仅在停服并取得排他维护锁后，从交互终端读两次密码，不收命令行明文；持锁至密码与授权撤销事务完成且连接关闭。`backup create` 可在服务运行时执行。所有命令使用与服务相同的 YAML、数据库卷和密钥文件。

服务和普通数据库维护命令（查询、任务重试、在线备份等），在打开 SQLite 前取得同一个本地文件锁的共享锁并持有至连接关闭；`backup restore` 与 `auth reset-password` 必须先停服，再取得该锁的排他锁，若仍有共享持锁者或其他排他命令则直接拒绝操作。锁文件放在数据目录中且不随数据库替换，不删除或重建仍在使用的锁文件；锁由操作系统在进程退出时释放。恢复过程中保留同目录的持久化恢复标记；普通启动及维护命令发现该标记就拒绝打开数据库，仅恢复命令可持排他锁继续完成或回退。

恢复顺序如下；临时恢复库、保全目录、标记和目标路径位于同一本地数据文件系统，可从独立备份卷复制输入。保全副本、标记和关键重命名须同步文件及目录，不能只依赖 SQLite 事务保护文件替换：

1. 在独立临时路径复制指定在线备份，校验 `integrity_check` 与 `key_check`。删除其中全部登录会话与 OAuth 授权工件，写入恢复后发送暂停标识，再提交、checkpoint 并正常关闭；替换文件本身必须包含这些更新，不能遗留在临时 WAL 中。失败时不替换当前数据库。
2. 在移动当前文件前写入恢复标记，记录执行阶段、临时库和旧文件保全目录的位置。完整复制并同步当前主文件与存在的 `-wal`、`-shm`，再将标记推进到原文件保全完成阶段；该副本随后不再覆盖。若旧库可读，保全后通过 SQLite 读取其未结束的目的地冷却，与临时库逐项取最大值后提交、校验、checkpoint 并正常关闭和同步主文件。旧库损坏时仍保全原集合，记录冷却只能恢复到备份时点，供运维核对，不能先删 WAL 尝试修复。
3. 确认全部连接关闭且原文件集合已完整保全后，清除活动路径的旧主文件及侧文件，使其不残留旧 `-wal`、`-shm`；保全副本保持不动，再原子重命名准备好的临时主文件到配置路径。持排他锁重新打开并校验指定备份状态、密钥及授权撤销结果，正常关闭后才能清除恢复标记并释放锁。原文件集合保留用于回退；不能将它的 WAL 配给新库。
4. 若任一步中断，保留恢复标记，后续恢复命令依据标记与已落盘文件完成替换或还原整个旧文件集合；恢复完成前禁止服务启动，不能仅删标记或只还原主文件。无论完成替换还是回退，允许启动前仍须校验完整性及密钥、撤销授权工件并写入恢复暂停标识；失败则继续保留标记。

SQLite 官方明确提示 [WAL 属于持久状态](https://www.sqlite.org/wal.html#the_wal_file)，[主文件与热日志错配](https://www.sqlite.org/howtocorrupt.html#_mispairing_database_files_and_hot_journals)可导致损坏。以上流程不要求损坏旧库先成功 checkpoint，也不会把删除旧 WAL 当作恢复手段。恢复会回退任务状态，运维人员需先核对可能重复投递的 `processing` 和待处理记录。Worker 每次从已恢复数据库启动后的首个 60 秒不发送，再清除恢复暂停标识；中途重启则重新等待完整 60 秒，恢复标识未清除前不能绕过。备份中的配额及冷却仍生效，可读旧库的更晚冷却不得缩短；若旧库不可读，无法推断备份之后的远端冷却要求，需由运维核对后启动。

## 部署与验证

Docker 镜像采用 Node 24 多阶段构建，安装并锁定原生 SQLite 扩展，运行阶段以非 root 用户启动。挂载 `/data`、`/backup` 可写卷、只读 YAML 和只读数据密钥文件；只发布内部 HTTP 端口。容器内 `/healthz` 仅返回进程、数据库可用性与 Worker 运行状态，不含秘密；外部代理不必公开它。Nginx 必须把公开 Host 和 HTTPS 方案正确传给 OAuth Provider，覆盖而非透传客户端伪造的转发头，并限制容器端口仅代理可访问。Provider 的代理信任开关只有在此前提成立时启用；对外 URI 始终使用 `publicBaseUrl`。

按风险顺序实施和验收：

1. **协议与授权探针**：启动最小 MCP 工具和 OAuth Provider，验证 2026-07-28 SDK、CIMD 白名单、PKCE、资源受众、原生类型受限适配、Claude Code 随机 loopback 端口及 HTTPS 回调精确匹配、刷新令牌轮换及滚动 30 天有效期、令牌撤销。回调路径/查询变更、主机替换、未列出的主机和非原生客户端套用端口例外必须拒绝；授权码兑换时改变原始端口也必须拒绝。仅授予 `notification:submit` 时断言签发刷新令牌；用可控时钟在第 13、26、39 天刷新，断言浏览器会话结束后仍能刷新、Grant 的 Payload 与存储截止时间同步延长，最后一次刷新后超过 30 天则拒绝；续期失败不返回有效新令牌。分别用 Claude Code、ChatGPT 自定义连接完成真实工具调用。若目标 Host 使用旧协议，明确 SDK 可支持的兼容方式后再铺开业务实现。
2. **接收与持久化**：用可控时钟及 SQLite 临时库验证输入白名单、UTF-8 字节数、双 Target 原子扇出、1000 条容量边界、每 Client 调用限速、事务提交前后故障及明文不落库。Webhook 校验覆盖主机大小写、默认端口及等价查询编码归一，拒绝 fragment、用户信息、重复/额外参数、无效编码和非默认端口；相同机器人规范化后共用快照、发送地址及目的地标识。
3. **投递与恢复**：用本地假 Webhook 验证响应体业务码、超时/重试、进程在请求前后退出、租约到期、人工重试及 90 天清理。在领取与实际发送间注入延迟并跨越 60 秒边界，以 Adapter 实际开始调用时刻验证四并发下任意滚动 60 秒不超过 20 次；覆盖过期租约禁止发送、旧预留保留至 `hold_until`、重启。两个 Target 共用 Webhook A，A 返回 `45009` 或 HTTP 429 加 `Retry-After: 120` 时，尚未发送的 A 任务共同等待，独立 B 继续；覆盖冷却延长、重启、人工重试及已在途响应。等待不耗尝试次数，已发生的限流响应计一次；请求前崩溃不消耗预算，请求后结果未提交可重复发送。
4. **运维与镜像**：验证任务列表按通知接收时间筛选、停服密码重置后旧密码及所有旧授权工件失效、在线备份、密钥不匹配拒绝、日志只输出允许字段及 Node 24 镜像启动。恢复覆盖正常停服、强制退出后非空 WAL、其他维护命令持锁、逐步故障注入及中断重入；断言恢复标记存在时启动拒绝、旧文件集合完整可回退、指定备份状态正确、撤销工件未留在临时 WAL、恢复后暂停与更晚目的地冷却生效。补充服务及其他数据库命令持锁时拒绝重置、重置期间拒绝启动、事务中断后密码与工件同时回滚、重启后旧授权不能重新写回的验收。以连续备份失败验证旧备份保留与告警，新成功备份按最近 7 份清理；恢复标记引用的副本不得删除，验收后由运维整组清理。再以真实企业微信机器人做一次受控发送，确认 `markdown_v2` 格式和响应分类。

实施完成的门槛是上述自动化测试通过，且两个目标 Host 能完成 OAuth 登录、`tools/list`、`submit_notification` 和刷新后的再调用。具体公网域名、CIMD URL、Nginx 路由和日志监控规则属于部署取值；不改变本文的接口及存储语义。
