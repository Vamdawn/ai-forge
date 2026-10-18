import { randomUUID } from "node:crypto";
import { migrate } from "./migrations.js";
import Database from "better-sqlite3";
import { chmodSync, closeSync, existsSync, mkdirSync, openSync } from "node:fs";
import { dirname } from "node:path";
import { flockSync } from "fs-ext";
import type {
  DeliveryPlan,
  NotificationInput,
  SendOutcome,
} from "./channel.js";
import { Vault } from "./crypto.js";
import { AuthorizationStore } from "./storage/authorization.js";
export {
  validateDatabase,
  readCooldowns,
  prepareRestoredDatabase,
  verifyRestoredDatabase,
} from "./storage/recovery.js";
export class Store {
  private db!: Database.Database;
  private authorization: AuthorizationStore;
  private lock: number;
  private closed = false;
  constructor(
    readonly path: string,
    readonly vault: Vault,
    private now: () => number = () => Date.now(),
    exclusive = false,
  ) {
    mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
    this.lock = openSync(`${path}.lock`, "a", 0o600);
    try {
      flockSync(this.lock, exclusive ? "exnb" : "shnb");
      if (existsSync(`${path}.restore.json`))
        throw new Error("RESTORE_IN_PROGRESS");
      this.db = new Database(path, { timeout: 3000 });
      chmodSync(path, 0o600);
      this.db.pragma("journal_mode = WAL");
      this.db.pragma("synchronous = FULL");
      this.db.pragma("foreign_keys = ON");
      migrate(this.db, this.now());
      const check = this.db
        .prepare("SELECT cipher FROM key_check WHERE id=1")
        .get() as { cipher: string } | undefined;
      if (check) {
        if (
          vault.decrypt(check.cipher, "key_check", "1", "cipher") !==
          "noticeflow-v1"
        )
          throw new Error("WRONG_DATA_KEY");
      } else
        this.db
          .prepare("INSERT INTO key_check VALUES (1, ?)")
          .run(vault.encrypt("noticeflow-v1", "key_check", "1", "cipher"));
      this.authorization = new AuthorizationStore(this.db, vault, this.now);
    } catch (error) {
      this.db!?.close();
      closeSync(this.lock);
      throw error;
    }
  }
  initializeAdmin(initialPassword?: string) {
    return this.authorization.initializeAdmin(initialPassword);
  }
  password() {
    return this.authorization.password();
  }
  adapter(model: string) {
    return this.authorization.adapter(model);
  }
  accept(
    id: string,
    input: NotificationInput,
    deliveries: { id: string; targetId: string; plan: DeliveryPlan }[],
    now: number,
  ) {
    return this.db
      .transaction(() => {
        const count = this.db
          .prepare(
            "SELECT COUNT(*) AS count FROM deliveries WHERE status IN ('pending','processing','waiting_retry')",
          )
          .get() as { count: number };
        if (count.count + deliveries.length > 1000) return false;
        this.db
          .prepare("INSERT INTO notifications VALUES (?,?,?,?,?)")
          .run(
            id,
            input.topic,
            this.vault.encrypt(input.title, "notifications", id, "title"),
            this.vault.encrypt(input.content, "notifications", id, "content"),
            now,
          );
        for (const delivery of deliveries)
          this.db
            .prepare(
              "INSERT INTO deliveries (id,notification_id,target_id,channel,destination_digest,plan_cipher,status,next_attempt_at) VALUES (?,?,?,?,?,?,'pending',?)",
            )
            .run(
              delivery.id,
              id,
              delivery.targetId,
              delivery.plan.channel,
              this.vault.destinationDigest(delivery.plan.destination),
              this.vault.encrypt(
                delivery.plan,
                "deliveries",
                delivery.id,
                "plan",
              ),
              now,
            );
        return true;
      })
      .immediate();
  }
  listTasks(
    filter: {
      status?: string;
      receivedFrom?: number;
      receivedBefore?: number;
      notification?: string;
    } = {},
  ): Task[] {
    const clauses: string[] = [];
    const values: (string | number)[] = [];
    for (const [column, operator, value] of [
      ["d.status", "=", filter.status],
      ["n.created_at", ">=", filter.receivedFrom],
      ["n.created_at", "<", filter.receivedBefore],
      ["n.id", "=", filter.notification],
    ] as const) {
      if (value !== undefined) {
        clauses.push(`${column} ${operator} ?`);
        values.push(value);
      }
    }
    return this.db
      .prepare(
        `${taskSelect} ${clauses.length ? "WHERE " + clauses.join(" AND ") : ""} ORDER BY n.created_at, d.id`,
      )
      .all(...values) as Task[];
  }
  showTask(id: string): Task | undefined {
    return this.db.prepare(`${taskSelect} WHERE d.id=?`).get(id) as
      | Task
      | undefined;
  }
  state(name: string) {
    return (
      this.db
        .prepare("SELECT value FROM maintenance_state WHERE name=?")
        .get(name) as { value: string } | undefined
    )?.value;
  }
  setState(name: string, value: string | undefined) {
    if (value === undefined)
      this.db.prepare("DELETE FROM maintenance_state WHERE name=?").run(name);
    else
      this.db
        .prepare(
          "INSERT INTO maintenance_state VALUES (?,?) ON CONFLICT(name) DO UPDATE SET value=excluded.value",
        )
        .run(name, value);
  }
  claim(now: number, limit: number): Lease[] {
    return this.db
      .transaction(() => {
        this.db
          .prepare(
            "UPDATE deliveries SET status='waiting_retry', next_attempt_at=?, lease_id=NULL, lease_until=NULL WHERE status='processing' AND lease_until<=?",
          )
          .run(now, now);
        this.db.prepare("DELETE FROM send_slots WHERE hold_until<=?").run(now);
        const due = this.db
          .prepare(
            "SELECT * FROM deliveries WHERE status IN ('pending','waiting_retry') AND next_attempt_at<=? ORDER BY next_attempt_at,id",
          )
          .all(now) as DeliveryRow[];
        const leases: Lease[] = [];
        for (const row of due) {
          if (leases.length >= limit) break;
          const cooldown = this.cooldown(row.destination_digest);
          const slots = this.db
            .prepare(
              "SELECT COUNT(*) AS count, MIN(hold_until) AS earliest FROM send_slots WHERE destination_digest=? AND hold_until>?",
            )
            .get(row.destination_digest, now) as {
            count: number;
            earliest: number;
          };
          const next = Math.max(
            cooldown,
            slots.count >= 20 ? slots.earliest : 0,
          );
          if (next > now) {
            this.db
              .prepare(
                "UPDATE deliveries SET next_attempt_at=MAX(next_attempt_at,?) WHERE id=?",
              )
              .run(next, row.id);
            continue;
          }
          const plan = this.vault.decrypt<DeliveryPlan>(
            row.plan_cipher,
            "deliveries",
            row.id,
            "plan",
          );
          const leaseId = randomUUID();
          this.db
            .prepare(
              "UPDATE deliveries SET status='processing', lease_id=?, lease_until=? WHERE id=?",
            )
            .run(leaseId, now + 30000, row.id);
          this.db
            .prepare(
              "INSERT INTO send_slots (lease_id,delivery_id,destination_digest,reserved_at,hold_until) VALUES (?,?,?,?,?)",
            )
            .run(leaseId, row.id, row.destination_digest, now, now + 90000);
          leases.push({
            id: row.id,
            leaseId,
            destinationDigest: row.destination_digest,
            plan,
          });
        }
        return leases;
      })
      .immediate();
  }
  private cooldown(digest: string) {
    return (
      (
        this.db
          .prepare(
            "SELECT blocked_until FROM destination_cooldowns WHERE destination_digest=?",
          )
          .get(digest) as { blocked_until: number } | undefined
      )?.blocked_until ?? 0
    );
  }
  beginSend(lease: Lease, now: number) {
    return this.db
      .transaction(() => {
        const row = this.db
          .prepare(
            "SELECT lease_until FROM deliveries WHERE id=? AND lease_id=? AND status='processing'",
          )
          .get(lease.id, lease.leaseId) as { lease_until: number } | undefined;
        const slot = this.db
          .prepare("SELECT sent,hold_until FROM send_slots WHERE lease_id=?")
          .get(lease.leaseId) as
          | { sent: number; hold_until: number }
          | undefined;
        const blocked = this.cooldown(lease.destinationDigest);
        if (!row) return false;
        if (
          row.lease_until <= now + 10000 ||
          !slot ||
          slot.sent ||
          slot.hold_until <= now ||
          blocked > now
        ) {
          this.db
            .prepare(
              "UPDATE deliveries SET status='waiting_retry', next_attempt_at=?, lease_id=NULL, lease_until=NULL WHERE id=? AND lease_id=?",
            )
            .run(Math.max(now, blocked), lease.id, lease.leaseId);
          return false;
        }
        this.db
          .prepare("UPDATE send_slots SET sent=1 WHERE lease_id=?")
          .run(lease.leaseId);
        return true;
      })
      .immediate();
  }
  finish(lease: Lease, outcome: SendOutcome, now: number) {
    return this.db
      .transaction(() => {
        if (outcome.cooldownUntil !== undefined)
          this.db
            .prepare(
              "INSERT INTO destination_cooldowns VALUES (?,?) ON CONFLICT(destination_digest) DO UPDATE SET blocked_until=MAX(blocked_until,excluded.blocked_until)",
            )
            .run(lease.destinationDigest, outcome.cooldownUntil);
        const row = this.db
          .prepare(
            "SELECT attempts FROM deliveries WHERE id=? AND lease_id=? AND status='processing'",
          )
          .get(lease.id, lease.leaseId) as { attempts: number } | undefined;
        if (!row) return undefined;
        const attempts = row.attempts + 1;
        const status = outcome.success
          ? "succeeded"
          : !outcome.retryable || attempts >= 4
            ? "failed_final"
            : "waiting_retry";
        const next =
          status === "waiting_retry"
            ? Math.max(
                now + [60000, 300000, 900000][attempts - 1],
                outcome.retryAfter ?? 0,
                this.cooldown(lease.destinationDigest),
              )
            : now;
        this.db
          .prepare(
            "UPDATE deliveries SET status=?, attempts=?, next_attempt_at=?, lease_id=NULL, lease_until=NULL, finished_at=?, last_error_code=?, last_http_status=?, last_remote_code=? WHERE id=? AND lease_id=?",
          )
          .run(
            status,
            attempts,
            next,
            status === "waiting_retry" ? null : now,
            outcome.errorCode ?? null,
            outcome.httpStatus ?? null,
            outcome.remoteCode ?? null,
            lease.id,
            lease.leaseId,
          );
        return this.showTask(lease.id);
      })
      .immediate();
  }
  resetPassword(value: string) {
    return this.authorization.resetPassword(value);
  }
  retryTask(id: string, now: number) {
    return this.db
      .transaction(() => {
        const count = this.db
          .prepare(
            "SELECT COUNT(*) AS count FROM deliveries WHERE status IN ('pending','processing','waiting_retry')",
          )
          .get() as { count: number };
        if (count.count >= 1000) throw new Error("QUEUE_FULL");
        if (
          !this.db
            .prepare(
              "UPDATE deliveries SET status='pending', attempts=0, next_attempt_at=?, finished_at=NULL, lease_id=NULL, lease_until=NULL, last_error_code=NULL, last_http_status=NULL, last_remote_code=NULL WHERE id=? AND status='failed_final'",
            )
            .run(now, id).changes
        )
          throw new Error("TASK_NOT_RETRYABLE");
        return this.showTask(id)!;
      })
      .immediate();
  }
  backup(destination: string) {
    return this.db.backup(destination);
  }
  cleanup(now: number) {
    this.db
      .transaction(() => {
        this.db
          .prepare(
            "DELETE FROM deliveries WHERE finished_at IS NOT NULL AND finished_at<=?",
          )
          .run(now - 90 * 86400000);
        this.db
          .prepare(
            "DELETE FROM notifications WHERE NOT EXISTS (SELECT 1 FROM deliveries WHERE notification_id=notifications.id)",
          )
          .run();
        this.db
          .prepare("DELETE FROM oauth_artifacts WHERE expires_at<=?")
          .run(now);
        this.db.prepare("DELETE FROM send_slots WHERE hold_until<=?").run(now);
        this.db
          .prepare("DELETE FROM destination_cooldowns WHERE blocked_until<=?")
          .run(now);
      })
      .immediate();
  }
  healthy() {
    return Boolean(this.db.prepare("SELECT 1").get());
  }
  close() {
    if (this.closed) return;
    this.db.close();
    closeSync(this.lock);
    this.closed = true;
  }
}

export interface Task {
  id: string;
  notificationId: string;
  topic: string;
  targetId: string;
  channel: string;
  status:
    | "pending"
    | "processing"
    | "waiting_retry"
    | "succeeded"
    | "failed_final";
  attempts: number;
  receivedAt: number;
  nextAttemptAt: number;
  finishedAt: number | null;
  lastErrorCode: string | null;
  lastHttpStatus: number | null;
  lastRemoteCode: number | null;
}
const taskSelect = `SELECT d.id, d.notification_id AS notificationId, n.topic, d.target_id AS targetId, d.channel, d.status, d.attempts, n.created_at AS receivedAt, d.next_attempt_at AS nextAttemptAt, d.finished_at AS finishedAt, d.last_error_code AS lastErrorCode, d.last_http_status AS lastHttpStatus, d.last_remote_code AS lastRemoteCode FROM deliveries d JOIN notifications n ON n.id=d.notification_id`;

interface DeliveryRow {
  id: string;
  destination_digest: string;
  plan_cipher: string;
}
export interface Lease {
  id: string;
  leaseId: string;
  destinationDigest: string;
  plan: DeliveryPlan;
}
