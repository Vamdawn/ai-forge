# Noticeflow

English | [简体中文](README.zh-CN.md)

Noticeflow is an experimental remote MCP notification server for Node.js 24. Existing MCP hosts submit prepared notifications over Streamable HTTP and OAuth; a durable SQLite queue routes them to configured WeCom group robots. Local automated checks cover both MCP protocol eras and OAuth flows. The Linux/arm64 Docker image has passed build, startup, runtime-configured healthcheck, and persistent restart checks. Codex CLI 0.155.1 has passed local HTTPS OAuth and real Agent submission checks with delivery disabled. Real Claude Code, ChatGPT, and WeCom acceptance remain pending.

## Install

Build the server image from this checkout:

```sh
cd mcp/noticeflow/apps/server
docker build -t noticeflow:local .
```

The image runs as the `node` user (UID 1000). Provision writable `/data` and `/backup` volumes and mount the configuration and data key read-only. Keep credentials outside the checkout. This asset is not published to npm.

## Usage

Run one instance behind Nginx HTTPS:

```sh
docker run --rm --name noticeflow \
  -p 127.0.0.1:3000:3000 \
  -v /srv/noticeflow/data:/data \
  -v /srv/noticeflow/backup:/backup \
  -v /srv/noticeflow/config.yaml:/run/noticeflow/config.yaml:ro \
  -v /srv/noticeflow/data-key:/run/noticeflow/data-key:ro \
  noticeflow:local
```

Connect the host's generic MCP client to `${publicBaseUrl}/mcp`, complete administrator OAuth consent, and call `submit_notification` with `topic`, `title`, and `content`. `accepted` means the complete fanout is committed; delivery is asynchronous and repeated calls create distinct notifications. Only this tool is exposed. The server accepts both 2025 stateless handshakes and the 2026-07-28 protocol through the official SDK.

The same image supports maintenance commands. Every command requires the same mounts and `--config /run/noticeflow/config.yaml`; use `docker exec` for queries, retries, and online backups. Stop the service before password reset or restore and run a temporary container with the same mounts; password reset also needs `-it`.

```text
noticeflow tasks list [--status <status>] [--received-from <UTC-time>] [--received-before <UTC-time>] [--notification <id>]
noticeflow tasks show <delivery-id>
noticeflow tasks retry <delivery-id>
noticeflow auth reset-password
noticeflow backup create
noticeflow backup list
noticeflow backup restore <backup-file>
```

Replace `noticeflow` with `docker exec noticeflow node dist/main.js` for a running container, or append the subcommands after the image name for a temporary container. Task time filters use notification reception time with an inclusive start and exclusive end. Maintenance output contains metadata only. Password reset reads and confirms the new password without echoing it and revokes all stored authorization.

## Configuration

Copy [config.example.yaml](apps/server/config.example.yaml) outside the repository and replace its placeholders. Generate a separate 32-byte Base64 data key:

```sh
umask 077
openssl rand -base64 32 > /srv/noticeflow/data-key
```

Set an HTTPS base URL without a query, fragment, or trailing slash, such as `https://noticeflow.example.com/noticeflow`, plus the internal listener, exact allowed HTTPS CIMD URLs, absolute storage paths, targets, and topics. An optional base path uses nonempty segments of letters, digits, `.`, `_`, `~`, or `-`; encoded or normalized path aliases are rejected. Origin-only configurations still work. Changing the base URL requires hosts to authorize again for the new MCP resource. The example includes the official Claude Code and ChatGPT CIMD URLs. For Codex, add the exact CIMD URL shown during login; it can include a server-specific callback ID. Only official WeCom HTTPS Webhook URLs with one nonempty `key` parameter are accepted. Unknown fields, duplicate YAML keys, missing targets, and invalid endpoints fail startup. Restart to load configuration changes; accepted deliveries keep their original message and destination.

Remove `auth.initialAdminPassword` after first initialization. Preserve the key separately from database backups; losing it makes stored notifications and authorization unrecoverable. Keep the key and YAML readable only by the service user. Backups contain encrypted records and password hashes, so restrict their volume permissions too.

Nginx must replace forwarded host, scheme, and source-IP headers and keep the container port inaccessible to other clients. Preserve request paths when forwarding the configured base path and its MCP, OAuth, interaction, and provider resume routes. For `/noticeflow`, also forward the exact root paths `/.well-known/oauth-protected-resource/noticeflow/mcp` and `/.well-known/oauth-authorization-server/noticeflow`; do not send the existing site's entire `/` to Noticeflow. Keep `/healthz` private at the container root. `/healthz` reports process, database, and worker state without credentials.

## Limitations

- Single administrator, one running server, and local SQLite storage only; no API-key mode, dedicated client, SMTP, attachments, or MCP management tools.
- Markdown must fit 4096 UTF-8 bytes including the escaped title; images, HTML, mentions, task checkboxes, footnotes, and strikethrough are rejected. Content is never truncated or split.
- At most 1000 unfinished deliveries, four concurrent sends, 120 tool calls per client per rolling minute, and 20 starts per Webhook per rolling minute. Conservative reservations can reduce throughput. Retries and manual requeues share persistent quotas and cooldowns.
- Retryable failures have four recorded attempts with 1/5/15 minute backoff. Interrupted attempts can repeat without consuming that budget. Terminal deliveries are retained 90 days; unfinished deliveries are retained until terminal.
- Daily and manual online backups share a seven-file retention limit; failures preserve existing copies. Restore requires an exclusive lock, preserves the old main/WAL/SHM files, revokes authorization, and pauses sends for 60 seconds. An interrupted restore blocks startup; rerun restore to continue. Retain its preserved directory until recovery is verified, then remove the whole directory when no restore marker references it.
- Public HTTPS host interoperability, a controlled real WeCom send, other image platforms, and capacity-dependent maintenance latency still need deployment acceptance. Local fixtures do not establish these results.

## Development

```sh
cd mcp/noticeflow/apps/server
npm ci --ignore-scripts
npm run typecheck
npm test
npm run build
node dist/main.js serve --config /absolute/path/config.yaml
```

`pretest` rebuilds the locked SQLite, file-lock, and test-transform native dependencies. `src/` contains the server and maintenance commands; `test/` exercises public HTTP, submission, worker/Webhook, and maintenance boundaries with temporary data and controlled clocks.

## Links

- [Architecture](docs/architecture.md)
- [Glossary](GLOSSARY.md)
- [Changelog](CHANGELOG.md)
- [Repository license](../../LICENSE)
