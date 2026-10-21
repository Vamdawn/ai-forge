import { test } from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { fixture } from "./fixture.js";
const exec = promisify(execFile);
const main = fileURLToPath(new URL("../src/main.ts", import.meta.url));
async function cli(config: string, ...args: string[]) {
  const result = await exec(process.execPath, [
    "--import",
    "tsx",
    main,
    ...args,
    "--config",
    config,
  ]);
  return JSON.parse(result.stdout);
}
test("maintenance CLI lists by received time, shows metadata, and creates verified encrypted backups", async (t) => {
  const service = await fixture({
    now: () => Date.parse("2026-10-18T00:00:00Z"),
  });
  t.after(() => service.dispose());
  const accepted = service.submit("client", {
    topic: "build",
    title: "private-title",
    content: "private-body",
  });
  const tasks = await cli(
    service.configPath,
    "tasks",
    "list",
    "--received-from",
    "2026-10-18T00:00:00Z",
    "--received-before",
    "2026-10-19T00:00:00Z",
    "--notification",
    accepted.notificationId,
  );
  assert.equal(tasks.length, 2);
  assert.ok(!JSON.stringify(tasks).includes("private-"));
  assert.deepEqual(
    await cli(service.configPath, "tasks", "show", tasks[0].id),
    tasks[0],
  );
  const backup = await cli(service.configPath, "backup", "create");
  assert.ok(backup.file);
  assert.equal((await cli(service.configPath, "backup", "list")).length, 1);
});

import { main as runCommand } from "../src/main.js";
import { createService } from "../src/service.js";
import { authorize, redeem, claudeMetadata, authPath } from "./oauth-client.js";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
test("failed tasks can be requeued through the CLI with the original destination and reset budget", async (t) => {
  let sends = 0;
  const service = await fixture({
    webhookFetch: async () => {
      sends++;
      return Response.json({ errcode: 93000 });
    },
  });
  t.after(() => service.dispose());
  service.submit("client", { topic: "build", title: "title", content: "body" });
  await service.worker.runOnce();
  const task = service.store.listTasks()[0];
  await cli(service.configPath, "tasks", "retry", task.id);
  assert.equal(sends, 2);
  const retried = service.store.showTask(task.id)!;
  assert.equal(retried.status, "pending");
  assert.equal(retried.attempts, 0);
  assert.equal(retried.finishedAt, null);
  await assert.rejects(cli(service.configPath, "tasks", "retry", task.id));
});
test("password reset takes an exclusive lock before asking, and revokes all old OAuth state atomically", async (t) => {
  const options = { providerFetch: async () => Response.json(claudeMetadata) };
  const service = await fixture(options);
  t.after(() => service.dispose());
  const { code } = await authorize(service.request);
  const tokens = await (await redeem(service.request, code)).json();
  let asked = false;
  await assert.rejects(
    runCommand(["auth", "reset-password", "--config", service.configPath], {
      readPassword: async () => {
        asked = true;
        return "new-password";
      },
    }),
  );
  assert.equal(asked, false);
  await service.close();
  await runCommand(["auth", "reset-password", "--config", service.configPath], {
    readPassword: async () => "new-password",
  });
  const reopened = await createService(service.configPath, options);
  t.after(() => reopened.close());
  assert.equal(
    await reopened.store.adapter("AccessToken").find(tokens.access_token),
    undefined,
  );
  assert.equal(
    await reopened.store.adapter("RefreshToken").find(tokens.refresh_token),
    undefined,
  );
});
test("backup restore refuses active connections, restores the selected state, revokes grants and pauses sends", async (t) => {
  const service = await fixture();
  t.after(() => service.dispose());
  service.submit("client", { topic: "build", title: "first", content: "body" });
  const backup = await cli(service.configPath, "backup", "create");
  service.submit("client", {
    topic: "build",
    title: "second",
    content: "body",
  });
  await assert.rejects(
    cli(service.configPath, "backup", "restore", backup.file),
  );
  await service.close();
  const restored = await cli(
    service.configPath,
    "backup",
    "restore",
    backup.file,
  );
  assert.equal(restored.status, "restored");
  let time = 100000;
  let sends = 0;
  const reopened = await createService(service.configPath, {
    now: () => time,
    webhookFetch: async () => {
      sends++;
      return Response.json({ errcode: 0 });
    },
    logger: () => {},
  });
  t.after(() => reopened.close());
  assert.equal(reopened.store.listTasks().length, 2);
  time = Date.now(); // Keep the task due date while testing the full restore pause.
  await reopened.close();
  const paused = await createService(service.configPath, {
    now: () => time,
    webhookFetch: async () => {
      sends++;
      return Response.json({ errcode: 0 });
    },
    logger: () => {},
  });
  t.after(() => paused.close());
  await paused.worker.runOnce();
  assert.equal(sends, 0);
  time += 59999;
  await paused.worker.runOnce();
  assert.equal(sends, 0);
  time++;
  await paused.worker.runOnce();
  assert.equal(sends, 2);
  assert.ok(
    readFileSync(join(restored.preservedDirectory, "notice.sqlite")).length > 0,
  );
});

