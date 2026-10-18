import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  hkdfSync,
  randomBytes,
  scrypt,
  timingSafeEqual,
} from "node:crypto";
import { readFileSync } from "node:fs";
import { promisify } from "node:util";
const derivePassword = promisify(scrypt);
export interface PasswordHash {
  hash: string;
  salt: string;
}
export async function hashPassword(password: string): Promise<PasswordHash> {
  const salt = randomBytes(16).toString("base64");
  const hash = (await derivePassword(
    password,
    Buffer.from(salt, "base64"),
    64,
  )) as Buffer;
  return { hash: hash.toString("base64"), salt };
}
export async function verifyPassword(password: string, stored: PasswordHash) {
  const actual = (await derivePassword(
    password,
    Buffer.from(stored.salt, "base64"),
    64,
  )) as Buffer;
  return timingSafeEqual(actual, Buffer.from(stored.hash, "base64"));
}
export class Vault {
  private encryptionKey: Buffer;
  private oauthKey: Buffer;
  private destinationKey: Buffer;
  readonly cookieKey: string;
  constructor(keyFile: string) {
    const text = readFileSync(keyFile, "utf8").trim();
    if (!/^[A-Za-z0-9+/]{43}=$/.test(text)) throw new Error("INVALID_DATA_KEY");
    const key = Buffer.from(text, "base64");
    if (key.length !== 32 || key.toString("base64") !== text)
      throw new Error("INVALID_DATA_KEY");
    const derive = (purpose: string) =>
      Buffer.from(hkdfSync("sha256", key, "noticeflow-v1", purpose, 32));
    this.encryptionKey = derive("field-encryption");
    this.oauthKey = derive("oauth-index");
    this.destinationKey = derive("destination-index");
    this.cookieKey = derive("cookie-signing").toString("base64url");
  }
  encrypt(value: unknown, table: string, id: string, field: string) {
    const nonce = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", this.encryptionKey, nonce);
    cipher.setAAD(Buffer.from(JSON.stringify([table, id, field])));
    const content = Buffer.concat([
      cipher.update(JSON.stringify(value)),
      cipher.final(),
    ]);
    return [
      "v1",
      nonce.toString("base64"),
      cipher.getAuthTag().toString("base64"),
      content.toString("base64"),
    ].join(".");
  }
  decrypt<T>(value: string, table: string, id: string, field: string): T {
    const [version, nonce, tag, content, extra] = value.split(".");
    if (version !== "v1" || !nonce || !tag || !content || extra)
      throw new Error("INVALID_CIPHERTEXT");
    const cipher = createDecipheriv(
      "aes-256-gcm",
      this.encryptionKey,
      Buffer.from(nonce, "base64"),
    );
    cipher.setAAD(Buffer.from(JSON.stringify([table, id, field])));
    cipher.setAuthTag(Buffer.from(tag, "base64"));
    return JSON.parse(
      Buffer.concat([
        cipher.update(Buffer.from(content, "base64")),
        cipher.final(),
      ]).toString(),
    );
  }
  oauthDigest(value: string) {
    return createHmac("sha256", this.oauthKey).update(value).digest("hex");
  }
  destinationDigest(value: string) {
    return createHmac("sha256", this.destinationKey)
      .update(value)
      .digest("hex");
  }
}
