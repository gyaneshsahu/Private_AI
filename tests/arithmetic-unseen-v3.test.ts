import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import unseen from "../evaluation/arithmetic-gate/unseen-v3-20261023.json";
import dev from "../evaluation/arithmetic-gate/dev-v2-20261023.json";
import dev3 from "../evaluation/arithmetic-gate/dev-v3-20261023.json";
import unseen2 from "../evaluation/arithmetic-gate/unseen-v2-20261023.json";
import gate from "../evaluation/arithmetic-gate/cases.json";
import practice from "../evaluation/arithmetic-gate/practice.json";
import unseen1 from "../evaluation/arithmetic-gate/unseen-20261023.json";
import publicSet from "../evaluation/arithmetic-gate/public-20261023.json";
import { buildUnseenV3 } from "../evaluation/arithmetic-gate/make-unseen-v3";
import { evaluateDerivation } from "../evaluation/arithmetic-gate/derivation";
import { D } from "../evaluation/arithmetic-gate/numbers";
import { type GateCase, scoreConversation, scoreTurn } from "../evaluation/arithmetic-gate/scorer";
import { conversationSpans } from "../src/arithmetic/spans";

// Gate v3 case set (Design B), FROZEN by the SHA-256 written in THRESHOLD-v3.md.
// The hash is taken over LF-normalised bytes, the convention of prepare-run.ts,
// because this checkout converts line endings.
const cases = unseen.cases as unknown as GateCase[];
const sha256 = (path: string) =>
  createHash("sha256").update(readFileSync(path, "utf8").replace(/\r\n/g, "\n")).digest("hex");

describe("unseen-v3 frozen case set", () => {
  it("matches the SHA-256 recorded in THRESHOLD-v3.md and what make-unseen-v3.ts generates", () => {
    const threshold = readFileSync("evaluation/arithmetic-gate/THRESHOLD-v3.md", "utf8");
    const recorded = /SHA-256[\s\S]*?`([0-9a-f]{64})`/.exec(threshold)?.[1];
    expect(recorded, "THRESHOLD-v3.md names the frozen hash").toBeDefined();
    expect(sha256("evaluation/arithmetic-gate/unseen-v3-20261023.json")).toBe(recorded);
    expect(JSON.parse(JSON.stringify(buildUnseenV3()))).toEqual(unseen);
  });
  it("has 30 cases, half German, at least twelve critical, two turns each", () => {
    expect(cases).toHaveLength(30);
    expect(new Set(cases.map((c) => c.id)).size).toBe(30);
    expect(cases.filter((c) => c.locale === "de")).toHaveLength(15);
    expect(cases.filter((c) => c.critical).length).toBeGreaterThanOrEqual(12);
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
  it("shares no turn with any earlier set, including dev-v3 and the run set unseen-v2", () => {
    const others = new Set(
      [...dev.cases, ...dev3.cases, ...unseen2.cases, ...gate.cases, ...practice.cases, ...unseen1.cases, ...publicSet.cases].flatMap((c) => (c as { turns: string[] }).turns),
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
          if (["0", "1", "2", "20"].includes(value)) continue;
          expect(available.has(value), `${c.id} ${item.label}: ${literal} is not a span or constant`).toBe(true);
        }
      }
    }
  });
});
