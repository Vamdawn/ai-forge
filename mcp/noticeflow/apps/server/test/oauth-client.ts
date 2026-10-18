import { createHash } from "node:crypto";
import assert from "node:assert/strict";
import { CLAUDE, CHATGPT } from "./fixture.js";
export const claudeMetadata = {
  client_id: CLAUDE,
  client_name: "Claude Code",
  client_uri: "https://claude.ai",
  redirect_uris: ["http://localhost/callback", "http://127.0.0.1/callback"],
  grant_types: ["authorization_code", "refresh_token"],
  response_types: ["code"],
  token_endpoint_auth_method: "none",
};
export const chatgptMetadata = {
  client_id: CHATGPT,
  client_name: "ChatGPT",
  redirect_uris: ["https://chatgpt.com/connector_platform_oauth_redirect"],
  grant_types: ["authorization_code", "refresh_token"],
  response_types: ["code"],
  token_endpoint_auth_method: "private_key_jwt",
  token_endpoint_auth_methods_supported: ["none", "private_key_jwt"],
  token_endpoint_auth_signing_alg: "RS256",
  jwks_uri: "https://chatgpt.com/oauth/jwks.json",
};
export type Requester = (path: string, init?: RequestInit) => Promise<Response>;
export const verifier =
  "noticeflow-test-pkce-verifier-abcdefghijklmnopqrstuvwxyz123456789";
export function authPath(overrides: Record<string, string> = {}) {
  return (
    "/auth?" +
    new URLSearchParams({
      client_id: CLAUDE,
      response_type: "code",
      redirect_uri: "http://localhost:49152/callback",
      scope: "notification:submit",
      resource: "https://notice.example.com/mcp",
      state: "test-state",
      code_challenge: createHash("sha256").update(verifier).digest("base64url"),
      code_challenge_method: "S256",
      ...overrides,
    })
  );
}
export async function authorize(
  request: Requester,
  overrides: Record<string, string> = {},
) {
  const cookies = new Map<string, string>();
  const send: Requester = async (path, init = {}) => {
    const response = await request(path, {
      ...init,
      headers: { cookie: [...cookies.values()].join("; "), ...init.headers },
    });
    for (const cookie of response.headers.getSetCookie()) {
      const value = cookie.split(";")[0];
      cookies.set(value.split("=")[0], value);
    }
    return response;
  };
  let response = await send(authPath(overrides));
  for (let i = 0; i < 10; i++) {
    const location = response.headers.get("location");
    if (
      location?.startsWith(
        overrides.redirect_uri ?? "http://localhost:49152/callback",
      )
    ) {
      const callback = new URL(location);
      assert.equal(callback.searchParams.get("error"), null);
      const code = callback.searchParams.get("code");
      assert.ok(code);
      return { code, cookies };
    }
    if (location) {
      const url = new URL(location, "https://notice.example.com");
      response = await send(url.pathname + url.search);
    } else {
      const html = await response.text();
      assert.equal(response.status, 200, html);
      const csrf = html.match(/name="csrf" value="([^"]+)"/)?.[1];
      assert.ok(csrf, html);
      const path = html.match(/action="([^"]+)"/)?.[1];
      assert.ok(path, html);
      response = await send(path, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          csrf,
          password: "test-admin-password",
          approve: "yes",
        }),
      });
    }
  }
  throw new Error("Authorization did not complete");
}
export function redeem(
  request: Requester,
  code: string,
  overrides: Record<string, string> = {},
) {
  return request("/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: CLAUDE,
      code,
      code_verifier: verifier,
      redirect_uri: "http://localhost:49152/callback",
      resource: "https://notice.example.com/mcp",
      ...overrides,
    }),
  });
}
