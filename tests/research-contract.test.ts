import { expect, it } from "vitest";
import type { ChatCompletionChunk } from "openai/resources/chat/completions";
import {
  consumeResearchReply,
  renderResearchContract,
} from "../src/research-contract";

const sources = [
  {
    id: "notice-001",
    title: "Synthetic notice",
    url: "https://example.com/notice",
    text: "Published June 4. The launch is scheduled for June 12; completion has not been confirmed.",
  },
  {
    id: "notice-002",
    title: "Synthetic correction",
    url: "https://example.com/correction",
    text: "Published June 7. The launch was postponed until June 19.",
  },
];
const draft = (
  text = "The launch was postponed until June 19.",
  quote = sources[1].text,
  sourceId = "notice-002",
) => ({
  claims: [{ text, evidence: [{ sourceId, quote }] }],
  limitation: "none",
});
const pricing = {
  inputPerMillion: 1,
  outputPerMillion: 2,
  currency: "USD" as const,
};
function event(
  content: string,
  finish: "stop" | "length" | null = null,
): ChatCompletionChunk {
  return {
    id: "synthetic",
    model: "synthetic",
    created: 0,
    object: "chat.completion.chunk",
    choices: [{ index: 0, delta: { content }, finish_reason: finish }],
  };
}
async function* stream(raw: string, finish: "stop" | "length" | null = "stop") {
  yield event(raw.slice(0, 20));
  yield event(raw.slice(20), finish);
  yield {
    ...event(""),
    choices: [],
    usage: { prompt_tokens: 30, completion_tokens: 10, total_tokens: 40 },
  };
}

it("renders references only from exact passages in their cited sources", () => {
  expect(renderResearchContract(JSON.stringify(draft()), sources)).toContain(
    "[notice-002]",
  );
  expect(() =>
    renderResearchContract(
      JSON.stringify(draft(undefined, sources[1].text, "notice-001")),
      sources,
    ),
  ).toThrow();
});

it.each([
  ["unknown source", draft(undefined, undefined, "missing-001")],
  ["fabricated quote", draft(undefined, "The launch completed on June 19.")],
  [
    "altered punctuation",
    draft(undefined, sources[1].text.replace("June 7.", "June 7:")),
  ],
  ["invented locator", draft("Confirmed [notice-002†L4]")],
  ["uncaptured direct quote", draft('The notice says "completed".')],
  ["empty answer", { claims: [], limitation: "none" }],
  ["hidden extra facts", { ...draft(), summary: "The launch succeeded." }],
  [
    "claim without evidence",
    { claims: [{ text: "Completed.", evidence: [] }], limitation: "none" },
  ],
  ["ambiguous assertion", { ...draft(), limitation: "ambiguous" }],
])("rejects %s", (_name, value) => {
  expect(() =>
    renderResearchContract(JSON.stringify(value), sources),
  ).toThrow();
});

it("uses application-owned wording for insufficient evidence and ambiguity", () => {
  expect(
    renderResearchContract(
      '{"claims":[],"limitation":"insufficient"}',
      sources,
    ),
  ).toContain("insufficient");
  expect(
    renderResearchContract('{"claims":[],"limitation":"ambiguous"}', sources),
  ).toContain("Please specify");
});

it("documents that a real quote does not prove semantic support", () => {
  // Deliberately false claim: this must remain a separate semantic evaluation failure.
  expect(
    renderResearchContract(
      JSON.stringify(draft("The launch completed on June 19.")),
      sources,
    ),
  ).toContain("completed");
});

it("buffers all chunks until validation and keeps terminal usage on rejection", async () => {
  const emitted: string[] = [];
  const signal = new AbortController().signal;
  await expect(
    consumeResearchReply(
      stream(JSON.stringify(draft(undefined, "An invented exact quotation."))),
      pricing,
      signal,
      sources,
      (text) => emitted.push(text),
    ),
  ).rejects.toMatchObject({
    name: "IncompleteReplyError",
    usage: { total: 40 },
  });
  expect(emitted).toEqual([]);
  const usage = await consumeResearchReply(
    stream(JSON.stringify(draft())),
    pricing,
    signal,
    sources,
    (text) => emitted.push(text),
  );
  expect(usage?.total).toBe(40);
  expect(emitted).toHaveLength(1);
});

it("does not publish truncated or oversized drafts and retains usage", async () => {
  for (const [raw, finish] of [
    [JSON.stringify(draft()), "length"],
    ["a".repeat(64001), "stop"],
  ] as const) {
    const emitted: string[] = [];
    await expect(
      consumeResearchReply(
        stream(raw, finish),
        pricing,
        new AbortController().signal,
        sources,
        (text) => emitted.push(text),
      ),
    ).rejects.toMatchObject({ usage: { total: 40 } });
    expect(emitted).toEqual([]);
  }
});
