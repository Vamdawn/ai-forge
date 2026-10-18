import { test } from "node:test";
import assert from "node:assert/strict";
import { fixture } from "./fixture.js";

test("MCP advertises its OAuth resource and challenges unauthenticated callers", async (t) => {
  const service = await fixture();
  t.after(() => service.dispose());
  const response = await service.request("/mcp", {
    method: "POST",
    body: "{}",
  });
  assert.equal(response.status, 401);
  assert.match(
    response.headers.get("www-authenticate")!,
    /resource_metadata="https:\/\/notice.example.com\/\.well-known\/oauth-protected-resource\/mcp"/,
  );
  const metadata = await (
    await service.request("/.well-known/oauth-protected-resource/mcp")
  ).json();
  assert.equal(metadata.resource, "https://notice.example.com/mcp");
  assert.deepEqual(metadata.authorization_servers, [
    "https://notice.example.com",
  ]);
  const discovery = await (
    await service.request("/.well-known/oauth-authorization-server")
  ).json();
  assert.equal(discovery.issuer, "https://notice.example.com");
  assert.equal(discovery.token_endpoint, "https://notice.example.com/token");
  assert.equal(discovery.registration_endpoint, undefined);
  assert.deepEqual(discovery.code_challenge_methods_supported, ["S256"]);
});

import { authorize, redeem, claudeMetadata } from "./oauth-client.js";
test("official Claude CIMD supports random loopback ports, consent and PKCE tokens", async (t) => {
  const service = await fixture({
    providerFetch: async () => Response.json(claudeMetadata),
  });
  t.after(() => service.dispose());
  const { code } = await authorize(service.request);
  const response = await redeem(service.request, code);
  const tokens = await response.json();
  assert.equal(response.status, 200, JSON.stringify(tokens));
  assert.equal(tokens.expires_in, 900);
  assert.ok(tokens.refresh_token);
  const replay = await redeem(service.request, code);
  assert.equal(replay.status, 400);
});

for (const callbackId of ["", "abC012_-defg/"]) {
  test(`official Codex CIMD accepts its listed loopback callbacks (${callbackId || "shared"})`, async (t) => {
    const clientId = `https://chatgpt.com/oauth/codex/${callbackId}client.json`;
    const callbackPath = `/callback${callbackId ? `/${callbackId.slice(0, -1)}` : ""}`;
    const metadata = {
      client_id: clientId,
      application_type: "native",
      redirect_uris: [
        `http://127.0.0.1${callbackPath}`,
        `http://localhost${callbackPath}`,
      ],
      token_endpoint_auth_method: "none",
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
    };
    const service = await fixture(
      { providerFetch: async () => Response.json(metadata) },
      [clientId],
    );
    t.after(() => service.dispose());
    const redirectUri = `http://127.0.0.1:49152${callbackPath}`;
    const { code } = await authorize(service.request, {
      client_id: clientId,
      redirect_uri: redirectUri,
    });
    const response = await redeem(service.request, code, {
      client_id: clientId,
      redirect_uri: redirectUri,
    });
    const tokens = await response.json();
    assert.equal(response.status, 200, JSON.stringify(tokens));
    assert.ok(tokens.refresh_token);
    for (const redirect_uri of [
      `http://127.0.0.1:49152${callbackPath}/other`,
      `http://127.0.0.2:49152${callbackPath}`,
    ]) {
      const denied = await service.request(
        authPath({ client_id: clientId, redirect_uri }),
      );
      const location = denied.headers.get("location") ?? "";
      assert.ok(
        denied.status >= 400 || new URL(location).searchParams.has("error"),
      );
    }
  });
}

test("Codex CIMD localhost exception does not extend to lookalike identities", async (t) => {
  const clientId = "https://chatgpt.com.evil.example/oauth/codex/client.json";
  const service = await fixture(
    {
      providerFetch: async () => Response.json({
        client_id: clientId,
        application_type: "native",
        redirect_uris: ["http://localhost/callback"],
        token_endpoint_auth_method: "none",
        grant_types: ["authorization_code"],
        response_types: ["code"],
      }),
    },
    [clientId],
  );
  t.after(() => service.dispose());
  assert.equal(
    (await service.request(authPath({ client_id: clientId }))).status,
    400,
  );
});

