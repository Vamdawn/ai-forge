# Noticeflow Architecture

Noticeflow accepts prepared notifications through a remote MCP server and delivers them asynchronously to configured WeCom group robots. This document defines the current architectural boundaries and invariants. See the [README](../README.md) for operation, the [configuration example](../config.example.yaml) for configuration structure, and the [glossary](../GLOSSARY.md) for domain terms.

## Scope and boundaries

The runtime deliverable is one Node.js 24 and TypeScript server image, with one running instance, one administrator, and a local SQLite data volume. Existing hosts use their generic MCP clients; a dedicated Noticeflow client or skills plugin is not required. The host owns endpoint configuration, credentials, and permission to invoke tools. Generating notification content and triggering notifications when an upstream task finishes are host responsibilities.

The server owns OAuth authorization, notification acceptance, Topic routing, durable delivery tasks, retries, and maintenance. WeCom Webhook is the only channel. Multi-tenancy, multiple server instances, SMTP, attachments, API-key authentication, and remote MCP administration are outside the current boundary. Maintenance commands run temporarily from the same image against the same configuration, database, and key.

Keeping these responsibilities in one process lets acceptance and delivery coordination use local transactions without operating a separate queue. Channel-specific preparation and sending remain behind the `Channel` interface; another channel requires configuration validation, an adapter, and tests, rather than a host plugin or a change to the MCP tool fields.

## System overview

```text
Host's generic MCP client
          |
          v
External Nginx: HTTPS termination and trusted forwarding
          |
          v
Noticeflow process
  +-- MCP endpoint --> Authorization --> Submission --> SQLite
  +-- OAuth discovery, authorization, tokens, administrator consent
  +-- Worker <--> SQLite --> Channel adapter --> WeCom Webhook
  +-- Daily backup and retention maintenance
  +-- Private /healthz

Temporary maintenance command --> File lock --> SQLite and data key
```

| Boundary | Responsibility |
| --- | --- |
| [MCP handler](../src/http.ts) | SDK-managed protocol handling, tool discovery, structured results, and handler shutdown. |
| [Authorization](../src/auth.ts) | OAuth metadata, client and callback validation, administrator consent, resource and scope checks. |
| [Submission](../src/submit.ts) | Input validation, Topic resolution, channel preparation, and atomic acceptance. |
| [Store](../src/store.ts) | Short transactions for acceptance, leases, quotas, cooldowns, and authorization persistence. |
| [Worker](../src/worker.ts) | Delivery scheduling and result handling through the [Channel contract](../src/channel.ts). |
| [Maintenance](../src/maintenance.ts) | Backup, exclusive recovery, password reset, and metadata-only task operations. |

`server.publicBaseUrl` is the canonical HTTPS issuer, optionally including a deployment subpath; the MCP resource is `${publicBaseUrl}/mcp`. Public identifiers come from validated configuration, never untrusted request headers. Nginx preserves paths, replaces forwarded host, scheme, and source-IP headers, and prevents direct external access to the internal listener. An HTTP `Origin`, when present, must match the configured public origin.

OAuth and interaction routes follow the base path. Discovery inserts the well-known suffix before that path: a `/noticeflow` deployment uses `/.well-known/oauth-protected-resource/noticeflow/mcp` and `/.well-known/oauth-authorization-server/noticeflow`. The proxy forwards those exact root discovery paths without taking over unrelated site routes. `/healthz` stays at the container root and exposes only process, database, and Worker state.

The official MCP SDK handles Streamable HTTP, 2025 stateless handshakes and the 2026-07-28 protocol, and protocol errors; the server does not implement a parallel protocol stack. Dependency versions are pinned in the [server lockfile](../package-lock.json). Configuration is validated and frozen at startup, including rejection of unknown fields and invalid references; changes require restart.

Shutdown stops new ingress and delivery claims, closes MCP handlers to end active subscriptions, and drains HTTP requests and maintenance before closing storage. In-flight OAuth requests retain database access while draining. A bounded HTTP shutdown deadline prevents persistent connections from holding the process indefinitely; unresolved deliveries recover through their leases.

## Submission and delivery semantics

