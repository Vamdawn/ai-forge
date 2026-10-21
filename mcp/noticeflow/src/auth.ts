import Provider, {
  errors,
  type Configuration,
  type Interaction,
} from "oidc-provider";
import {
  createHmac,
  generateKeyPairSync,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
import express, { type Express, type Response, type NextFunction } from "express";
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
import { renderExpiredPage, renderInteractionPage } from "./auth-page.js";
export const SCOPE = "notification:submit";
const CLAUDE = "https://claude.ai/oauth/claude-code-client-metadata";
const THIRTY_DAYS = 30 * 86400;
export function createAuthorization(
  config: Config,
  store: Store,
  providerFetch?: Configuration["fetch"],
) {
  const issuer = config.server.publicBaseUrl;
  const origin = new URL(issuer).origin;
  const basePath = new URL(issuer).pathname.replace(/\/$/, "");
  const mcpPath = `${basePath}/mcp`;
  const resource = `${issuer}/mcp`;
  // RFC 9728/8414 insert well-known before the resource/issuer path, not after it.
  const resourceMetadataPath = `/.well-known/oauth-protected-resource${mcpPath}`;
  const authorizationMetadataPath = `/.well-known/oauth-authorization-server${basePath}`;
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
      long: {
        secure: true,
        httpOnly: true,
        sameSite: "lax",
        path: basePath || "/",
      },
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
      url: (_ctx, interaction) => `${basePath}/interaction/${interaction.uid}`,
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
      // CIMD may cross an outbound proxy. Keep the provider's SSRF dispatcher
      // and redirect policy, but allow more than its default 2.5 seconds.
      const fetchOptions = config.auth.allowedClientIds.includes(String(url))
        ? { ...options, signal: AbortSignal.timeout(10000) }
        : options;
      const response = await (providerFetch ?? fetch)(url, fetchOptions);
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
    const metadataRouter = mcpAuthMetadataRouter({
      resourceServerUrl: new URL(resource),
      scopesSupported: metadata.scopes_supported,
      oauthMetadata: metadata,
    });
    app.use((req, res, next) => {
      // Keep discovery scoped on a shared origin. The SDK only mounts AS
      // metadata at the root well-known path, so adapt the RFC 8414 suffix.
      if (
        basePath &&
        req.path !== resourceMetadataPath &&
        req.path !== authorizationMetadataPath
      )
        return next();
      const requestUrl = req.url;
      if (basePath && req.path === authorizationMetadataPath)
        req.url = `/.well-known/oauth-authorization-server${req.url.slice(authorizationMetadataPath.length)}`;
      metadataRouter(req, res, (error) => {
        req.url = requestUrl;
        next(error);
      });
    });
    app.use(mcpPath, (req, res, next) => {
      if (req.headers.origin && req.headers.origin !== origin) {
        res.status(403).json({ error: "FORBIDDEN_ORIGIN" });
        return;
      }
      next();
    });
    app.all(
      mcpPath,
      requireBearerAuth({
        verifier: { verifyAccessToken },
        requiredScopes: metadata.scopes_supported,
        expectedResource: new URL(resource),
        resourceMetadataUrl: `${origin}${resourceMetadataPath}`,
      }),
    );
  }
  function mount(app: Express) {
    const router = express.Router();
    function sendPage(
      res: Response,
      nonce: string,
      html: string,
      callbackOrigin = "",
    ) {
      // Chromium checks the full redirect chain. Only the provider-validated
      // callback origin is permitted alongside this server's resume route.
      res.set(
        "Content-Security-Policy",
        [
          "default-src 'none'",
          `form-action 'self'${callbackOrigin ? ` ${callbackOrigin}` : ""}`,
          "frame-ancestors 'none'",
          "base-uri 'none'",
          `style-src 'nonce-${nonce}'`,
          `script-src 'nonce-${nonce}'`,
        ].join("; "),
      );
      res.set("Cache-Control", "no-store");
      res.set("Referrer-Policy", "no-referrer");
      res.send(html);
    }
    async function showInteraction(
      res: Response,
      details: Interaction,
      error?: "password" | "limited",
    ) {
      const client = await provider.Client.find(String(details.params.client_id));
      const csrfNonce = randomBytes(24).toString("base64url");
      const csrf = createHmac("sha256", store.vault.cookieKey)
        .update(`${details.uid}:${csrfNonce}`)
        .digest("base64url");
      res.cookie("noticeflow_csrf", csrfNonce, {
        secure: true,
        httpOnly: true,
        sameSite: "lax",
        path: `${basePath}/interaction/${details.uid}`,
      });
      const nonce = randomBytes(24).toString("base64url");
      sendPage(
        res,
        nonce,
        renderInteractionPage({
          nonce,
          csrf,
          action: `${basePath}/interaction/${details.uid}`,
          clientName: client?.clientName ?? String(details.params.client_id),
          clientId: String(details.params.client_id),
          callback: String(details.params.redirect_uri),
          resource,
          scope: SCOPE,
          prompt: details.prompt.name,
          error,
        }),
        new URL(String(details.params.redirect_uri)).origin,
      );
    }
    function interactionError(error: unknown, res: Response, next: NextFunction) {
      if (!(error instanceof errors.SessionNotFound)) return next(error);
      const nonce = randomBytes(24).toString("base64url");
      sendPage(res.status(410), nonce, renderExpiredPage(nonce));
    }
    router.get("/interaction/:uid", async (req, res, next) => {
      try {
        const details = await provider.interactionDetails(req, res);
        await showInteraction(res, details);
      } catch (error) {
        interactionError(error, res, next);
      }
    });
    router.post(
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
            (req.body.approve !== "yes" && req.body.approve !== "no")
          ) {
            res.status(403).json({ error: "AUTHORIZATION_FAILED" });
            return;
          }
          if (req.body.approve === "no") {
            await provider.interactionFinished(
              req,
              res,
              {
                error: "access_denied",
                error_description: "Connection cancelled by the administrator",
              },
              { mergeWithLastSubmission: false },
            );
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
              await showInteraction(res.status(429), details, "limited");
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
              await showInteraction(res.status(401), details, "password");
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
          interactionError(error, res, next);
        }
      },
    );
    router.use(provider.callback());
    app.use(basePath || "/", router);
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
  return { protectMcp, mount, mcpPath };
}
