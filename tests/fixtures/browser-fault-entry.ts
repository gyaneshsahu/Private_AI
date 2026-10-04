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
      newMessage("user", "SYNTHETIC_REQUEST_CANARY: calculate 2 + 2"),
    );
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
          model: "TEST_ONLY",
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
      context: composeContext(conversation, 8000),
    };
  },
});
