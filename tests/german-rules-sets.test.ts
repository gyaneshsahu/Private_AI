// The German-rules question detector on its stored prompt sets (docs/german-routing-20261113.md,
// section of 14 November): the development set, the frozen set and the first hold-out. Offline.
// Prints recall, false alarms and every miss, and holds the bars so a later cue change that
// loses ground fails here.
import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { germanRulesQuestion } from "../src/german-rules";

type Prompt = { id: string; prompt: string; rules: boolean };
const measure = (file: string) => {
  const prompts = (JSON.parse(readFileSync(file, "utf8")) as { prompts: Prompt[] }).prompts;
  const rules = prompts.filter((p) => p.rules);
  const other = prompts.filter((p) => !p.rules);
  const missed = rules.filter((p) => !germanRulesQuestion(p.prompt));
  const alarms = other.filter((p) => germanRulesQuestion(p.prompt));
  console.log(
    `${file}: recall ${rules.length - missed.length} of ${rules.length}, false alarms ${alarms.length} of ${other.length}\n` +
      [...missed.map((p) => `  missed ${p.id}: ${p.prompt}`), ...alarms.map((p) => `  alarm  ${p.id}: ${p.prompt}`)].join("\n"),
  );
  return { recall: (rules.length - missed.length) / rules.length, alarms: alarms.length / other.length };
};

it("development set of 14 November: recall at least 85 %, false alarms at most 5 %", () => {
  const dev = measure("evaluation/german-rules-dev-20261114/prompts.json");
  expect(dev.recall).toBeGreaterThanOrEqual(0.85);
  expect(dev.alarms).toBeLessThanOrEqual(0.05);
});

// First run: 15 of 22 and 4 false alarms of 14. The numbers held here are after the fixes it led to.
it("second development round: recall at least 85 %, false alarms at most 5 %", () => {
  const round2 = measure("evaluation/german-rules-dev-20261114/round2.json");
  expect(round2.recall).toBeGreaterThanOrEqual(0.85);
  expect(round2.alarms).toBeLessThanOrEqual(0.05);
});

it("frozen set of 13 November: every rules prompt, no false alarm", () => {
  expect(measure("evaluation/german-routing-20261113/prompts.json")).toEqual({ recall: 1, alarms: 0 });
});

it("40-question set of 13 November (all rules questions; measured, never tuned on): no fewer than before", () => {
  const prompts = (
    JSON.parse(readFileSync("evaluation/german-rules-40-20261113/prompts.json", "utf8")) as { prompts: Prompt[] }
  ).prompts;
  const missed = prompts.filter((p) => !germanRulesQuestion(p.prompt)).map((p) => p.id);
  // Ids only: the texts stay unread so the set stays usable as a check.
  console.log(`40-question set: ${40 - missed.length} of 40 recognised; missed ${missed.join(" ")}`);
  expect(40 - missed.length).toBeGreaterThanOrEqual(23);
});

it("first hold-out of 13 November: at least 10 of 12, no false alarm", () => {
  const holdout = measure("evaluation/german-routing-20261113/holdout.json");
  expect(holdout.recall).toBeGreaterThanOrEqual(10 / 12);
  expect(holdout.alarms).toBe(0);
});
