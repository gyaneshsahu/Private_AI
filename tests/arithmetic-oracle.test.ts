import { expect, it } from "vitest";
import { renderAssistedResearch } from "../src/assisted-research";
import { emptyConversation } from "../shared/contracts";

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
