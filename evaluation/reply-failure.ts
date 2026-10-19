import { CalculatorValidationError } from "../src/calculator-turn";
import { CheckedResponseError } from "../src/checked-response";
import { ResearchEvidenceError } from "../src/research-contract";
import { IncompleteReplyError } from "../src/reply-stream";
export function classifyEvaluationFailure(error: unknown) {
  const contract =
    error instanceof CalculatorValidationError ||
    error instanceof CheckedResponseError ||
    error instanceof ResearchEvidenceError;
  return {
    failureKind: contract
      ? "CONTRACT_REJECTED"
      : "TRANSPORT_OR_APPLICATION_FAILURE",
    calculatorSchemaIssues:
      error instanceof CalculatorValidationError
        ? error.schemaIssues
        : undefined,
    calculatorFailure:
      error instanceof CalculatorValidationError
        ? error.calculatorFailure
        : undefined,
    calculatorValidationDetail:
      error instanceof CalculatorValidationError
        ? error.validationDetail
        : undefined,
    checkedFailure:
      error instanceof CheckedResponseError ? error.checkedFailure : undefined,
    evidenceFailure:
      error instanceof ResearchEvidenceError
        ? error.evidenceFailure
        : undefined,
    transportDiagnostic:
      error instanceof IncompleteReplyError ? error.diagnostic : undefined,
    usage: error instanceof IncompleteReplyError ? error.usage : undefined,
  };
}

// Historical plans retain the global stop. New plans may isolate known failures
// to one conversation, but never continue unknown transport/security failures.
export function shouldStopWorkspaceBatch(
  reply: {
    completed: boolean;
    failureKind?: string;
    transportDiagnostic?: { code: string };
  },
  policy: "global" | "independent-arms" = "global",
  upstreamHealthy = false,
): boolean {
  if (reply.completed) return false;
  if (policy !== "independent-arms" || !upstreamHealthy) return true;
  return !(
    reply.failureKind === "CONTRACT_REJECTED" ||
    ["OUTPUT_LIMIT_REACHED", "TIMED_OUT", "INCOMPLETE_ANSWER"].includes(
      reply.transportDiagnostic?.code ?? "",
    )
  );
}
