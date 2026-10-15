import { CheckedResponseError } from "../src/checked-response";
import { ResearchEvidenceError } from "../src/research-contract";
import { IncompleteReplyError } from "../src/reply-stream";
export function classifyEvaluationFailure(error: unknown) {
  const contract =
    error instanceof CheckedResponseError ||
    error instanceof ResearchEvidenceError;
  return {
    failureKind: contract
      ? "CONTRACT_REJECTED"
      : "TRANSPORT_OR_APPLICATION_FAILURE",
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
