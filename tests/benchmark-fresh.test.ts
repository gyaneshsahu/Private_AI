import { describe, expect, it } from "vitest";
import { OWNER_SAMPLE, agreement, checkAnswer, loadFresh, report, type FreshAnswer, type FreshPrompt } from "../evaluation/benchmark-fresh-20261112/fresh";

const { prompts } = loadFresh();
const byId = (id: string) => prompts.find((p) => p.id === id)!;

describe("fresh benchmark", () => {
  it("has 27 frozen prompts, the sample and the controls in place", () => {
    expect(prompts).toHaveLength(27);
    expect(new Set(prompts.map((p) => p.id)).size).toBe(27);
    expect(OWNER_SAMPLE.every((id) => byId(id))).toBe(true);
    expect(prompts.filter((p) => p.level === 3 && p.timeSensitive === false).map((p) => p.id)).toEqual(["T-07", "T-08"]);
    expect(prompts.filter((p) => p.level === 1).every((p) => p.searchQuery)).toBe(true);
  });

  it("deterministic checks catch codes, browsing claims and unrequested word counts", () => {
    const c = checkAnswer(byId("R-01"), { text: "Limit is €25,000 [2c0b433bea]. I don't have access to the internet. (43 words)" });
    expect(c).toMatchObject({ rawCode: true, noBrowsing: true, wordCount: true, link: false, pageRead: false });
    const ok = checkAnswer(byId("R-01"), { text: "See https://www.bundesfinanzministerium.de/x", pageRead: "https://www.bundesfinanzministerium.de/x" });
    expect(ok).toMatchObject({ rawCode: false, noBrowsing: false, wordCount: false, link: true, pageRead: true });
    expect(checkAnswer(byId("G-05"), { text: "20 Arbeitstage bei einer Fünf-Tage-Woche." }).wordCount).toBe(false);
    // site-name citation links count through their recorded hrefs
    expect(checkAnswer(byId("R-04"), { text: "13,90 € bundesregierung.de", links: ["https://www.bundesregierung.de/x"] }).link).toBe(true);
    expect(checkAnswer(byId("R-04"), { text: "13,90 € bundesregierung.de", citations: ["bundesregierung.de: Mindestlohn steigt"] }).link).toBe(true);
    expect(checkAnswer(byId("R-04"), { text: "x", citations: ["Synthetic title"] }).link).toBe(false);
    expect(checkAnswer(byId("T-01"), { text: "x", suggestionShown: true }).suggestion).toBe(true);
    expect(checkAnswer(byId("H-01"), { text: "Call 112 now." }).safety?.ok).toBe(true);
  });

  it("a mode meets the bar only when every check holds", () => {
    const good = (p: FreshPrompt): FreshAnswer => ({
      text: p.level === 5 ? "Call 112 now. See a doctor if it lasts." : "Answer with https://example.org/source",
      pageRead: p.level === 1 ? "https://example.org/source" : undefined,
      suggestionShown: p.level === 3 ? !!p.timeSensitive : undefined,
      ttftMs: 1000, totalMs: 2000,
    });
    const answers = new Map(prompts.map((p) => [p.id, { auto: good(p), fast: good(p), thinking: { ...good(p), text: p.id === "G-02" ? "31. Juli 2026 (52 Wörter)" : good(p).text } }]));
    const s = { score: 5, hallucination: false, speedNote: "", comment: "" };
    const scores = new Map(prompts.map((p) => [p.id, { auto: s, fast: s, thinking: s }]));
    const extra = new Map(prompts.map((p) => [p.id, { auto: { official: true, codeFails: false }, fast: { official: true, codeFails: false }, thinking: { official: true, codeFails: false } }]));
    const r = report(prompts, answers, scores, extra, "2026-11-12");
    expect(r.meets).toEqual({ auto: true, fast: true, thinking: false });
    expect(r.md).toContain("1 unrequested word count");
  });

  it("owner agreement reports differences and missed hallucinations", () => {
    const o = new Map([["G-01", { auto: { score: 2, hallucination: true, speedNote: "", comment: "" } }]]);
    const g = new Map([["G-01", { auto: { score: 4, hallucination: false, speedNote: "", comment: "" } }]]);
    expect(agreement(o, g)).toMatchObject({ n: 1, meanAbsDiff: 2, missedByGraders: ["G-01/auto"] });
  });
});
