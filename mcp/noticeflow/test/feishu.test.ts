import { test, type TestContext } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { writeFileSync } from "node:fs";
import { stringify } from "yaml";
import type { Config } from "../src/config.js";
import { createService, type ServiceOptions } from "../src/service.js";
import { SubmitError } from "../src/submit.js";
import { fixture } from "./fixture.js";

const hook = "https://open.feishu.cn/open-apis/bot/v2/hook/";
const notification = { topic: "build", title: "title", content: "body" };
const errorCode = (code: string) => (error: unknown) =>
  error instanceof SubmitError && error.code === code;
async function feishu(t: TestContext, options: ServiceOptions = {}) {
  const base = await fixture();
  t.after(() => base.dispose());
  base.config.targets = {
    signed: {
      channel: "feishu-webhook",
      webhookUrl: `${hook}token-a`,
      secret: "test-secret",
    },
    plain: { channel: "feishu-webhook", webhookUrl: `${hook}token-b` },
  };
  base.config.topics = { build: { targets: ["signed", "plain"] } };
  writeFileSync(base.configPath, stringify(base.config));
  const service = await createService(base.configPath, {
    logger: () => {},
    ...options,
  });
  t.after(() => service.close());
  return { ...service, config: base.config, configPath: base.configPath };
}

test("Feishu targets receive a JSON 2.0 card, signed only when a secret is configured", async (t) => {
  const requests: { url: string; body: unknown }[] = [];
  const service = await feishu(t, {
    now: () => 1700000000123,
    webhookFetch: async (url, init) => {
      requests.push({ url, body: JSON.parse(String(init.body)) });
      return Response.json({ code: 0, msg: "success", data: {} });
    },
  });
  const accepted = service.submit("client", {
    topic: "build",
    title: "*Build* <failed>",
    content: "**Body** ~~old~~",
  });
  await service.worker.runOnce();
  const card = {
    schema: "2.0",
    config: { update_multi: true },
    header: { title: { tag: "plain_text", content: "*Build* <failed>" } },
    body: { elements: [{ tag: "markdown", content: "**Body** ~~old~~" }] },
  };
  const timestamp = "1700000000";
  assert.deepEqual(
    requests.sort((a, b) => a.url.localeCompare(b.url)),
    [
      {
        url: `${hook}token-a`,
        body: {
          msg_type: "interactive",
          card,
          timestamp,
          sign: createHmac("sha256", `${timestamp}\ntest-secret`)
            .update("")
            .digest("base64"),
        },
      },
      { url: `${hook}token-b`, body: { msg_type: "interactive", card } },
    ],
  );
  assert.ok(
    service.store
      .listTasks({ notification: accepted.notificationId })
      .every((task) => task.status === "succeeded" && task.attempts === 1),
  );
});

test("Feishu content rejects images, HTML, mentions and oversized cards without truncation", async (t) => {
  const service = await feishu(t);
  const table = "| a |\n| --- |\n| 1 |\n\n";
  for (const content of [
    "![image](img_v2_key)",
    "<at id=all></at>",
    "<font color=red>text</font>",
    "`<at id=all></at>`",
    "```\n<at id=all></at>\n```",
    "- [x] task",
    "[link](javascript:alert)",
    "[^footnote]",
    table.repeat(5),
    "中".repeat(7000),
  ])
    assert.throws(
      () => service.submit("client", { ...notification, content }),
      errorCode("UNSUPPORTED_CONTENT"),
      content.slice(0, 40),
    );
  assert.equal(service.store.listTasks().length, 0);
  const content =
    "# Heading\n\n**bold** *em* ~~struck~~ @all\n\n1. item\n    - nested\n\n> quote\n\n[link](https://example.com)\n\n---\n\n`code`\n\n```ts\nconst a = 1;\n```\n\n" +
    table.repeat(4);
  assert.equal(
    service.submit("client", { ...notification, content }).status,
    "accepted",
  );
});

test("Feishu permanent errors fail immediately and rate limits cool the destination down", async (t) => {
  for (const failure of [9499, 19021, 19022, 19024]) {
    const service = await feishu(t, {
      webhookFetch: async () =>
        Response.json(
          { code: failure, msg: "do not retain remote secret", data: {} },
          { status: failure === 9499 ? 400 : 200 },
        ),
    });
    service.submit("client", notification);
    await service.worker.runOnce();
    assert.ok(
      service.store
        .listTasks()
        .every(
          (task) =>
            task.status === "failed_final" &&
            task.attempts === 1 &&
            task.lastErrorCode === "REMOTE_REJECTED" &&
            task.lastRemoteCode === failure,
        ),
    );
  }
  let time = 100000;
  let sends = 0;
  const service = await feishu(t, {
    now: () => time,
    webhookFetch: async () => {
      sends++;
      return Response.json({ code: 11232, msg: "rate limit", data: {} });
    },
  });
  service.submit("client", notification);
  await service.worker.runOnce();
  assert.equal(sends, 2);
  assert.ok(
    service.store
      .listTasks()
      .every(
        (task) =>
          task.status === "waiting_retry" &&
          task.lastErrorCode === "REMOTE_RATE_LIMIT",
      ),
  );
  service.submit("client", notification);
  time += 59999;
  await service.worker.runOnce();
  assert.equal(sends, 2);
  time += 1;
  await service.worker.runOnce();
  assert.equal(sends, 6);
});

test("Feishu Webhooks are canonicalized and unsafe target configuration is rejected", async (t) => {
  const service = await feishu(t);
  const write = () =>
    writeFileSync(service.configPath, stringify(service.config));
  service.config.targets.signed.webhookUrl =
    "https://OPEN.FEISHU.CN:443/open-apis/bot/v2/hook/token-a";
  write();
  const normalized = await createService(service.configPath);
  t.after(() => normalized.close());
  assert.equal(normalized.config.targets.signed.webhookUrl, `${hook}token-a`);
  for (const url of [
    `${hook}token-a?x=1`,
    `${hook}token-a?`,
    `${hook}token-a#fragment`,
    `${hook}token-a/extra`,
    `${hook}%74oken-a`,
    hook,
    "http://open.feishu.cn/open-apis/bot/v2/hook/token-a",
    "https://open.feishu.cn:8443/open-apis/bot/v2/hook/token-a",
    "https://user@open.feishu.cn/open-apis/bot/v2/hook/token-a",
    "https://evil.example/open-apis/bot/v2/hook/token-a",
    "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=token-a",
  ]) {
    service.config.targets.signed.webhookUrl = url;
    write();
    await assert.rejects(createService(service.configPath), /INVALID_CONFIG/, url);
  }
  service.config.targets.signed = {
    channel: "feishu-webhook",
    webhookUrl: `${hook}token-a`,
    secret: "",
  };
  write();
  await assert.rejects(createService(service.configPath), /INVALID_CONFIG/);
  service.config.targets.signed = {
    channel: "wecom-webhook",
    webhookUrl: "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=x",
    secret: "secret",
  } as Config["targets"][string];
  write();
  await assert.rejects(createService(service.configPath), /INVALID_CONFIG/);
});
