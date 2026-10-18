import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import type { Config } from "../src/config.js";
import { stringify } from "yaml";
import { createService, type ServiceOptions } from "../src/service.js";

export const CLAUDE = "https://claude.ai/oauth/claude-code-client-metadata";
export const CHATGPT = "https://chatgpt.com/oauth/client.json";
export async function fixture(
  options: ServiceOptions = {},
  allowedClientIds = [CLAUDE, CHATGPT],
) {
  const directory = mkdtempSync(join(tmpdir(), "noticeflow-"));
  const configPath = join(directory, "config.yaml");
  const config: Config = {
    server: {
      publicBaseUrl: "https://notice.example.com",
      listen: "127.0.0.1:3000",
    },
    auth: {
      initialAdminPassword: "test-admin-password",
      allowedClientIds,
    },
    storage: {
      sqlitePath: join(directory, "notice.sqlite"),
      encryptionKeyFile: join(directory, "data-key"),
      backupDir: join(directory, "backups"),
    },
    targets: {
      a: {
        channel: "wecom-webhook",
        webhookUrl:
          "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=test-secret-a",
      },
      b: {
        channel: "wecom-webhook",
        webhookUrl:
          "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=test-secret-b",
      },
    },
    topics: { build: { targets: ["a", "b"] } },
  };
  writeFileSync(
    config.storage.encryptionKeyFile,
    randomBytes(32).toString("base64"),
    { mode: 0o600 },
  );
  writeFileSync(configPath, stringify(config));
  const service = await createService(configPath, {
    logger: () => {},
    ...options,
  });
  const server = service.app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address();
  if (!address || typeof address === "string")
    throw new Error("No test listener");
  const base = `http://127.0.0.1:${address.port}`;
  return {
    ...service,
    directory,
    configPath,
    config,
    base,
    request(path: string, init: RequestInit = {}) {
      return fetch(`${base}${path}`, {
        ...init,
        redirect: "manual",
        headers: {
          host: "notice.example.com",
          "x-forwarded-host": "notice.example.com",
          "x-forwarded-proto": "https",
          "x-forwarded-for": "192.0.2.1",
          ...init.headers,
        },
      });
    },
    async dispose() {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
      await service.close();
      rmSync(directory, { recursive: true, force: true });
    },
  };
}
