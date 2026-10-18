import Provider, { errors, type Configuration } from "oidc-provider";
import {
  createHmac,
  generateKeyPairSync,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
import express, { type Express } from "express";
import {
  OAuthError,
  OAuthErrorCode,
  type AuthInfo,
} from "@modelcontextprotocol/server";
import {
  mcpAuthMetadataRouter,
  requireBearerAuth,
} from "@modelcontextprotocol/express";
import type { Config } from "./config.js";
import type { Store } from "./store.js";
import { verifyPassword } from "./crypto.js";
export const SCOPE = "notification:submit";
const CLAUDE = "https://claude.ai/oauth/claude-code-client-metadata";
const THIRTY_DAYS = 30 * 86400;
const escape = (value: unknown) =>
  String(value).replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ]!,
  );
export function createAuthorization(
  config: Config,
  store: Store,
  providerFetch?: Configuration["fetch"],
) {
  const issuer = config.server.publicBaseUrl;
  const resource = `${issuer}/mcp`;
  const routes = {
    authorization: "/auth",
    token: "/token",
    revocation: "/token/revocation",
  };
  const metadata = {
    issuer,
    authorization_endpoint: `${issuer}${routes.authorization}`,
    token_endpoint: `${issuer}${routes.token}`,
    revocation_endpoint: `${issuer}${routes.revocation}`,
    response_types_supported: ["code"] satisfies Configuration["responseTypes"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    scopes_supported: [SCOPE],
    code_challenge_methods_supported: ["S256"],
    token_endpoint_auth_methods_supported: ["none", "private_key_jwt"] satisfies
      Configuration["clientAuthMethods"],
    client_id_metadata_document_supported: true,
  };
  const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const provider = new Provider(issuer, {
    adapter: (model: string) => store.adapter(model),
    jwks: {
      keys: [
        {
          ...privateKey.export({ format: "jwk" }),
          kid: "noticeflow",
          use: "sig",
          alg: "RS256",
        },
      ],
    },
    cookies: {
      keys: [store.vault.cookieKey],
      short: { secure: true, httpOnly: true, sameSite: "lax" },
      long: { secure: true, httpOnly: true, sameSite: "lax" },
    },
    clients: [],
    routes,
    scopes: metadata.scopes_supported,
    responseTypes: metadata.response_types_supported,
    clientAuthMethods: metadata.token_endpoint_auth_methods_supported,
    pkce: { required: () => true },
    ttl: {
      AccessToken: 900,
      RefreshToken: THIRTY_DAYS,
      Grant: THIRTY_DAYS,
      Session: 3600,
      Interaction: 600,
      AuthorizationCode: 60,
    },
    rotateRefreshToken: true,
    expiresWithSession: () => false,
    issueRefreshToken: (_ctx, client, source) =>
      client.grantTypeAllowed("refresh_token") &&
      source.scopes.has(SCOPE) &&
      [source.resource].flat().includes(resource),
    findAccount: (_ctx, id) =>
      id === "admin"
        ? { accountId: id, claims: () => ({ sub: id }) }
        : undefined,
    interactions: {
      url: (_ctx, interaction) => `/interaction/${interaction.uid}`,
    },
    extraClientMetadata: {
      properties: ["noticeflow_policy"],
      validator: (_ctx, _key, _value, metadata) => {
        if (
          !metadata.redirect_uris?.every((value) => {
            try {
              const url = new URL(value);
              return (
                !url.username &&
                !url.password &&
                !value.includes("#") &&
                (url.protocol === "https:" ||
                  (metadata.application_type === "native" &&
                    url.protocol === "http:" &&
                    (["127.0.0.1", "[::1]"].includes(url.hostname) ||
                      ((metadata.client_id === CLAUDE ||
                        /^https:\/\/chatgpt\.com\/oauth\/codex\/(?:[A-Za-z0-9_-]+\/)?client\.json$/.test(
                          metadata.client_id ?? "",
                        )) &&
                        url.hostname === "localhost"))))
              );
            } catch {
              return false;
            }
          })
        )
          throw new errors.InvalidClientMetadata("Invalid redirect URI");
      },
    },
    features: {
      devInteractions: { enabled: false },
      userinfo: { enabled: false },
      registration: { enabled: false },
      rpInitiatedLogout: { enabled: false },
      revocation: {
        enabled: true,
        allowedPolicy: (_ctx, client, token) =>
          token.clientId === client.clientId,
      },
      clientIdMetadataDocument: {
        enabled: metadata.client_id_metadata_document_supported,
        ack: "draft-02",
        allowFetch: (_ctx, id) => config.auth.allowedClientIds.includes(id),
        allowClient: (_ctx, client) =>
          config.auth.allowedClientIds.includes(client.clientId),
      },
      resourceIndicators: {
        enabled: true,
        useGrantedResource: () => true,
        defaultResource: () => {
          throw new errors.InvalidTarget("Resource required");
        },
        getResourceServerInfo: (_ctx, value) => {
          if (value !== resource)
            throw new errors.InvalidTarget("Invalid resource");
          return {
            scope: SCOPE,
            audience: resource,
            accessTokenTTL: 900,
            accessTokenFormat: "opaque",
          };
        },
      },
    },
    fetch: async (url, options) => {
      const response = await (providerFetch ?? fetch)(url, options);
      if (String(url) !== CLAUDE || response.status !== 200) return response;
      const metadata: unknown = await response.clone().json();
      if (
        !metadata ||
        typeof metadata !== "object" ||
        Array.isArray(metadata) ||
        !("client_id" in metadata) ||
        metadata.client_id !== CLAUDE ||
        Object.hasOwn(metadata, "application_type")
      )
        return response;
      const headers = new Headers(response.headers);
      headers.delete("content-length");
      return new Response(
        JSON.stringify({ ...metadata, application_type: "native" }),
        { status: response.status, headers },
      );
    },
    renderError: (ctx, _out, error) => {
      ctx.status = "statusCode" in error ? error.statusCode : 500;
      ctx.body = { error: "AUTHORIZATION_FAILED" };
    },
  });
  provider.proxy = true;
  // Only reachable behind the configured proxy, which must replace forwarding headers.
  provider.use(async (ctx, next) => {
    const params = ctx.query;
    if (ctx.path === routes.authorization) {
      const redirect =
        typeof params.redirect_uri === "string"
          ? URL.parse(params.redirect_uri)
          : null;
      if (
        redirect &&
        (redirect.username ||
          redirect.password ||
          String(params.redirect_uri).includes("#"))
      )
        throw new errors.InvalidRequest("Invalid redirect URI");
      if (
        typeof params.scope !== "string" ||
        params.scope !== SCOPE ||
        params.resource !== resource
      )
        throw new errors.InvalidScope("Invalid scope or resource", SCOPE);
    }
    await next();
  });
  const failures = new Map<string, { times: number[]; inFlight: number }>();
  function protectMcp(app: Express) {
    app.use(
      mcpAuthMetadataRouter({
        resourceServerUrl: new URL(resource),
        scopesSupported: metadata.scopes_supported,
        oauthMetadata: metadata,
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
        verifier: { verifyAccessToken },
        requiredScopes: metadata.scopes_supported,
        expectedResource: new URL(resource),
        resourceMetadataUrl: `${issuer}/.well-known/oauth-protected-resource/mcp`,
      }),
    );
  }
  function mount(app: Express) {
    app.get("/interaction/:uid", async (req, res, next) => {
      try {
        const details = await provider.interactionDetails(req, res);
        const client = await provider.Client.find(
          String(details.params.client_id),
        );
        const nonce = randomBytes(24).toString("base64url");
        const csrf = createHmac("sha256", store.vault.cookieKey)
          .update(`${details.uid}:${nonce}`)
          .digest("base64url");
        res.cookie("noticeflow_csrf", nonce, {
          secure: true,
          httpOnly: true,
          sameSite: "lax",
          path: `/interaction/${details.uid}`,
        });
        res.set(
          "Content-Security-Policy",
          "default-src 'none'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'",
        );
        res.set("Cache-Control", "no-store");
        res.send(
          `<html><head><title>Noticeflow</title></head><body><h1>Noticeflow 授权</h1><p>${escape(client?.clientName ?? details.params.client_id)}</p><p>${escape(details.params.redirect_uri)}</p><p>${SCOPE}：允许向配置的群机器人发送通知。</p><form method="post" action="/interaction/${escape(details.uid)}"><input type="hidden" name="csrf" value="${csrf}">${details.prompt.name === "login" ? '<label>管理员密码<input name="password" type="password" required autocomplete="current-password"></label>' : ""}<button name="approve" value="yes">登录并授权</button></form></body></html>`,
        );
      } catch (error) {
        next(error);
      }
    });
    app.post(
      "/interaction/:uid",
      express.urlencoded({ extended: false, limit: "4kb" }),
      async (req, res, next) => {
        try {
          const details = await provider.interactionDetails(req, res);
          const nonce = req.headers.cookie
            ?.split(";")
            .map((value) => value.trim())
            .find((value) => value.startsWith("noticeflow_csrf="))
            ?.slice("noticeflow_csrf=".length);
          const expected = createHmac("sha256", store.vault.cookieKey)
            .update(`${details.uid}:${nonce}`)
            .digest("base64url");
          const provided = req.body?.csrf;
          if (
            !nonce ||
            typeof provided !== "string" ||
            provided.length !== expected.length ||
            !timingSafeEqual(Buffer.from(provided), Buffer.from(expected)) ||
            req.body.approve !== "yes"
          ) {
            res.status(403).json({ error: "AUTHORIZATION_FAILED" });
            return;
          }
          if (details.prompt.name === "login") {
            const ip = req.ip ?? "";
            const recent = failures.get(ip) ?? { times: [], inFlight: 0 };
            recent.times = recent.times.filter(
              (time) => time > Date.now() - 900000,
            );
            failures.set(ip, recent);
            if (recent.times.length + recent.inFlight >= 5) {
              res.status(429).json({ error: "AUTHORIZATION_FAILED" });
              return;
            }
            recent.inFlight++;
            let valid: boolean;
            try {
              valid =
                typeof req.body.password === "string" &&
                (await verifyPassword(req.body.password, store.password()!));
            } finally {
              recent.inFlight--;
            }
            if (!valid) {
              recent.times.push(Date.now());
              res.status(401).json({ error: "AUTHORIZATION_FAILED" });
              return;
            }
            await provider.interactionFinished(
              req,
              res,
              { login: { accountId: "admin" } },
              { mergeWithLastSubmission: false },
            );
          } else if (details.prompt.name === "consent") {
            const grant = details.grantId
              ? await provider.Grant.find(details.grantId)
              : new provider.Grant({
                  accountId: "admin",
                  clientId: String(details.params.client_id),
                });
            if (!grant) throw new Error("INVALID_GRANT");
            grant.addOIDCScope(SCOPE);
            grant.addResourceScope(resource, SCOPE);
            const grantId = await grant.save();
            await provider.interactionFinished(
              req,
              res,
              { consent: { grantId } },
              { mergeWithLastSubmission: true },
            );
          } else res.status(400).json({ error: "AUTHORIZATION_FAILED" });
        } catch (error) {
          next(error);
        }
      },
    );
    app.use(provider.callback());
  }
  async function verifyAccessToken(raw: string): Promise<AuthInfo> {
    const token = await provider.AccessToken.find(raw);
    const grant = token?.grantId
      ? await provider.Grant.find(token.grantId)
      : undefined;
    if (
      !token ||
      !grant ||
      !token.clientId ||
      !token.exp ||
      token.isExpired ||
      !config.auth.allowedClientIds.includes(token.clientId) ||
      token.aud !== resource
    )
      throw new OAuthError(OAuthErrorCode.InvalidToken, "Invalid token");
    return {
      token: raw,
      clientId: token.clientId,
      scopes: token.scope?.split(" ") ?? [],
      expiresAt: token.exp,
      resource: new URL(resource),
    };
  }
  return { protectMcp, mount };
}
