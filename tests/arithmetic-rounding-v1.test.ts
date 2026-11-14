import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import rounding from "../evaluation/arithmetic-gate/rounding-v1-20261114.json";
import unseen3 from "../evaluation/arithmetic-gate/unseen-v3-20261023.json";
import dev from "../evaluation/arithmetic-gate/dev-v2-20261023.json";
import dev3 from "../evaluation/arithmetic-gate/dev-v3-20261023.json";
import unseen2 from "../evaluation/arithmetic-gate/unseen-v2-20261023.json";
import gate from "../evaluation/arithmetic-gate/cases.json";
import practice from "../evaluation/arithmetic-gate/practice.json";
import unseen1 from "../evaluation/arithmetic-gate/unseen-20261023.json";
import publicSet from "../evaluation/arithmetic-gate/public-20261023.json";
import { evaluateDerivation } from "../evaluation/arithmetic-gate/derivation";
import { D } from "../evaluation/arithmetic-gate/numbers";
import { type GateCase, scoreConversation, scoreTurn } from "../evaluation/arithmetic-gate/scorer";

// Rounding set v1, written 14 November 2026 by make-rounding-v1.py BEFORE the code-tool
// instruction got its rounding sentence, and FROZEN here (LF-normalised SHA-256, as prepare-run.ts).
const FROZEN = "6e65df798b2122286c680ae81169f480ca621707e72c83edf8c507cff9316c10";
const PATH = "evaluation/arithmetic-gate/rounding-v1-20261114.json";
const cases = rounding.cases as unknown as GateCase[];

/** de 1.234,56 · en 1,234.56 · ch 1'234.56 */
function fmt(value: string, style: "de" | "en" | "ch") {
  const [whole, frac] = value.split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+$)/g, { de: ".", en: ",", ch: "'" }[style]);
  return frac === undefined ? grouped : grouped + (style === "de" ? "," : ".") + frac;
}

describe("rounding-v1 frozen case set", () => {
  it("matches the frozen SHA-256", () => {
    expect(createHash("sha256").update(readFileSync(PATH, "utf8").replace(/\r\n/g, "\n")).digest("hex")).toBe(FROZEN);
  });
  it("has 24 cases, half German, two turns each, no scorer rounding field", () => {
    expect(cases).toHaveLength(24);
    expect(new Set(cases.map((c) => c.id)).size).toBe(24);
    expect(cases.filter((c) => c.locale === "de")).toHaveLength(12);
    for (const c of cases) {
      expect(c.synthetic).toBe(true);
      expect(c.turns).toHaveLength(2);
      expect(c.expected[0].length && c.expected[1].length, c.id).toBeTruthy();
      // The scorer would round the model's figure half up first, so "355.50" would pass for "356".
      for (const item of c.expected.flat()) expect(item.rounding, `${c.id} ${item.label}`).toBeUndefined();
    }
  });
  it("re-derives every value Python computed from its written derivation", () => {
    for (const c of cases)
      for (const item of c.expected.flat()) {
        expect(new D(evaluateDerivation(item.derivation)).eq(item.value), `${c.id} ${item.label}`).toBe(true);
        if (item.kind === "money") expect(item.value, `${c.id} ${item.label}`).toMatch(/^\d+\.\d{2}$/);
      }
  });
  it("shares no turn with any earlier set", () => {
    const others = new Set(
      [...dev.cases, ...dev3.cases, ...unseen1.cases, ...unseen2.cases, ...unseen3.cases, ...gate.cases, ...practice.cases, ...publicSet.cases].flatMap(
        (c) => (c as { turns: string[] }).turns,
      ),
    );
    for (const c of cases) for (const t of c.turns) expect(others.has(t), `${c.id}: ${t.slice(0, 40)}`).toBe(false);
  });
  it("cannot be passed by echoing the user's own message", () => {
    for (const c of cases)
      c.turns.forEach((t, i) => expect(scoreTurn(t, c.expected[i], c.forbidden[i], c.locale).pass, `${c.id} turn ${i + 1}`).toBe(false));
  });
  it("the scorer accepts every expected value in the case's own format, and in Swiss format for CHF cases", () => {
    for (const c of cases) {
      expect(scoreConversation(c, c.mandatoryFacts).pass, `${c.id}: ${c.mandatoryFacts.join(" | ")}`).toBe(true);
      if (!c.turns[0].includes("CHF")) continue;
      const swiss = c.expected.map((items) => items.map((e) => `${e.label}: CHF ${fmt(e.value, "ch")}`).join("; "));
      expect(scoreConversation(c, swiss).pass, `${c.id}: ${swiss.join(" | ")}`).toBe(true);
    }
  });
  it("fails a reply that also states a value of the wrong rounding rule", () => {
    for (const c of cases)
      c.forbidden.forEach((list, i) => {
        for (const f of list) {
          const text = `${c.mandatoryFacts[i]}; ${f.label}: ${fmt(f.value, c.locale)}${f.kind === "percent" ? (c.locale === "de" ? " %" : "%") : ""}`;
          expect(scoreTurn(text, c.expected[i], list, c.locale).pass, `${c.id} turn ${i + 1}: ${text}`).toBe(false);
        }
      });
  });
});
