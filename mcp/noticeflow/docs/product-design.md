# Noticeflow 初版产品方案

状态：初版产品方案已确认，首版服务端实现及本地自动化验证已加入仓库。Linux/arm64 容器已通过构建、启动、运行时配置的健康检查及持久卷重启验证。公网部署、两个真实 Host、真实企业微信及容量下维护延迟验收仍待完成；本文的完成门槛尚未全部满足。

## 背景与目标

Noticeflow 把一条已准备好的通知通过 MCP 提交给服务端，再按 Topic 路由到一个或多个推送目的地。原始[讨论记录](https://chatgpt.com/share/6ad46175-b074-83ec-978f-5afe48d47119)提供思路，本方案只采用后续讨论确认的决策。

初版成功标准：现成 MCP Host 使用自己的通用 MCP Client 连接 Noticeflow Server，发现并调用通知工具；服务端持久化通知与投递任务，随后通过配置的渠道投递，并在统一的 90 天保留期内提供成功与最终失败记录。GPT/dots 如何发现、生成或获取通知内容不在本产品范围内。

## MCP 产品形态与边界

按 MCP 的[架构规范](https://modelcontextprotocol.io/specification/2026-07-28/architecture/index)，Host 管理连接和工具调用，每个 MCP Client 实例与一个 Server 通信；Server 暴露工具等能力。Noticeflow 交付远程 MCP Server，不要求 Host 安装 Noticeflow 专用 Client。Host 获得服务端端点和凭据后，使用其通用 Client 按[Streamable HTTP](https://modelcontextprotocol.io/specification/2026-07-28/basic/transports/streamable-http)连接，通过 `tools/list` 发现工具，再以 `tools/call` 提交通知。服务端地址、凭据及调用授权由接入该服务的 Host 管理。

| 范围内 | 初版范围外 |
| --- | --- |
| 远程 MCP Server、工具契约与标准 Client 互操作验收 | Noticeflow 专用 Client CLI、Client 库或自建 Host |
| Topic 路由、目标快照、SQLite 持久化、异步投递与有限重试 | GPT/dots 或其他上游如何发现、生成、获取通知内容 |
| 企业微信机器人 Webhook 服务端渠道组件 | SMTP 邮件渠道、多租户、多实例部署、动态配置管理界面 |
| 服务端失败记录、运维告警与维护重试入口 | 附件、图片、@提及、内容截断或自动拆分 |
|  | MCP 状态查询工具、MCP 重试工具、stdio 服务端入口 |

初版面向单用户、单实例。渠道的可插拔性表现为服务端代码模块注册：新增渠道需部署新版本，不改变 MCP 工具参数。若未来确有脚本或程序调用需求，再分别评估独立 CLI 或 Client 库；它们不是 MCP Server 交付的前置条件。

初版同时以 Claude Code 与 ChatGPT 的自定义 MCP Server 连接作为验收目标，不包含 ChatGPT 插件公开提交。两者通过通用 MCP Client 接入同一个 Streamable HTTP Server。[Claude Code](https://code.claude.com/docs/en/mcp)与 [ChatGPT](https://developers.openai.com/plugins/deploy/connect-chatgpt)的 OAuth 接入方式不同，但均支持按标准流程发现授权信息。ChatGPT 从云端访问 Nginx 对外提供的公网 HTTPS 地址；账号和工作区策略仍可能限制自定义连接。[ChatGPT 鉴权文档](https://developers.openai.com/plugins/build/auth)不支持由 ChatGPT 提供自定义 API key，因此 `submit_notification` 对两个 Host 统一使用 OAuth 2.1 用户授权；初版不提供 API key 鉴权模式。

## 端点与授权边界

Nginx 负责公网 HTTPS 终止及请求转发，不在本项目实现；Noticeflow 进程只监听内部 HTTP。外部完整 MCP 地址为 `https://<域名>/mcp`，实际域名由部署配置指定。进程中的 MCP 资源服务器校验每个请求的 Bearer 令牌及 `notification:submit` 权限；未授权请求通过 `401` 和 `WWW-Authenticate` 指向受保护资源元数据。按 [MCP 授权规范](https://modelcontextprotocol.io/specification/2026-07-28/basic/authorization)，客户端据此发现同一进程内置的 OAuth 2.1 授权服务器，再进行授权码加 PKCE 登录。对外还需转发 `/.well-known/oauth-protected-resource/mcp`、`/.well-known/oauth-authorization-server` 与授权、令牌等 HTTP 路径；不能只转发 `/mcp`。

单进程同时承担 MCP 资源服务器、内置 OAuth 授权服务器和投递任务处理。外部 HTTPS 基址作为显式配置，用于生成 issuer、资源标识、元数据和回调地址，不能从未经验证的代理请求头推断。授权服务器发布发现元数据，校验 OAuth Client 身份及回调地址，签发只针对本 MCP 资源的访问令牌。MCP SDK 负责协议与资源端鉴权辅助；[SDK 不负责签发令牌](https://github.com/modelcontextprotocol/typescript-sdk/blob/v2.3.1/docs/serving/authorization.md)，令牌签发能力需在本次服务端开发中实现或集成合适的库。

初版只有一个管理员账号，不开放注册。首次部署从服务端 YAML 配置读取管理员初始密码，服务端将密码哈希保存到 SQLite；初始化后不再用 YAML 中的初始密码覆盖数据库，部署人员应删除该字段。用户在 Noticeflow 的网页授权页输入密码并同意 `notification:submit` 权限。管理员通过同一镜像内的服务端维护命令重置密码；重置时撤销已有登录会话与 OAuth 令牌，不提供邮件找回。授权服务器优先使用 [Client ID Metadata Documents（CIMD）](https://modelcontextprotocol.io/specification/2026-07-28/basic/authorization/client-registration)识别 Claude Code 和 ChatGPT：仅接受服务端配置白名单中的 Client ID，获取并验证对应 HTTPS 元数据及回调地址；初版不开放动态客户端注册（DCR）。

HTTPS 回调与元数据精确匹配；已确认身份的原生客户端使用 HTTP loopback 回调时，仅允许端口变化，协议、主机、路径和查询仍须匹配元数据中的同一条地址。按 [RFC 8252](https://www.rfc-editor.org/rfc/rfc8252#section-7.3)支持 loopback IP 的动态端口；Claude Code 官方 Client ID 还允许其元数据明确列出的 `localhost` 回调使用动态端口，以适配[默认随机端口行为](https://code.claude.com/docs/en/mcp#configure-a-fixed-oauth-callback-port)。不能把 `localhost`、`127.0.0.1` 或其他主机相互替换，也不做 URI 前缀匹配。授权码兑换时仍须提交与该次授权请求完全相同、包含实际端口的回调地址。Provider 对原生客户端的识别及受限适配必须由接入探针验证，不能仅凭 Client ID 在白名单内就放宽任意回调。

授权码流程使用 PKCE `S256`。管理员同意 `notification:submit` 后，授权码兑换同时签发 15 分钟有效的访问令牌与 30 天有效的刷新令牌，不要求额外的 `offline_access` scope。刷新令牌每次使用时轮换，新令牌从该次轮换起有效 30 天；对应 Grant 的有效期同步延长，不能早于本次签发令牌的最晚过期时间。浏览器登录会话结束不撤销这项持续授权；连续 30 天未刷新则过期，Host 需重新引导用户登录，不能仅凭仍存在的 Grant 恢复过期令牌。失效、撤销及登录会话状态保存在 SQLite。服务端持久化令牌校验材料而非明文令牌；每次 MCP 请求校验令牌有效期、资源受众与权限。授权记录与投递记录可存于同一 SQLite 数据卷，但分表管理；密钥和令牌不得写入日志。

## 完整调用链

```text
已准备好的 topic/title/content
    → 接入方 Host：管理通用 MCP Client、端点、鉴权与调用授权
    → Noticeflow Server：submit_notification 校验与 Topic 路由
    → SQLite：通知和每个 Target 的投递任务在一次事务中持久化
    → MCP 工具返回业务结果 accepted 与通知 ID
    → 服务端投递任务：按渠道发送、有限重试、记录最终结果
    → 企业微信机器人 Webhook
```

`accepted` 是通知领域的接收结果，不是渠道已送达，也不是 HTTP 传输层的 `202 Accepted`。MCP 2026-07-28 版以逐请求元数据和 `server/discover` 支持版本及能力发现；服务端使用官方 SDK 实现协议，不自建通用协议栈。是否同时支持旧版 Host 的协议握手需在实施前以目标 Host 验证。[版本说明](https://ts.sdk.modelcontextprotocol.io/v2/protocol-versions)

## MCP 工具契约

初版只暴露一个工具：`submit_notification`。工具输入为三个必填字符串：

| 字段 | 含义 |
| --- | --- |
| `topic` | 精确匹配的路由键，由服务端配置映射到 Target |
| `title` | 单行纯文本通知标题 |
| `content` | 企业微信 `markdown_v2` 可完整表达的 Markdown 内容 |

初版 `content` 允许标题、强调、列表、引用、链接、分隔线、代码和表格；图片、原始 HTML、@ 提及及颜色语法不接受，也不静默删改。发送时把转义后的 `title` 作为 `# 标题` 放在消息开头，再附上 `content`。对加入标题后的最终消息按 UTF-8 字节数校验 4096 上限；超限或出现不支持的语法时整条拒绝。

服务端对已认证 Client ID 的 `submit_notification` 调用按滚动 60 秒限流，每个 Client 最多 120 次；超限返回可重试的 `RATE_LIMITED` 错误，不写入通知或任务。该入口限流计数保存在进程内，重启后清零。通过限流后，服务端解析 Topic 所有 Target，再对每个渠道的内容能力、目标配置与必要参数做接收前校验。未知 Topic、无可用 Target、任一渠道不能完整处理内容，均拒绝整条通知，不持久化部分投递任务。单实例未终结投递任务（待处理、处理中和等待重试）上限为 1000 条；若接收本次全部 Target 后将超过上限，也在同一接收事务中拒绝，并返回可重试的队列繁忙错误。服务端只在通知及全部投递任务成功提交 SQLite 事务之后，返回 `status: accepted` 与 `notificationId`。`accepted` 仅表示已经可靠接收，不表示任何渠道已送达。

相同参数的重复调用是两条不同通知，不按内容去重；Host 在不确定前一次调用是否被接收时重试，可能产生两条通知。初版不提供 MCP 查询投递状态或重试工具。

## 路由与投递语义

Topic 与配置键精确匹配；一个 Topic 可以对应多个 Target，并向它们扇出。每个 Target 包含渠道类型与具体接收目的地。接收时固定本次通知的 Target 列表及具体群机器人目的地；之后的配置变更只影响新通知。企业微信 Webhook 只接受官方 HTTPS 发送端点及唯一、非空的 `key` 参数，拒绝用户信息、fragment、额外参数及非默认端口。启动校验后统一规范化地址；目标快照、实际发送、配额和冷却都使用该规范化目的地，同一机器人不能因地址写法不同获得多套限额。Topic、Target、渠道设置和企业微信机器人 Webhook 地址均写在服务端 YAML 文件中；启动时完整校验，初版通过重启使新配置生效。该 YAML 还含管理员初始密码，是明文凭据部署文件；留在仓库外，以只读方式挂载，并限制读取权限，不能打印到日志或纳入公开构建产物。

初版 YAML 的结构草案如下，尖括号内容仅为部署占位符。`publicBaseUrl` 是对 Host 公布的 HTTPS 基址；`listen` 是 Nginx 可访问的容器内 HTTP 地址。`allowedClientIds` 使用目标 Host 实际发布的完整 CIMD URL；Topic 引用 Target ID，多个 Topic 可复用一个 Target。

```yaml
server:
  publicBaseUrl: https://notice.example.com
  listen: 0.0.0.0:3000
auth:
  initialAdminPassword: <INITIAL_ADMIN_PASSWORD>
  allowedClientIds:
    - <CHATGPT_CIMD_URL>
    - <CLAUDE_CODE_CIMD_URL>
storage:
  sqlitePath: /data/noticeflow.sqlite
  encryptionKeyFile: /run/noticeflow/data-key
  backupDir: /backup
targets:
  operations:
    channel: wecom-webhook
    webhookUrl: <WEBHOOK_URL>
topics:
  build-failure:
    targets: [operations]
```

接收时把每个 Target 的具体目的地与渠道类型快照写入 SQLite；Webhook 地址、通知标题和正文使用同一份单独挂载文件中的数据密钥加密后入库，密钥不写入 YAML。采用带完整性校验的逐记录加密，并为每条密文使用独立随机数；密钥版本随记录保存，以便未来迁移。密钥丢失会使通知内容、尚未投递的目标快照及数据库备份无法恢复，因此备份必须配套保存可恢复的密钥，并保护含凭据的 YAML 备份。数据库与备份所在卷的访问权限也需限制。

存储按职责划分为通知、投递任务、授权与登录状态三组表；同一份 SQLite 数据库即可，不需要额外队列服务。通知记录保存 ID、Topic、加密后的标题与正文、接收时间；每条投递任务保存通知 ID、Target ID、渠道类型、加密后的目的地快照、状态、已尝试次数、下次执行时间、处理租约、最近一次失败的非敏感错误分类及完成时间。授权记录保存管理员密码哈希、已授予权限的 Client 身份、授权码、令牌校验材料、授权和登录会话状态；允许接入的 Client ID 白名单仍来自 YAML。授权码、令牌及密码不明文落库。投递任务与通知在一次事务中创建，完成状态和重试计划也经 SQLite 事务更新。

SQLite 数据库放在单实例可写的本地持久化卷。`accepted` 必须在通知和全部投递任务的事务提交后返回；若采用 WAL 模式，使用 `synchronous=FULL` 保持断电后的提交持久性。[SQLite WAL 与同步设置](https://www.sqlite.org/pragma.html#pragma_synchronous) 主库中成功与最终失败的投递记录均从各自进入终态的时间起保留 90 天，然后自动清理；仍待处理或等待重试的任务不按年龄清理。某条通知的全部投递记录都已清理后，连同通知内容一并清理；不提供额外的失败关闭状态。服务端每天通过 SQLite 在线备份生成一份备份，自动及手动生成的在线备份共用最近 7 份的保留规则。只有新备份成功后才淘汰旧备份，失败时保留最后可用副本并告警，因此不承诺备份中的历史密文在主库清理后 7 天内删除。备份写入独立于主数据库卷的受保护位置；恢复时另行保全的旧文件集合由运维确认无需回退后整组删除，不计入在线备份的 7 份限额。

每个 Target 对应一条独立投递任务。投递任务具有待处理、处理中、等待重试、成功和最终失败状态；首次发送得到可重试失败结果后最多重试 3 次，延迟分别为 1、5、15 分钟，故最多记录 4 次有结果的发送尝试。网络超时算作有结果的失败尝试；进程中断造成的结果未知不消耗此预算，租约到期后继续处理，因此实际 HTTP 请求可能超过 4 次。网络超时、HTTP 429 和 5xx 视为可重试；若收到有效 `Retry-After`，下次发送不得早于它指定的时间和既定退避时间。不能假定企业微信一定使用 HTTP 429 或提供 `Retry-After`。配置错误及确定的永久拒绝直接标记最终失败。最终失败记录保留错误分类与尝试次数，并输出结构化失败日志，由部署环境的日志监控触发运维告警。

同一 Webhook 的全部 Target、首次发送、自动重试和人工重试共用持久化配额，任意滚动 60 秒内本地开始的 HTTP 发送请求不超过 20 次。初版采用保守预留：从领取任务起占用一格，直到该次租约截止后的完整 60 秒才释放，即使尚未发出、已完成或进程退出也不提前释放；发送只能在有效租约内开始。该策略可能降低吞吐，但不能通过提前释放预留突破限额。发送前还须检查租约、超时余量和目的地冷却；仅因等待配额或冷却而未发请求，不消耗尝试预算。

收到 HTTP 429、企业微信 `45009` 或带有效 `Retry-After` 的可重试响应时，服务端为同一 Webhook 持久化共享冷却截止时间，只能延长已有冷却。429 和 `45009` 至少冷却 60 秒，有效 `Retry-After` 要求更久时以更久为准。冷却期间不再向该目的地发起新请求，已在途的请求可完成；其他目的地继续处理。重启不能清除配额或冷却，人工重试也不能绕过它们；各任务自己的退避时间仍独立生效。

任务开始处理时，服务端在 SQLite 中取得有期限的处理租约。进程中断或重启后，未过期的租约等待到期，过期任务重新进入处理，不仅因租约过期而标记最终失败；外部发送成功但状态尚未提交的任务可能再次发送。每次发送的请求超时必须短于租约，避免正常运行时同一任务并行投递。对同一投递任务的人工重试使用原先固定的 Target 快照，且只能从最终失败状态重新入队；重试后仍受单 Webhook 限速与队列容量约束。

渠道调用与 SQLite 提交无法构成跨系统事务，因此对尚未取得确定终态的任务持续恢复发送尝试：渠道已收到、但服务端尚未记录成功时发生中断，后续重试可能造成重复推送。永久错误及重试预算耗尽仍会形成最终失败，不承诺每条通知都成功送达。运维记录必须能区分通知与各 Target 的投递结果。

### 服务端维护命令

同一服务端镜像提供维护命令，不另行交付 Client、CLI 应用或常驻进程。命令仅在服务端部署环境执行，使用同一 SQLite 数据卷和密钥文件：

- 按状态、通知接收时间范围或通知 ID 列出任务，并按投递任务 ID 查看最终失败原因、尝试次数和时间；输出不含标题、正文、Webhook 地址或凭据。
- 按投递任务 ID 将一条最终失败任务重新入队；记录操作时间与结果，不直接调用 Webhook。
- 停止服务后交互式重置管理员密码；命令必须先取得数据库排他维护锁，服务或其他数据库命令仍在运行时拒绝重置。更新密码哈希并撤销全部登录会话及 OAuth 授权工件后才允许重新启动，避免旧授权流程在重置后写回令牌；密码不得作为命令行参数或写入日志。
- 手动触发 SQLite 在线备份、列出备份，并从指定备份恢复。恢复须停止服务并取得排除所有数据库访问命令的维护锁，完整保全旧数据库及其 `-wal`、`-shm` 文件；不能只覆盖主文件或先删旧 WAL。指定备份先在独立路径校验密钥与完整性、撤销全部登录会话和 OAuth 授权工件，再正常关闭并替换。恢复期间保留持久化标记；中断后必须完成或回退恢复，不能直接启动服务。该动作会回退任务状态，因此启动前先核对可能重复投递的任务；恢复后的首个 60 秒不发送，并保留可读取旧库中尚未结束的目的地冷却。

唯一常驻进程仍是 Server。每日自动备份由该进程执行，维护命令只在人工运行时短暂启动。应用日志仅记录通知 ID、Topic、投递任务 ID、状态、尝试次数、人工重试操作时间和非敏感错误分类；不得记录通知标题、正文、完整 Webhook URL、管理员密码、OAuth 令牌或数据密钥。

## 初版渠道

初版仅实现企业微信机器人 Webhook 渠道：Target 指向固定群机器人地址，发送内容使用 `markdown_v2`。SMTP 邮件留待后续版本。渠道的可插拔接口仍由服务端维护，后续增加渠道不改变 MCP 工具参数。

渠道组件由服务端注册，负责校验自己的配置与内容能力、转换内容、执行发送并返回结果。服务端路由与任务处理不包含某个渠道专有的发送逻辑。目标快照与失败记录可能涉及地址和渠道凭据；实现必须保护这些值，不能把密钥写入日志或工具响应。

按[企业微信机器人官方文档](https://developer.work.weixin.qq.com/document/path/91770)，`markdown_v2` 的完整消息内容不得超过 4096 个 UTF-8 字节；接收前校验应按加入标题后最终发往 Webhook 的内容计算。每个消息推送每分钟不超过 20 条，队列发送与重试共用同一限额。旧版企业微信客户端可能将 `markdown_v2` 消息显示为纯文本。

发送结果同时检查 HTTP 状态与 JSON 响应体的 `errcode`，只有 `2xx` 且 `errcode=0` 才判成功；响应体缺失或无法解析不能判成功。[企业微信全局错误码](https://developer.work.weixin.qq.com/document/path/90313)要求依据 `errcode` 而非 `errmsg` 判错。`-1` 系统繁忙可按重试预算处理；`45009` 表示可能触发接口调用限制，至少等待一分钟并遵守本服务的限速；`93000`、`93001`、`93004` 等 Webhook 或群配置错误，以及 `40008` 消息类型错误、`45002` 内容超限，按确定的永久失败处理。机器人发送接口文档没有逐项保证这些业务码与 HTTP 429 的对应关系，具体响应仍需通过目标接口验收。

## 交付与目录

```text
mcp/noticeflow/
├── README.md / README.zh-CN.md
├── CHANGELOG.md / CHANGELOG.zh-CN.md
├── GLOSSARY.md
├── docs/
│   ├── product-design.md
│   ├── research-mcp-project-layout.md
│   └── adr/
├── apps/
│   └── server/                  # 远程 MCP 服务、SQLite、任务与渠道；容器镜像
└── tests/e2e/                   # 标准 MCP Client 调用与投递链路验收
```

`apps/server` 是初版唯一运行交付物：一个常驻进程、一个容器镜像，同时处理 MCP HTTP 请求、内置 OAuth 授权和 SQLite 投递任务，并持有 SQLite 数据卷。维护命令使用同一镜像临时运行。MCP 工具入口固定为 `/mcp`；Host 配置包含 `/mcp` 的完整外部 HTTPS URL。`tests/e2e` 使用标准 MCP Client SDK 验证互操作性，不发布为产品客户端。镜像仓库和版本发布节奏尚未确定。初版不建立 `apps/client`、`apps/cli`、`packages/client` 或 `packages/shared`。

本仓库根 `docs/` 只放仓库维护规则，Noticeflow 的产品设计及后续产品文档留在 `mcp/noticeflow/docs/`；服务端渠道组件留在 `apps/server` 内，不属于根 `plugins/`。

## 验收场景

1. 标准 MCP Client 配置端点并完成工具发现与调用；Server 返回通知 ID 和 `accepted`，且数据库中已有通知及各 Target 的任务。
2. 一个 Topic 配置两个企业微信群机器人 Target 时，两条投递任务各自完成；渠道使用可控的替身验证，不依赖真实外部发送。
3. 未知 Topic、空必填值、非法 Markdown 或最终消息超过 4096 字节时，工具返回明确错误，数据库中没有部分接收的通知；每 Client 滚动 60 秒超过 120 次调用时返回 `RATE_LIMITED`，队列超过 1000 条时拒绝新通知，已有任务继续处理。
4. 相同输入调用两次产生不同通知；接收后修改路由配置不改变旧通知的目的地。
5. 重启服务后待处理任务及过期处理租约可继续；请求前崩溃不耗尽重试预算，请求后崩溃可能重复投递。在领取后注入延迟并跨越 60 秒边界、重启服务或人工重试时，同一 Webhook 实际开始的发送请求仍不超过每滚动 60 秒 20 次；同一机器人的可接受 URL 写法规范化后共用目的地标识，fragment、额外或重复参数被拒绝。两个 Target 共用 Webhook A 时，A 的限流响应使它们共同冷却，独立 Webhook B 继续发送，等待不耗尝试次数。网络超时、429、5xx 和企业微信可重试业务码按规则重试，永久错误直接失败，HTTP 200 但非零 `errcode` 不误判成功。最终失败留有记录与结构化日志，部署环境能据此告警；服务端维护命令可按通知接收时间筛选、查看并重新入队。主库终态记录按 90 天清理，未完成任务不清理；新备份成功后仅保留最近 7 份，连续失败时保留最后可用备份并告警，恢复保全副本不被自动轮换删除。
6. Claude Code 和 ChatGPT 自定义 MCP Server 分别经公网 HTTPS 地址完成 CIMD 识别、管理员 OAuth 登录、工具发现与调用，并可在访问令牌过期后刷新。仅授予 `notification:submit` 也获得刷新令牌，浏览器会话结束后仍可刷新；持续刷新跨越最初 30 天仍有效，最后一次刷新后连续 30 天未使用则失效。Claude Code 的随机端口回调可用；未知 Client ID、回调路径/查询变更、未列出的主机、HTTPS 回调端口变更及授权码兑换时端口变更均被拒绝，已撤销令牌不能使用。
7. 数据库与备份不含明文标题、正文和 Webhook URL；日志与维护命令输出不泄露这些内容或凭据。服务或其他数据库命令运行时，密码重置被排他锁拒绝；停服重置完成并重启后，旧密码、会话、授权码、Grant、访问令牌和刷新令牌均不可用。也可在停服时用备份和对应数据密钥恢复数据库。正常停服、强制退出后遗留非空 WAL、恢复中途退出及维护命令并发均有验收；恢复后数据来自指定备份，原文件集合可回退，备份中的会话和令牌不得重新生效，未完成恢复时服务拒绝启动。

## 实施与接入校验

- 外部 HTTPS 域名及 Nginx 的路由、转发头和可达性配置；Nginx 不由本项目实现。
- Claude Code 与 ChatGPT 的目标版本和协议兼容范围；初版以当前规范作为设计依据，实际兼容性由互操作测试确认。
- YAML 校验规则、维护命令、渠道超时与业务错误分类已在[技术方案](technical-design.md)中设计；部署环境仍需确定具体的日志告警规则。

交付边界的理由见[架构决策](adr/0001-mcp-product-boundary.md)，开源案例见[目录调研](research-mcp-project-layout.md)。