import fs from "node:fs";
import { syncBuiltinESMExports } from "node:module";
for (const phase of ["prepared", "preserved", "ready", "installed"]) {
  test(`restore interrupted after ${phase} blocks startup and resumes without replacing preserved files`, async (t) => {
    const service = await fixture();
    t.after(() => service.dispose());
    service.submit("client", {
      topic: "build",
      title: "backup",
      content: "body",
    });
    const backup = await cli(service.configPath, "backup", "create");
    service.submit("client", {
      topic: "build",
      title: "later",
      content: "body",
    });
    await service.close();
    const markerPath = `${service.config.storage.sqlitePath}.restore.json`;
    const rename = fs.renameSync;
    const injection = t.mock.method(
      fs,
      "renameSync",
      (...args: Parameters<typeof rename>) => {
        rename(...args);
        if (
          String(args[1]) === markerPath &&
          JSON.parse(fs.readFileSync(markerPath, "utf8")).stage === phase
        )
          throw new Error("injected interruption");
      },
    );
    syncBuiltinESMExports();
    try {
      await assert.rejects(
        runCommand([
          "backup",
          "restore",
          backup.file,
          "--config",
          service.configPath,
        ]),
      );
    } finally {
      injection.mock.restore();
      syncBuiltinESMExports();
    }
    await assert.rejects(
      createService(service.configPath),
      /RESTORE_IN_PROGRESS/,
    );
    const marker = JSON.parse(readFileSync(markerPath, "utf8"));
    const preserved = join(marker.preservedDirectory, "notice.sqlite");
    const before = fs.existsSync(preserved)
      ? readFileSync(preserved)
      : undefined;
    const resumed = await cli(
      service.configPath,
      "backup",
      "restore",
      backup.file,
    );
    if (before) assert.deepEqual(readFileSync(preserved), before);
    assert.equal(resumed.status, "restored");
    const reopened = await createService(service.configPath);
    t.after(() => reopened.close());
    assert.equal(reopened.store.listTasks().length, 2);
  });
}
test("restore preserves nonempty WAL after abrupt exit and uses only the selected backup", async (t) => {
  const service = await fixture();
  t.after(() => service.dispose());
  service.submit("client", {
    topic: "build",
    title: "backup",
    content: "body",
  });
  const backup = await cli(service.configPath, "backup", "create");
  await service.close();
  const source = fileURLToPath(new URL("../src/service.ts", import.meta.url));
  await exec(process.execPath, [
    "--import",
    "tsx",
    "--input-type=module",
    "-e",
    `import { createService } from ${JSON.stringify(source)}; const service = await createService(process.argv[1]); service.submit('crashed', {topic:'build',title:'later WAL',content:'body'}); process.exit(0);`,
    service.configPath,
  ]);
  const wal = readFileSync(`${service.config.storage.sqlitePath}-wal`);
  assert.ok(wal.length > 0);
  const restored = await cli(
    service.configPath,
    "backup",
    "restore",
    backup.file,
  );
  assert.deepEqual(
    readFileSync(join(restored.preservedDirectory, "notice.sqlite-wal")),
    wal,
  );
  const reopened = await createService(service.configPath);
  t.after(() => reopened.close());
  assert.equal(reopened.store.listTasks().length, 2);
});
test("backups keep the latest seven only after success and reject corrupt or wrong-key recovery", async (t) => {
  const service = await fixture();
  t.after(() => service.dispose());
  for (let i = 0; i < 8; i++) await cli(service.configPath, "backup", "create");
  const backups: string[] = await cli(service.configPath, "backup", "list");
  assert.equal(backups.length, 7);
  const failingBackup = fs.renameSync;
  const injection = t.mock.method(
    fs,
    "renameSync",
    (...args: Parameters<typeof failingBackup>) => {
      if (String(args[1]).endsWith(".sqlite")) throw new Error("disk failure");
      failingBackup(...args);
    },
  );
  syncBuiltinESMExports();
  try {
    await assert.rejects(
      runCommand(["backup", "create", "--config", service.configPath]),
    );
  } finally {
    injection.mock.restore();
    syncBuiltinESMExports();
  }
  assert.deepEqual(await cli(service.configPath, "backup", "list"), backups);
  const originalKey = readFileSync(service.config.storage.encryptionKeyFile);
  await service.close();
  writeFileSync(
    service.config.storage.encryptionKeyFile,
    Buffer.alloc(32, 4).toString("base64"),
  );
  await assert.rejects(
    cli(service.configPath, "backup", "restore", backups[0]),
  );
  writeFileSync(service.config.storage.encryptionKeyFile, originalKey);
  writeFileSync(
    join(service.config.storage.backupDir, "corrupt.sqlite"),
    "not a database",
  );
  await assert.rejects(
    cli(service.configPath, "backup", "restore", "corrupt.sqlite"),
  );
  const reopened = await createService(service.configPath);
  t.after(() => reopened.close());
  assert.equal(reopened.store.listTasks().length, 0);
});

