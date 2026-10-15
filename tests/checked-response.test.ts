import { expect, it } from "vitest";
import type { ChatCompletionChunk } from "openai/resources/chat/completions";
import { emptyConversation } from "../shared/contracts";
import { newMessage } from "../src/conversation";
import { auditResearchAnswer } from "../src/research-audit";
import {
  consumeCheckedResponse,
  renderCheckedResponse,
} from "../src/checked-response";

const sources = [
  {
    id: "calc-source",
    title: "Synthetic receipt",
    text: "Four units cost 35 each. Discount is 10 percent. Delivery costs 6. Tax is 15 percent. The notice does not describe replacement delivery slots.",
  },
];
const conversation = emptyConversation();
conversation.messages.push(
  newMessage("user", "Quantity is 4. Calculate the total."),
  newMessage("assistant", "An incorrect previous total: 999"),
  newMessage("user", "Delivery is corrected to 8."),
);
const evidence = (quote: string) => ({
  kind: "source",
  sourceId: "calc-source",
  quote,
});
const fixture = () => ({
  inputs: [
    {
      id: "quantity",
      value: "4",
      evidence: { kind: "user", userTurn: 1, quote: "Quantity is 4." },
    },
    {
      id: "price",
      value: "35",
      evidence: evidence("Four units cost 35 each."),
    },
    {
      id: "discount",
      value: "10",
      evidence: evidence("Discount is 10 percent."),
    },
    {
      id: "fee",
      value: "8",
      evidence: {
        kind: "user",
        userTurn: 2,
        quote: "Delivery is corrected to 8.",
      },
    },
    { id: "rate", value: "15", evidence: evidence("Tax is 15 percent.") },
  ],
  steps: [
    { id: "gross", op: "multiply", left: "quantity", right: "price" },
    {
      id: "discount_amount",
      op: "percentOf",
      left: "gross",
      right: "discount",
    },
    { id: "net", op: "subtract", left: "gross", right: "discount_amount" },
    { id: "taxable", op: "add", left: "net", right: "fee" },
    { id: "tax", op: "percentOf", left: "taxable", right: "rate" },
    { id: "total", op: "add", left: "taxable", right: "tax" },
  ],
  results: [{ id: "total", decimals: 2 }],
  passages: [
    evidence("The notice does not describe replacement delivery slots."),
  ],
  limitation: "none",
});

it("computes the final total locally and preserves user correction and source-silence provenance", () => {
  const answer = renderCheckedResponse(
    JSON.stringify(fixture()),
    sources,
    conversation,
  );
  expect(answer).toContain("154.10"); // (4*35 * .90 + 8) *1.15
  expect(answer).toContain("134 + 20.1 = 154.1");
  expect(answer).toContain("your message 2");
  expect(answer).toContain(
    "The notice does not describe replacement delivery slots",
  );
  expect(answer).not.toContain("unavailable");
  expect(answer).not.toContain("999");
  expect(
    auditResearchAnswer(answer, sources).quotesNotFoundInCitedSources,
  ).toBe(0);
});

it.each(["total", "answer", "claim"])(
  "rejects a model-authored %s instead of rendering unchecked arithmetic or paraphrases",
  (key) => {
    expect(() =>
      renderCheckedResponse(
        JSON.stringify({
          ...fixture(),
          [key]: "999; replacement slots are unavailable",
        }),
        sources,
        conversation,
      ),
    ).toThrow();
  },
);

it("withholds altered source wording and references to assistant answers", () => {
  const f = fixture();
  f.passages[0].quote = "Replacement delivery slots are unavailable.";
  expect(() =>
    renderCheckedResponse(JSON.stringify(f), sources, conversation),
  ).toThrow();
  f.inputs[0].evidence = {
    kind: "user",
    userTurn: 2,
    quote: "An incorrect previous total: 999",
  };
  expect(() =>
    renderCheckedResponse(JSON.stringify(f), sources, conversation),
  ).toThrow();
});

it("preserves explicit unavailability rather than blindly rewriting every negative statement", () => {
  const source = {
    id: "notice-01",
    title: "Synthetic notice",
    text: "Replacement slots are unavailable during maintenance.",
  };
  const raw = {
    inputs: [],
    steps: [],
    results: [],
    passages: [{ kind: "source", sourceId: source.id, quote: source.text }],
    limitation: "none",
  };
  expect(
    renderCheckedResponse(JSON.stringify(raw), [source], emptyConversation()),
  ).toContain("are unavailable during maintenance");
});

