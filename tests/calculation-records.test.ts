import { expect, it } from "vitest";
import { emptyConversation } from "../shared/contracts";
import { newMessage } from "../src/conversation";
import { createCalculationRecords } from "../src/calculation-records";
import { expandCalculationReplay } from "../src/calculation-replay";
import { renderCheckedResponse } from "../src/checked-response";
import { createCalculationSession } from "../src/calculation-session";

function fixture() {
  const conversation = emptyConversation();
  conversation.messages = [
    newMessage("user", "Quantity 3 and price 17."),
    newMessage("assistant", "Calculated total 51."),
  ];
  const raw = JSON.stringify({
    unit: "EUR",
    inputs: [
      {
        id: "quantity",
        value: "3",
        evidence: {
          kind: "user",
          userTurn: 1,
          quote: "Quantity 3 and price 17.",
        },
      },
      {
        id: "price",
        value: "17",
        evidence: {
          kind: "user",
          userTurn: 1,
          quote: "Quantity 3 and price 17.",
        },
      },
    ],
    steps: [{ id: "total", op: "multiply", left: "quantity", right: "price" }],
    results: [{ id: "total", decimals: 2 }],
  });
  return { conversation, raw, assistantId: conversation.messages[1].id };
}
it("binds pending programs only to the exact completed delivered reply", () => {
  const { conversation, raw } = fixture();
  const session = createCalculationSession();
  const before = {
    ...conversation,
    messages: conversation.messages.slice(0, 1),
  };
  session.stage(raw, conversation.messages[1].text, before);
  const partial = structuredClone(conversation);
  partial.messages[1].status = "partial";
  expect(session.references(partial)).toEqual([]);
  expect(session.references(conversation)).toHaveLength(1);
  expect(session.references(conversation)).toHaveLength(1);
  const next = structuredClone(conversation);
  next.messages.push(newMessage("user", "Correct the price."));
  expect(session.references(next)).toHaveLength(1);
  session.clear();
  expect(session.references(next)).toEqual([]);
  session.stage(raw, "Different delivered text", before);
  expect(session.references(conversation)).toEqual([]);
});
it("clears staged and committed content on session replacement", () => {
  const { conversation, raw } = fixture();
  const session = createCalculationSession();
  session.stage(raw, conversation.messages[1].text, {
    ...conversation,
    messages: conversation.messages.slice(0, 1),
  });
  expect(session.references(emptyConversation())).toEqual([]);
  expect(session.references(conversation)).toEqual([]);
});
it("replays unrounded operations instead of using displayed rounded values", () => {
  const { conversation, raw, assistantId } = fixture();
  const original = JSON.parse(raw);
  original.steps = [
    { id: "ratio", op: "divide", left: "price", right: "quantity" },
  ];
  original.results = [{ id: "ratio", decimals: 2 }];
  const store = createCalculationRecords();
  const key = store.record(JSON.stringify(original), conversation, assistantId);
  expect(store.resolve(key, conversation)!.results[0].displayedValue).toBe(
    "5.67",
  );
  const request = {
    unit: "EUR",
    inputs: [original.inputs[0]],
    derivedInputs: [{ id: "old_ratio", recordId: key, resultId: "ratio" }],
    steps: [
      { id: "restored", op: "multiply", left: "old_ratio", right: "quantity" },
    ],
    results: [{ id: "restored", decimals: 2 }],
  };
  const compiled = JSON.parse(
    expandCalculationReplay(JSON.stringify(request), store, conversation),
  );
  delete compiled.unit;
  expect(
    renderCheckedResponse(
      JSON.stringify({ ...compiled, passages: [], limitation: "none" }),
      [],
      conversation,
      "result",
    ),
  ).toBe("17.00");
  expect(JSON.stringify(compiled)).not.toContain('"5.67"');
  store.clear();
  expect(() =>
    expandCalculationReplay(JSON.stringify(request), store, conversation),
  ).toThrow("unavailable");
});
it("rejects invented result references and ambiguous identifier reuse", () => {
  const { conversation, raw, assistantId } = fixture();
  const store = createCalculationRecords();
  const key = store.record(raw, conversation, assistantId);
  const original = JSON.parse(raw);
  const request = {
    ...original,
    derivedInputs: [{ id: "previous", recordId: key, resultId: "imaginary" }],
  };
  expect(() =>
    expandCalculationReplay(JSON.stringify(request), store, conversation),
  ).toThrow("unavailable");
  request.derivedInputs[0] = {
    id: "quantity",
    recordId: key,
    resultId: "total",
  };
  expect(() =>
    expandCalculationReplay(JSON.stringify(request), store, conversation),
  ).toThrow("Duplicate");
});
it("replays historical arithmetic without making a correction overwrite it", () => {
  const { conversation, raw, assistantId } = fixture();
  const store = createCalculationRecords();
  const key = store.record(raw, conversation, assistantId);
  conversation.messages.push(newMessage("user", "Price is corrected to 19."));
  const result = store.resolve(key, conversation)!;
  expect(result.historical).toBe(true);
  expect(result.results[0].displayedValue).toBe("51.00");
  result.results[0].displayedValue = "999";
  expect(store.resolve(key, conversation)!.results[0].displayedValue).toBe(
    "51.00",
  );
  expect(JSON.stringify(conversation)).not.toContain(key);
});
it("invalidates edits, exclusion, forks, deletion and changed source selection", () => {
  for (const mutate of [
    (c: ReturnType<typeof emptyConversation>) => {
      c.messages[0].text = "Price 99";
    },
    (c: ReturnType<typeof emptyConversation>) => {
      c.messages[0].included = false;
    },
    (c: ReturnType<typeof emptyConversation>) => {
      c.id = crypto.randomUUID();
    },
    (c: ReturnType<typeof emptyConversation>) => {
      c.messages.pop();
    },
    (c: ReturnType<typeof emptyConversation>) => {
      c.attachments.push({
        id: "attachment",
        name: "new",
        selected: true,
        sources: [{ id: "source-new", title: "New", text: "New evidence" }],
      });
    },
  ]) {
    const { conversation, raw, assistantId } = fixture();
    const store = createCalculationRecords();
    const key = store.record(raw, conversation, assistantId);
    mutate(conversation);
    expect(store.resolve(key, conversation)).toBeUndefined();
  }
});
it("rejects fabricated operands and partial answers without retaining them", () => {
  const { conversation, raw, assistantId } = fixture();
  const store = createCalculationRecords();
  expect(() =>
    store.record(raw.replace('"17"', '"99"'), conversation, assistantId),
  ).toThrow();
  conversation.messages[1].status = "partial";
  expect(() => store.record(raw, conversation, assistantId)).toThrow();
});
it("bounds records and explicitly clears all session state", () => {
  const { conversation, raw, assistantId } = fixture();
  const store = createCalculationRecords();
  const keys = Array.from({ length: 9 }, () =>
    store.record(raw, conversation, assistantId),
  );
  expect(store.resolve(keys[0], conversation)).toBeUndefined();
  expect(store.resolve(keys[8], conversation)).toBeDefined();
  store.clear();
  expect(store.resolve(keys[8], conversation)).toBeUndefined();
});
