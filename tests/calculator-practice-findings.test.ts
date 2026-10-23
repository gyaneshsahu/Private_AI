import { describe, expect, it } from "vitest";
import { evidenceNumberTokens } from "../src/number-evidence";
import {
  normalizeEvidenceShorthand,
  renderCalculatorTurn,
} from "../src/calculator-turn";
import { renderCheckedResponse } from "../src/checked-response";
import { emptyConversation, type Conversation } from "../shared/contracts";

// Each case here reproduces a calculator argument shape observed in the paid
// practice batches of 23 October 2026 (Gemma 4 31B and GPT-OSS 120B) and pins
// the deterministic tolerance that now accepts it. No value is ever inferred.

const conversation = (): Conversation => {
  const c = emptyConversation();
  c.messages.push({
    id: "u1",
    role: "user",
    text: "Eine Rechnung über brutto 1.785,00 EUR enthält 19 % Umsatzsteuer. Mein Zug fährt um 09:23 Uhr, ich brauche 18 Minuten.",
    status: "complete",
    included: true,
  });
  return c;
};

describe("tokens a quoted percentage and clock time stand for", () => {
  it("offers the rate, its fraction and its gross factor for a written percentage", () => {
    const tokens = evidenceNumberTokens("enthält 19 % Umsatzsteuer");
    expect(tokens).toContain("19");
    expect(tokens).toContain("0.19");
    expect(tokens).toContain("1.19");
    expect(evidenceNumberTokens("VAT 7%")).toEqual(
      expect.arrayContaining(["7", "0.07", "1.07"]),
    );
    expect(evidenceNumberTokens("2,5 % Zinsen")).toEqual(
      expect.arrayContaining(["2.5", "0.025", "1.025"]),
    );
  });
  it("offers minutes since midnight for a clock time", () => {
    expect(evidenceNumberTokens("um 09:23 Uhr")).toContain("563");
    expect(evidenceNumberTokens("at 7:10")).toContain("430");
    expect(evidenceNumberTokens("ratio 25:70")).not.toContain("1570");
  });
});

describe("shapes seen in practice are normalised, nothing else", () => {
  it("Gemma: divides by the gross factor written as a literal that the quoted rate stands for", () => {
    const p = {
      inputs: [
        { id: "brutto", value: "1785.00", evidence: "1.785,00 EUR" },
        { id: "satz", value: "1.19", evidence: "19 %" },
      ],
      steps: [
        { id: "netto", op: "divide", left: "brutto", right: "1.19" },
        { id: "steuer", op: "subtract", left: "brutto", right: "netto" },
      ],
      results: [
        { id: "netto", decimals: 2 },
        { id: "steuer", decimals: 2 },
      ],
      passages: [],
      limitation: "none",
    };
    const normalised = normalizeEvidenceShorthand(
      p,
      [],
      conversation(),
    ) as typeof p;
    expect(normalised.steps[0].right).toBe("satz");
    const render = (id: string) =>
      renderCheckedResponse(
        JSON.stringify({ ...normalised, results: [{ id, decimals: 2 }] }),
        [],
        conversation(),
        "result",
      );
    expect(render("netto")).toBe("1500.00");
    expect(render("steuer")).toBe("285.00");
  });
  it("Gemma: a running total written as repeated step ids becomes a chain", () => {
    const p = {
      inputs: [
        { id: "a", value: "1250.00", evidence: "x" },
        { id: "b", value: "84.50", evidence: "x" },
        { id: "c", value: "39.99", evidence: "x" },
      ],
      steps: [
        { id: "summe", op: "add", left: "a", right: "b" },
        { id: "summe", op: "add", left: "summe", right: "c" },
      ],
      results: [{ id: "summe", decimals: 2 }],
    };
    const n = normalizeEvidenceShorthand(p, [], conversation()) as typeof p;
    expect(n.steps.map((s) => s.id)).toEqual(["summe", "summe_2"]);
    expect(n.steps[1].left).toBe("summe");
    expect(n.results[0].id).toBe("summe_2");
  });
  it("Gemma: a clock time as minutes, a result shown as a clock", () => {
    const text = renderCalculatorTurn({
      text: "",
      usage: { input: 1, output: 1, total: 2, estimatedUSD: 0 },
      calculation: {
        id: "leave_time",
        value: "545",
        unit: "clock",
        references: ["user:1"],
      },
    });
    expect(text).toContain("**Calculated leave time: 09:05**");
    expect(
      renderCalculatorTurn({
        text: "",
        usage: { input: 1, output: 1, total: 2, estimatedUSD: 0 },
        calculation: {
          id: "late",
          value: "1500",
          unit: "clock",
          references: [],
        },
      }),
    ).toContain("01:00");
  });
  it("GPT-OSS: kind spelling variants, a constant with a stray quote, and a single input object", () => {
    const p = {
      inputs: {
        id: "net",
        value: "189.90",
        evidence: { kind: "userMessage", quote: "189,90", userTurn: 1 },
      },
    };
    const n = normalizeEvidenceShorthand(p, [], conversation()) as {
      inputs: { evidence: unknown }[];
    };
    expect(Array.isArray(n.inputs)).toBe(true);
    expect(n.inputs[0].evidence).toEqual({
      kind: "user",
      quote: "189,90",
      userTurn: 1,
    });
    const c = normalizeEvidenceShorthand(
      {
        inputs: [
          {
            id: "f",
            value: "100",
            evidence: { kind: "constant", quote: "100" },
          },
        ],
      },
      [],
      conversation(),
    ) as { inputs: { evidence: unknown }[] };
    expect(c.inputs[0].evidence).toEqual({ kind: "constant" });
  });
  it("GPT-OSS: an input object whose evidence is an array stays as written for the schema to refuse", () => {
    const p = {
      inputs: {
        id: "net",
        value: "1",
        evidence: [{ kind: "user", quote: "a", userTurn: 1 }],
      },
    };
    expect(normalizeEvidenceShorthand(p, [], conversation())).toEqual(p);
  });
});
