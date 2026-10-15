import { expect, it } from "vitest";
import { emptyConversation } from "../shared/contracts";
import { renderAssistedResearch } from "../src/assisted-research";
import { consumeCheckedResponse } from "../src/checked-response";

const source = {
  id: "fixture-price",
  title: "Synthetic terms",
  text: "Buy 3 items at EUR 27 each. Delivery EUR 4. Tax 12 percent applies to items and delivery. The bulletin gives a planned opening date; it does not confirm actual opening.",
};
const input = (value: string) => ({
  value,
  evidence: { kind: "source", sourceId: source.id, quote: source.text },
});
const calculation = {
  kind: "calculation",
  method: "order-total",
  unit: "EUR",
  inputs: {
    quantity: input("3"),
    price: input("27"),
    fee: input("4"),
    tax: input("12"),
  },
};
const paragraph = {
  kind: "paragraph",
  text: "The total includes delivery and tax on the entire subtotal.",
  evidence: [{ sourceId: source.id, quote: source.text }],
};
const run = (blocks: unknown[]) =>
  renderAssistedResearch(
    JSON.stringify({ blocks }),
    [source],
    emptyConversation(),
  );

it("combines an ordinary explanation with an independently calculated total and source links", () => {
  const answer = run([paragraph, { kind: "calculator", calculation }]);
  expect(answer).toContain("The total includes delivery");
  expect(answer).toContain("**95.20 EUR** [fixture-price]");
  expect(answer).not.toContain("Method:");
});

it("can directly explain the limits of evidence without forcing a calculator or quotation-only output", () => {
  expect(
    run([
      {
        ...paragraph,
        text: "No, a planned opening does not establish that opening happened.",
      },
    ]),
  ).toContain("No, a planned opening");
});

it("normalizes only redundant calculator tags and evidence-bound inline citations", () => {
  const { kind: _kind, ...withoutTag } = calculation;
  const answer = run([
    { ...paragraph, text: "Delivery is included [fixture-price]." },
    { kind: "calculator", calculation: withoutTag },
  ]);
  expect(answer).toContain("95.20 EUR");
  expect(answer.match(/\[fixture-price\]/g)).toHaveLength(2);
  expect(() =>
    run([{ ...paragraph, text: "Delivery is included [unknown-source]." }]),
  ).toThrow();
  expect(() =>
    run([
      { kind: "calculator", calculation: { ...calculation, kind: "invented" } },
    ]),
  ).toThrow();
});

it("rejects fabricated evidence, incompatible units and model-supplied totals", () => {
  expect(() =>
    run([
      {
        ...paragraph,
        evidence: [{ sourceId: source.id, quote: "Not retrieved" }],
      },
    ]),
  ).toThrow();
  expect(() =>
    run([{ kind: "calculator", calculation: { ...calculation, total: "99" } }]),
  ).toThrow();
  expect(() =>
    run([
      {
        kind: "calculator",
        calculation: {
          kind: "calculation",
          method: "convert",
          unit: "kW",
          targetUnit: "kWh",
          inputs: { amount: input("3") },
        },
      },
    ]),
  ).toThrow();
});

it("does not misrepresent provenance matching as a semantic validator", () => {
  // Deliberately unsupported inference: this exposes the remaining review boundary.
  expect(
    run([{ ...paragraph, text: "The opening definitely happened." }]),
  ).toContain("definitely happened");
});

it("withholds the whole answer if a later calculator block is invalid", async () => {
  const raw = JSON.stringify({
    blocks: [
      paragraph,
      { kind: "calculator", calculation: { ...calculation, total: "99" } },
    ],
  });
  async function* stream() {
    yield {
      choices: [{ index: 0, delta: { content: raw }, finish_reason: "stop" }],
    } as any;
  }
  const shown: string[] = [];
  await expect(
    consumeCheckedResponse(
      stream(),
      { inputPerMillion: 1, outputPerMillion: 1, currency: "USD" },
      new AbortController().signal,
      [source],
      emptyConversation(),
      (text) => shown.push(text),
      undefined,
      renderAssistedResearch,
    ),
  ).rejects.toThrow();
  expect(shown).toEqual([]);
});
