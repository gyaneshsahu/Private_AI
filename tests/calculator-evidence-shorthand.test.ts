import { describe, expect, it } from "vitest";
import { normalizeEvidenceShorthand } from "../src/calculator-turn";
import { emptyConversation, type Conversation } from "../shared/contracts";

function conversationWith(...userTexts: string[]): Conversation {
  const c = emptyConversation();
  for (const text of userTexts)
    c.messages.push({
      id: `u${c.messages.length}`,
      role: "user",
      text,
      status: "complete",
      included: true,
    });
  return c;
}

describe("calculator evidence shorthand (seen on Gemma 4 31B, 23 October practice run)", () => {
  const conversation = conversationWith(
    "Nettobetrag 2.345,67 EUR, Umsatzsteuer 19 %.",
    "Korrektur: der Nettobetrag ist 2.435,67 EUR.",
  );
  it("resolves a bare quotation to the latest included user turn that contains it", () => {
    const out = normalizeEvidenceShorthand(
      {
        inputs: [
          { id: "netto", value: "2435.67", evidence: "2.435,67 EUR" },
          { id: "rate", value: "19", evidence: "19 %" },
        ],
      },
      [],
      conversation,
    ) as { inputs: { evidence: unknown }[] };
    expect(out.inputs[0].evidence).toEqual({
      kind: "user",
      userTurn: 2,
      quote: "2.435,67 EUR",
    });
    expect(out.inputs[1].evidence).toEqual({
      kind: "user",
      userTurn: 1,
      quote: "19 %",
    });
  });
  it("resolves a quotation found in a supplied source and adds a missing kind", () => {
    const sources = [
      {
        id: "src-000001",
        title: "Note",
        text: "Payment of 60 percent on delivery.",
      },
    ];
    const out = normalizeEvidenceShorthand(
      {
        inputs: [
          { id: "share", value: "60", evidence: "60 percent" },
          {
            id: "net",
            value: "2345.67",
            evidence: { userTurn: 1, quote: "2.345,67 EUR" },
          },
          {
            id: "again",
            value: "60",
            evidence: { sourceId: "src-000001", quote: "60 percent" },
          },
        ],
      },
      sources,
      conversation,
    ) as { inputs: { evidence: unknown }[] };
    expect(out.inputs[0].evidence).toEqual({
      kind: "source",
      sourceId: "src-000001",
      quote: "60 percent",
    });
    expect(out.inputs[1].evidence).toEqual({
      kind: "user",
      userTurn: 1,
      quote: "2.345,67 EUR",
    });
    expect(out.inputs[2].evidence).toEqual({
      kind: "source",
      sourceId: "src-000001",
      quote: "60 percent",
    });
  });
  it("maps a numeric step operand onto the one input that carries that value, and nothing else", () => {
    const out = normalizeEvidenceShorthand(
      {
        inputs: [
          { id: "net", value: "2435.67", evidence: "2.435,67 EUR" },
          { id: "rate", value: "19", evidence: "19 %" },
          { id: "a", value: "5", evidence: "x" },
          { id: "b", value: "5.0", evidence: "x" },
        ],
        steps: [
          { id: "vat", op: "percentOf", left: "2435.67", right: "19" },
          { id: "gross", op: "add", left: "net", right: "vat" },
          { id: "dup", op: "add", left: "5", right: "7" },
        ],
      },
      [],
      conversation,
    ) as { steps: { left: unknown; right: unknown }[] };
    expect(out.steps[0]).toMatchObject({ left: "net", right: "rate" });
    expect(out.steps[1]).toMatchObject({ left: "net", right: "vat" });
    // "5" matches two inputs (5 and 5.0) and "7" matches none: both stay as written.
    expect(out.steps[2]).toMatchObject({ left: "5", right: "7" });
  });
  it("leaves a quotation that occurs nowhere, and malformed shapes, for the schema to refuse", () => {
    const out = normalizeEvidenceShorthand(
      {
        inputs: [
          { id: "x", value: "1", evidence: "not in any text" },
          "junk",
          { id: "y", value: "2", evidence: 5 },
        ],
      },
      [],
      conversation,
    ) as { inputs: unknown[] };
    expect(out.inputs[0]).toEqual({
      id: "x",
      value: "1",
      evidence: "not in any text",
    });
    expect(out.inputs[1]).toBe("junk");
    expect(out.inputs[2]).toEqual({ id: "y", value: "2", evidence: 5 });
    expect(normalizeEvidenceShorthand("nope", [], conversation)).toBe("nope");
    expect(
      normalizeEvidenceShorthand({ unit: "EUR" }, [], conversation),
    ).toEqual({ unit: "EUR" });
  });
});