test("refresh rotates at days 13, 26 and 39 after browser session expiry, then expires after 30 idle days", async (t) => {
  const start = Date.now();
  t.mock.timers.enable({ apis: ["Date"], now: start });
  const service = await fixture({
    providerFetch: async () => Response.json(claudeMetadata),
  });
  t.after(() => service.dispose());
  const { code } = await authorize(service.request);
  let tokens = await (await redeem(service.request, code)).json();
  for (const day of [13, 26, 39]) {
    t.mock.timers.setTime(start + day * 86400000);
    const oldRefresh = tokens.refresh_token;
    const response = await service.request("/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        client_id: claudeMetadata.client_id,
        refresh_token: oldRefresh,
        resource: "https://notice.example.com/mcp",
      }),
    });
    tokens = await response.json();
    assert.equal(response.status, 200, `day ${day}: ${JSON.stringify(tokens)}`);
    assert.ok(tokens.access_token);
    assert.ok(tokens.refresh_token);
    assert.notEqual(tokens.refresh_token, oldRefresh);
  }
  t.mock.timers.setTime(start + 70 * 86400000);
  const expired = await service.request("/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: claudeMetadata.client_id,
      refresh_token: tokens.refresh_token,
    }),
  });
  assert.equal(expired.status, 400);
});

import { createSign, generateKeyPairSync, randomUUID } from "node:crypto";
import { authPath, chatgptMetadata } from "./oauth-client.js";
import { CHATGPT, CLAUDE } from "./fixture.js";
test("ChatGPT CIMD uses private_key_jwt with its JWKS and exact HTTPS callback", async (t) => {
  const { privateKey, publicKey } = generateKeyPairSync("rsa", {
    modulusLength: 2048,
  });
  const service = await fixture({
    providerFetch: async (url) =>
      Response.json(
        String(url) === CHATGPT
          ? chatgptMetadata
          : {
              keys: [
                {
                  ...publicKey.export({ format: "jwk" }),
                  kid: "chatgpt-test",
                  use: "sig",
                  alg: "RS256",
                },
              ],
            },
      ),
  });
  t.after(() => service.dispose());
  const { code } = await authorize(service.request, {
    client_id: CHATGPT,
    redirect_uri: chatgptMetadata.redirect_uris[0],
  });
  const header = Buffer.from(
    JSON.stringify({ alg: "RS256", kid: "chatgpt-test" }),
  ).toString("base64url");
  const payload = Buffer.from(
    JSON.stringify({
      iss: CHATGPT,
      sub: CHATGPT,
      aud: "https://notice.example.com/token",
      jti: randomUUID(),
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 60,
    }),
  ).toString("base64url");
  const signingInput = `${header}.${payload}`;
  const assertion = `${signingInput}.${createSign("RSA-SHA256").update(signingInput).sign(privateKey).toString("base64url")}`;
  const response = await redeem(service.request, code, {
    client_id: CHATGPT,
    redirect_uri: chatgptMetadata.redirect_uris[0],
    client_assertion_type:
      "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
    client_assertion: assertion,
  });
  const tokens = await response.json();
  assert.equal(response.status, 200, JSON.stringify(tokens));
  assert.ok(tokens.refresh_token);
});

test("CIMD rejects unlisted identities, changed callbacks, non-S256 PKCE, wrong scope and resource", async (t) => {
  const fetches: string[] = [];
  const service = await fixture({
    providerFetch: async (url) => {
      fetches.push(String(url));
      return Response.json(
        String(url) === CLAUDE ? claudeMetadata : chatgptMetadata,
      );
    },
  });
  t.after(() => service.dispose());
  const invalidRequests: Record<string, string>[] = [
    { client_id: "https://unlisted.example/client.json" },
    { redirect_uri: "http://localhost:49152/other" },
    { redirect_uri: "http://localhost:49152/callback?extra=1" },
    { redirect_uri: "http://127.0.0.2:49152/callback" },
    { redirect_uri: "http://evil.localhost:49152/callback" },
    { redirect_uri: "http://user@localhost:49152/callback" },
    { redirect_uri: "http://localhost:49152/callback#fragment" },
    {
      client_id: CHATGPT,
      redirect_uri:
        "https://chatgpt.com:8443/connector_platform_oauth_redirect",
    },
    { client_id: CHATGPT, redirect_uri: "http://127.0.0.1:1234/callback" },
    { code_challenge_method: "plain" },
    { code_challenge: "" },
    { scope: "offline_access" },
    { resource: "https://other.example/mcp" },
    { resource: "" },
  ];
  for (const change of invalidRequests) {
    const response = await service.request(authPath(change));
    const location = response.headers.get("location") ?? "";
    assert.ok(
      response.status >= 400 || new URL(location).searchParams.has("error"),
      JSON.stringify(change),
    );
  }
  assert.ok(!fetches.includes("https://unlisted.example/client.json"));
  const { code } = await authorize(service.request);
  assert.equal(
    (
      await redeem(service.request, code, {
        redirect_uri: "http://localhost:49153/callback",
      })
    ).status,
    400,
  );
});

