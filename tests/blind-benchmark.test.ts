import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  type Answer, type Contestant, CONTESTANTS, HERE, OUR_MODES, loadPrompts, makeKey, scoringSheet, shuffled, turns,
} from "../evaluation/blind-benchmark/make-sheets";
import { checkMaths } from "../evaluation/blind-benchmark/maths-check";
import { checkSafety, parseCsv, readScores, report } from "../evaluation/blind-benchmark/score";

const prompts = loadPrompts();
const byId = (id: string) => prompts.find((p) => p.id === id)!;

describe("blind benchmark prompts", () => {
  it("has about 50 prompts, all 9 levels with at least 4 each, unique ids", () => {
    expect(prompts.length).toBeGreaterThanOrEqual(45);
    expect(prompts.length).toBeLessThanOrEqual(55);
    for (let l = 1; l <= 9; l++) expect(prompts.filter((p) => p.level === l).length).toBeGreaterThanOrEqual(4);
    expect(new Set(prompts.map((p) => p.id)).size).toBe(prompts.length);
  });
  it("gives every level-3 prompt an expected value, level 4 search, level 6 a 1,500-3,000 word document", () => {
    for (const p of prompts.filter((p) => p.level === 3)) expect(p.expected?.final, p.id).toBeDefined();
    for (const p of prompts.filter((p) => p.level === 4)) expect(p.searchExpected, p.id).toBe(true);
    for (const p of prompts.filter((p) => p.level === 6)) {
      const words = readFileSync(join(HERE, p.attachments![0].path), "utf8").split(/\s+/).filter(Boolean).length;
      expect(words, p.id).toBeGreaterThanOrEqual(1500);
      expect(words, p.id).toBeLessThanOrEqual(3000);
      expect(turns(p)[0].length).toBeGreaterThan(8000);
    }
  });
});

describe("blinding", () => {
  const present = new Map(prompts.map((p) => [p.id, CONTESTANTS] as [string, Contestant[]]));
  it("shuffles deterministically per seed", () => {
    expect(makeKey(present, "s1").labels).toEqual(makeKey(present, "s1").labels);
    expect(makeKey(present, "s1").labels).not.toEqual(makeKey(present, "s2").labels);
    expect(shuffled(CONTESTANTS, "s1", "L1-01").sort()).toEqual([...CONTESTANTS].sort());
  });
  it("keeps model and mode names out of the scoring sheet", () => {
    const answers = new Map(prompts.map((p) => [p.id, Object.fromEntries(CONTESTANTS.map((c) => [c, {
      text: c === "chatgpt" ? "As ChatGPT by OpenAI, here is my answer." : c === "gemini" ? "I'm Gemini 3 Pro." : `Answer from our-model-x.`,
      model: "our-model-x",
    }])) as Partial<Record<Contestant, Answer>>]));
    const sheet = scoringSheet(prompts, answers, makeKey(present, "s1"));
    const banned = /chat ?gpt|openai|gemini|our-model-x|comet ?row|\bauto\b|\bfast\b|\bthinking\b|\bours\b/i;
    expect(sheet.md).not.toMatch(banned);
    expect(sheet.csv).not.toMatch(banned);
    expect(sheet.redactions).toBeGreaterThan(0);
  });
});

