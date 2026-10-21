import { test } from "node:test";
import assert from "node:assert/strict";
import { fixture } from "./fixture.js";
import { authPath, claudeMetadata, redeem, type Requester } from "./oauth-client.js";

function session(request: Requester, issuer = "https://notice.example.com") {
  const cookies = new Map<string, string>();
  const send: Requester = async (path, init = {}) => {
    const url = new URL(path, issuer);
    const response = await request(url.pathname + url.search, {
      ...init,
      headers: { cookie: [...cookies.values()].join("; "), ...init.headers },
    });
    for (const cookie of response.headers.getSetCookie()) {
      const value = cookie.split(";")[0];
      cookies.set(value.split("=")[0], value);
    }
    return response;
  };
  async function follow(response: Response) {
    for (let i = 0; i < 10; i++) {
      const location = response.headers.get("location");
      if (!location || location.startsWith("http://localhost:")) return response;
      response = await send(location);
    }
    throw new Error("Too many authorization redirects");
  }
  return {
    send,
    follow,
    open: async () => follow(await send(authPath({}, issuer))),
    post: async (html: string, values: Record<string, string>) => {
      const csrf = html.match(/name="csrf" value="([^"]+)"/)?.[1];
      const path = html.match(/action="([^"]+)"/)?.[1];
      assert.ok(csrf);
      assert.ok(path);
      return send(path, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ csrf, approve: "yes", ...values }),
      });
    },
  };
}

test("connection panel escapes client metadata and nonces all inline assets under the deployment path", async (t) => {
  const issuer = "https://notice.example.com/noticeflow";
  const service = await fixture({
    providerFetch: async () => Response.json({
      ...claudeMetadata, client_name: '<img src=x onerror="alert(1)"> & client',
    }),
  }, undefined, issuer);
  t.after(() => service.dispose());
  const browser = session(service.request, issuer);
  const page = await browser.open();
  const html = await page.text();
  assert.equal(page.status, 200);
  assert.match(html, /<html lang="zh-CN">/);
  assert.match(html, /name="viewport"/);
  assert.match(html, /&lt;img src=x onerror=&quot;alert\(1\)&quot;&gt; &amp; client/);
  assert.doesNotMatch(html, /<img|onerror="|unsafe-inline|https?:\/\/[^" ]+\.(?:js|css)/);
  assert.match(html, /action="\/noticeflow\/interaction\//);
  assert.match(html, /验证身份/);
  assert.match(html, /查看连接详情/);
  assert.match(html, /https:\/\/notice.example.com\/noticeflow\/mcp/);
  assert.match(html, /autocomplete="current-password"/);
  assert.match(html, /name="approve" value="no" formnovalidate/);
  const nonce = html.match(/<style nonce="([^"]+)"/)?.[1];
  assert.ok(nonce);
  assert.match(html, new RegExp(`<script nonce="${nonce}">`));
  const policy = page.headers.get("content-security-policy")!;
  for (const directive of ["default-src 'none'", "frame-ancestors 'none'", "base-uri 'none'", `style-src 'nonce-${nonce}'`, `script-src 'nonce-${nonce}'`, "form-action 'self' http://localhost:49152"])
    assert.ok(policy.split("; ").includes(directive), policy);
  assert.equal(page.headers.get("cache-control"), "no-store");
  assert.equal(page.headers.get("referrer-policy"), "no-referrer");
  assert.doesNotMatch(page.headers.getSetCookie().join(";"), new RegExp(nonce));
  const next = await browser.open();
  assert.ok(!(await next.text()).includes(`nonce="${nonce}"`));
});

test("wrong password renders a retryable empty field, then login and explicit consent issue a usable code", async (t) => {
  const service = await fixture({ providerFetch: async () => Response.json(claudeMetadata) });
  t.after(() => service.dispose());
  const browser = session(service.request);
  const login = await (await browser.open()).text();
  const failure = await browser.post(login, { password: "wrong-password" });
  assert.equal(failure.status, 401);
  assert.match(failure.headers.get("content-type")!, /text\/html/);
  const retry = await failure.text();
  assert.match(retry, /密码不正确，请重新输入/);
  assert.match(retry, /aria-invalid="true"/);
  assert.doesNotMatch(retry, /wrong-password/);
  const consent = await browser.follow(await browser.post(retry, { password: "test-admin-password" }));
  const html = await consent.text();
  assert.equal(consent.status, 200);
  assert.match(html.replace(/<[^>]*>/g, ""), /允许 Claude Code 发送通知/);
  assert.match(html, /管理员身份已验证/);
  assert.doesNotMatch(html, /name="password"|test-admin-password/);
  const complete = await browser.follow(await browser.post(html, {}));
  const callback = new URL(complete.headers.get("location")!);
  assert.equal(callback.searchParams.get("state"), "test-state");
  assert.equal(callback.searchParams.get("error"), null);
  assert.equal((await redeem(service.request, callback.searchParams.get("code")!)).status, 200);
});

for (const prompt of ["login", "consent"]) {
  test(`cancel ${prompt} requires CSRF and returns access_denied without a code`, async (t) => {
    const service = await fixture({ providerFetch: async () => Response.json(claudeMetadata) });
    t.after(() => service.dispose());
    const browser = session(service.request);
    let html = await (await browser.open()).text();
    if (prompt === "consent")
      html = await (await browser.follow(await browser.post(html, { password: "test-admin-password" }))).text();
    assert.equal((await browser.post(html, { approve: "no", csrf: "invalid" })).status, 403);
    const response = await browser.follow(await browser.post(html, { approve: "no" }));
    const callback = new URL(response.headers.get("location")!);
    assert.equal(callback.origin, "http://localhost:49152");
    assert.equal(callback.searchParams.get("state"), "test-state");
    assert.equal(callback.searchParams.get("error"), "access_denied");
    assert.equal(callback.searchParams.get("code"), null);
  });
}

test("password throttling renders guidance and still allows cancelling", async (t) => {
  const service = await fixture({ providerFetch: async () => Response.json(claudeMetadata) });
  t.after(() => service.dispose());
  const browser = session(service.request);
  let html = await (await browser.open()).text();
  for (let i = 0; i < 5; i++) {
    const failure = await browser.post(html, { password: "wrong" });
    assert.equal(failure.status, 401);
    html = await failure.text();
  }
  const limited = await browser.post(html, { password: "test-admin-password" });
  assert.equal(limited.status, 429);
  html = await limited.text();
  assert.match(html, /请稍后再试/);
  assert.doesNotMatch(html, /name="password"/);
  const cancelled = await browser.follow(await browser.post(html, { approve: "no" }));
  assert.equal(new URL(cancelled.headers.get("location")!).searchParams.get("error"), "access_denied");
});

test("expired interaction renders safe restart guidance for GET and POST", async (t) => {
  const service = await fixture({ providerFetch: async () => Response.json(claudeMetadata) });
  t.after(() => service.dispose());
  const browser = session(service.request);
  const html = await (await browser.open()).text();
  const path = html.match(/action="([^"]+)"/)![1];
  await service.store.adapter("Interaction").destroy(path.split("/").at(-1)!);
  for (const response of [await browser.send(path), await browser.post(html, { approve: "no" })]) {
    assert.equal(response.status, 410);
    assert.equal(response.headers.get("location"), null);
    assert.equal(response.headers.get("cache-control"), "no-store");
    const body = await response.text();
    assert.match(body, /这次授权请求已过期/);
    assert.match(body, /重新发起/);
    assert.doesNotMatch(body, /<form|test-admin-password|http:\/\/localhost/);
  }
});
