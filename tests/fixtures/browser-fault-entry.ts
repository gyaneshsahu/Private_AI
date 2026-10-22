import { streamLegacyConversation } from "./legacy-stream";
// TEST ONLY. Verification evidence is injected by the test server, never live.
import { streamVerifiedConversation } from "../../src/verified-chat";
import { emptyConversation } from "../../shared/contracts";
import { newMessage, composeContext } from "../../src/conversation";
import { IncompleteReplyError } from "../../src/reply-stream";

Object.assign(window, {
  runFaultCase: async (mode: string) => {
    Object.assign(window, { verificationFaultMode: mode });
    const conversation = emptyConversation();
    conversation.messages.push(
      newMessage(
        "user",
        mode === "masked"
          ? "SYNTHETIC_REQUEST_CANARY: pay DE89 3704 0044 0532 0130 00 and call +49 170 1234567"
          : "SYNTHETIC_REQUEST_CANARY: calculate 2 + 2",
      ),
    );
    let keptOnDevice: unknown;
    const checkedHistory = new Map<string, string>();
    if (mode === "checked_history") {
      const earlier = newMessage(
        "assistant",
        "RENDERED_HISTORY_NOT_WIRE_FORMAT",
      );
      conversation.messages.push(
        earlier,
        newMessage("user", "Calculate it again."),
      );
      checkedHistory.set(
        earlier.id,
        JSON.stringify({
          inputs: [],
          steps: [],
          results: [],
          passages: [],
          limitation: "insufficient",
        }),
      );
    }
    const answer = {
      ...newMessage("assistant", ""),
      status: "partial" as "partial" | "complete",
    };
    const controller = new AbortController();
    if (mode === "pre_cancel") controller.abort();
    if (mode === "stalled_verification")
      setTimeout(() => controller.abort(), 100);
    let authorizations = 0;
    let failure = false;
    let testError = "";
    let usage;
    const evidence: unknown[] = [];
    try {
      usage = await (
        mode === "legacy_valid"
          ? streamLegacyConversation
          : streamVerifiedConversation
      )(
        conversation,
        {
          origin: "https://inference.tinfoil.sh",
          repository: "tinfoilsh/confidential-model-router",
          releaseDigests: ["a".repeat(64)],
          model:
            mode === "deepseek_off"
              ? "deepseek-v4-1-flash"
              : mode.startsWith("thinking_")
                ? "gemma4-31b"
                : mode === "glm_low"
                  ? "glm-5-3"
                  : mode === "oss_high"
                    ? "gpt-oss-120b"
                    : "TEST_ONLY",
          ...(mode === "deepseek_off" ? { deepSeekThinking: false } : {}),
          ...(mode.startsWith("checked_")
            ? { checkedResponseContract: true }
            : {}),
          ...(mode === "oss_high"
            ? { gptOssReasoningEffort: "high" as const }
            : {}),
          ...(mode.startsWith("thinking_")
            ? { gemmaThinking: mode === "thinking_on" }
            : {}),
          ...(mode === "glm_low" ? { glmReasoningEffort: "low" as const } : {}),
          ...(mode === "policy_v2"
            ? { answerPolicyVariant: "constraints-v2" as const }
            : {}),
          maxInputCharacters: 8000,
          maxOutputTokens: 100,
          pricing: { inputPerMillion: 1, outputPerMillion: 1, currency: "USD" },
        },
        "SYNTHETIC_CSRF",
        controller.signal,
        (text) => {
          answer.text += text;
          if (mode === "cancel") controller.abort();
        },
        () => {},
        () => {
          authorizations++;
          if (mode === "permission_expired" && authorizations > 1)
            throw new Error("TEST permit expired");
        },
        (doc) => evidence.push(doc),
        undefined,
        checkedHistory,
        undefined,
        undefined,
        undefined,
        (kept) => {
          keptOnDevice = kept;
        },
      );
      answer.status = "complete";
    } catch (error) {
      failure = true;
      testError = error instanceof Error ? error.message : "Unknown test error";
      if (error instanceof IncompleteReplyError) usage = error.usage;
    }
    conversation.messages.push(answer);
    return {
      testError,
      failure,
      usage,
      evidence,
      answer,
      keptOnDevice,
      context: composeContext(conversation, 8000),
    };
  },
});