The only MCP tool is `submit_notification(topic, title, content)`. Its input is a strict object with three nonempty strings and no extra fields. `topic` exactly matches a configured routing key, `title` is single-line plain text, and `content` is supported Markdown. Tool discovery advertises available Topics, the external side effect, and non-idempotent behavior.

The WeCom adapter parses Markdown through a syntax-tree allowlist. Headings, emphasis, lists, quotations, links, separators, code, and tables are supported; images, HTML, mentions, task checkboxes, footnotes, and strikethrough are rejected. Links use HTTP or HTTPS. The complete prepared message, including the escaped title, must fit 4096 UTF-8 bytes. Unsupported content is rejected rather than truncated, split, or silently downgraded.

Acceptance follows this order:

1. Account for the authenticated client's call rate, then validate input and resolve all Targets for the Topic.
2. Prepare every channel plan without network I/O, fixing each destination and formatted message.
3. In one immediate SQLite transaction, check capacity and persist the Notification and every Delivery with encrypted content and plans.
4. Return `status: accepted` and `notificationId` only after the complete transaction commits.

Any invalid Target, unsupported plan, capacity failure, or database error prevents partial acceptance. The queue admits at most 1000 unfinished Deliveries across `pending`, `processing`, and `waiting_retry`. The separate ingress limit is 120 tool calls per authenticated Client ID per rolling minute; rejected business inputs count, and this in-memory counter resets on process restart.

Success is returned as both structured content and equivalent JSON text. Business failures return `isError: true`, a stable code, and a `retryable` flag: `INVALID_INPUT`, `UNKNOWN_TOPIC`, and `UNSUPPORTED_CONTENT` are not retryable; `QUEUE_FULL` and `RATE_LIMITED` are. Authentication failures use HTTP 401/403, protocol failures are handled by the SDK, and unexpected server failures expose no internal details.

`accepted` means durable reception, not channel delivery. Identical submissions create distinct Notifications, and a lost response can conceal a committed submission. Callers must not infer failure from a timeout and blindly resend. Once accepted, later routing changes do not alter the frozen Targets or messages. There is no atomic transaction spanning SQLite and WeCom: a successful external send followed by a crash before recording its result can produce a duplicate after recovery. Permanent errors and exhausted retries can still prevent delivery.

## Delivery scheduling

SQLite is the scheduling source of truth; timers only wake the Worker. Each Delivery progresses independently:

```text
pending --> processing --> succeeded
                 |
                 +-- retryable failure --> waiting_retry --> processing
                 +-- permanent failure or exhausted budget --> failed_final

processing -- expired lease --> waiting_retry
failed_final -- manual retry --> pending
```

At most four requests run concurrently. A claim assigns a random lease ID and a 30-second lease; request timeout is 10 seconds. Immediately before sending, the Worker rechecks lease ownership, strictly more than one timeout of remaining lease, quota reservation, and shared cooldown, then starts the request without an intervening asynchronous wait. Results update the Delivery only while the lease ID still matches, so stale results cannot overwrite a newer attempt.

The retry budget counts recorded outcomes, including network timeouts: at most four outcomes per automatic cycle, with 1, 5, and 15 minute backoffs after retryable failures. Expired leases represent unknown outcomes and do not consume that budget, so crash recovery can cause more than four actual requests. Waiting for quota or cooldown also consumes no attempt. Manual retry accepts only a final failure, checks capacity atomically, resets the cycle, and preserves the Delivery ID and original plan.

Quota and cooldown identity is an HMAC of the canonical Webhook URL. Configuration accepts only the official WeCom HTTPS endpoint with one nonempty `key` parameter, rejecting user information, fragments, extra parameters, and nondefault ports. Canonicalization prevents equivalent URL spellings or different Targets from obtaining separate limits for the same destination.

All initial sends, automatic retries, and manual retries share at most 20 persistent reservations per destination. Each reservation remains occupied until its original lease deadline plus 60 seconds, including completed, unsent, or interrupted attempts. One reservation permits one request, and an expired lease cannot send. Because a request must begin within its lease, its reservation remains occupied for at least 60 seconds after the actual start; the reservation cap therefore bounds actual local request starts in every rolling minute. This deliberately conservative rule can reduce throughput and does not control arrival times at the remote service.

