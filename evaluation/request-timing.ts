/**
 * Client-side request timing for the local experiment runner. Measured in the
 * browser from the callbacks `streamVerifiedConversation` already exposes; no
 * server change and no inspection of encrypted bytes.
 *
 * Request start is the last status before the encrypted request leaves the
 * device ("Receiving a protected response…"), which follows attestation,
 * verification and transport preparation. The first content delta is the
 * first non-empty text chunk delivered to the page. The final usage frame is
 * observed when the stream promise resolves with usage, which the stream
 * parser only does after it accepted the final usage frame and the stream
 * closed; a failed or interrupted stream records null for it.
 */
export const requestSentStatusPrefix = "Receiving a protected response";

export interface RequestTiming {
  /** "request_sent" when the pre-send status was observed; "call_start" when the call never reached sending. */
  measuredFrom: "request_sent" | "call_start";
  /** Attestation, verification and transport preparation before the request left; null when it never left. */
  preparationMs: number | null;
  /** Request start to the first non-empty content delta; null when no content arrived. */
  timeToFirstContentDeltaMs: number | null;
  /** Request start to the resolved final usage frame; null when the stream did not complete with usage. */
  timeToFinalUsageFrameMs: number | null;
  /** Request start to the moment the snapshot was taken. */
  elapsedMs: number;
}

export function requestTiming(now: () => number = () => performance.now()) {
  const callStart = now();
  let sentAt: number | null = null;
  let firstDeltaAt: number | null = null;
  let usageAt: number | null = null;
  return {
    status(text: string) {
      if (sentAt === null && text.startsWith(requestSentStatusPrefix))
        sentAt = now();
    },
    chunk(text: string) {
      if (firstDeltaAt === null && text.length > 0) firstDeltaAt = now();
    },
    usage() {
      if (usageAt === null) usageAt = now();
    },
    snapshot(): RequestTiming {
      const origin = sentAt ?? callStart;
      const since = (at: number | null) =>
        at === null ? null : Math.max(0, Math.round(at - origin));
      return {
        measuredFrom: sentAt === null ? "call_start" : "request_sent",
        preparationMs: sentAt === null ? null : Math.round(sentAt - callStart),
        timeToFirstContentDeltaMs: since(firstDeltaAt),
        timeToFinalUsageFrameMs: since(usageAt),
        elapsedMs: Math.max(0, Math.round(now() - origin)),
      };
    },
  };
}
