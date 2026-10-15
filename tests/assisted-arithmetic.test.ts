import { expect, it } from "vitest";
import { renderAssistedResearch } from "../src/assisted-research";
import { emptyConversation } from "../shared/contracts";

const source = {
  id: "synthetic-order",
  title: "Synthetic quotation",
  text: "8 items at GBP 16 each; 15 percent tax on items only. Delivery GBP 7 is untaxed.",
};
const input = (id: string, value: string) => ({
  id,
  value,
  evidence: { kind: "source", sourceId: source.id, quote: source.text },
});
const block = () => ({
  kind: "arithmetic",
  unit: "GBP",
  program: {
    inputs: [
      input("quantity", "8"),
      input("price", "16"),
      input("tax", "15"),
      input("fee", "7"),
    ],
    steps: [
      { id: "items", op: "multiply", left: "quantity", right: "price" },
      { id: "tax_amount", op: "percentOf", left: "items", right: "tax" },
      { id: "taxed_items", op: "add", left: "items", right: "tax_amount" },
      { id: "total", op: "add", left: "taxed_items", right: "fee" },
    ],
    results: [{ id: "total", decimals: 2 }],
    passages: [],
    limitation: "none",
  },
});
const run = (b: unknown) =>
  renderAssistedResearch(
    JSON.stringify({ blocks: [b] }),
    [source],
    emptyConversation(),
  );
it("computes a general bounded expression without another invoice-specific recipe", () => {
  // Independently: 128 + 19.20 + 7 = 154.20.
  expect(run(block())).toBe("**154.20 GBP** [synthetic-order]");
});
it("rejects ungrounded operands, arbitrary operations and multiple final results", () => {
  const missing = block();
  missing.program.inputs[0].value = "999";
  expect(() => run(missing)).toThrow();
  const code = block();
  code.program.steps[0].op = "eval";
  expect(() => run(code)).toThrow();
  const multiple = block();
  multiple.program.results.push({ id: "items", decimals: 2 });
  expect(() => run(multiple)).toThrow();
});
it("keeps equation and unit selection explicitly outside arithmetic validation", () => {
  const partial = block();
  partial.program.results[0].id = "tax_amount";
  // A valid tax calculation is not proof that it answers a question about totals.
  expect(run(partial)).toContain("19.20 GBP");
});
