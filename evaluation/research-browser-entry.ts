import type { Source } from "../shared/contracts";
import { emptyConversation } from "../shared/contracts";
import { newMessage } from "../src/conversation";
import { streamVerifiedConversation } from "../src/verified-chat";
import { validateExperiment, developmentCase } from "./experiment";
import { auditResearchAnswer } from "../src/research-audit";
import { IncompleteReplyError } from "../src/reply-stream";
import { ResearchEvidenceError } from "../src/research-contract";

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
      !permit.developmentCaseId?.startsWith("evidence-")
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
    for (const prompt of fixture.turns) {
      conversation.messages.push(newMessage("user", prompt));
      let answer = "";
      let stage = "starting";
      const started = performance.now();
      try {
        const usage = await streamVerifiedConversation(
          conversation,
          permit.policy,
          csrf,
          AbortSignal.timeout(95000),
          (chunk) => {
            answer += chunk;
          },
          (value) => {
            stage = value;
          },
          () => {
            validateExperiment(permit);
          },
        );
        conversation.messages.push(newMessage("assistant", answer));
        outcomes.push({
          completed: true,
          answer,
          usage,
          elapsedMs: Math.round(performance.now() - started),
          evidenceAudit: auditResearchAnswer(answer, sources),
        });
      } catch (error) {
        outcomes.push({
          completed: false,
          answer,
          stage,
          failureKind:
            error instanceof ResearchEvidenceError
              ? "EVIDENCE_WITHHELD"
              : "INCOMPLETE",
          evidenceFailure:
            error instanceof ResearchEvidenceError
              ? error.evidenceFailure
              : undefined,
          transportDiagnostic:
            error instanceof IncompleteReplyError
              ? error.diagnostic
              : undefined,
          usage:
            error instanceof IncompleteReplyError ? error.usage : undefined,
          elapsedMs: Math.round(performance.now() - started),
        });
        break;
      }
    }
    return outcomes;
  },
});