import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { request as requestHttp } from "node:http";
import { stringify } from "yaml";
import { setTimeout as delay } from "node:timers/promises";
import {
  Client,
  StreamableHTTPClientTransport,
} from "@modelcontextprotocol/client";
test("serve drains OAuth requests and gracefully closes MCP subscriptions on SIGTERM", async (t) => {
  const service = await fixture({
    providerFetch: async () => Response.json(claudeMetadata),
  });
  t.after(() => service.dispose());
  const reservation = createServer().listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => reservation.once("listening", resolve));
  const address = reservation.address();
  assert.ok(address && typeof address === "object");
  await new Promise<void>((resolve) => reservation.close(() => resolve()));
  service.config.server.listen = `127.0.0.1:${address.port}`;
  writeFileSync(service.configPath, stringify(service.config));
  const child = spawn(
    process.execPath,
    ["--import", "tsx", main, "serve", "--config", service.configPath],
    { stdio: "pipe" },
  );
  let errors = "";
  child.stderr.on("data", (chunk) => {
    errors += chunk.toString();
  });
  t.after(() => {
    if (child.exitCode === null) child.kill("SIGKILL");
  });
  let healthy = false;
  for (let i = 0; i < 50; i++) {
    try {
      const response = await fetch(`http://127.0.0.1:${address.port}/healthz`);
      const body = await response.json();
      healthy = body.worker === "running" && body.database === "ok";
      if (healthy) break;
    } catch {}
    await delay(100);
  }
  assert.ok(healthy, errors);
  await assert.rejects(cli(service.configPath, "serve"));
  const { code } = await authorize(service.request);
  const tokens = await (await redeem(service.request, code)).json();
  const client = new Client(
    { name: "shutdown-probe", version: "1.0.0" },
    { versionNegotiation: { mode: { pin: "2026-07-28" } } },
  );
  t.after(() => client.close());
  await client.connect(
    new StreamableHTTPClientTransport(
      new URL(`http://127.0.0.1:${address.port}/mcp`),
      {
        requestInit: {
          headers: { authorization: `Bearer ${tokens.access_token}` },
        },
      },
    ),
  );
  const subscription = await client.listen({ toolsListChanged: true });
  const login = await service.request(authPath());
  const cookies = login.headers.getSetCookie().map((value) => value.split(";")[0]);
  const page = await service.request(login.headers.get("location")!, {
    headers: { cookie: cookies.join("; ") },
  });
  cookies.push(...page.headers.getSetCookie().map((value) => value.split(";")[0]));
  const html = await page.text();
  const csrf = html.match(/name="csrf" value="([^"]+)"/)![1];
  const action = html.match(/action="([^"]+)"/)![1];
  const form = new URLSearchParams({
    csrf,
    password: "test-admin-password",
    approve: "yes",
  }).toString();
  const pendingLogin = requestHttp(`http://127.0.0.1:${address.port}${action}`, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      "content-length": Buffer.byteLength(form),
      cookie: cookies.join("; "),
      expect: "100-continue",
    },
  });
  t.after(() => pendingLogin.destroy());
  const loginStatus = new Promise<number | undefined>((resolve, reject) => {
    pendingLogin.once("error", reject);
    pendingLogin.once("response", (response) => {
      response.resume();
      response.once("end", () => resolve(response.statusCode));
    });
  });
  const requestAccepted = new Promise<void>((resolve) =>
    pendingLogin.once("continue", resolve),
  );
  pendingLogin.flushHeaders();
  await requestAccepted;
  const exit = new Promise<number | null>((resolve) =>
    child.once("exit", resolve),
  );
  child.kill("SIGTERM");
  const subscriptionClosed = await Promise.race([
    subscription.closed,
    delay(2000, "still-open", { ref: false }),
  ]);
  pendingLogin.end(form);
  assert.equal(await loginStatus, 303);
  assert.equal(subscriptionClosed, "graceful");
  assert.equal(await exit, 0, errors);
});

