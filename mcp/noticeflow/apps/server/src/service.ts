import express from "express";
import { accessSync, constants, mkdirSync } from "node:fs";
import { type Configuration } from "oidc-provider";
import {
  mcpAuthMetadataRouter,
  requireBearerAuth,
} from "@modelcontextprotocol/express";
import { loadConfig } from "./config.js";
import { Vault } from "./crypto.js";
import { Store } from "./store.js";
import { DeliveryWorker } from "./worker.js";
import type { WebhookFetch } from "./channel.js";
import { log, type Logger } from "./log.js";
import { mountMcp } from "./http.js";
import { createSubmit } from "./submit.js";
import { createWecom } from "./wecom.js";
import { createAuthorization, SCOPE } from "./auth.js";
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
    const channels = new Map([
      ["wecom-webhook", createWecom(options.webhookFetch, options.now)],
    ]);
    const submit = createSubmit(config, store, channels, options.now);
    const worker = new DeliveryWorker(
      store,
      channels,
      options.now,
      options.logger,
    );
    const issuer = config.server.publicBaseUrl;
    const resource = new URL(`${issuer}/mcp`);
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
    app.use(
      mcpAuthMetadataRouter({
        resourceServerUrl: resource,
        scopesSupported: [SCOPE],
        oauthMetadata: {
          issuer,
          authorization_endpoint: `${issuer}/auth`,
          token_endpoint: `${issuer}/token`,
          revocation_endpoint: `${issuer}/token/revocation`,
          response_types_supported: ["code"],
          grant_types_supported: ["authorization_code", "refresh_token"],
          scopes_supported: [SCOPE],
          code_challenge_methods_supported: ["S256"],
          token_endpoint_auth_methods_supported: ["none", "private_key_jwt"],
          client_id_metadata_document_supported: true,
        },
      }),
    );
    app.use("/mcp", (req, res, next) => {
      if (req.headers.origin && req.headers.origin !== issuer) {
        res.status(403).json({ error: "FORBIDDEN_ORIGIN" });
        return;
      }
      next();
    });
    app.all(
      "/mcp",
      requireBearerAuth({
        verifier: authorization,
        requiredScopes: [SCOPE],
        expectedResource: resource,
        resourceMetadataUrl: `${issuer}/.well-known/oauth-protected-resource/mcp`,
      }),
    );
    mountMcp(app, submit, Object.keys(config.topics));
    authorization.mount(app);
    app.use(authorization.provider.callback());
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
    return {
      app,
      store,
      config,
      submit,
      worker,
      async close() {
        await worker.stop();
        store.close();
      },
    };
  } catch (error) {
    store.close();
    throw error;
  }
}
