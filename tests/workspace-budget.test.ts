import { expect, it } from "vitest";
import { assertWorkspaceBudget } from "../evaluation/workspace-budget";
const plan = {
  maxRequests: 48,
  reserveUSD: 1.8,
  actualBeforeUSD: 0.74,
  uncertaintyUSD: 0.26,
  capUSD: 5,
  providerAccountLimitUSD: 3,
  providerKeyLimitUSD: 5,
  prepaidBeforeUSD: 10.26,
};
it("admits a meaningful batch within actual controls without inventing a smaller ceiling", () => {
  expect(() => assertWorkspaceBudget(plan, 48, 1.8, 5)).not.toThrow();
  expect(() =>
    assertWorkspaceBudget(
      { ...plan, reserveUSD: 3.8, providerAccountLimitUSD: 5 },
      48,
      3.8,
      5,
    ),
  ).not.toThrow();
});
it("bounds all requests against actual account/key/permit caps and genuine uncertainty", () => {
  expect(() =>
    assertWorkspaceBudget({ ...plan, reserveUSD: 2.1 }, 48, 2.1, 5),
  ).toThrow();
  expect(() =>
    assertWorkspaceBudget({ ...plan, providerKeyLimitUSD: 2 }, 48, 1.8, 5),
  ).toThrow();
  expect(() => assertWorkspaceBudget(plan, 48, 1.8, 2)).toThrow();
  expect(() =>
    assertWorkspaceBudget({ ...plan, prepaidBeforeUSD: 2 }, 48, 1.8, 5),
  ).toThrow();
  expect(() => assertWorkspaceBudget(plan, 49, 1.8, 5)).toThrow();
  expect(() => assertWorkspaceBudget(plan, 48, 1.9, 5)).toThrow();
  expect(() =>
    assertWorkspaceBudget(
      { ...plan, providerKeyLimitUSD: undefined },
      48,
      1.8,
      5,
    ),
  ).toThrow();
});
