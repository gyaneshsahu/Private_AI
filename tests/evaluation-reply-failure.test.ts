import { CalculatorValidationError } from "../src/calculator-turn";
import { it, expect } from "vitest";
import {
  classifyEvaluationFailure,
  shouldStopWorkspaceBatch,
} from "../evaluation/reply-failure";
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

it("stops before the next request after every incomplete outcome, including usage-bearing contract rejection", () => {
  for (const failureKind of [
    "CONTRACT_REJECTED",
    "TRANSPORT_OR_APPLICATION_FAILURE",
    undefined,
  ]) {
    for (const usage of [
      undefined,
      { input: 1, output: 1, total: 2, estimatedUSD: 0.001 },
    ]) {
      const queue = [
        { completed: false, failureKind, usage },
        { completed: true },
      ];
      let attempted = 0;
      for (const reply of queue) {
        attempted++;
        if (shouldStopWorkspaceBatch(reply)) break;
      }
      expect(attempted).toBe(1);
    }
  }
  expect(shouldStopWorkspaceBatch({ completed: true })).toBe(false);
});

it("records calculator rejection as a local contract failure without prompt content", () => {
  const result = classifyEvaluationFailure(
    new CalculatorValidationError("INVALID_SCHEMA", {
      input: 1,
      output: 2,
      total: 3,
      estimatedUSD: 0,
    }),
  );
  expect(result.failureKind).toBe("CONTRACT_REJECTED");
  expect(result.calculatorFailure).toBe("INVALID_SCHEMA");
  expect(result.transportDiagnostic).toBeUndefined();
});

it("retains an enum diagnostic without exposing source content", () => {
  const result = classifyEvaluationFailure(
    new CalculatorValidationError(
      "EVIDENCE_OR_ARITHMETIC",
      { input: 1, output: 1, total: 2, estimatedUSD: 0 },
      undefined,
      "DEPENDENCY",
    ),
  );
  expect(result.calculatorValidationDetail).toBe("DEPENDENCY");
  expect(result.failureKind).toBe("CONTRACT_REJECTED");
});
