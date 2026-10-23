import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import snapshot from "../evaluation/results/model-catalog-20261020.json";
import gate from "../evaluation/arithmetic-gate/cases.json";
import { validateExperiment } from "../evaluation/experiment";
import { renderCheckedResponse } from "../src/checked-response";
import { calculatorArguments } from "../src/calculator-turn";
import { emptyConversation } from "../shared/contracts";
import {
  BATCH_RESERVE_CEILING_USD,
  LIMITS,
  borderlineSpec,
  buildBatch,
  checkLiveCatalog,
  conversations,
  referencePrices,
  reportBatch,
  schedule,
  screenCaseIds,
  worstPerRequest,
} from "../evaluation/arithmetic-gate/prepare-run";

const NOW = Date.parse("2026-10-23T09:00:00Z");
const catalog = (
  patch: (rows: Record<string, unknown>[]) => void = () => {},
) => {
  const data = structuredClone(snapshot.data) as Record<string, unknown>[];
  patch(data);
  return {
    source: "https://inference.tinfoil.sh/v1/models",
    observedAt: "2026-10-23T08:30:00Z",
    data,
  };
};
const template = {
  purpose: "SYNTHETIC_ONLY_NOT_PROVIDER_QUALIFICATION",
  scenario: "robustness_case",
  developmentCaseId: "selection-01",
  approvalId: "template_only_1",
  approvedAt: "2026-10-19T00:00:00Z",
  expiresAt: "2026-10-19T06:00:00Z",
  approvalEvidence: "template evidence, replaced per permit",
  approvedCapUSD: 5,
  providerCapUSD: 3,
  providerLimitEvidence: "template evidence, replaced per permit",
  pricingEvidence: "template evidence, replaced per permit",
  pricingCheckedAt: "2026-10-19T00:00:00Z",
  browserPreflightEvidence: "synthetic browser preflight evidence for tests",
  releaseReviewEvidence: "synthetic release review evidence for tests only",
  policy: {
    origin: "https://inference.tinfoil.sh",
    repository: "tinfoilsh/confidential-model-router",
    releaseDigests: [
      "1ffc1cde7acd5134367cb9f430024203ed4455a51ee4473f7b3e75bd556d0a6b",
    ],
    model: "deepseek-v4-1-flash",
    answerPolicyVariant: "constraints-v4",
    maxInputCharacters: 20000,
    maxOutputTokens: 4096,
    pricing: { currency: "USD", inputPerMillion: 0.65, outputPerMillion: 1.45 },
    deepSeekThinking: true,
    deepSeekReasoningEffort: "low",
  },
};
const budget = {
  actualBeforeUSD: 0.82,
  prepaidBeforeUSD: 10.18,
  uncertaintyUSD: 0.29,
  capUSD: 5,
  providerAccountLimitUSD: 3,
  providerKeyLimitUSD: 5,
  approvedCapUSD: 5,
  providerCapUSD: 3,
  modelSpentUSD: 0,
  budgetEvidence: "synthetic test budget evidence, not a billing read",
  approvalEvidence: "synthetic test approval, not an owner authorisation",
};
const build = (
  id: string,
  over: Partial<typeof budget> = {},
  cat = catalog(),
) =>
  buildBatch({
    spec: schedule().find((s) => s.id === id)!,
    catalog: cat,
    catalogSHA256: "0".repeat(64),
    template,
    budget: { ...budget, ...over },
    now: NOW,
    gateHashes: {},
    implementationHashes: {},
    fixtureSHA256: "1".repeat(64),
  });

