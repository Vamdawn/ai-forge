import { createHmac } from "node:crypto";
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
import { normalizeFeishuWebhook, type Config } from "./config.js";
import { postWebhook, type ResponseCodes } from "./webhook.js";
const allowed = new Set([
  "root",
  "text",
  "paragraph",
  "heading",
  "emphasis",
  "strong",
  "delete",
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
const codes: ResponseCodes = {
  field: "code",
  rejected: [9499, 19021, 19022, 19024],
  rateLimited: 11232,
};
const parser = unified().use(remarkParse).use(remarkGfm);
// Card Markdown can interpret tags such as <at> even inside code, so reject them everywhere.
const tag = /<\/?[A-Za-z]/;
function validate(
  node: Node & {
    children?: Node[];
    value?: string;
    url?: string;
    checked?: unknown;
  },
): number {
  if (!allowed.has(node.type) || node.checked != null)
    throw new Error("UNSUPPORTED_CONTENT");
  if (tag.test(node.value ?? "")) throw new Error("UNSUPPORTED_CONTENT");
  if (node.url && !/^https?:\/\//i.test(node.url))
    throw new Error("UNSUPPORTED_CONTENT");
  if (node.type === "text" && /\[\^/.test(node.value ?? ""))
    throw new Error("UNSUPPORTED_CONTENT");
  let tables = node.type === "table" ? 1 : 0;
  for (const child of node.children ?? []) tables += validate(child);
  return tables;
}
function body(message: string, secret: string | undefined, now: number) {
  const card = JSON.parse(message) as unknown;
  if (!secret) return { msg_type: "interactive", card };
  const timestamp = String(Math.floor(now / 1000));
  const sign = createHmac("sha256", `${timestamp}\n${secret}`)
    .update("")
    .digest("base64");
  return { msg_type: "interactive", card, timestamp, sign };
}
export function createFeishu(
  send: WebhookFetch = fetch,
  now: () => number = () => Date.now(),
): Channel {
  return {
    prepare(
      input: NotificationInput,
      target: Config["targets"][string],
    ): DeliveryPlan {
      if (validate(parser.parse(input.content)) > 4)
        throw new Error("UNSUPPORTED_CONTENT");
      const message = JSON.stringify({
        schema: "2.0",
        config: { update_multi: true },
        header: { title: { tag: "plain_text", content: input.title } },
        body: { elements: [{ tag: "markdown", content: input.content }] },
      });
      const secret =
        target.channel === "feishu-webhook" ? target.secret : undefined;
      // Size the signed form so a secret can never push the body over 20 KB.
      if (
        Buffer.byteLength(
          JSON.stringify(body(message, "x", 9999999999000)),
          "utf8",
        ) > 20480
      )
        throw new Error("UNSUPPORTED_CONTENT");
      return Object.freeze({
        channel: "feishu-webhook",
        destination: normalizeFeishuWebhook(target.webhookUrl),
        message,
        ...(secret ? { secret } : {}),
      });
    },
    send(plan): Promise<SendOutcome> {
      // Sign at send time: Feishu rejects timestamps older than one hour.
      return postWebhook(
        send,
        now,
        plan.destination,
        body(plan.message, plan.secret, now()),
        codes,
      );
    },
  };
}
