import { expect, it } from "vitest";
import type { ChatCompletionChunk } from "openai/resources/chat/completions";
import { consumeCalculatorTurn } from "../src/calculator-turn";
import { emptyConversation } from "../shared/contracts";
const source = {
  id: "synthetic-source",
  title: "Invoice",
  text: "Price GBP 37; quantity 3.",
};
const program = {
  inputs: [
    {
      id: "price",
      value: "37",
      evidence: { kind: "source", sourceId: source.id, quote: source.text },
    },
    {
      id: "quantity",
      value: "3",
      evidence: { kind: "source", sourceId: source.id, quote: source.text },
    },
  ],
  steps: [{ id: "total", op: "multiply", left: "price", right: "quantity" }],
  results: [{ id: "total", decimals: 2 }],
  passages: [],
  limitation: "none",
};
const args = JSON.stringify({ unit: "GBP", program });
const frame = (delta: unknown, finish_reason: unknown = null) => ({
  choices: [{ index: 0, delta, finish_reason }],
});
const usage = {
  choices: [],
  usage: { prompt_tokens: 20, completion_tokens: 10, total_tokens: 30 },
};
function tool(raw = args) {
  return [
    frame({
      tool_calls: [
        {
          index: 0,
          id: "call-1",
          type: "function",
          function: { name: "calculate", arguments: raw.slice(0, 40) },
        },
      ],
    }),
    frame(
      { tool_calls: [{ index: 0, function: { arguments: raw.slice(40) } }] },
      "tool_calls",
    ),
    usage,
  ];
}
async function run(events: unknown[], signal = new AbortController().signal) {
  async function* stream() {
    for (const e of events) yield e as ChatCompletionChunk;
  }
  return consumeCalculatorTurn(
    stream(),
    { inputPerMillion: 1, outputPerMillion: 1, currency: "USD" },
    signal,
    [source],
    emptyConversation(),
  );
}
it("delivers ordinary prose without imposing a calculation format", async () => {
  const result = await run([
    frame(
      { content: "The notice does not establish an actual reopening." },
      "stop",
    ),
    usage,
  ]);
  expect(result.text).toContain("does not establish");
  expect(result.calculation).toBeUndefined();
});
it("assembles split arguments and returns a separate locally computed result", async () => {
  const result = await run(tool());
  expect(result.calculation).toEqual({
    value: "111.00",
    unit: "GBP",
    references: [source.id],
  });
  expect(result.text).toBe("");
  expect(result.usage.total).toBe(30);
});
it("retains usage when a complete tool call has ungrounded operands", async () => {
  await expect(run(tool(args.replace('"37"', '"99"')))).rejects.toMatchObject({
    usage: { total: 30 },
  });
});
it("rejects incomplete, unknown, multiple or oversized calls without a retry", async () => {
  for (const events of [
    tool().slice(0, 1),
    tool().map((e) =>
      JSON.parse(JSON.stringify(e).replace("calculate", "execute")),
    ),
    [frame({ tool_calls: [{ index: 0 }, { index: 1 }] }, "tool_calls"), usage],
    tool("x".repeat(32001)),
  ])
    await expect(run(events)).rejects.toThrow();
});
it("requires final usage and honours pre-cancellation", async () => {
  await expect(run(tool().slice(0, 2))).rejects.toThrow("requires final usage");
  const c = new AbortController();
  c.abort();
  await expect(run(tool(), c.signal)).rejects.toThrow();
});
it("rejects post-finish content and changed tool identity", async () => {
  const events = tool();
  events.splice(2, 0, frame({ content: "extra" }));
  await expect(run(events)).rejects.toThrow();
  const changed = tool();
  (changed[1] as any).choices[0].delta.tool_calls[0].id = "different";
  await expect(run(changed)).rejects.toThrow();
});
it("rejects arbitrary operations, forged evidence, and malformed tool-list data", async () => {
  for (const raw of [
    args.replace('"multiply"', '"eval"'),
    args.replaceAll(source.text, "Invented source quote"),
    args.replace('"GBP"', '"secret"'),
  ])
    await expect(run(tool(raw))).rejects.toThrow("could not be validated");
  await expect(
    run([
      frame({ tool_calls: { function: { name: "calculate" } } }, "stop"),
      usage,
    ]),
  ).rejects.toThrow();
});
it("does not claim formula choice or prose arithmetic is verified", async () => {
  const wrongEquation = args.replace('"multiply"', '"add"');
  const result = await run([
    frame({ content: "The total is GBP 999." }),
    ...tool(wrongEquation),
  ]);
  expect(result.calculation?.value).toBe("40.00");
  expect(result.text).toContain("999");
  // Both are deliberate counterexamples: neither task applicability nor prose
  // numeric agreement follows from executing a syntactically valid program.
});
it("aborting between argument chunks prevents calculator execution", async () => {
  const c = new AbortController();
  async function* stream() {
    yield tool()[0] as ChatCompletionChunk;
    c.abort();
    yield tool()[1] as ChatCompletionChunk;
  }
  await expect(
    consumeCalculatorTurn(
      stream(),
      { inputPerMillion: 1, outputPerMillion: 1, currency: "USD" },
      c.signal,
      [source],
      emptyConversation(),
    ),
  ).rejects.toThrow();
});
it("classifies local calculator failures without logging arguments", async () => {
  await expect(run(tool("{broken"))).rejects.toMatchObject({
    calculatorFailure: "INVALID_JSON",
    usage: { total: 30 },
  });
  await expect(run(tool("{}"))).rejects.toMatchObject({
    calculatorFailure: "INVALID_SCHEMA",
    usage: { total: 30 },
  });
  await expect(run(tool(args.replace('"37"', '"99"')))).rejects.toMatchObject({
    calculatorFailure: "EVIDENCE_OR_ARITHMETIC",
    usage: { total: 30 },
  });
});
it("returns bounded multiple named results without model rewriting", async () => {
  const p = {
    ...program,
    steps: [
      ...program.steps,
      { id: "difference", op: "subtract", left: "total", right: "price" },
    ],
    results: [
      { id: "total", decimals: 2 },
      { id: "difference", decimals: 2 },
    ],
  };
  const result = await run(tool(JSON.stringify({ unit: "GBP", program: p })));
  expect(result.calculations?.map((r) => [r.id, r.value, r.unit])).toEqual([
    ["total", "111.00", "GBP"],
    ["difference", "74.00", "GBP"],
  ]);
});
it("preserves per-result units and rejects invalid later results atomically", async () => {
  const p = {
    ...program,
    results: [
      { id: "total", decimals: 2, unit: "kWh" },
      { id: "missing", decimals: 2, unit: "EUR" },
    ],
  };
  await expect(
    run(tool(JSON.stringify({ unit: "GBP", program: p }))),
  ).rejects.toMatchObject({ calculatorFailure: "EVIDENCE_OR_ARITHMETIC" });
  p.results[1].id = "total";
  await expect(
    run(tool(JSON.stringify({ unit: "GBP", program: p }))),
  ).rejects.toMatchObject({ calculatorFailure: "INVALID_SCHEMA" });
});
it("limits result count without extra inference calls", async () => {
  const p = {
    ...program,
    results: Array.from({ length: 5 }, () => ({ id: "total", decimals: 2 })),
  };
  await expect(
    run(tool(JSON.stringify({ unit: "GBP", program: p }))),
  ).rejects.toMatchObject({ calculatorFailure: "INVALID_SCHEMA" });
});
it("reports schema issue paths without source text, supplied values or error prose", async () => {
  try {
    await run(
      tool(
        JSON.stringify({
          unit: "SECRET_INPUT",
          program: { ...program, SECRET_FIELD: "PRIVATE_TEXT" },
        }),
      ),
    );
    throw Error("Expected reject");
  } catch (error) {
    expect(error).toHaveProperty("calculatorFailure", "INVALID_SCHEMA");
    const issues = JSON.stringify((error as any).schemaIssues);
    expect(issues).toContain("unit");
    expect(issues).not.toMatch(/SECRET|PRIVATE/);
  }
});
