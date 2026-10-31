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
import { postWebhook, type ResponseCodes } from "./webhook.js";
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
const codes: ResponseCodes = {
  field: "errcode",
  rejected: [93000, 93001, 93004, 40008, 45002],
  rateLimited: 45009,
  busy: -1,
};
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
    send(plan): Promise<SendOutcome> {
      return postWebhook(
        send,
        now,
        plan.destination,
        { msgtype: "markdown_v2", markdown_v2: { content: plan.message } },
        codes,
      );
    },
  };
}
