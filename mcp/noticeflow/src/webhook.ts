import type { SendOutcome, WebhookFetch } from "./channel.js";
const httpDate =
  /^(?:[A-Za-z]{3}, \d{2} [A-Za-z]{3} \d{4} \d{2}:\d{2}:\d{2} GMT|[A-Za-z]+, \d{2}-[A-Za-z]{3}-\d{2} \d{2}:\d{2}:\d{2} GMT|[A-Za-z]{3} [A-Za-z]{3} [ \d]\d \d{2}:\d{2}:\d{2} \d{4})$/;
export interface ResponseCodes {
  field: string;
  rejected: readonly number[];
  rateLimited: number;
  busy?: number;
}
export async function postWebhook(
  send: WebhookFetch,
  now: () => number,
  url: string,
  payload: unknown,
  codes: ResponseCodes,
): Promise<SendOutcome> {
  try {
    const response = await send(url, {
      method: "POST",
      redirect: "error",
      signal: AbortSignal.timeout(10000),
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    let body: unknown;
    try {
      body = await response.json();
    } catch {
      body = null;
    }
    const value =
      body && typeof body === "object"
        ? (body as Record<string, unknown>)[codes.field]
        : undefined;
    const code = Number.isSafeInteger(value) ? (value as number) : undefined;
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
    if (code !== undefined && codes.rejected.includes(code))
      return {
        success: false,
        retryable: false,
        errorCode: "REMOTE_REJECTED",
        ...metadata,
      };
    const busy = code !== undefined && code === codes.busy;
    const rateLimited = code === codes.rateLimited || response.status === 429;
    const retryable =
      busy || rateLimited || response.status >= 500 || response.ok;
    return {
      success: false,
      retryable,
      errorCode: rateLimited
        ? "REMOTE_RATE_LIMIT"
        : busy
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
}