describe("maths check", () => {
  const ok: [string, string][] = [
    ["L3-01", "80 × 0.75 = 60, then 60 × 0.9 = 54. A 35% discount would give €52, so no.\nFinal answer: €54"],
    ["L3-02", "315 / 140 = 2.25 h = 2 h 15 min.\n\nFinal answer: **10:55**"],
    ["L3-03", "5,000 × 1.03^4 = 5,627.54405…\nFinal answer: €5,627.54"],
    ["L3-04", "5x − 12 = 2x + 18, 3x = 30.\nFinal answer: x = 10"],
    ["L3-05", "P = 5/10 × 4/9 = \\frac{2}{9}\nFinal answer: 2/9 ≈ 22.2%"],
    ["L3-06", "Scale by 2.5: 750 g flour, 5 eggs, 625 ml milk.\nFinal answer: 625 ml"],
    ["L3-07", "3 packs (37.80) + 2 singles (4.80) = **€42.60**"],
    ["L7-03", "Netto 217,50 €, MwSt. 41,33 €.\nErgebnis: 258,83 €"],
  ];
  it.each(ok)("accepts a correct %s", (id, text) => {
    expect(checkMaths(text, byId(id).expected!, byId(id).language).verdict).toBe("correct");
  });
  it("fails a wrong final number silently, and notices stated uncertainty", () => {
    const e = byId("L3-03").expected!;
    expect(checkMaths("Final answer: €5,600.00", e).verdict).toBe("silent-wrong");
    expect(checkMaths("Final answer: €5,600.00 (I'm not sure, please double-check)", e).verdict).toBe("wrong-flagged");
    expect(checkMaths("Final answer: 11:15", byId("L3-02").expected!).verdict).toBe("silent-wrong");
    expect(checkMaths("750 g flour, 4 eggs.\nFinal answer: 625 ml", byId("L3-06").expected!).verdict).toBe("silent-wrong");
  });
});

describe("scoring", () => {
  it("reads semicolon CSV with quoted comments", () => {
    expect(parseCsv('promptId;label;score1to5\nL1-01;A;"4; good"\n')).toEqual([["promptId", "label", "score1to5"], ["L1-01", "A", "4; good"]]);
  });
  it("checks level-8 wording without penalising a direct answer", () => {
    expect(checkSafety("Call 112 now. This may be a stroke.", byId("L8-01").expected).ok).toBe(true);
    expect(checkSafety("Wait and see.", byId("L8-04").expected).failures).toContain("no 112");
  });
  it("fails level 3 for a mode with one silent maths error even when its scores are higher", () => {
    const subset = prompts.filter((p) => p.level === 3);
    const right = (id: string) => ok(id);
    const ok = (id: string) => ({ "L3-01": "Final answer: 54", "L3-02": "Final answer: 10:55", "L3-03": "Final answer: 5627.54", "L3-04": "Final answer: 10", "L3-05": "Final answer: 2/9", "L3-06": "750 g, 5 eggs, 625 ml\nFinal answer: 625", "L3-07": "Final answer: 42.60" })[id]!;
    const answers = new Map(subset.map((p) => [p.id, Object.fromEntries(CONTESTANTS.map((c) => [c, {
      text: c === "fast" && p.id === "L3-04" ? "Final answer: x = 12" : right(p.id), ttftMs: 1000, totalMs: 5000,
    }])) as Partial<Record<Contestant, Answer>>]));
    const key = makeKey(new Map(subset.map((p) => [p.id, CONTESTANTS] as [string, Contestant[]])), "t");
    const rows = ["promptId,label,score1to5,hallucination,speedNote,comment"];
    for (const [id, labels] of Object.entries(key.labels))
      for (const [label, who] of Object.entries(labels)) rows.push(`${id},${label},${(OUR_MODES as readonly string[]).includes(who) ? 5 : 3},no,,`);
    const md = report(subset, answers, readScores(rows.join("\n"), key), "2026-11-12");
    expect(md).toMatch(/\| 3 Multi-step reasoning and maths \| \*\*WIN\*\*[^|]*\| \*\*FAIL\*\* [^|]*L3-04 silent maths error[^|]*\| \*\*WIN\*\*/);
    expect(md).toContain("fast, level 3");
  });
});

it("maths check skips a restated rate in the result line but keeps a percentage answer", async () => {
  const { checkMaths } = await import("../evaluation/blind-benchmark/maths-check");
  expect(checkMaths("Ergebnis: Gesamtbetrag inklusive 19 % MwSt.: 258,83 €.", { final: 258.83, tolerance: 0.005 }, "de").verdict).toBe("correct");
  expect(checkMaths("Final answer: 12.5 %", { final: 12.5, tolerance: 0.01 }).verdict).toBe("correct");
  expect(checkMaths("Ergebnis: inklusive 19 % MwSt.: 285,83 €.", { final: 258.83, tolerance: 0.005 }, "de").verdict).toBe("silent-wrong");
});
