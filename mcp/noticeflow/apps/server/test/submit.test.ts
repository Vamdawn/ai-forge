import { test } from "node:test";
import assert from "node:assert/strict";
import { fixture } from "./fixture.js";

test("submit durably accepts one notification with two independent deliveries and distinct duplicate IDs", async (t) => {
  const service = await fixture();
  t.after(() => service.dispose());
  const input = {
    topic: "build",
    title: "Build failed",
    content: "**Action required**",
  };
  const accepted = service.submit("test-client", input);
  assert.equal(accepted.status, "accepted");
  const deliveries = service.store.listTasks({
    notification: accepted.notificationId,
  });
  assert.equal(deliveries.length, 2);
  assert.deepEqual(deliveries.map((task) => task.targetId).sort(), ["a", "b"]);
  assert.ok(
    deliveries.every(
      (task) => task.status === "pending" && task.attempts === 0,
    ),
  );
  assert.notEqual(
    service.submit("test-client", input).notificationId,
    accepted.notificationId,
  );
});

import { SubmitError } from "../src/submit.js";
import Database from "better-sqlite3";
import { readFileSync, writeFileSync } from "node:fs";
import { stringify } from "yaml";
import { createService } from "../src/service.js";
const input = {
  topic: "build",
  title: "Private build title",
  content: "Private notification body",
};
const errorCode = (code: string) => (error: unknown) =>
  error instanceof SubmitError && error.code === code;
test("invalid input and unsupported Markdown reject the whole notification without truncation", async (t) => {
  const service = await fixture();
  t.after(() => service.dispose());
  for (const invalid of [
    null,
    {},
    { ...input, title: "line\nbreak" },
    { ...input, content: "" },
    { ...input, unexpected: "secret" },
  ])
    assert.throws(
      () => service.submit("client", invalid),
      errorCode("INVALID_INPUT"),
    );
  assert.throws(
    () => service.submit("client", { ...input, topic: "Build" }),
    errorCode("UNKNOWN_TOPIC"),
  );
  for (const content of [
    "![image](https://example.com/a.png)",
    "<b>raw</b>",
    "@all",
    "- [x] task",
    "~~deleted~~",
    "[link](javascript:alert)",
    "[^footnote]",
    "中".repeat(1366),
  ])
    assert.throws(
      () => service.submit("client", { ...input, content }),
      errorCode("UNSUPPORTED_CONTENT"),
    );
  assert.equal(service.store.listTasks().length, 0);
  const content =
    "# Heading\n\n**bold** *em*\n\n- item\n\n> quote\n\n[link](https://example.com)\n\n---\n\n`@all`\n\n```ts\n@all\n```\n\n| a | b |\n| --- | --- |\n| 1 | 2 |";
  assert.equal(
    service.submit("client", { ...input, content }).status,
    "accepted",
  );
});
test("queue capacity is checked for the complete fanout and failed transactions leave no partial notification", async (t) => {
  const service = await fixture();
  t.after(() => service.dispose());
  for (let i = 0; i < 500; i++) service.submit(`client-${i}`, input);
  assert.equal(service.store.listTasks().length, 1000);
  assert.throws(
    () => service.submit("another-client", input),
    errorCode("QUEUE_FULL"),
  );
  assert.equal(service.store.listTasks().length, 1000);
});
test("failed SQLite writes cannot return accepted or persist partial fanout", async (t) => {
  const service = await fixture();
  t.after(() => service.dispose());
  const database = new Database(service.config.storage.sqlitePath);
  database.exec(
    "CREATE TRIGGER fail_second BEFORE INSERT ON deliveries WHEN NEW.target_id='b' BEGIN SELECT RAISE(ABORT,'injected'); END",
  );
  t.after(() => database.close());
  assert.throws(() => service.submit("client", input));
  assert.equal(service.store.listTasks().length, 0);
  database.exec("DROP TRIGGER fail_second");
  assert.equal(service.submit("client", input).status, "accepted");
});
test("client rate limit includes rejected calls and expires on a rolling 60 second window", async (t) => {
  let time = 100000;
  const service = await fixture({ now: () => time });
  t.after(() => service.dispose());
  for (let i = 0; i < 120; i++)
    assert.throws(
      () => service.submit("client", {}),
      errorCode("INVALID_INPUT"),
    );
  assert.throws(
    () => service.submit("client", input),
    errorCode("RATE_LIMITED"),
  );
  assert.equal(service.submit("other-client", input).status, "accepted");
  time += 60000;
  assert.equal(service.submit("client", input).status, "accepted");
});
test("encrypted notification and destination snapshots survive restart and reject the wrong key", async (t) => {
  const service = await fixture();
  t.after(() => service.dispose());
  const accepted = service.submit("client", input);
  const files = [
    service.config.storage.sqlitePath,
    `${service.config.storage.sqlitePath}-wal`,
  ];
  for (const file of files) {
    const bytes = readFileSync(file);
    for (const secret of [
      input.title,
      input.content,
      "test-secret-a",
      "test-secret-b",
    ])
      assert.ok(!bytes.includes(Buffer.from(secret)));
  }
  const second = await createService(service.configPath);
  t.after(() => second.close());
  assert.equal(
    second.store.listTasks({ notification: accepted.notificationId }).length,
    2,
  );
  writeFileSync(
    service.config.storage.encryptionKeyFile,
    Buffer.alloc(32, 7).toString("base64"),
  );
  await assert.rejects(createService(service.configPath));
});
test("startup normalizes equivalent Webhooks and rejects unsafe configuration", async (t) => {
  const service = await fixture();
  t.after(() => service.dispose());
  const write = () =>
    writeFileSync(service.configPath, stringify(service.config));
  service.config.targets.a.webhookUrl =
    "https://QYAPI.WEIXIN.QQ.COM:443/cgi-bin/webhook/send?%6Bey=test%2Dsecret%2Da";
  write();
  const normalized = await createService(service.configPath);
  t.after(() => normalized.close());
  assert.equal(
    normalized.config.targets.a.webhookUrl,
    "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=test-secret-a",
  );
  for (const suffix of ["#fragment", "&other=1", "&key=duplicate", "%xx"]) {
    service.config.targets.a.webhookUrl = `https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=secret${suffix}`;
    write();
    await assert.rejects(createService(service.configPath), /INVALID_CONFIG/);
  }
  for (const url of [
    "https://qyapi.weixin.qq.com:8443/cgi-bin/webhook/send?key=x",
    "https://user@qyapi.weixin.qq.com/cgi-bin/webhook/send?key=x",
    "https://evil.example/cgi-bin/webhook/send?key=x",
    "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=%20",
  ]) {
    service.config.targets.a.webhookUrl = url;
    write();
    await assert.rejects(createService(service.configPath), /INVALID_CONFIG/);
  }
});

test("startup refuses a database from a newer schema version", async (t) => {
  const service = await fixture();
  t.after(() => service.dispose());
  const database = new Database(service.config.storage.sqlitePath);
  database
    .prepare("INSERT INTO schema_migrations VALUES (999,?)")
    .run(Date.now());
  database.close();
  await assert.rejects(
    createService(service.configPath),
    /NEWER_DATABASE_SCHEMA/,
  );
});

test("startup rejects an unusable backup directory before accepting work", async (t) => {
  const service = await fixture();
  t.after(() => service.dispose());
  service.config.storage.backupDir = service.config.storage.sqlitePath;
  writeFileSync(service.configPath, stringify(service.config));
  await assert.rejects(createService(service.configPath));
});
