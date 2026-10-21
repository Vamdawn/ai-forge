#!/usr/bin/env node
import { parseArgs } from "node:util";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { serve } from "./serve.js";
import { readPassword } from "./terminal.js";
import { loadConfig } from "./config.js";
import { Store } from "./store.js";
import { Vault } from "./crypto.js";
import { createBackup, listBackups, restoreBackup } from "./maintenance.js";
const statuses = [
  "pending",
  "processing",
  "waiting_retry",
  "succeeded",
  "failed_final",
];
function utc(value?: string) {
  if (value === undefined) return undefined;
  if (
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value) ||
    !Number.isFinite(Date.parse(value)) ||
    new Date(value).toISOString().replace(".000Z", "Z") !==
      value.replace(".000Z", "Z")
  )
    throw new Error("INVALID_TIME");
  return Date.parse(value);
}
export async function main(args: string[], io = { readPassword }) {
  const { values, positionals } = parseArgs({
    args,
    allowPositionals: true,
    options: {
      config: { type: "string" },
      status: { type: "string" },
      "received-from": { type: "string" },
      "received-before": { type: "string" },
      notification: { type: "string" },
    },
  });
  if (!values.config) throw new Error("CONFIG_REQUIRED");
  const config = loadConfig(values.config);
  const [group, action, id, ...extra] = positionals;
  if (extra.length) throw new Error("INVALID_COMMAND");
  if (group === "serve" && !action) {
    await serve(values.config, config);
    return;
  }
  if (group === "backup" && action === "restore" && id)
    return restoreBackup(
      config,
      new Vault(config.storage.encryptionKeyFile),
      id,
    );
  const store = new Store(
    config.storage.sqlitePath,
    new Vault(config.storage.encryptionKeyFile),
    undefined,
    group === "auth" && action === "reset-password",
  );
  try {
    if (group === "auth" && action === "reset-password" && !id) {
      const first = await io.readPassword("New administrator password: ");
      const second = await io.readPassword("Confirm password: ");
      if (!first || first !== second) throw new Error("PASSWORD_MISMATCH");
      await store.resetPassword(first);
      return { status: "password_reset" };
    }
    if (group === "tasks" && action === "list" && !id) {
      if (values.status && !statuses.includes(values.status))
        throw new Error("INVALID_STATUS");
      const receivedFrom = utc(values["received-from"]);
      const receivedBefore = utc(values["received-before"]);
      if (
        receivedFrom !== undefined &&
        receivedBefore !== undefined &&
        receivedFrom >= receivedBefore
      )
        throw new Error("INVALID_TIME");
      return store.listTasks({
        status: values.status,
        receivedFrom,
        receivedBefore,
        notification: values.notification,
      });
    }
    if (group === "tasks" && action === "show" && id) {
      const task = store.showTask(id);
      if (!task) throw new Error("TASK_NOT_FOUND");
      return task;
    }
    if (group === "tasks" && action === "retry" && id) {
      const operatedAt = Date.now();
      try {
        const task = store.retryTask(id, operatedAt);
        process.stderr.write(
          JSON.stringify({
            deliveryId: task.id,
            operatedAt,
            status: task.status,
            attempts: task.attempts,
          }) + "\n",
        );
        return task;
      } catch (error) {
        const errorCode =
          error instanceof Error &&
          ["QUEUE_FULL", "TASK_NOT_RETRYABLE"].includes(error.message)
            ? error.message
            : "RETRY_FAILED";
        process.stderr.write(
          JSON.stringify({ deliveryId: id, operatedAt, errorCode }) + "\n",
        );
        throw error;
      }
    }
    if (group === "backup" && action === "create" && !id)
      return await createBackup(store, config.storage.backupDir);
    if (group === "backup" && action === "list" && !id)
      return listBackups(config.storage.backupDir);
    throw new Error("INVALID_COMMAND");
  } finally {
    store.close();
  }
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  process.umask(0o077);
  main(process.argv.slice(2))
    .then((result) => {
      if (result !== undefined)
        process.stdout.write(JSON.stringify(result) + "\n");
    })
    .catch(() => {
      process.stderr.write(
        JSON.stringify({ errorCode: "COMMAND_FAILED" }) + "\n",
      );
      process.exitCode = 1;
    });
}
