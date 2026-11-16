// Why an answer failed, kept on the message as data, and the one plain sentence shown for it.
import type { Message } from "../shared/contracts";
import { AttestationBusyError, DeploymentChangedError } from "./providers/inference-client";
import { IncompleteReplyError } from "./reply-stream";
import { chatCoreText } from "./text/chat-core";
import type { Lang } from "./text/core";

export type FailureKind = NonNullable<Message["failure"]>;

/** The kind of a failed send. `aborted`: the user (or a new chat, a lock) stopped it. */
export function failureKind(error: unknown, aborted: boolean): FailureKind {
  if (aborted) return "stopped";
  if (error instanceof AttestationBusyError) return "busy";
  if (error instanceof DeploymentChangedError) return "unavailable";
  if (error instanceof IncompleteReplyError) {
    const code = error.diagnostic?.code;
    if (code === "HTTP_RATE_LIMITED") return "busy";
    if (code === "HTTP_SERVICE_UNAVAILABLE" || code === "HTTP_MODEL_NOT_FOUND") return "unavailable";
    return "incomplete";
  }
  if (error instanceof Error && error.name === "TimeoutError") return "timeout";
  return "error";
}

const sentences: Record<FailureKind, keyof (typeof chatCoreText)["en"]> = {
  stopped: "failureStopped",
  timeout: "failureTimeout",
  busy: "failureBusy",
  unavailable: "failureUnavailable",
  incomplete: "failureIncomplete",
  empty: "failureEmpty",
  error: "failureError",
};

/** One sentence per kind. A kind this version does not know reads as the generic one. */
export function failureSentence(kind: string, lang: Lang): string {
  return chatCoreText[lang][sentences[kind as FailureKind] ?? "failureError"] as string;
}