HTTP 429, WeCom rate-limit code `45009`, and retryable responses with a valid `Retry-After` extend a persistent destination-wide cooldown. Rate-limit responses impose at least 60 seconds; valid seconds or HTTP-date headers can extend it further. Updates only increase the existing deadline. Every related Target and retry observes it, including after restart; unrelated destinations continue. An expired lease's response may extend cooldown but cannot overwrite current task state. In-flight requests cannot be recalled.

The [WeCom adapter](../src/wecom.ts) requires both HTTP 2xx and JSON `errcode: 0` for success. It classifies business errors before generic HTTP handling, retries transient network and remote failures within budget, and fails permanent destination or parameter errors immediately. Per-task backoff, valid remote retry instructions, shared cooldown, and quota all constrain the next send. Raw remote error messages are not persisted or logged.

## Authorization and data protection

The server combines an MCP resource server with an `oidc-provider` authorization server. It uses authorization code flow with PKCE `S256`, the exact MCP resource audience, and `notification:submit`. Dynamic client registration, implicit grants, and client credentials grants are disabled. The SDK's resource protection does not issue tokens; the Provider owns issuance and refresh, backed by SQLite.

CIMD identity is allowed only by an exact HTTPS Client ID URL in configuration, checked both before fetching metadata and when accepting cached clients. Fetched metadata must identify the same client; Provider SSRF and redirect protections remain active, with a bounded fetch wait. HTTPS callbacks match registered metadata exactly. Verified native loopback callbacks permit only the supported port variation described in [RFC 8252](https://www.rfc-editor.org/rfc/rfc8252#section-7.3): host, path, query, and identity remain constrained, and the code exchange must use the full original redirect URI including its actual port. The limited `localhost` and native-type adaptations apply only to the explicitly recognized official Claude Code and Codex identities and their listed metadata, not arbitrary allowlisted clients.

Access tokens expire after 15 minutes. Consent for the business scope also permits refresh-token issuance without an extra `offline_access` scope. Refresh tokens rotate on use with a rolling 30-day lifetime independent of the browser session. Before issuing new tokens, Grant renewal extends both its encrypted payload expiry and storage expiry to cover those tokens; failure issues no usable replacement. Expired, consumed, or revoked credentials cannot be revived by renewal. Each resource request checks stored authorization, scope, audience, client identity, and revocation.

The initial administrator password is used only when creating the account and then removed from the deployment YAML. Passwords use salted `scrypt` hashes. Consent forms bind CSRF tokens to the interaction, use Secure/HttpOnly/SameSite cookies, and restrict form redirects to validated callback origins. Failed password attempts are limited by the trusted source IP. Password reset requires a stopped service and exclusive maintenance lock, replacing the hash and revoking all authorization artifacts in one transaction so in-flight requests cannot restore old credentials.

A separately mounted 32-byte data key derives distinct field-encryption, OAuth-index, destination-index, and cookie-signing keys through HKDF. AES-256-GCM uses a fresh nonce and record/field identity as authenticated data. Notification content, delivery plans including Webhook credentials, and OAuth payloads are encrypted; OAuth lookup identifiers and destination quota keys use HMACs. A key check rejects mismatched keys, and failed decryption stops the operation. Online key rotation is not provided. Backups require the matching key to remain recoverable.

Configuration, keys, and host-side connection credentials stay outside Git and public artifacts. Logs and maintenance output expose metadata such as IDs, Topic, state, attempts, operation time, and allowlisted error categories, not notification text, Webhook URLs, passwords, tokens, or remote response text. Numeric HTTP and business error codes may be stored for maintenance diagnosis; application logs omit them. Proxy logging must also redact authorization and login inputs. Deployment-specific addresses are not architectural documentation.

## Persistence and recovery

SQLite uses a local durable volume, WAL, foreign keys, a finite busy timeout, and `synchronous=FULL`. Immediate transactions couple capacity checks with acceptance or manual retry; no network request runs within a database transaction. [Migrations](../src/migrations.ts) define exact tables and indexes. Store operations preserve atomic lease, quota, cooldown, token-consumption, and authorization-revocation changes instead of exposing general SQL to callers.

Successful and final-failure Deliveries are retained for 90 days from their latest terminal transition; unfinished work has no age-based cleanup. Notifications are removed only after all their Deliveries have been cleaned up. The unfinished-task cap does not bound total database size, so maintenance cost depends on historical volume.

Daily and manual online backups share a latest-seven policy. A backup is written to a unique temporary path, checked for database integrity and the matching key, and published atomically before old backups are removed. Failure preserves the last usable copies. Missed daily work is caught up after restart. Retention is by count rather than a promise to erase backed-up history within a fixed number of days. Configuration and key backups remain separately protected.

The service and ordinary database maintenance commands hold a shared operating-system file lock before opening SQLite. Restore and password reset require the service to stop and take an exclusive lock, refusing active users. The lock file is separate from database replacement and remains stable while in use. A persistent restore marker blocks ordinary startup and maintenance until recovery completes; file changes and marker transitions must be synchronized durably because SQLite transactions cannot protect filesystem replacement. SQLite treats [WAL as persistent database state](https://www.sqlite.org/wal.html#the_wal_file), which is why recovery preserves the complete file set.

Restore preserves these steps:

1. Prepare the selected backup at a separate local path; validate integrity and key, revoke authorization artifacts, and set the post-restore sending pause. Commit, checkpoint, and close so the prepared main file contains those changes.
2. Persist the restore marker before replacing anything. Preserve and synchronize the complete old database file set, including existing WAL and SHM, without overwriting the preservation copy on resume. If readable, merge later destination cooldowns from the old database into the prepared copy using maximum deadlines.
3. With every connection closed and preservation complete, remove the old active file set and atomically install the prepared database. Reopen exclusively, verify the selected state and revoked authorization, then close before clearing the marker. Never pair a replacement database with an old WAL.
4. After interruption, resume using the recorded phase and durable files or restore the complete preserved set. Integrity, key, revoked authorization, and the sending pause must be valid before normal startup is allowed; deleting the marker alone is not recovery.

Restore rolls back task state and can repeat external side effects. The Worker waits a full 60 seconds after starting with the restore pause, restarting that wait if interrupted before clearing it. Persisted quota and cooldown still apply; readable old cooldowns must not be shortened. If the old database is corrupt, its unknown later remote cooldowns require operator assessment. Preserve its file set without first deleting WAL as a repair attempt. Preservation copies are outside automatic backup rotation and are removed as a whole only after recovery is accepted and no marker references them.

## Verification boundaries

The [server tests](../test) use temporary databases, controlled clocks, standard MCP clients, and fake Webhooks to check public boundaries. Their source is the executable reference for regression cases, not evidence that a deployed host or real channel has passed acceptance.

| Area | Required regression boundary |
| --- | --- |
| Protocol and authorization | Supported protocol eras; resource and scope checks; exact client/callback identity; PKCE; concurrent single-use refresh; rolling Grant renewal, expiry, and revocation. |
| Acceptance | Whole-fanout commit or rejection; content and capacity boundaries; immutable plans; duplicate submissions; encrypted storage and redacted output. |
| Scheduling | Actual request starts under delayed claims and restart; stale leases; shared cooldown across Targets while unrelated destinations continue; bounded recorded outcomes. |
| Maintenance | Lock conflicts; nonempty WAL after abrupt exit; interruption at restore phases; preservation-copy reuse; key/integrity failure; authorization revocation; sending pause and backup retention. |
| Lifecycle | Graceful MCP subscription closure and in-flight HTTP draining before storage closes. |

Deployment acceptance additionally requires real host OAuth, discovery, submission, and refresh through the configured HTTPS proxy, plus a controlled WeCom send and channel-response inspection. Claude Code and ChatGPT interoperability must be verified separately from Codex acceptance. A successful `accepted` response is not proof of Webhook delivery, and one host's success does not establish another's compatibility.

Image acceptance checks the actual SQLite engine as well as pinned npm dependencies, including applicable upstream WAL fixes, non-root operation, native dependencies, healthchecks, and persistent restarts. At expected retained-data volume, measure HTTP latency during backup, cleanup, and integrity checking: the live-queue cap does not bound synchronous maintenance cost. These checks are acceptance requirements, not claims of completed measurements. Versioned results and current limitations belong in the CHANGELOG and README.
