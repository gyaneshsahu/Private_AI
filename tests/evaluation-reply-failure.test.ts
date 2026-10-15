import { it, expect } from "vitest";
import { classifyEvaluationFailure } from "../evaluation/reply-failure";
import { CheckedResponseError } from "../src/checked-response";
import { IncompleteReplyError } from "../src/reply-stream";
it("distinguishes contract rejection from transport failure despite their shared error name", () => {
  const usage = { input: 12, output: 3, total: 15, estimatedUSD: 0.001 };
  const contract = classifyEvaluationFailure(
    new CheckedResponseError("INVALID_SCHEMA", usage),
  );
  expect(contract.failureKind).toBe("CONTRACT_REJECTED");
  expect(contract.checkedFailure).toBe("INVALID_SCHEMA");
  expect(contract.usage).toEqual(usage);
  const transport = classifyEvaluationFailure(
    new IncompleteReplyError("Synthetic truncated stream", usage),
  );
  expect(transport.failureKind).toBe("TRANSPORT_OR_APPLICATION_FAILURE");
  expect(transport.usage).toEqual(usage);
});