test("MCP rejects a foreign Origin before authentication", async (t) => {
  const service = await fixture();
  t.after(() => service.dispose());
  assert.equal(
    (
      await service.request("/mcp", {
        method: "POST",
        headers: { origin: "https://foreign.example" },
        body: "{}",
      })
    ).status,
    403,
  );
});

import {
  Client,
  StreamableHTTPClientTransport,
} from "@modelcontextprotocol/client";
for (const mode of ["legacy", { pin: "2026-07-28" }] as const) {
  test(`standard MCP Client discovers and calls the notification tool (${JSON.stringify(mode)})`, async (t) => {
    const service = await fixture({
      providerFetch: async () => Response.json(claudeMetadata),
    });
    t.after(() => service.dispose());
    const { code } = await authorize(service.request);
    const tokens = await (await redeem(service.request, code)).json();
    const client = new Client(
      { name: "noticeflow-probe", version: "1.0.0" },
      { versionNegotiation: { mode } },
    );
    const transport = new StreamableHTTPClientTransport(
      new URL(`${service.base}/mcp`),
      {
        requestInit: {
          headers: { authorization: `Bearer ${tokens.access_token}` },
        },
      },
    );
    await client.connect(transport);
    t.after(() => client.close());
    const tools = await client.listTools();
    assert.deepEqual(
      tools.tools.map((tool) => tool.name),
      ["submit_notification"],
    );
    assert.equal(tools.tools[0].annotations?.idempotentHint, false);
    const result = await client.callTool({
      name: "submit_notification",
      arguments: { topic: "build", title: "MCP title", content: "MCP message" },
    });
    assert.equal(result.isError, undefined);
    const output = result.structuredContent;
    assert.ok(
      output &&
        typeof output === "object" &&
        "status" in output &&
        "notificationId" in output,
    );
    assert.equal(output.status, "accepted");
    assert.equal(
      service.store.listTasks({ notification: String(output.notificationId) })
        .length,
      2,
    );
    const invalid = await client.callTool({
      name: "submit_notification",
      arguments: {
        topic: "build",
        title: "MCP title",
        content: "MCP message",
        extra: true,
      },
    });
    assert.equal(invalid.isError, true);
    assert.match(JSON.stringify(invalid.content), /INVALID_INPUT/);
  });
}

