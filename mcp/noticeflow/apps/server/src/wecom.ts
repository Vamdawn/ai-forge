import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import type { Node } from "unist";
import type {
  Channel,
  DeliveryPlan,
  NotificationInput,
  SendOutcome,
  WebhookFetch,
} from "./channel.js";
import { normalizeWebhook, type Config } from "./config.js";
const allowed = new Set([
  "root",
  "text",
  "paragraph",
  "heading",
  "emphasis",
  "strong",
  "list",
  "listItem",
  "blockquote",
  "link",
  "linkReference",
  "definition",
  "thematicBreak",
  "inlineCode",
  "code",
  "table",
  "tableRow",
  "tableCell",
  "break",
]);
const httpDate =
  /^(?:[A-Za-z]{3}, \d{2} [A-Za-z]{3} \d{4} \d{2}:\d{2}:\d{2} GMT|[A-Za-z]+, \d{2}-[A-Za-z]{3}-\d{2} \d{2}:\d{2}:\d{2} GMT|[A-Za-z]{3} [A-Za-z]{3} [ \d]\d \d{2}:\d{2}:\d{2} \d{4})$/;
const parser = unified().use(remarkParse).use(remarkGfm);
function validate(
  node: Node & {
    children?: Node[];
    value?: string;
    url?: string;
    checked?: unknown;
  },
) {
  if (!allowed.has(node.type) || node.checked != null)
    throw new Error("UNSUPPORTED_CONTENT");
  if (node.type === "code" || node.type === "inlineCode") return;
  if (node.url && !/^https?:\/\//i.test(node.url))
    throw new Error("UNSUPPORTED_CONTENT");
  if (node.type === "text" && /@[^\s]|\[\^/.test(node.value ?? ""))
    throw new Error("UNSUPPORTED_CONTENT");
  for (const child of node.children ?? []) validate(child);
}
export function createWecom(
  send: WebhookFetch = fetch,
  now: () => number = () => Date.now(),
): Channel {
  return {
    prepare(
      input: NotificationInput,
      target: Config["targets"][string],
    ): DeliveryPlan {
      validate(parser.parse(input.content));
      const title = input.title.replace(/[\\`*_{}\[\]()#+\-.!|<>~]/g, "\\$&");
      const message = `# ${title}\n\n${input.content}`;
      if (Buffer.byteLength(message, "utf8") > 4096)
        throw new Error("UNSUPPORTED_CONTENT");
      return Object.freeze({
        channel: "wecom-webhook",
        destination: normalizeWebhook(target.webhookUrl),
        message,
      });
    },
    async send(plan): Promise<SendOutcome> {
      try {
        const response = await send(plan.destination, {
          method: "POST",
          redirect: "error",
          signal: AbortSignal.timeout(10000),
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            msgtype: "markdown_v2",
            markdown_v2: { content: plan.message },
          }),
        });
        let body: unknown;
        try {
          body = await response.json();
        } catch {
          body = null;
        }
        const code =
          body &&
          typeof body === "object" &&
          "errcode" in body &&
          Number.isSafeInteger(body.errcode)
            ? (body.errcode as number)
            : undefined;
        const receivedAt = now();
        const header = response.headers.get("retry-after");
        let retryAfter: number | undefined;
        if (header && /^\d+$/.test(header)) {
          const until = receivedAt + Number(header) * 1000;
          if (Number.isSafeInteger(until)) retryAfter = until;
        } else if (
          header &&
          httpDate.test(header) &&
          Number.isFinite(Date.parse(header))
        )
          retryAfter = Math.max(receivedAt, Date.parse(header));
        const metadata = {
          httpStatus: response.status,
          ...(code === undefined ? {} : { remoteCode: code }),
        };
        if (response.ok && code === 0) return { success: true, ...metadata };
        if ([93000, 93001, 93004, 40008, 45002].includes(code!))
          return {
            success: false,
            retryable: false,
            errorCode: "REMOTE_REJECTED",
            ...metadata,
          };
        const rateLimited = code === 45009 || response.status === 429;
        const retryable =
          code === -1 || rateLimited || response.status >= 500 || response.ok;
        return {
          success: false,
          retryable,
          errorCode: rateLimited
            ? "REMOTE_RATE_LIMIT"
            : code === -1
              ? "REMOTE_BUSY"
              : response.ok && code === undefined
                ? "INVALID_RESPONSE"
                : "HTTP_ERROR",
          ...metadata,
          ...(retryable && retryAfter !== undefined ? { retryAfter } : {}),
          ...(retryable && (rateLimited || retryAfter !== undefined)
            ? {
                cooldownUntil: Math.max(
                  rateLimited ? receivedAt + 60000 : 0,
                  retryAfter ?? 0,
                ),
              }
            : {}),
        };
      } catch {
        return { success: false, retryable: true, errorCode: "NETWORK_ERROR" };
      }
    },
  };
}
