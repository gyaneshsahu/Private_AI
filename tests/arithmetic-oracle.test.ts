import { expect, it } from "vitest";
import { renderAssistedResearch } from "../src/assisted-research";
import { emptyConversation } from "../shared/contracts";
import { renderCheckedResponse } from "../src/checked-response";

it("computes ratio percentages against an independent signed rational oracle", () => {
  for (let index = 0; index < 256; index++) {
    const old = BigInt(1 + (index % 23)),
      current = BigInt((index * 7) % 41);
    const source = {
      id: "ratio-source",
      title: "Synthetic counts",
      text: `Previous ${old}; current ${current}.`,
    };
    const input = (id: string, value: bigint) => ({
      id,
      value: String(value),
      evidence: { kind: "source", sourceId: source.id, quote: source.text },
    });
    const program = {
      inputs: [input("old", old), input("current", current)],
      steps: [
        { id: "difference", op: "subtract", left: "current", right: "old" },
        { id: "change", op: "ratioPercent", left: "difference", right: "old" },
      ],
      results: [{ id: "change", decimals: 2 }],
      passages: [],
      limitation: "none",
    };
    const delta = current - old,
      magnitude = delta < 0n ? -delta : delta;
    const hundredths = (2n * magnitude * 10000n + old) / (2n * old);
    const expected = `${delta < 0n && hundredths > 0n ? "-" : ""}${hundredths / 100n}.${String(hundredths % 100n).padStart(2, "0")}`;
    expect(
      renderCheckedResponse(
        JSON.stringify(program),
        [source],
        emptyConversation(),
        "result",
      ),
      `ratio fixture ${index}`,
    ).toBe(expected);
    if (index !== 0) continue;
    const zeroSource = { ...source, text: "Previous 0; current 7." };
    program.inputs = [input("old", 0n), input("current", 7n)].map((i) => ({
      ...i,
      evidence: { ...i.evidence, quote: zeroSource.text },
    }));
    expect(() =>
      renderCheckedResponse(
        JSON.stringify(program),
        [zeroSource],
        emptyConversation(),
        "result",
      ),
    ).toThrow();
  }
});

it("matches an independent integer-cents oracle across 256 tax, fee and rounding combinations", () => {
  for (let index = 0; index < 256; index++) {
    const quantity = 1 + (index % 13);
    const priceCents = 101 + index * 37;
    const feeCents = 17 + index * 11;
    const rate = 1 + (index % 27);
    const taxedFee = index % 2 === 0;
    const money = (cents: number) => (cents / 100).toFixed(2);
    const source = {
      id: "generated-source",
      title: "Synthetic invoice",
      text: `Quantity ${quantity}; price GBP ${money(priceCents)}; fee GBP ${money(feeCents)}; tax ${rate} percent. Fee is ${taxedFee ? "taxable" : "untaxed"}.`,
    };
    const input = (id: string, value: string) => ({
      id,
      value,
      evidence: { kind: "source", sourceId: source.id, quote: source.text },
    });
    const steps = [
      { id: "items", op: "multiply", left: "quantity", right: "price" },
      { id: "subtotal", op: "add", left: "items", right: "fee" },
      {
        id: "tax",
        op: "percentOf",
        left: taxedFee ? "subtotal" : "items",
        right: "rate",
      },
      { id: "total", op: "add", left: "subtotal", right: "tax" },
    ];
    const raw = JSON.stringify({
      blocks: [
        {
          kind: "arithmetic",
          unit: "GBP",
          program: {
            inputs: [
              input("quantity", String(quantity)),
              input("price", money(priceCents)),
              input("fee", money(feeCents)),
              input("rate", String(rate)),
            ],
            steps,
            results: [{ id: "total", decimals: 2 }],
            passages: [],
            limitation: "none",
          },
        },
      ],
    });
    // Rational integer oracle: tax in hundredths of a penny, rounded only at final display.
    const items = BigInt(quantity * priceCents);
    const fee = BigInt(feeCents);
    const hundredths =
      (items + fee) * 100n + (items + (taxedFee ? fee : 0n)) * BigInt(rate);
    const cents = (hundredths + 50n) / 100n;
    const expected = `${cents / 100n}.${String(cents % 100n).padStart(2, "0")}`;
    expect(
      renderAssistedResearch(raw, [source], emptyConversation()),
      `fixture ${index}`,
    ).toBe(`**${expected} GBP** [generated-source]`);
  }
});