test("login requires a bound CSRF cookie and limits five failed passwords per source IP", async (t) => {
  const service = await fixture({
    providerFetch: async () => Response.json(claudeMetadata),
  });
  t.after(() => service.dispose());
  const start = await service.request(authPath());
  const location = start.headers.get("location")!;
  const cookies = start.headers
    .getSetCookie()
    .map((cookie) => cookie.split(";")[0])
    .join("; ");
  const page = await service.request(location, {
    headers: { cookie: cookies },
  });
  assert.equal(page.status, 200);
  const html = await page.text();
  const csrf = html.match(/name="csrf" value="([^"]+)"/)![1];
  const path = html.match(/action="([^"]+)"/)![1];
  const headers = {
    "content-type": "application/x-www-form-urlencoded",
    cookie: cookies,
  };
  const post = (cookie: string, password: string) =>
    service.request(path, {
      method: "POST",
      headers: { ...headers, cookie },
      body: new URLSearchParams({ csrf, password, approve: "yes" }),
    });
  assert.equal((await post(cookies, "test-admin-password")).status, 403);
  const bound =
    cookies +
    "; " +
    page.headers
      .getSetCookie()
      .map((cookie) => cookie.split(";")[0])
      .join("; ");
  assert.ok(
    page.headers
      .getSetCookie()
      .every(
        (cookie) =>
          /Secure/.test(cookie) &&
          /HttpOnly/.test(cookie) &&
          /SameSite=Lax/.test(cookie),
      ),
  );
  const failures = await Promise.all(
    Array.from({ length: 5 }, () => post(bound, "wrong-password")),
  );
  assert.ok(failures.every((response) => response.status === 401));
  assert.equal((await post(bound, "test-admin-password")).status, 429);
});
test("token revocation and repeated refresh use invalidate the old authorization chain", async (t) => {
  const service = await fixture({
    providerFetch: async () => Response.json(claudeMetadata),
  });
  t.after(() => service.dispose());
  const { code } = await authorize(service.request);
  const tokens = await (await redeem(service.request, code)).json();
  const refresh = () =>
    service.request("/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        client_id: CLAUDE,
        refresh_token: tokens.refresh_token,
      }),
    });
  const rotatedResponse = await refresh();
  assert.equal(rotatedResponse.status, 200);
  const rotated = await rotatedResponse.json();
  assert.equal((await refresh()).status, 400);
  assert.equal(
    (
      await service.request("/mcp", {
        method: "POST",
        headers: { authorization: `Bearer ${rotated.access_token}` },
        body: "{}",
      })
    ).status,
    401,
  );
  const fresh = await authorize(service.request);
  const valid = await (await redeem(service.request, fresh.code)).json();
  const revoke = await service.request("/token/revocation", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: CLAUDE,
      token: valid.access_token,
      token_type_hint: "access_token",
    }),
  });
  assert.equal(revoke.status, 200);
  assert.equal(
    (
      await service.request("/mcp", {
        method: "POST",
        headers: { authorization: `Bearer ${valid.access_token}` },
        body: "{}",
      })
    ).status,
    401,
  );
});

test("concurrent refresh consumes a token only once and grant persistence failures issue no new token", async (t) => {
  const service = await fixture({
    providerFetch: async () => Response.json(claudeMetadata),
  });
  t.after(() => service.dispose());
  const { code } = await authorize(service.request);
  const tokens = await (await redeem(service.request, code)).json();
  const refresh = () =>
    service.request("/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        client_id: CLAUDE,
        refresh_token: tokens.refresh_token,
      }),
    });
  const responses = await Promise.all([refresh(), refresh()]);
  assert.equal(
    responses.filter((response) => response.status === 200).length,
    1,
  );
  const fresh = await authorize(service.request);
  const database = new Database(service.config.storage.sqlitePath);
  t.after(() => database.close());
  database.exec(
    "CREATE TRIGGER prevent_renewal BEFORE UPDATE ON oauth_artifacts WHEN NEW.model='Grant' BEGIN SELECT RAISE(ABORT,'injected'); END",
  );
  const failed = await redeem(service.request, fresh.code);
  assert.equal(failed.status, 500);
  assert.equal((await failed.json()).access_token, undefined);
});

import Database from "better-sqlite3";
import { readFileSync } from "node:fs";
test("OAuth artifacts and database logs contain no plaintext passwords, codes or bearer credentials", async (t) => {
  const service = await fixture({
    providerFetch: async () => Response.json(claudeMetadata),
  });
  t.after(() => service.dispose());
  const { code } = await authorize(service.request);
  const tokens = await (await redeem(service.request, code)).json();
  for (const file of [
    service.config.storage.sqlitePath,
    `${service.config.storage.sqlitePath}-wal`,
  ]) {
    const bytes = readFileSync(file);
    for (const secret of [
      code,
      tokens.access_token,
      tokens.refresh_token,
      "test-admin-password",
    ])
      assert.ok(!bytes.includes(Buffer.from(secret)));
  }
});

test("Claude native adaptation does not override an explicit application type", async (t) => {
  const service = await fixture({
    providerFetch: async () =>
      Response.json({ ...claudeMetadata, application_type: "web" }),
  });
  t.after(() => service.dispose());
  const response = await service.request(authPath());
  assert.ok(
    response.status >= 400 ||
      response.headers.get("location")?.includes("error="),
  );
});
