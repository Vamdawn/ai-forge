import type Database from "better-sqlite3";
import type { AdapterPayload } from "oidc-provider";
import { type Vault, type PasswordHash, hashPassword } from "../crypto.js";

export class AuthorizationStore {
  constructor(
    private db: Database.Database,
    private vault: Vault,
    private now: () => number,
  ) {}
  async initializeAdmin(initialPassword?: string) {
    if (this.password()) return Boolean(initialPassword);
    if (!initialPassword) throw new Error("INITIAL_PASSWORD_REQUIRED");
    const password = await hashPassword(initialPassword);
    this.db
      .prepare("INSERT OR IGNORE INTO admin VALUES (1, ?, ?, ?, ?)")
      .run(
        password.hash,
        password.salt,
        JSON.stringify({ N: 16384, r: 8, p: 1, keylen: 64 }),
        this.now(),
      );
    return false;
  }
  password(): PasswordHash | undefined {
    return this.db
      .prepare("SELECT password_hash AS hash, salt FROM admin WHERE id=1")
      .get() as PasswordHash | undefined;
  }
  adapter(model: string) {
    const digest = (id: string) => this.vault.oauthDigest(id);
    const decode = (
      row:
        | { id_digest: string; payload_cipher: string; consumed: number | null }
        | undefined,
    ) => {
      if (!row) return undefined;
      const payload = this.vault.decrypt<AdapterPayload>(
        row.payload_cipher,
        "oauth_artifacts",
        `${model}:${row.id_digest}`,
        "payload",
      );
      if (row.consumed) payload.consumed = row.consumed;
      return payload;
    };
    const find = (column: string, id: string) =>
      decode(
        this.db
          .prepare(
            `SELECT * FROM oauth_artifacts WHERE model=? AND ${column}=? AND expires_at>?`,
          )
          .get(model, digest(id), this.now()) as Parameters<typeof decode>[0],
      );
    return {
      find: async (id: string) => find("id_digest", id),
      findByUid: async (id: string) => find("uid_digest", id),
      findByUserCode: async (id: string) => find("user_code_digest", id),
      upsert: async (
        id: string,
        payload: AdapterPayload,
        expiresIn: number,
      ) => {
        this.db
          .transaction(() => {
            let expires = this.now() + expiresIn * 1000;
            const key = digest(id);
            if (
              (model === "RefreshToken" || model === "AccessToken") &&
              typeof payload.grantId === "string"
            ) {
              const grantKey = digest(payload.grantId);
              const row = this.db
                .prepare(
                  "SELECT * FROM oauth_artifacts WHERE model='Grant' AND id_digest=? AND expires_at>?",
                )
                .get(grantKey, this.now()) as
                | { payload_cipher: string; expires_at: number }
                | undefined;
              if (!row) throw new Error("INVALID_GRANT");
              const grant = this.vault.decrypt<AdapterPayload>(
                row.payload_cipher,
                "oauth_artifacts",
                `Grant:${grantKey}`,
                "payload",
              );
              const deadline = Math.max(row.expires_at, expires);
              // Provider validation reads payload.exp, while adapter lookup uses
              // expires_at; both must cover every token issued under this Grant.
              grant.exp = Math.ceil(deadline / 1000);
              this.db
                .prepare(
                  "UPDATE oauth_artifacts SET payload_cipher=?, expires_at=? WHERE model='Grant' AND id_digest=?",
                )
                .run(
                  this.vault.encrypt(
                    grant,
                    "oauth_artifacts",
                    `Grant:${grantKey}`,
                    "payload",
                  ),
                  deadline,
                  grantKey,
                );
            }
            if (model === "Grant") {
              const old = this.db
                .prepare(
                  "SELECT expires_at FROM oauth_artifacts WHERE model='Grant' AND id_digest=?",
                )
                .get(key) as { expires_at: number } | undefined;
              // A later Grant save must not undo the extension from token issuance.
              expires = Math.max(expires, old?.expires_at ?? 0);
              payload = { ...payload, exp: Math.ceil(expires / 1000) };
            }
            this.db
              .prepare(
                `INSERT INTO oauth_artifacts VALUES (?,?,?,?,?,?,?,?) ON CONFLICT(model,id_digest) DO UPDATE SET payload_cipher=excluded.payload_cipher, expires_at=excluded.expires_at, grant_digest=excluded.grant_digest, uid_digest=excluded.uid_digest, user_code_digest=excluded.user_code_digest`,
              )
              .run(
                model,
                key,
                this.vault.encrypt(
                  payload,
                  "oauth_artifacts",
                  `${model}:${key}`,
                  "payload",
                ),
                expires,
                payload.grantId ? digest(payload.grantId) : null,
                payload.uid ? digest(payload.uid) : null,
                payload.userCode ? digest(payload.userCode) : null,
                payload.consumed ?? null,
              );
          })
          .immediate();
      },
      consume: async (id: string) => {
        if (
          !this.db
            .prepare(
              "UPDATE oauth_artifacts SET consumed=? WHERE model=? AND id_digest=? AND consumed IS NULL AND expires_at>?",
            )
            .run(Math.floor(this.now() / 1000), model, digest(id), this.now())
            .changes
        )
          throw new Error("ALREADY_CONSUMED");
      },
      destroy: async (id: string) => {
        this.db
          .prepare("DELETE FROM oauth_artifacts WHERE model=? AND id_digest=?")
          .run(model, digest(id));
      },
      revokeByGrantId: async (id: string) => {
        this.db
          .prepare(
            "DELETE FROM oauth_artifacts WHERE grant_digest=? OR (model='Grant' AND id_digest=?)",
          )
          .run(digest(id), digest(id));
      },
    };
  }
  async resetPassword(value: string) {
    if (!value || !this.password()) throw new Error("INVALID_PASSWORD");
    const password = await hashPassword(value);
    this.db
      .transaction(() => {
        this.db
          .prepare(
            "UPDATE admin SET password_hash=?, salt=?, updated_at=? WHERE id=1",
          )
          .run(password.hash, password.salt, this.now());
        this.db.prepare("DELETE FROM oauth_artifacts").run();
      })
      .immediate();
  }
}
