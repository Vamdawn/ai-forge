import Database from "better-sqlite3";
import type { Vault } from "../crypto.js";

export function validateDatabase(path: string, vault: Vault) {
  const db = new Database(path, { fileMustExist: true, readonly: true });
  try {
    const integrity = db.pragma("integrity_check") as {
      integrity_check: string;
    }[];
    if (integrity.length !== 1 || integrity[0].integrity_check !== "ok")
      throw new Error("INVALID_DATABASE");
    const check = db
      .prepare("SELECT cipher FROM key_check WHERE id=1")
      .get() as { cipher: string } | undefined;
    if (
      !check ||
      vault.decrypt(check.cipher, "key_check", "1", "cipher") !==
        "noticeflow-v1"
    )
      throw new Error("WRONG_DATA_KEY");
  } finally {
    db.close();
  }
}

export function readCooldowns(
  path: string,
  now: number,
): { destination_digest: string; blocked_until: number }[] {
  const db = new Database(path, { readonly: true, fileMustExist: true });
  try {
    return db
      .prepare(
        "SELECT destination_digest, blocked_until FROM destination_cooldowns WHERE blocked_until>?",
      )
      .all(now) as { destination_digest: string; blocked_until: number }[];
  } finally {
    db.close();
  }
}
export function prepareRestoredDatabase(
  path: string,
  vault: Vault,
  restoreId: string,
  cooldowns: ReturnType<typeof readCooldowns> = [],
) {
  validateDatabase(path, vault);
  const db = new Database(path, { fileMustExist: true });
  try {
    db.pragma("synchronous = FULL");
    db.transaction(() => {
      db.prepare("DELETE FROM oauth_artifacts").run();
      for (const [name, value] of [
        ["restore_pause", "true"],
        ["restore_id", restoreId],
      ])
        db.prepare(
          "INSERT INTO maintenance_state VALUES (?,?) ON CONFLICT(name) DO UPDATE SET value=excluded.value",
        ).run(name, value);
      for (const cooldown of cooldowns)
        db.prepare(
          "INSERT INTO destination_cooldowns VALUES (?,?) ON CONFLICT(destination_digest) DO UPDATE SET blocked_until=MAX(blocked_until,excluded.blocked_until)",
        ).run(cooldown.destination_digest, cooldown.blocked_until);
    }).immediate();
    db.pragma("wal_checkpoint(TRUNCATE)");
  } finally {
    db.close();
  }
  validateDatabase(path, vault);
}
export function verifyRestoredDatabase(
  path: string,
  vault: Vault,
  restoreId: string,
) {
  validateDatabase(path, vault);
  const db = new Database(path, { readonly: true, fileMustExist: true });
  try {
    const row = db
      .prepare("SELECT value FROM maintenance_state WHERE name='restore_id'")
      .get() as { value: string } | undefined;
    const count = db
      .prepare("SELECT COUNT(*) AS count FROM oauth_artifacts")
      .get() as { count: number };
    if (row?.value !== restoreId || count.count !== 0)
      throw new Error("RESTORE_VERIFICATION_FAILED");
  } finally {
    db.close();
  }
}