test("manual retry audits the delivery, operation time and success or refusal", async (t) => {
  const service = await fixture({
    webhookFetch: async () => Response.json({ errcode: 93000 }),
  });
  t.after(() => service.dispose());
  service.submit("client", {
    topic: "build",
    title: "private title",
    content: "private content",
  });
  await service.worker.runOnce();
  const task = service.store.listTasks()[0];
  const success = await exec(process.execPath, [
    "--import",
    "tsx",
    main,
    "tasks",
    "retry",
    task.id,
    "--config",
    service.configPath,
  ]);
  const audit = JSON.parse(success.stderr.trim());
  assert.equal(audit.deliveryId, task.id);
  assert.equal(audit.status, "pending");
  assert.equal(audit.operatedAt, JSON.parse(success.stdout).nextAttemptAt);
  try {
    await cli(service.configPath, "tasks", "retry", task.id);
    assert.fail("pending delivery must not retry");
  } catch (error) {
    assert.ok(error && typeof error === "object" && "stderr" in error);
    const refused = JSON.parse(String(error.stderr).split("\n")[0]);
    assert.equal(refused.deliveryId, task.id);
    assert.equal(refused.errorCode, "TASK_NOT_RETRYABLE");
    assert.ok(Number.isInteger(refused.operatedAt));
    assert.ok(
      !/private title|private content|webhook/.test(JSON.stringify(refused)),
    );
  }
});
