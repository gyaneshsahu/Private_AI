// Usage metering, browser side (docs/usage-metering-20261115.md). Privatemode encrypts the token
// counts together with the reply, so only this browser can read them. After a reply the relay
// marked with a request id, this sends the counts (numbers only, never text) back under that id.
// It never blocks the answer, never retries, and does nothing when the relay sent no id
// (metering switched off). The relay checks the numbers against what it measured itself.
import { REQUEST_ID_HEADER } from "../shared/usage-config";

export interface StreamUsage {
  prompt_tokens?: number;
  completion_tokens?: number;
  prompt_tokens_details?: { cached_tokens?: number } | null;
  completion_tokens_details?: { reasoning_tokens?: number } | null;
}

const whole = (n: unknown): n is number => Number.isSafeInteger(n) && (n as number) >= 0;

/** The report body for one reply, or undefined when there is nothing valid to report. */
export function usageReportBody(requestId: string | null, usage: StreamUsage | undefined) {
  if (!requestId || !usage || !whole(usage.prompt_tokens) || !whole(usage.completion_tokens)) return undefined;
  const cached = usage.prompt_tokens_details?.cached_tokens;
  const reasoning = usage.completion_tokens_details?.reasoning_tokens;
  return {
    requestId,
    promptTokens: usage.prompt_tokens,
    completionTokens: usage.completion_tokens,
    ...(whole(cached) ? { cachedTokens: cached } : {}),
    ...(whole(reasoning) ? { reasoningTokens: reasoning } : {}),
  };
}

export function reportUsage(csrf: string, response: Response, usage: StreamUsage | undefined) {
  const body = usageReportBody(response.headers.get(REQUEST_ID_HEADER), usage);
  if (!body) return;
  void fetch("/api/usage/report", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-PrivateAI-CSRF": csrf },
    body: JSON.stringify(body),
    credentials: "same-origin",
    redirect: "error",
    keepalive: true,
  }).catch(() => {});
}
