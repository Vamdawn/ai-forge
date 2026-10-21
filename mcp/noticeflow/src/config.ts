import { readFileSync } from "node:fs";
import { isAbsolute } from "node:path";
import { parseDocument } from "yaml";
import { z } from "zod";
const absolutePath = z.string().refine(isAbsolute);
const httpsUrl = z.string().refine((value) => {
  try {
    const url = new URL(value);
    return (
      /^https:\/\//i.test(value) &&
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      !value.includes("#") &&
      !/[\s\\]/.test(value)
    );
  } catch {
    return false;
  }
});
const schema = z.strictObject({
  server: z.strictObject({
    publicBaseUrl: httpsUrl.refine((value) => {
      const url = new URL(value);
      const path = url.pathname === "/" ? "" : url.pathname;
      // One canonical spelling keeps the issuer, resource and cookie paths aligned.
      return (
        value === `${url.origin}${path}` &&
        /^(?:\/[A-Za-z0-9._~-]+)*$/.test(path)
      );
    }),
    listen: z
      .string()
      .regex(/^(?:\[[0-9a-fA-F:]+\]|[^:\s/]+):[0-9]+$/)
      .refine((value) => {
        const port = Number(value.slice(value.lastIndexOf(":") + 1));
        return port > 0 && port <= 65535;
      }),
  }),
  auth: z.strictObject({
    initialAdminPassword: z.string().min(1).optional(),
    allowedClientIds: z
      .array(httpsUrl)
      .min(1)
      .refine((items) => new Set(items).size === items.length),
  }),
  storage: z.strictObject({
    sqlitePath: absolutePath,
    encryptionKeyFile: absolutePath,
    backupDir: absolutePath,
  }),
  targets: z.record(
    z.string().min(1),
    z.strictObject({
      channel: z.literal("wecom-webhook"),
      webhookUrl: z.string(),
    }),
  ),
  topics: z.record(
    z.string().min(1),
    z.strictObject({
      targets: z
        .array(z.string().min(1))
        .min(1)
        .refine((items) => new Set(items).size === items.length),
    }),
  ),
});
export type Config = z.infer<typeof schema>;
function freeze<T>(value: T): T {
  if (value && typeof value === "object") {
    Object.freeze(value);
    for (const child of Object.values(value)) freeze(child);
  }
  return value;
}
export function normalizeWebhook(value: string) {
  try {
    if (
      /[\s\u0000-\u001f\u007f\\]/.test(value) ||
      /%(?![\da-f]{2})/i.test(value) ||
      value.includes("#")
    )
      throw new Error();
    decodeURIComponent(value);
    const url = new URL(value);
    const entries = [...url.searchParams];
    if (
      url.protocol !== "https:" ||
      url.hostname !== "qyapi.weixin.qq.com" ||
      url.port ||
      url.username ||
      url.password ||
      url.pathname !== "/cgi-bin/webhook/send" ||
      entries.length !== 1 ||
      entries[0][0] !== "key" ||
      !entries[0][1] ||
      /[\s\u0000-\u001f\u007f]/.test(entries[0][1])
    )
      throw new Error();
    return `https://qyapi.weixin.qq.com/cgi-bin/webhook/send?${new URLSearchParams({ key: entries[0][1] })}`;
  } catch {
    throw new Error("INVALID_WEBHOOK");
  }
}
export function loadConfig(path: string): Config {
  try {
    if (!isAbsolute(path)) throw new Error();
    const document = parseDocument(readFileSync(path, "utf8"), {
      uniqueKeys: true,
    });
    if (document.errors.length) throw new Error();
    const config = schema.parse(document.toJS());
    for (const target of Object.values(config.targets))
      target.webhookUrl = normalizeWebhook(target.webhookUrl);
    for (const topic of Object.values(config.topics))
      if (topic.targets.some((id) => !Object.hasOwn(config.targets, id)))
        throw new Error();
    return freeze(config);
  } catch {
    throw new Error("INVALID_CONFIG");
  }
}
