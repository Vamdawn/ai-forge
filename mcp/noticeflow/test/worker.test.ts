import { test } from "node:test";
import assert from "node:assert/strict";
import { fixture } from "./fixture.js";

test("worker sends the frozen markdown_v2 plan and records independent successful deliveries", async (t) => {
  const requests: { url: string; body: unknown }[] = [];
  const service = await fixture({
    webhookFetch: async (url, init) => {
      requests.push({ url, body: JSON.parse(String(init.body)) });
      return Response.json({ errcode: 0 });
    },
  });
  t.after(() => service.dispose());
  const accepted = service.submit("client", {
    topic: "build",
    title: "*Build*",
    content: "**Body**",
  });
  await service.worker.runOnce();
  assert.deepEqual(
    requests.map((request) => request.body),
    Array(2).fill({
      msgtype: "markdown_v2",
      markdown_v2: { content: "# \\*Build\\*\n\n**Body**" },
    }),
  );
  assert.ok(
    service.store
      .listTasks({ notification: accepted.notificationId })
      .every((task) => task.status === "succeeded" && task.attempts === 1),
  );
});

import { createService } from "../src/service.js";
import { writeFileSync } from "node:fs";
import { stringify } from "yaml";
const notification = { topic: "build", title: "title", content: "body" };
test("retryable responses use 1, 5 and 15 minute backoff then stop after four results", async (t) => {
  let time = 100000;
  const service = await fixture({
    now: () => time,
    webhookFetch: async () => Response.json({ errcode: -1 }),
  });
  t.after(() => service.dispose());
  service.submit("client", notification);
  for (const [attempt, delay] of [
    [1, 60000],
    [2, 300000],
    [3, 900000],
  ] as const) {
    await service.worker.runOnce();
    const tasks = service.store.listTasks();
    assert.ok(
      tasks.every(
        (task) =>
          task.status === "waiting_retry" &&
          task.attempts === attempt &&
          task.nextAttemptAt === time + delay,
      ),
    );
    time += delay;
  }
  await service.worker.runOnce();
  assert.ok(
    service.store
      .listTasks()
      .every(
        (task) =>
          task.status === "failed_final" &&
          task.attempts === 4 &&
          task.lastRemoteCode === -1,
      ),
  );
});
test("permanent business errors fail immediately while missing JSON and network errors retry", async (t) => {
  for (const failure of [93000, 93001, 93004, 40008, 45002]) {
    const service = await fixture({
      webhookFetch: async () =>
        Response.json({
          errcode: failure,
          errmsg: "do not retain remote secret",
        }),
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
            task.lastRemoteCode === failure,
        ),
    );
    await service.dispose();
  }
  const service = await fixture({
    webhookFetch: async (url) => {
      if (url.endsWith("a")) throw new Error("secret URL network error");
      return new Response("invalid JSON", { status: 200 });
    },
  });
  t.after(() => service.dispose());
  service.submit("client", notification);
  await service.worker.runOnce();
  assert.deepEqual(
    service.store
      .listTasks()
      .map((task) => task.lastErrorCode)
      .sort(),
    ["INVALID_RESPONSE", "NETWORK_ERROR"],
  );
  assert.ok(
    service.store
      .listTasks()
      .every((task) => task.status === "waiting_retry" && task.attempts === 1),
  );
});
test("shared cooldown survives reopening, blocks both targets on A, and lets B continue", async (t) => {
  let time = 100000;
  const sends: string[] = [];
  const service = await fixture({
    now: () => time,
    webhookFetch: async (url) => {
      sends.push(url);
      return url.endsWith("a")
        ? Response.json(
            { errcode: 45009 },
            { status: 429, headers: { "retry-after": "120" } },
          )
        : Response.json({ errcode: 0 });
    },
  });
  t.after(() => service.dispose());
  service.config.targets.b.webhookUrl = service.config.targets.a.webhookUrl;
  service.config.targets.c = {
    channel: "wecom-webhook",
    webhookUrl:
      "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=independent",
  };
  service.config.topics.build.targets = ["a", "b", "c"];
  writeFileSync(service.configPath, stringify(service.config));
  const reopened = await createService(service.configPath, {
    now: () => time,
    logger: () => {},
    webhookFetch: async (url) => {
      sends.push(url);
      return Response.json(
        { errcode: url.endsWith("a") ? 45009 : 0 },
        { headers: { "retry-after": "120" } },
      );
    },
  });
  t.after(() => reopened.close());
  service.submit("client", notification);
  await service.worker.runOnce();
  const before = sends.length;
  reopened.submit("new-client", notification);
  await reopened.worker.runOnce();
  assert.equal(sends.length, before + 1);
  assert.ok(
    reopened.store
      .listTasks({ status: "pending" })
      .filter((task) => task.targetId !== "c")
      .every((task) => task.attempts === 0),
  );
  time += 119999;
  await reopened.worker.runOnce();
  assert.equal(sends.length, before + 1);
  time += 1;
  await reopened.worker.runOnce();
  assert.ok(sends.length > before + 1);
});
test("actual HTTP starts stay within 20 per rolling minute per destination across delayed sends and reopen", async (t) => {
  let time = 0;
  let checks = 0;
  let injectDelay = false;
  const starts: { url: string; time: number }[] = [];
  const now = () => {
    checks++;
    if (injectDelay && checks === 3) {
      time = 19000;
      injectDelay = false;
    }
    return time;
  };
  const webhookFetch = async (url: string) => {
    starts.push({ url, time });
    return Response.json({ errcode: 0 });
  };
  const service = await fixture({ now, webhookFetch });
  t.after(() => service.dispose());
  for (let i = 0; i < 50; i++) service.submit(`client-${i}`, notification);
  checks = 0;
  injectDelay = true;
  for (let i = 0; i < 30; i++) await service.worker.runOnce();
  assert.equal(starts.length, 40);
  time = 60001;
  const reopened = await createService(service.configPath, {
    now,
    webhookFetch,
    logger: () => {},
  });
  t.after(() => reopened.close());
  await reopened.worker.runOnce();
  assert.equal(starts.length, 40);
  time = 110000;
  for (let i = 0; i < 30; i++) await reopened.worker.runOnce();
  assert.equal(starts.length, 80);
  for (const start of starts)
    assert.ok(
      starts.filter(
        (other) =>
          other.url === start.url &&
          other.time > start.time - 60000 &&
          other.time <= start.time,
      ).length <= 20,
    );
});
test("expired leases and results cannot send or overwrite a later lease, but stale throttling extends cooldown", async (t) => {
  let time = 100000;
  const resolve: ((value: Response) => void)[] = [];
  let count = 0;
  const service = await fixture({
    now: () => time,
    webhookFetch: async () => {
      count++;
      if (count <= 2)
        return new Promise<Response>((done) => resolve.push(done));
      return Response.json({ errcode: 0 });
    },
  });
  t.after(() => service.dispose());
  service.submit("client", notification);
  const original = service.worker.runOnce();
  time += 30001;
  await service.worker.runOnce();
  assert.ok(
    service.store
      .listTasks()
      .every((task) => task.status === "succeeded" && task.attempts === 1),
  );
  for (const done of resolve)
    done(
      Response.json({ errcode: 45009 }, { headers: { "retry-after": "120" } }),
    );
  await original;
  assert.ok(
    service.store
      .listTasks()
      .every((task) => task.status === "succeeded" && task.attempts === 1),
  );
  service.submit("client", notification);
  await service.worker.runOnce();
  assert.equal(count, 4);
});
test("worker does not start HTTP when the remaining lease equals the request timeout", async (t) => {
  let time = 100000;
  let reads = 0;
  let sends = 0;
  const service = await fixture({
    now: () => {
      if (++reads === 3) time += 20000;
      return time;
    },
    webhookFetch: async () => {
      sends++;
      return Response.json({ errcode: 0 });
    },
  });
  t.after(() => service.dispose());
  service.submit("client", notification);
  reads = 0;
  await service.worker.runOnce();
  assert.equal(sends, 0);
  assert.ok(
    service.store
      .listTasks()
      .every((task) => task.status === "waiting_retry" && task.attempts === 0),
  );
});