it.each(["350", "3.5", "1e3", "1,000", "NaN", "Infinity"])(
  "rejects unsupported or unsafe operands %s",
  (value) => {
    const f = fixture();
    f.inputs[1].value = value;
    expect(() =>
      renderCheckedResponse(JSON.stringify(f), sources, conversation),
    ).toThrow();
  },
);

it("rejects cycles, forward dependencies, duplicate IDs and non-calculated results", () => {
  for (const mutation of [
    (f: ReturnType<typeof fixture>) => {
      f.steps[0].left = "total";
    },
    (f: ReturnType<typeof fixture>) => {
      f.steps[1].id = "gross";
    },
    (f: ReturnType<typeof fixture>) => {
      f.results[0].id = "fee";
    },
  ]) {
    const f = fixture();
    mutation(f);
    expect(() =>
      renderCheckedResponse(JSON.stringify(f), sources, conversation),
    ).toThrow();
  }
});

it("accepts ordinary numbered identifiers without interpreting them as code", () => {
  const f = fixture();
  f.steps[5].id = "result2";
  f.results[0].id = "result2";
  expect(
    renderCheckedResponse(JSON.stringify(f), sources, conversation),
  ).toContain("154.10");
  f.steps[5].id = "a.constructor";
  f.results[0].id = "a.constructor";
  expect(() =>
    renderCheckedResponse(JSON.stringify(f), sources, conversation),
  ).toThrow();
});

it("supports exact decimal addition and rejects zero division", () => {
  const c = emptyConversation();
  c.messages.push(newMessage("user", "0.1 plus 0.2; zero is 0."));
  const inputs = ["0.1", "0.2", "0"].map((value, i) => ({
    id: ["a", "b", "zero"][i],
    value,
    evidence: { kind: "user", userTurn: 1, quote: c.messages[0].text },
  }));
  const f = {
    inputs,
    steps: [{ id: "total", op: "add", left: "a", right: "b" }],
    results: [{ id: "total", decimals: 2 }],
    passages: [],
    limitation: "none",
  };
  expect(renderCheckedResponse(JSON.stringify(f), [], c)).toContain("0.30");
  f.steps[0] = { id: "total", op: "divide", left: "a", right: "zero" };
  expect(() => renderCheckedResponse(JSON.stringify(f), [], c)).toThrow();
});

it("does not misrepresent valid arithmetic as proof of the selected method", () => {
  const f = fixture();
  f.steps[5].op = "subtract";
  const answer = renderCheckedResponse(
    JSON.stringify(f),
    sources,
    conversation,
  );
  expect(answer).toContain("113.90");
  expect(answer).toContain(
    "choice of inputs, units and operations still needs review",
  );
});

async function* stream(
  raw: string,
  finish = "stop",
): AsyncGenerator<ChatCompletionChunk> {
  yield {
    choices: [
      { index: 0, delta: { content: raw.slice(0, 20) }, finish_reason: null },
    ],
  } as ChatCompletionChunk;
  yield {
    choices: [
      { index: 0, delta: { content: raw.slice(20) }, finish_reason: finish },
    ],
  } as ChatCompletionChunk;
  yield {
    choices: [],
    usage: { prompt_tokens: 20, completion_tokens: 10, total_tokens: 30 },
  } as unknown as ChatCompletionChunk;
}
it("buffers the entire draft, emits only checked output, and keeps usage on refusal", async () => {
  const emitted: string[] = [];
  const run = (raw: string, finish = "stop") =>
    consumeCheckedResponse(
      stream(raw, finish),
      { currency: "USD", inputPerMillion: 1, outputPerMillion: 1 },
      new AbortController().signal,
      sources,
      conversation,
      (t) => emitted.push(t),
    );
  await expect(
    run(JSON.stringify({ ...fixture(), answer: "999" })),
  ).rejects.toMatchObject({
    checkedFailure: "INVALID_SCHEMA",
    usage: { total: 30 },
  });
  expect(emitted).toEqual([]);
  await expect(run(JSON.stringify(fixture()), "length")).rejects.toMatchObject({
    usage: { total: 30 },
  });
  expect(emitted).toEqual([]);
  await expect(run(JSON.stringify(fixture()))).resolves.toMatchObject({
    total: 30,
  });
  expect(emitted).toHaveLength(1);
  expect(emitted[0]).toContain("154.10");
});
