import { z } from "zod";
import { randomUUID } from "node:crypto";
import type { Config } from "./config.js";
import type { Store } from "./store.js";
import type { Channel } from "./channel.js";
export const inputSchema = z.strictObject({
  topic: z.string().min(1),
  title: z
    .string()
    .min(1)
    .refine((value) => !/[\r\n\u2028\u2029]/.test(value)),
  content: z.string().min(1),
});
export type SubmitCode =
  | "INVALID_INPUT"
  | "UNKNOWN_TOPIC"
  | "UNSUPPORTED_CONTENT"
  | "QUEUE_FULL"
  | "RATE_LIMITED";
export class SubmitError extends Error {
  readonly retryable: boolean;
  constructor(readonly code: SubmitCode) {
    super(code);
    this.retryable = code === "QUEUE_FULL" || code === "RATE_LIMITED";
  }
}
export function createSubmit(
  config: Config,
  store: Store,
  channels: ReadonlyMap<string, Channel>,
  now: () => number = () => Date.now(),
) {
  const calls = new Map<string, number[]>();
  return (clientId: string, raw: unknown) => {
    const time = now();
    const recent = (calls.get(clientId) ?? []).filter(
      (value) => value > time - 60000,
    );
    calls.set(clientId, recent);
    if (recent.length >= 120) throw new SubmitError("RATE_LIMITED");
    recent.push(time);
    const parsed = inputSchema.safeParse(raw);
    if (!parsed.success) throw new SubmitError("INVALID_INPUT");
    const input = parsed.data;
    const topic = Object.hasOwn(config.topics, input.topic)
      ? config.topics[input.topic]
      : undefined;
    if (!topic) throw new SubmitError("UNKNOWN_TOPIC");
    const plans = topic.targets.map((targetId) => {
      const target = config.targets[targetId];
      const channel = channels.get(target.channel);
      if (!channel) throw new SubmitError("UNSUPPORTED_CONTENT");
      try {
        return {
          id: randomUUID(),
          targetId,
          plan: channel.prepare(input, target),
        };
      } catch {
        throw new SubmitError("UNSUPPORTED_CONTENT");
      }
    });
    const notificationId = randomUUID();
    if (!store.accept(notificationId, input, plans, time))
      throw new SubmitError("QUEUE_FULL");
    return { status: "accepted" as const, notificationId };
  };
}