import { startMaintenance } from "../src/maintenance.js";
test("daily retention removes terminal deliveries after 90 days and retains unfinished notifications", async (t) => {
  const start = Date.now();
  t.mock.timers.enable({ apis: ["Date"], now: start });
  const service = await fixture({
    webhookFetch: async () => Response.json({ errcode: 0 }),
  });
  t.after(() => service.dispose());
  const completed = service.submit("client", notification);
  await service.worker.runOnce();
  const pending = service.submit("client", notification);
  t.mock.timers.setTime(start + 90 * 86400000);
  const stop = startMaintenance(service.store, service.config, () => {});
  await stop();
  assert.equal(
    service.store.listTasks({ notification: completed.notificationId }).length,
    0,
  );
  assert.equal(
    service.store.listTasks({ notification: pending.notificationId }).length,
    2,
  );
});

test("local fake HTTP Webhook sees markdown_v2 and redacted failure logs contain no message or remote text", async (t) => {
  const { createServer } = await import("node:http");
  const bodies: unknown[] = [];
  const server = createServer(async (req, res) => {
    let text = "";
    for await (const chunk of req) text += chunk;
    bodies.push(JSON.parse(text));
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ errcode: 93000, errmsg: "remote-secret" }));
  }).listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  t.after(() => new Promise<void>((resolve) => server.close(() => resolve())));
  const address = server.address();
  assert.ok(address && typeof address === "object");
  const logs: unknown[] = [];
  const service = await fixture({
    webhookFetch: (_url, init) =>
      fetch(`http://127.0.0.1:${address.port}/webhook`, init),
    logger: (record) => {
      logs.push(record);
    },
  });
  t.after(() => service.dispose());
  service.submit("client", { ...notification, content: "private-body" });
  await service.worker.runOnce();
  assert.equal(bodies.length, 2);
  assert.deepEqual(bodies[0], {
    msgtype: "markdown_v2",
    markdown_v2: { content: "# title\n\nprivate-body" },
  });
  assert.ok(
    !/private-body|remote-secret|httpStatus|remoteCode|webhook|password/i.test(
      JSON.stringify(logs),
    ),
  );
  assert.ok(
    service.store.listTasks().every((task) => task.lastRemoteCode === 93000),
  );
});

