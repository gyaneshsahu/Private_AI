import { describe, expect, it } from "vitest";
import dev from "../evaluation/arithmetic-gate/dev-v2-20261023.json";
import gate from "../evaluation/arithmetic-gate/cases.json";
import practice from "../evaluation/arithmetic-gate/practice.json";
import unseen from "../evaluation/arithmetic-gate/unseen-20261023.json";
import publicSet from "../evaluation/arithmetic-gate/public-20261023.json";
import { buildDevSet } from "../evaluation/arithmetic-gate/make-dev-v2";
import { evaluateDerivation } from "../evaluation/arithmetic-gate/derivation";
import { D } from "../evaluation/arithmetic-gate/numbers";
import { type GateCase, scoreConversation, scoreTurn } from "../evaluation/arithmetic-gate/scorer";
import { conversationSpans } from "../src/arithmetic/spans";

// The Design A development set (arithmetic v2, 23 October 2026).
const cases = dev.cases as unknown as GateCase[];

describe("dev-v2 development set", () => {
  it("is what make-dev-v2.ts generates, 24 cases, half German", () => {
    expect(JSON.parse(JSON.stringify(buildDevSet()))).toEqual(dev);
    expect(cases).toHaveLength(24);
    expect(new Set(cases.map((c) => c.id)).size).toBe(24);
    expect(cases.filter((c) => c.locale === "de")).toHaveLength(12);
    expect(cases.filter((c) => c.critical).length).toBeGreaterThanOrEqual(8);
    for (const c of cases) {
      expect(c.synthetic).toBe(true);
      expect(c.turns).toHaveLength(2);
      expect(c.expected[0].length && c.expected[1].length, c.id).toBeTruthy();
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
  it("shares no turn with the practice, frozen, unseen or public sets", () => {
    const others = new Set(
      [...gate.cases, ...practice.cases, ...unseen.cases, ...publicSet.cases].flatMap((c) => (c as { turns: string[] }).turns),
    );
    for (const c of cases) for (const t of c.turns) expect(others.has(t), `${c.id}: ${t.slice(0, 40)}`).toBe(false);
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
      c.turns.forEach((t, i) => expect(scoreTurn(t, c.expected[i], c.forbidden[i], c.locale).pass, `${c.id} turn ${i + 1}`).toBe(false));
  });
  it("passes a reply that states exactly the expected facts in the case's own locale", () => {
    for (const c of cases) expect(scoreConversation(c, c.mandatoryFacts).pass, `${c.id}: ${c.mandatoryFacts.join(" | ")}`).toBe(true);
  });
  it("gives every case the spans Design A needs: each operand of the derivation is a span or a constant", () => {
    const constants = ["1", "2", "7", "12", "24", "30", "52", "60", "100", "365", "366", "1000"];
    for (const c of cases) {
      const spans = conversationSpans(c.turns, c.locale);
      const available = new Set([...spans.map((s) => s.value), ...constants]);
      // Spans also stand for derived forms the program can build: a percentage p gives p/100 and 1 ± p/100.
      for (const s of spans)
        if (s.unit === "%") {
          available.add(new D(s.value).div(100).toString());
          available.add(new D(1).plus(new D(s.value).div(100)).toString());
          available.add(new D(1).minus(new D(s.value).div(100)).toString());
        }
      for (const item of c.expected.flat()) {
        const literals = item.derivation.replace(/"[^"]*"/g, "").match(/(?<![\w.])\d+(?:\.\d+)?(?!\w)/g) ?? [];
        for (const literal of literals) {
          const value = new D(literal).toString();
          // Rounding places and the Swiss 20 / 0 helpers are not operands.
          if (["0", "1", "2", "20"].includes(value)) continue;
          expect(available.has(value), `${c.id} ${item.label}: ${literal} is not a span or constant`).toBe(true);
        }
      }
    }
  });
});