describe("arithmetic gate batch schedule", () => {
  const plan = schedule();
  it("runs Gemma, then GPT-OSS, and only later GLM-5.3 and Kimi K3", () => {
    const firstOf = (cell: string) => plan.findIndex((s) => s.cell === cell);
    expect(plan[0].id).toBe("gemma-screen-1");
    expect(firstOf("gemma")).toBeLessThan(firstOf("gptoss"));
    expect(firstOf("gptoss")).toBeLessThan(firstOf("glm"));
    expect(firstOf("glm")).toBeLessThan(firstOf("kimi"));
    expect(
      new Set(plan.filter((s) => s.wave === 1).map((s) => s.cell)),
    ).toEqual(new Set(["gemma", "gptoss"]));
    const kimi = plan.filter((s) => s.cell === "kimi");
    expect(kimi.flatMap((s) => s.caseIds).sort()).toEqual(
      gate.cases
        .filter((c) => c.critical)
        .map((c) => c.id)
        .sort(),
    );
    expect(
      kimi.every((s) => s.arms.join() === "alone" && s.repetition === 1),
    ).toBe(true);
  });
  it("covers the nine-case screen and every gate case three times in both request arms", () => {
    expect(screenCaseIds).toHaveLength(9);
    for (const cell of ["gemma", "gptoss", "glm"] as const) {
      expect(
        plan
          .filter((s) => s.cell === cell && s.kind === "screen")
          .flatMap((s) => s.caseIds),
      ).toEqual(screenCaseIds);
      for (const rep of [1, 2, 3]) {
        const convs = plan
          .filter(
            (s) => s.cell === cell && s.kind === "gate" && s.repetition === rep,
          )
          .flatMap(conversations);
        expect(convs).toHaveLength(80);
        expect(new Set(convs.map((c) => `${c.caseId}-${c.arm}`)).size).toBe(80);
      }
    }
  });
  it("keeps every batch's worst-case reserve within the ceiling", () => {
    for (const s of plan) {
      const chars =
        s.kind === "screen"
          ? LIMITS.screenInputCharacters
          : LIMITS.gateInputCharacters;
      const reserve =
        conversations(s).length *
        2 *
        worstPerRequest(referencePrices[s.cell], chars);
      if (s.caseIds.length > 1)
        expect(reserve, s.id).toBeLessThanOrEqual(BATCH_RESERVE_CEILING_USD);
    }
  });
  it("alternates arm order by case and names permits the way the runner reads them", () => {
    const convs = conversations(plan.find((s) => s.id === "gemma-gate-r1-1")!);
    expect(convs.slice(0, 4).map((c) => `${c.caseId}-${c.runnerCell}`)).toEqual(
      [
        "arith-01-gemma-alone-r1",
        "arith-01-gemma-calculator-r1",
        "arith-02-gemma-calculator-r1",
        "arith-02-gemma-alone-r1",
      ],
    );
  });
  it("allows borderline repetitions only for named non-critical cases", () => {
    expect(
      borderlineSpec("gemma-gate-r4-borderline", ["arith-03"], ["alone"])
        .repetition,
    ).toBe(4);
    expect(() =>
      borderlineSpec("gemma-gate-r4-borderline", ["arith-01"], ["alone"]),
    ).toThrow(/critical/);
    expect(() =>
      borderlineSpec("gemma-gate-r6-borderline", ["arith-03"], ["alone"]),
    ).toThrow();
    expect(() =>
      borderlineSpec("gemma-gate-r4-borderline", ["arith-99"], ["alone"]),
    ).toThrow();
  });
});