test("Retry-After accepts seconds and HTTP dates only on retryable responses", async () => {
  const now = Date.parse("2026-10-18T00:00:00Z");
  for (const response of [
    {
      status: 429,
      code: 0,
      header: "120",
      next: now + 120000,
      terminal: false,
    },
    {
      status: 200,
      code: 45009,
      header: new Date(now + 180000).toUTCString(),
      next: now + 180000,
      terminal: false,
    },
    {
      status: 503,
      code: 99,
      header: "2099",
      next: now + 2099000,
      terminal: false,
    },
    {
      status: 503,
      code: 99,
      header: "January 1, 2099",
      next: now + 60000,
      terminal: false,
    },
    { status: 400, code: 93000, header: "120", next: now, terminal: true },
  ]) {
    const service = await fixture({
      now: () => now,
      webhookFetch: async () =>
        Response.json(
          { errcode: response.code },
          {
            status: response.status,
            headers: { "retry-after": response.header },
          },
        ),
    });
    try {
      service.submit("client", notification);
      await service.worker.runOnce();
      assert.ok(
        service.store
          .listTasks()
          .every(
            (task) =>
              task.nextAttemptAt === response.next &&
              task.status ===
                (response.terminal ? "failed_final" : "waiting_retry"),
          ),
        response.header,
      );
    } finally {
      await service.dispose();
    }
  }
});
