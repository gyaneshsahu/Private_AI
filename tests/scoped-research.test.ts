import { describe, it, expect } from "vitest";
import { compileScopedResearch } from "../src/scoped-research";
import { emptyConversation } from "../shared/contracts";
const source = {
  id: "fixture-source",
  title: "Synthetic price sheet",
  text: "Quantity 4. Unit price EUR 18. Fee EUR 6. Tax 15 percent applies to the entire subtotal. The notice does not describe a cancellation policy. Amount 2.5 kWh. Before 80; after 100.",
};
const input = (value: string) => ({
  value,
  evidence: { kind: "source", sourceId: source.id, quote: source.text },
});
const order = () => ({
  kind: "calculation",
  method: "order-total",
  unit: "EUR",
  inputs: {
    quantity: input("4"),
    price: input("18"),
    fee: input("6"),
    tax: input("15"),
  },
});
const run = (x: unknown) =>
  compileScopedResearch(JSON.stringify(x), [source], emptyConversation());
describe("scoped methods, independently checked expected values", () => {
  it("renders the full tax-inclusive total, never a model-selected tax-only step", () => {
    expect(run(order())).toContain("89.70");
    expect(() => run({ ...order(), results: [{ id: "tax" }] })).toThrow();
  });
  it("uses the corrected user value with the same fixed method", () => {
    const c = emptyConversation();
    c.messages.push({
      id: "u",
      role: "user",
      text: "The fee is now EUR 10.",
      status: "complete",
      included: true,
    });
    const p = order();
    p.inputs.fee = {
      value: "10",
      evidence: { kind: "user", userTurn: 1, quote: c.messages[0].text },
    } as any;
    expect(compileScopedResearch(JSON.stringify(p), [source], c)).toContain(
      "94.30",
    );
  });
  it("keeps source silence as an exact quotation", () => {
    const answer = run({
      kind: "evidence",
      passages: [
        {
          kind: "source",
          sourceId: source.id,
          quote: "The notice does not describe a cancellation policy.",
        },
      ],
      limitation: "none",
    });
    expect(answer).toContain("does not describe");
    expect(answer).not.toContain("unavailable");
  });
  it("rejects unsupported paraphrases even when they sound plausible", () => {
    expect(() =>
      run({
        kind: "evidence",
        passages: [
          {
            kind: "source",
            sourceId: source.id,
            quote: "Cancellation is unavailable.",
          },
        ],
        limitation: "none",
      }),
    ).toThrow();
  });
  it("calculates percentage change with a positive baseline", () => {
    expect(
      run({
        kind: "calculation",
        method: "percent-change",
        unit: "count",
        inputs: { before: input("80"), after: input("100") },
      }),
    ).toContain("25.000000");
  });
  it("converts energy using application factors, not model-authored factors", () => {
    const answer = run({
      kind: "calculation",
      method: "convert",
      unit: "kWh",
      targetUnit: "Wh",
      inputs: { amount: input("2.5") },
    });
    expect(answer).toContain("2500.000000");
    expect(answer).not.toContain("[local-");
  });
  it("blocks power-to-energy conversion without a duration", () => {
    expect(() =>
      run({
        kind: "calculation",
        method: "convert",
        unit: "kW",
        targetUnit: "kWh",
        inputs: { amount: input("2.5") },
      }),
    ).toThrow("UNIT_MISMATCH");
  });
  it("does not silently invent a missing fee", () => {
    const x = order();
    x.inputs.fee = input("0");
    expect(() => run(x)).toThrow();
  });
  it("has an explicit insufficient path instead of inventing a rate", () => {
    expect(
      run({ kind: "evidence", passages: [], limitation: "insufficient" }),
    ).toContain("cannot establish");
  });
  it("preserves the negative control: exact input support is not applicability proof", () => {
    const x = order();
    x.inputs.quantity = input("80");
    const result = run(x);
    expect(result).toContain("1662.90");
    expect(result).toContain("not independently verified");
  });
});