describe("live catalog check (offline, from a saved catalog file)", () => {
  it("accepts the non-experimental candidates and reports price changes", () => {
    expect(checkLiveCatalog(catalog(), "gemma", NOW)).toMatchObject({
      price: referencePrices.gemma,
      changes: [],
    });
    const raised = catalog((rows) => {
      (
        rows.find((r) => r.id === "gpt-oss-120b")!.pricing as Record<
          string,
          number
        >
      ).outputTokenPricePer1M = 0.9;
    });
    expect(checkLiveCatalog(raised, "gptoss", NOW).changes).toEqual([
      "output 0.6 -> 0.9 USD",
    ]);
  });
  it("refuses any model labelled experimental, in any field", () => {
    const flagged = catalog(
      (rows) => (rows.find((r) => r.id === "gemma4-31b")!.experimental = true),
    );
    expect(() => checkLiveCatalog(flagged, "gemma", NOW)).toThrow(
      /experimental/,
    );
    const named = catalog(
      (rows) =>
        (rows.find((r) => r.id === "glm-5-3")!.name = "GLM-5.3 (Experimental)"),
    );
    expect(() => checkLiveCatalog(named, "glm", NOW)).toThrow(/experimental/);
    const tagged = catalog(
      (rows) => (rows.find((r) => r.id === "kimi-k3")!.tags = ["experimental"]),
    );
    expect(() => checkLiveCatalog(tagged, "kimi", NOW)).toThrow(/experimental/);
  });
  it("refuses a missing, duplicated, unpriced or stale entry", () => {
    expect(() =>
      checkLiveCatalog(
        catalog((rows) =>
          rows.splice(
            rows.findIndex((r) => r.id === "gemma4-31b"),
            1,
          ),
        ),
        "gemma",
        NOW,
      ),
    ).toThrow();
    expect(() =>
      checkLiveCatalog(
        catalog((rows) =>
          rows.push({ ...rows.find((r) => r.id === "gemma4-31b")! }),
        ),
        "gemma",
        NOW,
      ),
    ).toThrow();
    expect(() =>
      checkLiveCatalog(
        catalog(
          (rows) => delete rows.find((r) => r.id === "gemma4-31b")!.pricing,
        ),
        "gemma",
        NOW,
      ),
    ).toThrow();
    expect(() =>
      checkLiveCatalog(
        { ...catalog(), observedAt: "2026-10-22T09:00:00Z" },
        "gemma",
        NOW,
      ),
    ).toThrow(/hours/);
    expect(() =>
      checkLiveCatalog(
        { ...catalog(), source: "https://example.com/models" },
        "gemma",
        NOW,
      ),
    ).toThrow();
  });
});

describe("frozen batch permits and plan", () => {
  it("builds valid permits with live prices; only the calculator arm enables the calculator", () => {
    const { plan, permits } = build("gemma-gate-r1-1");
    expect(permits).toHaveLength(20);
    for (const p of permits) {
      expect(() => validateExperiment(p.permit, NOW)).not.toThrow();
      expect(p.permit.policy.model).toBe("gemma4-31b");
      expect(p.permit.policy.gemmaThinking).toBe(false);
      expect(p.permit.policy.maxInputCharacters).toBe(12000);
      expect("deepSeekThinking" in p.permit.policy).toBe(false);
      expect(
        !!(p.permit.policy as { optionalCalculator?: boolean })
          .optionalCalculator,
      ).toBe(p.conversation.arm === "calculator");
    }
    expect(plan.maxRequests).toBe(40);
    expect(plan.automaticRetries).toBe(0);
    expect(plan.reserveUSD).toBeCloseTo(
      40 * worstPerRequest(referencePrices.gemma, 12000),
    );
    expect(new Set(permits.map((p) => p.permit.approvalId)).size).toBe(20);
  });
  it("builds the selection screen at its original 8000-character limit", () => {
    const { permits } = build("gptoss-screen-1");
    expect(permits.map((p) => p.file)).toEqual(
      screenCaseIds.map((id) => `${id}-gptoss.json`),
    );
    expect(
      permits.every((p) => p.permit.policy.maxInputCharacters === 8000),
    ).toBe(true);
    expect(
      permits.every((p) => p.permit.policy.gptOssReasoningEffort === "low"),
    ).toBe(true);
  });
  it("stops at the model cap and at the account headroom", () => {
    expect(() => build("kimi-gate-r1-1", { modelSpentUSD: 0.5 })).toThrow(
      /model cap/,
    );
    expect(() => build("kimi-gate-r1-1", { modelSpentUSD: 0.4 })).not.toThrow();
    expect(() => build("gemma-gate-r1-1", { actualBeforeUSD: 2.0 })).toThrow(
      /authorization|limits/,
    );
  });
  it("refuses to prepare a batch for an experimental model", () => {
    const flagged = catalog(
      (rows) => (rows.find((r) => r.id === "gemma4-31b")!.experimental = true),
    );
    expect(() => build("gemma-screen-1", {}, flagged)).toThrow(/experimental/);
  });
  it("reports batch cost from usage and scores the gate replies", () => {
    const { plan } = build("gemma-gate-r1-1");
    const results = {
      results: [
        {
          id: "arith-01",
          cell: "gemma-alone-r1",
          replies: [
            {
              completed: true,
              answer: "USt 234,57 EUR, Brutto 1.469,13 EUR",
              usage: { input: 700, output: 300 },
            },
            {
              completed: true,
              answer: "1.243,56 + 236,28 = 1.479,85 EUR; USt 236,28 EUR",
              usage: { input: 900, output: 300 },
            },
          ],
        },
      ],
    };
    const out = reportBatch(plan as never, results);
    expect(out.costLine.requests).toBe(2);
    expect(out.costLine.costUSD).toBeCloseTo((1600 * 0.4 + 600 * 1) / 1e6);
    expect(out.rows[0]).toMatchObject({ exact: false, postcheckFlagged: true });
    expect(() =>
      reportBatch(plan as never, {
        results: [{ id: "arith-01", cell: "glm-alone-r1", replies: [] }],
      }),
    ).toThrow();
  });
});

