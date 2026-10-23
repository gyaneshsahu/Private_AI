/**
 * Independent masking check (evaluation/masking/independent): hand-written
 * documents, scored with the benchmark scorer. Pins the measured numbers
 * loosely and proves the corpus shares nothing with the generator.
 * Run with WRITE_INDEPENDENT_RESULTS=1 to rewrite
 * evaluation/masking/results/independent.json after a deliberate change.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { IDENTIFIER_KINDS } from "../src/identifier-masking";
import { ALL_DOCUMENTS, PROMISED_KINDS, buildIndependentCorpus, corpusSha256 } from "../evaluation/masking/independent/build";
import {
  isGermanVat,
  isIban,
  isKvnr,
  isLuhn,
  isRvnr,
  isTaxId,
  mrzCheck,
} from "../evaluation/masking/independent/check-digits";
import {
  type IndependentResult,
  runIndependentEvaluation,
  summaryMarkdown,
  writeIndependentResults,
} from "../evaluation/masking/independent/evaluate-independent";

const root = join(__dirname, "..");
const folder = join(root, "evaluation/masking/independent");
const corpus = buildIndependentCorpus();
const result = runIndependentEvaluation();

describe("independent masking corpus", () => {
  it("imports nothing from the benchmark generator", () => {
    const generator = /(^|\/)(values|doc|layouts|corpus)(\.ts)?$/;
    const files = readdirSync(folder).filter((f) => f.endsWith(".ts"));
    expect(files.length).toBeGreaterThanOrEqual(5);
    for (const file of files) {
      const source = readFileSync(join(folder, file), "utf8");
      const specifiers = [
        ...source.matchAll(/(?:^|\n)\s*(?:import|export)[^;]*?from\s+["']([^"']+)["']/g),
        ...source.matchAll(/import\(\s*["']([^"']+)["']\s*\)/g),
      ].map((m) => m[1]);
      for (const specifier of specifiers) {
        expect(generator.test(specifier), `${file} imports ${specifier}`).toBe(false);
        // The corpus files stay inside this folder; only the evaluator reaches the scorer.
        if (file !== "evaluate-independent.ts")
          expect(specifier.startsWith("./") || specifier.startsWith("node:"), `${file} imports ${specifier}`).toBe(true);
        else expect(["../score", "./build", "node:fs/promises", "node:url"]).toContain(specifier);
      }
    }
    // The scorer's only link to the generator is a type import, erased at runtime.
    const score = readFileSync(join(root, "evaluation/masking/score.ts"), "utf8");
    const scoreImports = [...score.matchAll(/import\s+(type\s+)?[^;]*?from\s+["']([^"']+)["']/g)];
    for (const m of scoreImports) if (m[2] === "./corpus") expect(m[1]).toBe("type ");
  });

  it("shares no identifier value with the generator's development split", () => {
    const dev = readFileSync(join(root, "evaluation/masking/dev/dev.json"), "utf8");
    const devCompact = dev.replace(/\s+/g, "");
    for (const sample of corpus.samples)
      for (const span of sample.spans) {
        // Dates are low-entropy and coincide by chance; every other value must be new.
        if (span.kind === "BIRTH-DATE") continue;
        const value = sample.text.slice(span.start, span.end).replace(/\s+/g, "");
        expect(devCompact.includes(value), `${sample.id} ${value}`).toBe(false);
      }
  });

  it("covers every category, layout family and promised kind with enough documents", () => {
    expect(corpus.samples.length).toBeGreaterThanOrEqual(40);
    const perCategory = new Map<string, number>();
    for (const s of corpus.samples) perCategory.set(s.category, (perCategory.get(s.category) ?? 0) + 1);
    expect([...perCategory.keys()].sort()).toEqual(
      ["bank-statement", "bill", "chat", "contract", "cv", "email", "form", "invoice", "medical-letter", "scan-ocr", "table", "tax-letter"],
    );
    for (const count of perCategory.values()) expect(count).toBeGreaterThanOrEqual(4);
    expect([...PROMISED_KINDS]).toEqual([...IDENTIFIER_KINDS]);
    const kinds = new Set(corpus.samples.flatMap((s) => s.spans.map((x) => x.kind)));
    for (const kind of PROMISED_KINDS) expect(kinds.has(kind), kind).toBe(true);
    const layouts = new Set(ALL_DOCUMENTS.map((d) => d.layout));
    for (const needed of ["whatsapp-ios-export", "whatsapp-android-export", "forwarded-chain-quoted", "spreadsheet-rows-pasted-tsv", "screenshot-described-as-text", "municipal-fee-notice-footnotes", "bilingual-parallel-columns"])
      expect(layouts.has(needed), needed).toBe(true);
    expect(corpus.samples.some((s) => s.language === "mixed")).toBe(true);
    expect(corpus.samples.reduce((n, s) => n + s.notCovered.length, 0)).toBeGreaterThan(100);
  });

  it("records spans that match the text exactly and carry valid check digits where the identifier has one", () => {
    for (const sample of corpus.samples) {
      const exempt = (variant: string) => sample.ocr || /ocr|invalid/.test(variant);
      for (const span of sample.spans) {
        const value = sample.text.slice(span.start, span.end);
        expect(value.trim(), `${sample.id} empty span`).toBe(value);
        if (exempt(span.variant)) continue;
        const compact = value.replace(/[\s ­-]/g, "").toUpperCase();
        if (span.kind === "IBAN") expect(isIban(compact), `${sample.id} ${value}`).toBe(true);
        if (span.kind === "CARD") expect(isLuhn(compact), `${sample.id} ${value}`).toBe(true);
        if (span.kind === "TAX-ID" && /taxid/.test(span.variant)) expect(isTaxId(compact), `${sample.id} ${value}`).toBe(true);
        if (span.kind === "TAX-ID" && /vat/.test(span.variant)) expect(isGermanVat(compact), `${sample.id} ${value}`).toBe(true);
        if (span.kind === "INSURANCE" && /kvnr/.test(span.variant)) expect(isKvnr(compact), `${sample.id} ${value}`).toBe(true);
        if (span.kind === "INSURANCE" && /rvnr/.test(span.variant)) expect(isRvnr(compact), `${sample.id} ${value}`).toBe(true);
      }
      // Machine-readable zones: line lengths and ICAO check digits of the document number and birth date.
      for (const line of sample.text.split("\n").filter((l) => /<</.test(l) && /^[A-Z0-9<]+$/.test(l))) {
        expect([30, 44], `${sample.id} MRZ ${line}`).toContain(line.length);
      }
    }
    const td1 = corpus.samples.find((s) => s.id === "scan-01")!.text.split("\n").filter((l) => /^[A-Z0-9<]{30}$/.test(l));
    expect(Number(td1[0][14])).toBe(mrzCheck(td1[0].slice(5, 14)));
    expect(Number(td1[1][6])).toBe(mrzCheck(td1[1].slice(0, 6)));
    const td3 = corpus.samples.find((s) => s.id === "scan-02")!.text.split("\n").filter((l) => /^[A-Z0-9<]{44}$/.test(l));
    expect(Number(td3[1][9])).toBe(mrzCheck(td3[1].slice(0, 9)));
    expect(Number(td3[1][19])).toBe(mrzCheck(td3[1].slice(13, 19)));
  });
});

describe("independent masking measurement", () => {
  it("writes the result file on request and otherwise matches it", async () => {
    if (process.env.WRITE_INDEPENDENT_RESULTS === "1") {
      await writeIndependentResults(result);
      console.log(summaryMarkdown(result));
    }
    const path = join(root, "evaluation/masking/results/independent.json");
    expect(existsSync(path)).toBe(true);
    const saved = JSON.parse(readFileSync(path, "utf8")) as IndependentResult;
    // The saved file belongs to this corpus; its detector numbers may drift with the detector (pinned loosely below).
    expect(saved.corpusSha256).toBe(corpusSha256(corpus));
    expect(saved.overall.identifiers).toBe(result.overall.identifiers);
    for (const [category, counts] of Object.entries(result.byCategory))
      expect(saved.byCategory[category].identifiers, category).toBe(counts.identifiers);
  });

  // Measured on 23 October 2026 (recall per category; the margin allows one or
  // two identifiers to change on these small counts). A detector change that
  // falls below a floor is a regression on documents the detector was never
  // tuned on; raising a floor needs a new measurement, not a tuning round.
  const RECALL_FLOORS: Record<string, number> = {
    bill: 0.9, // measured 17/17
    invoice: 0.9, // 16/16
    "tax-letter": 0.9, // 25/25
    contract: 0.9, // 28/28
    cv: 0.9, // 16/16
    "medical-letter": 0.85, // 15/16
    "bank-statement": 0.9, // 20/20
    email: 0.8, // 33/37
    chat: 0.85, // 17/18
    form: 0.84, // 23/25
    table: 0.8, // 54/62
    "scan-ocr": 0.25, // 7/21
  };
  it("keeps recall per category at or above the measured floors", () => {
    expect(Object.keys(result.byCategory).sort()).toEqual(Object.keys(RECALL_FLOORS).sort());
    for (const [category, floor] of Object.entries(RECALL_FLOORS))
      expect(result.byCategory[category].recall!, category).toBeGreaterThanOrEqual(floor);
  });

  it("keeps overall and per-kind numbers near the measurement", () => {
    expect(result.overall.identifiers).toBe(301);
    expect(result.overall.recall!).toBeGreaterThanOrEqual(0.86); // measured 271/301 = 0.900
    expect(result.overallExcludingScans.recall!).toBeGreaterThanOrEqual(0.9); // 264/280 = 0.943
    expect(result.overall.precision!).toBeGreaterThanOrEqual(0.93); // 272/283 = 0.961
    const floors: Record<string, number> = {
      IBAN: 0.85, // 46/51
      CARD: 0.85, // 7/7
      "TAX-ID": 0.9, // 32/33
      INSURANCE: 0.85, // 20/21
      "ID-NUMBER": 0.75, // 14/16
      EMAIL: 0.85, // 43/48
      PHONE: 0.88, // 73/78
      "BIRTH-DATE": 0.7, // 36/47
    };
    for (const [kind, floor] of Object.entries(floors))
      expect(result.byKind[kind].recall!, kind).toBeGreaterThanOrEqual(floor);
  });

  it("measures names and addresses only as 'not covered, counted', never as detection targets", () => {
    const { overall, falsePositivesOnNamesOrAddresses } = result.namesAndAddresses;
    // They are not in the ground truth, so they cannot raise or lower recall.
    for (const sample of corpus.samples)
      for (const span of sample.spans) expect(["NAME", "ADDRESS"]).not.toContain(span.kind);
    expect(overall.NAME.spans).toBe(184);
    expect(overall.ADDRESS.spans).toBe(73);
    // Measured: every name and address left in clear; none touched by a detection.
    expect(overall.NAME.maskedAtLeastPartly + overall.ADDRESS.maskedAtLeastPartly).toBeLessThanOrEqual(3);
    expect(falsePositivesOnNamesOrAddresses).toBeLessThanOrEqual(3);
  });
});
