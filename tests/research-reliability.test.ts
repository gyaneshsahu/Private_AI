import { expect, it } from "vitest";
import Decimal from "decimal.js";
import fixtures from "../evaluation/cases/research-reliability-transfer.json";
import {
  developmentCase,
  experimentRequestLimit,
} from "../evaluation/experiment";
import { replyTiming } from "../evaluation/reply-timing";

it("binds the fresh transfer packet to separate two-request conversations", () => {
  expect(fixtures.cases).toHaveLength(12);
  expect(new Set(fixtures.cases.map((c) => c.id)).size).toBe(12);
  for (const c of fixtures.cases) {
    expect(developmentCase(c.id, "robustness_case").sources[0].text).toBe(
      c.source,
    );
    expect(
      experimentRequestLimit({
        scenario: "robustness_case",
        developmentCaseId: c.id,
      }),
    ).toBe(2);
  }
  expect(fixtures.cases.length * 2 * fixtures.arms.length).toBe(
    fixtures.maximumRequests,
  );
});

it("measures first nonblank delivered text and keeps no-answer latency null", () => {
  let clock = 100;
  const timing = replyTiming(() => clock);
  clock = 150;
  timing.chunk(" \n");
  expect(timing.snapshot()).toEqual({
    firstVisibleTextMs: null,
    elapsedMs: 50,
  });
  clock = 210;
  timing.chunk("Answer");
  clock = 350;
  timing.chunk(" continues");
  expect(timing.snapshot()).toEqual({
    firstVisibleTextMs: 110,
    elapsedMs: 250,
  });
});

it("checks independent arithmetic and strict endpoints", () => {
  const discounted = new Decimal(240).times("0.85");
  expect(discounted.plus(18).times("1.2").toFixed(2)).toBe("266.40");
  expect(discounted.plus(12).times("1.2").toFixed(2)).toBe("259.20");
  expect(new Decimal(80).div(200).times(100).toNumber()).toBe(40);
  expect((18 + 16) / 100).toBe(0.34);
  expect((64 + 2) / 100).toBe(0.66);
  expect(400 > 250 && 400 < 400).toBe(false);
  expect(
    (Date.parse("2026-10-16T15:00:00Z") - Date.parse("2026-10-12T15:00:00Z")) /
      3600000,
  ).toBe(96);
});
