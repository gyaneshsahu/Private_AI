import { emptyConversation } from "../shared/contracts";
import { newMessage } from "../src/conversation";
import { extract } from "../src/documents";
import { streamVerifiedConversation } from "../src/verified-chat";
import { IncompleteReplyError } from "../src/reply-stream";
import {
  invoiceText,
  experimentPrompts,
  validateExperiment,
} from "./experiment";

export async function runSynthetic(input: unknown, csrf: string) {
  const permit = validateExperiment(input);
  const conversation = emptyConversation();
  const signal = AbortSignal.timeout(240000);
  const evidence: { host: string; releaseDigest: string }[] = [];
  const timings: number[] = [];
  let failure: string | null = null;
  let stage = "Extracting synthetic document";
  let diagnostic: { stage: string; category: string } | null = null;
  try {
    const attachment = await extract(
      new File([invoiceText], "synthetic-invoice.txt", { type: "text/plain" }),
      signal,
      () => {},
    );
    conversation.attachments.push(attachment);
    for (const prompt of experimentPrompts) {
      conversation.messages.push(newMessage("user", prompt));
      const answer = {
        ...newMessage("assistant", ""),
        status: "partial" as "partial" | "complete",
      };
      const start = performance.now();
      try {
        const usage = await streamVerifiedConversation(
          conversation,
          permit.policy,
          csrf,
          signal,
          (chunk) => {
            answer.text += chunk;
          },
          (status) => {
            stage = status;
          },
          () => {
            validateExperiment(permit);
          },
          (doc) => evidence.push(doc),
        );
        answer.status = "complete";
        if (usage) conversation.usage.push(usage);
        if (!usage) throw new Error("Usage was not returned.");
      } finally {
        timings.push(performance.now() - start);
        conversation.messages.push(answer);
      }
    }
  } catch (error) {
    if (error instanceof IncompleteReplyError && error.usage)
      conversation.usage.push(error.usage);
    const message = error instanceof Error ? error.message : "";
    diagnostic = {
      stage,
      category:
        /dynamically imported module|module script|module specifier/i.test(
          message,
        )
          ? "MODULE_LOAD_FAILED"
          : /Failed to fetch|Load failed/i.test(message)
            ? "FETCH_FAILED"
            : /does not match the reviewed|Unexpected verification destination/i.test(
                  message,
                )
              ? "VERIFICATION_POLICY_MISMATCH"
              : /Usage was not returned/i.test(message)
                ? "USAGE_MISSING"
                : "OTHER_ERROR_REDACTED",
    };
    failure =
      "Experiment stopped. No automatic retry. Inspect partial transcript and gateway request outcomes; unreported charges remain unknown.";
  }
  return {
    conversation,
    evidence,
    timings,
    diagnostic,
    failure,
    providerQualification: "NOT_PASSED",
    qualityVerdict: "HUMAN_REVIEW_REQUIRED",
  };
}
