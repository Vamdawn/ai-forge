import type { Config } from "./config.js";
export interface NotificationInput {
  topic: string;
  title: string;
  content: string;
}
export interface DeliveryPlan {
  channel: string;
  destination: string;
  message: string;
  secret?: string;
}
export interface SendOutcome {
  success: boolean;
  retryable?: boolean;
  errorCode?:
    | "NETWORK_ERROR"
    | "REMOTE_BUSY"
    | "REMOTE_RATE_LIMIT"
    | "REMOTE_REJECTED"
    | "INVALID_RESPONSE"
    | "HTTP_ERROR";
  httpStatus?: number;
  remoteCode?: number;
  retryAfter?: number;
  cooldownUntil?: number;
}
export interface Channel {
  prepare(
    input: NotificationInput,
    target: Config["targets"][string],
  ): DeliveryPlan;
  send(plan: DeliveryPlan): Promise<SendOutcome>;
}
export type WebhookFetch = (
  url: string,
  init: RequestInit,
) => Promise<Response>;
