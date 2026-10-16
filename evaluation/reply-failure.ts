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
    calculatorFailure:
      error instanceof CalculatorValidationError
        ? error.calculatorFailure
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

// Any incomplete reply ends this batch, even if usage was reported or the
// rejection was local. A later batch needs a new explicit plan and permits.
export function shouldStopWorkspaceBatch(reply: {
  completed: boolean;
}): boolean {
  return !reply.completed;
}