it("prepare-run never calls the network or reads credentials", () => {
  const source = readFileSync(
    "evaluation/arithmetic-gate/prepare-run.ts",
    "utf8",
  );
  for (const forbidden of [
    "fetch(",
    "TINFOIL_API_KEY",
    "BRAVE_SEARCH_API_KEY",
    "node:https",
    "node:http",
    "process.env",
  ])
    expect(source, forbidden).not.toContain(forbidden);
});

// Offline evidence behind the fix-option ordering: what the existing calculator
// path (src/checked-response.ts, src/calculator-turn.ts) accepts today.
describe("existing calculator path limits", () => {
  const run = (sourceText: string, value: string, rate = "19") => {
    const source = { id: "gate-source", title: "Synthetic", text: sourceText };
    const program = {
      inputs: [
        {
          id: "net",
          value,
          evidence: { kind: "source", sourceId: source.id, quote: sourceText },
        },
        {
          id: "rate",
          value: rate,
          evidence: { kind: "source", sourceId: source.id, quote: sourceText },
        },
      ],
      steps: [{ id: "vat", op: "percentOf", left: "net", right: "rate" }],
      results: [{ id: "vat", decimals: 2 }],
      passages: [],
      limitation: "none",
    };
    return () =>
      renderCheckedResponse(
        JSON.stringify(program),
        [source as never],
        emptyConversation(),
        "result",
      );
  };
  it("accepts an ungrouped English operand", () => {
    expect(run("Net 120.00 EUR, VAT 19%.", "120.00")()).toBe("22.80");
  });
  // 23 October: German and English groupings are accepted in their canonical
  // form, calendar and unit constants need no quotation, and minute and day
  // units exist. Arbitrary constants are still refused.
  it("accepts German decimal commas and thousands separators as canonical operands", () => {
    expect(run("Netto 1.234,56 EUR, USt 19 %.", "1234.56")()).toBe("234.57");
    expect(run("Net 1,234.56 EUR, VAT 19%.", "1234.56")()).toBe("234.57");
    expect(run("Netto 86,40 EUR, USt 7 %.", "86.40", "7")()).toBe("6.05");
  });
  it("refuses a constant the user did not write unless it is an allowed calendar or unit constant, and has minute and day units", () => {
    // 1.19 is what a quoted "19%" stands for since 23 October; 1.21 is not.
    expect(run("Net 120.00 EUR, VAT 19%.", "120.00", "1.21")).toThrow();
    for (const unit of ["min", "d"])
      expect(calculatorArguments.shape.unit.safeParse(unit).success, unit).toBe(
        true,
      );
    for (const unit of ["minutes", "day", "date"])
      expect(calculatorArguments.shape.unit.safeParse(unit).success, unit).toBe(
        false,
      );
  });
});
