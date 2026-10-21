import type Database from "better-sqlite3";
const migrations = [
  `
        CREATE TABLE IF NOT EXISTS key_check (id INTEGER PRIMARY KEY CHECK(id=1), cipher TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS admin (id INTEGER PRIMARY KEY CHECK(id=1), password_hash TEXT NOT NULL, salt TEXT NOT NULL, scrypt_params TEXT NOT NULL, updated_at INTEGER NOT NULL);
        CREATE TABLE IF NOT EXISTS oauth_artifacts (model TEXT NOT NULL, id_digest TEXT NOT NULL, payload_cipher TEXT NOT NULL, expires_at INTEGER NOT NULL, grant_digest TEXT, uid_digest TEXT, user_code_digest TEXT, consumed INTEGER, PRIMARY KEY(model,id_digest));
        CREATE INDEX IF NOT EXISTS oauth_grant ON oauth_artifacts(grant_digest);
        CREATE INDEX IF NOT EXISTS oauth_uid ON oauth_artifacts(model,uid_digest);
        CREATE INDEX IF NOT EXISTS oauth_user_code ON oauth_artifacts(model,user_code_digest);
        CREATE TABLE IF NOT EXISTS notifications (id TEXT PRIMARY KEY, topic TEXT NOT NULL, title_cipher TEXT NOT NULL, content_cipher TEXT NOT NULL, created_at INTEGER NOT NULL);
        CREATE TABLE IF NOT EXISTS deliveries (id TEXT PRIMARY KEY, notification_id TEXT NOT NULL REFERENCES notifications(id), target_id TEXT NOT NULL, channel TEXT NOT NULL, destination_digest TEXT NOT NULL, plan_cipher TEXT NOT NULL, status TEXT NOT NULL CHECK(status IN ('pending','processing','waiting_retry','succeeded','failed_final')), attempts INTEGER NOT NULL DEFAULT 0, next_attempt_at INTEGER NOT NULL, lease_id TEXT, lease_until INTEGER, finished_at INTEGER, last_error_code TEXT, last_http_status INTEGER, last_remote_code INTEGER);
        CREATE INDEX IF NOT EXISTS delivery_due ON deliveries(status,next_attempt_at);
        CREATE INDEX IF NOT EXISTS delivery_notification ON deliveries(notification_id);
        CREATE TABLE IF NOT EXISTS send_slots (lease_id TEXT PRIMARY KEY, delivery_id TEXT NOT NULL, destination_digest TEXT NOT NULL, reserved_at INTEGER NOT NULL, hold_until INTEGER NOT NULL, sent INTEGER NOT NULL DEFAULT 0);
        CREATE INDEX IF NOT EXISTS slot_destination ON send_slots(destination_digest,hold_until);
        CREATE TABLE IF NOT EXISTS destination_cooldowns (destination_digest TEXT PRIMARY KEY, blocked_until INTEGER NOT NULL);
        CREATE TABLE IF NOT EXISTS maintenance_state (name TEXT PRIMARY KEY, value TEXT NOT NULL);
      `,
];
export function migrate(db: Database.Database, now: number) {
  db.exec(
    "CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, applied_at INTEGER NOT NULL)",
  );
  const { version } = db
    .prepare(
      "SELECT COALESCE(MAX(version),0) AS version FROM schema_migrations",
    )
    .get() as { version: number };
  if (version > migrations.length) throw new Error("NEWER_DATABASE_SCHEMA");
  db.transaction(() => {
    for (let next = version; next < migrations.length; next++) {
      db.exec(migrations[next]);
      db.prepare("INSERT INTO schema_migrations VALUES (?,?)").run(
        next + 1,
        now,
      );
    }
  }).immediate();
}
