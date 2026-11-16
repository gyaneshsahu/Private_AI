// Why an answer failed, kept on the message as data, and the one plain sentence shown for it.
import type { Message } from "../shared/contracts";
import { AttestationBusyError, DeploymentChangedError } from "./providers/inference-client";
import { IncompleteReplyError } from "./reply-stream";
import type { StreamFailureCode } from "./stream-failure";
import { chatCoreText } from "./text/chat-core";
import type { Lang } from "./text/core";

export type FailureKind = NonNullable<Message["failure"]>;

const CUT_OFF = new Set<StreamFailureCode>([
  "TRANSPORT_OR_DECRYPTION",
  "MISSING_DONE",
  "INCOMPLETE_ANSWER",
  "OUTPUT_LIMIT_REACHED",
]);

/** The kind of a failed send. `aborted`: the user (or a new chat, a lock) stopped it. */
export function failureKind(error: unknown, aborted: boolean): FailureKind {
  if (aborted) return "stopped";
  if (error instanceof AttestationBusyError) return "busy";
  if (error instanceof DeploymentChangedError) return "unavailable";
  if (error instanceof IncompleteReplyError) {
    const code = error.diagnostic?.code;
    if (code === "HTTP_RATE_LIMITED") return "busy";
    // The provider refused for a spend cap or rate limit (relay class "capacity"): not "busy", which says a minute.
    if (code === "HTTP_CAPACITY_REACHED") return "capacity";
    if (code === "HTTP_SERVICE_UNAVAILABLE" || code === "HTTP_MODEL_NOT_FOUND") return "unavailable";
    if (code === "TIMED_OUT") return "timeout";
    // The answer stopped coming: the connection broke, the stream ended early or hit its length.
    if (code && CUT_OFF.has(code)) return "incomplete";
    // Refused upstream, a broken stream, a withheld research answer (no code).
    return "error";
  }
  if (error instanceof Error && error.name === "TimeoutError") return "timeout";
  return "error";
}

const sentences: Record<FailureKind, keyof (typeof chatCoreText)["en"]> = {
  stopped: "failureStopped",
  timeout: "failureTimeout",
  busy: "failureBusy",
  capacity: "failureCapacity",
  unavailable: "failureUnavailable",
  incomplete: "failureIncomplete",
  empty: "failureEmpty",
  error: "failureError",
};

/** One sentence per kind. A kind this version does not know reads as the generic one. */
export function failureSentence(kind: string, lang: Lang): string {
  return chatCoreText[lang][sentences[kind as FailureKind] ?? "failureError"] as string;
}
