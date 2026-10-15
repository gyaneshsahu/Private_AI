import { replyTiming } from "./reply-timing";
import type { Source } from "../shared/contracts";
import { emptyConversation } from "../shared/contracts";
import { newMessage } from "../src/conversation";
import { streamVerifiedConversation } from "../src/verified-chat";
import { validateExperiment, developmentCase } from "./experiment";
import { auditResearchAnswer } from "../src/research-audit";
import { IncompleteReplyError } from "../src/reply-stream";
import { ResearchEvidenceError } from "../src/research-contract";
import { CheckedResponseError } from "../src/checked-response";

// Evaluation-only entry point. No source, answer or secret is written to storage.
Object.assign(window, {
  privateAiResearchRun: async (
    input: unknown,
    csrf: string,
    sources: Source[],
  ) => {
    const permit = validateExperiment(input);
    if (
      !permit.developmentCaseId?.startsWith("research-") &&
      !permit.developmentCaseId?.startsWith("evidence-") &&
      !permit.developmentCaseId?.startsWith("reason-") &&
      !permit.developmentCaseId?.startsWith("transfer-") &&
      !permit.developmentCaseId?.startsWith("revision-") &&
      !permit.developmentCaseId?.startsWith("checked-")
    )
      throw Error("Research permit required");
    const fixture = developmentCase(
      permit.developmentCaseId,
      "robustness_case",
    );
    const conversation = emptyConversation();
    conversation.temporarySearch = true;
    conversation.attachments.push({
      id: "research",
      name: "Temporary public research",
      selected: true,
      kind: "research",
      sources,
    });
    const outcomes = [];
    // Per-conversation, in-memory wire history; never substitutes a failed draft.
    const checkedHistory = new Map<string, string>();
    for (const prompt of fixture.turns) {
      conversation.messages.push(newMessage("user", prompt));
      let answer = "";
      let stage = "starting";
      let diagnosticDraft: string | undefined;
      const timing = replyTiming();
      try {
        const usage = await streamVerifiedConversation(
          conversation,
          permit.policy,
          csrf,
          AbortSignal.timeout(95000),
          (chunk) => {
            timing.chunk(chunk);
            answer += chunk;
          },
          (value) => {
            stage = value;
          },
          () => {
            validateExperiment(permit);
          },
          undefined,
          permit.developmentCaseId?.startsWith("checked-")
            ? (raw) => {
                diagnosticDraft = raw;
              }
            : undefined,
          checkedHistory,
        );
        const completedMessage = newMessage("assistant", answer);
        conversation.messages.push(completedMessage);
        if (permit.policy.checkedResponseContract && diagnosticDraft)
          checkedHistory.set(completedMessage.id, diagnosticDraft);
        outcomes.push({
          completed: true,
          answer,
          diagnosticDraft,
          usage,
          ...timing.snapshot(),
          evidenceAudit: auditResearchAnswer(answer, sources),
        });
      } catch (error) {
        outcomes.push({
          completed: false,
          answer,
          diagnosticDraft,
          stage,
          failureKind:
            error instanceof CheckedResponseError
              ? "CHECKED_RESPONSE_WITHHELD"
              : error instanceof ResearchEvidenceError
                ? "EVIDENCE_WITHHELD"
                : "INCOMPLETE",
          evidenceFailure:
            error instanceof ResearchEvidenceError
              ? error.evidenceFailure
              : undefined,
          checkedFailure:
            error instanceof CheckedResponseError
              ? error.checkedFailure
              : undefined,
          transportDiagnostic:
            error instanceof IncompleteReplyError
              ? error.diagnostic
              : undefined,
          usage:
            error instanceof IncompleteReplyError ? error.usage : undefined,
          ...timing.snapshot(),
        });
        break;
      }
    }
    return outcomes;
  },
});
