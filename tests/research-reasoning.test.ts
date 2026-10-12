import { expect, it } from "vitest";
import Decimal from "decimal.js";
import fixtures from "../evaluation/cases/research-reasoning-transfer.json";
import {
  developmentCase,
  experimentRequestLimit,
} from "../evaluation/experiment";
import { qualificationSchema } from "../shared/contracts";

it("binds ten frozen synthetic cases to exactly two requests each", () => {
  expect(fixtures.cases).toHaveLength(10);
  expect(new Set(fixtures.cases.map((c) => c.id)).size).toBe(10);
  for (const fixture of fixtures.cases) {
    const c = developmentCase(fixture.id, "robustness_case");
    expect(c.synthetic).toBe(true);
    expect(c.sources[0].text).toBe(fixture.source);
    expect(c.turns).toEqual(fixture.turns);
    expect(
      experimentRequestLimit({
        scenario: "robustness_case",
        developmentCaseId: c.id,
      }),
    ).toBe(2);
  }
});

it("independently checks arithmetic ground truth using decimal quantities and explicit denominators", () => {
  const D = (n: number) => new Decimal(n);
  expect(D(360).minus(240).div(240).times(100).toString()).toBe("50");
  expect(D(104).minus(80).div(80).times(100).toString()).toBe("30");
  expect(D(75).minus(15).minus(18).toString()).toBe("42");
  for (const [pumps, kWh, charge] of [
    [3, "1.8", "1.176"],
    [2, "1.2", "0.984"],
  ] as const) {
    const energy = D(pumps).times(800).div(1000).times(45).div(60);
    expect(energy.toString()).toBe(kWh);
    expect(energy.times("0.32").plus("0.60").toString()).toBe(charge);
  }
  expect(D(9).plus(30).div(110).times(100).toFixed(2)).toBe("35.45");
  expect(D(80).plus(2).div(110).times(100).toFixed(2)).toBe("74.55");
});

it("does not raise the production output limit", () => {
  expect(
    qualificationSchema.shape.maxOutputTokens.safeParse(8192).success,
  ).toBe(false);
  expect(
    qualificationSchema.shape.maxOutputTokens.safeParse(4096).success,
  ).toBe(true);
});
