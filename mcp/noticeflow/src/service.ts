import express from "express";
import { accessSync, constants, mkdirSync } from "node:fs";
import { type Configuration } from "oidc-provider";
import { loadConfig } from "./config.js";
import { Vault } from "./crypto.js";
import { Store } from "./store.js";
import { DeliveryWorker } from "./worker.js";
import type { Channel, WebhookFetch } from "./channel.js";
import { log, type Logger } from "./log.js";
import { mountMcp } from "./http.js";
import { createSubmit } from "./submit.js";
import { createWecom } from "./wecom.js";
import { createFeishu } from "./feishu.js";
import { createAuthorization } from "./auth.js";
export interface ServiceOptions {
  providerFetch?: Configuration["fetch"];
  now?: () => number;
  webhookFetch?: WebhookFetch;
  logger?: Logger;
}
export async function createService(
  configPath: string,
  options: ServiceOptions = {},
) {
  const config = loadConfig(configPath);
  mkdirSync(config.storage.backupDir, { recursive: true, mode: 0o700 });
  accessSync(config.storage.backupDir, constants.W_OK);
  const store = new Store(
    config.storage.sqlitePath,
    new Vault(config.storage.encryptionKeyFile),
    options.now,
  );
  try {
    if (await store.initializeAdmin(config.auth.initialAdminPassword))
      (options.logger ?? log)({
        errorCode: "REMOVE_INITIAL_PASSWORD_FROM_CONFIG",
      });
    const channels = new Map<string, Channel>([
      ["wecom-webhook", createWecom(options.webhookFetch, options.now)],
      ["feishu-webhook", createFeishu(options.webhookFetch, options.now)],
    ]);
    const submit = createSubmit(config, store, channels, options.now);
    const worker = new DeliveryWorker(
      store,
      channels,
      options.now,
      options.logger,
    );
    const issuer = config.server.publicBaseUrl;
    const authorization = createAuthorization(
      config,
      store,
      options.providerFetch,
    );
    const app = express();
    app.disable("x-powered-by");
    app.set("trust proxy", 1);
    app.use((req, _res, next) => {
      req.headers.host = new URL(issuer).host;
      req.headers["x-forwarded-host"] = new URL(issuer).host;
      req.headers["x-forwarded-proto"] = "https";
      next();
    });
    app.get("/healthz", (_req, res) => {
      try {
        res.json({
          process: "ok",
          database: store.healthy() ? "ok" : "unavailable",
          worker: worker.running ? "running" : "stopped",
        });
      } catch {
        res.status(503).json({
          process: "ok",
          database: "unavailable",
          worker: worker.running ? "running" : "stopped",
        });
      }
    });
    authorization.protectMcp(app);
    const closeMcp = mountMcp(
      app,
      submit,
      Object.keys(config.topics),
      authorization.mcpPath,
    );
    authorization.mount(app);
    app.use(
      (
        _error: unknown,
        _req: express.Request,
        res: express.Response,
        _next: express.NextFunction,
      ) => {
        res.status(500).json({ error: "SERVER_ERROR" });
      },
    );
    let stopping: Promise<void> | undefined;
    // HTTP listeners must drain before close() releases storage.
    function stop() {
      stopping ??= (async () => {
        await Promise.all([closeMcp(), worker.stop()]);
      })();
      return stopping;
    }
    let closing: Promise<void> | undefined;
    return {
      app,
      store,
      config,
      submit,
      worker,
      stop,
      close() {
        closing ??= (async () => {
          await stop();
          store.close();
        })();
        return closing;
      },
    };
  } catch (error) {
    store.close();
    throw error;
  }
}
