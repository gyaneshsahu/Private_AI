import { describe, expect, it } from "vitest";
import gate from "../evaluation/arithmetic-gate/cases.json";
import { evaluateDerivation } from "../evaluation/arithmetic-gate/derivation";
import { D } from "../evaluation/arithmetic-gate/numbers";
import { type GateCase, scoreConversation, scoreTurn } from "../evaluation/arithmetic-gate/scorer";
import { developmentCase } from "../evaluation/experiment";

const cases = gate.cases as unknown as GateCase[];
const count = (key: (c: GateCase) => string) =>
  cases.reduce<Record<string, number>>((a, c) => ((a[key(c)] = (a[key(c)] ?? 0) + 1), a), {});

describe("frozen arithmetic gate cases", () => {
  it("has the agreed shape and coverage", () => {
    expect(cases).toHaveLength(40);
    expect(new Set(cases.map((c) => c.id)).size).toBe(40);
    expect(count((c) => c.locale)).toEqual({ de: 20, en: 20 });
    expect(count((c) => String(c.critical))).toEqual({ true: 10, false: 30 });
    expect(count((c) => (c.critical ? c.locale : "other"))).toEqual({ de: 5, en: 5, other: 30 });
    expect(count((c) => c.secondTurn).correction).toBeGreaterThanOrEqual(10);
    expect(count((c) => c.category)).toEqual({
      vat: 5,
      "net-gross": 5,
      "percent-change": 4,
      "instalments-simple-interest": 5,
      "compound-interest": 4,
      "table-sum": 5,
      "date-time": 6,
      proration: 3,
      "multi-step": 3,
    });
    for (const c of cases) {
      expect(c.synthetic).toBe(true);
      expect(c.turns).toHaveLength(2);
      expect(c.expected[0].length && c.expected[1].length, c.id).toBeTruthy();
      expect(developmentCase(c.id, "robustness_case").turns).toEqual(c.turns);
    }
  });
  it("re-derives every expected value from its written derivation", () => {
    for (const c of cases)
      for (const item of c.expected.flat()) {
        const derived = evaluateDerivation(item.derivation);
        if (item.kind === "time" || item.kind === "date") expect(derived, `${c.id} ${item.label}`).toBe(item.value);
        else expect(new D(derived).eq(item.value), `${c.id} ${item.label}: ${derived} vs ${item.value}`).toBe(true);
        if (item.kind === "money") expect(item.value, `${c.id} ${item.label}`).toMatch(/^\d+\.\d{2}$/);
      }
  });
  it("uses German formats in German cases and English formats in English cases", () => {
    for (const c of cases) {
      const text = c.turns.join(" ");
      if (c.locale === "de") {
        expect(text, c.id).not.toMatch(/\d,\d{3}\.\d{2}|\d+\.\d{2} (?:EUR|USD)/);
        expect(text, c.id).not.toMatch(/\d%/);
      } else {
        expect(text, c.id).not.toMatch(/\d\.\d{3},\d{2}|\d+,\d{2} (?:EUR|USD)/);
        expect(text, c.id).not.toMatch(/\d %/);
      }
    }
  });
  it("cannot be passed by echoing the user's own message", () => {
    for (const c of cases)
      c.turns.forEach((t, i) =>
        expect(scoreTurn(t, c.expected[i], c.forbidden[i], c.locale).pass, `${c.id} turn ${i + 1}`).toBe(false),
      );
  });
  it("passes a reply that states exactly the expected facts in the case's own locale", () => {
    for (const c of cases)
      expect(scoreConversation(c, c.mandatoryFacts).pass, `${c.id}: ${c.mandatoryFacts.join(" | ")}`).toBe(true);
  });
  it("never lists an expected value as forbidden in the same turn", () => {
    for (const c of cases)
      c.forbidden.forEach((list, i) => {
        for (const f of list)
          expect(c.expected[i].some((e) => e.kind === f.kind && e.value === f.value), `${c.id} ${f.label}`).toBe(false);
        expect(scoreTurn(c.mandatoryFacts[i], c.expected[i], list, c.locale).forbiddenHits).toEqual([]);
      });
  });
});
