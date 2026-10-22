import { expect, it } from "vitest";
import type { RequestAllowance } from "../shared/contracts";
import {
  costBasisSentence,
  formatCostUsd,
  isActiveAllowance,
  meteredTokensSentence,
  noActivePlanMessage,
  periodEndLabel,
  publishedCostSentence,
  requestsRemainingHeading,
  requestsUsedSentence,
  settlementSentence,
  unmeteredSentence,
} from "../src/account-usage-format";
import { normalizeDecimalString, sumDecimalStrings } from "../server/usage-cost";

const active: RequestAllowance = {
  state: "active",
  limit: 50,
  used: 8,
  remaining: 42,
  pending: 1,
  uncertain: 2,
  resetsAt: "2026-11-01T00:00:00.000Z",
  meteredRequests: 5,
  promptTokens: 12345,
  completionTokens: 678,
  costUsd: "0.0123",
  unmeteredRequests: 3,
};

it("names the absence of a plan honestly and never calls it unavailable", () => {
  expect(noActivePlanMessage).toBe("No plan is active for this account yet.");
  expect(noActivePlanMessage).not.toMatch(/unavailable/i);
  expect(isActiveAllowance(undefined)).toBe(false);
  expect(isActiveAllowance({ state: "unavailable" })).toBe(false);
  expect(isActiveAllowance(active)).toBe(true);
});

it("renders request counts, period end and settlement wording from the allowance", () => {
  expect(requestsRemainingHeading(active)).toBe("42 requests remaining");
  expect(requestsRemainingHeading({ ...active, remaining: 0 })).toBe(
    "0 requests remaining",
  );
  expect(requestsUsedSentence(active)).toBe(
    "8 of 50 requests reserved or attempted in this period.",
  );
  expect(settlementSentence(active)).toBe(
    "1 pending or interrupted before settlement; 2 with an uncertain transport outcome.",
  );
  expect(periodEndLabel(active, "en-GB")).toMatch(/2026/);
  expect(periodEndLabel({ ...active, resetsAt: "not a date" })).toBe(
    "unknown",
  );
});

it("renders metered tokens, published cost and the fixed cost-basis sentence", () => {
  expect(meteredTokensSentence(active)).toBe(
    "5 completed requests were metered: 12,345 prompt tokens and 678 completion tokens.",
  );
  expect(meteredTokensSentence({ ...active, meteredRequests: 1 })).toMatch(
    /^1 completed request was metered/,
  );
  expect(publishedCostSentence(active)).toBe(
    "Published cost so far: USD 0.0123.",
  );
  expect(publishedCostSentence({ ...active, costUsd: undefined })).toBe(
    "No published cost has been reported for this period yet.",
  );
  expect(unmeteredSentence(active)).toBe(
    "3 settled requests have no metering (interrupted or uncertain).",
  );
  expect(unmeteredSentence({ ...active, unmeteredRequests: 1 })).toBe(
    "1 settled request has no metering (interrupted or uncertain).",
  );
  expect(costBasisSentence).toBe(
    "Cost is at published rates for completed requests only; interrupted requests are billed by the provider but cannot be counted here.",
  );
});

it("formats published costs without rounding tiny amounts up to a cent", () => {
  expect(formatCostUsd("0")).toBe("USD 0");
  expect(formatCostUsd("2.50")).toBe("USD 2.5");
  expect(formatCostUsd("0.000046")).toBe("USD 0.000046");
  expect(formatCostUsd("0.0000004")).toBe("less than USD 0.000001");
  expect(formatCostUsd("1.0000004")).toBe("USD 1");
  expect(formatCostUsd("0.123456789")).toBe("USD 0.123456");
  expect(formatCostUsd("abc")).toBe("USD unknown");
});

it("sums decimal cost strings exactly and keeps zero", () => {
  expect(sumDecimalStrings([])).toBe("0");
  expect(sumDecimalStrings(["0.1", "0.2"])).toBe("0.3");
  expect(sumDecimalStrings(["0.000046", "0.1", "3"])).toBe("3.100046");
  expect(sumDecimalStrings(["0.000000000001", "0.999999999999"])).toBe("1");
  expect(normalizeDecimalString("0.000000000000")).toBe("0");
  expect(normalizeDecimalString("0.100000000000")).toBe("0.1");
  expect(normalizeDecimalString("12")).toBe("12");
  expect(() => sumDecimalStrings(["1e3"])).toThrow("Invalid decimal cost.");
  expect(() => normalizeDecimalString("-1")).toThrow("Invalid decimal cost.");
});
