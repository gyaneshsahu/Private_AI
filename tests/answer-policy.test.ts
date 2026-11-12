import { expect, it } from "vitest";
import { emptyConversation } from "../shared/contracts";
import { composeContext, newMessage } from "../src/conversation";

it("keeps the default policy unchanged and adds the experimental policy only explicitly", () => {
  const conversation = emptyConversation();
  conversation.messages.push(newMessage("user", "Please shorten the notice."));
  const now = new Date("2026-10-08T00:00:00Z");
  const baseline = composeContext(conversation, 8000, now);
  const candidate = composeContext(conversation, 8000, now, "constraints-v1");
  expect(baseline[0].content).not.toContain("Brevity changes wording");
  expect(candidate[0].content).toContain(
    "Brevity changes wording, not those obligations",
  );
  expect(candidate.slice(1)).toEqual(baseline.slice(1));
  const baselineSize = baseline.reduce((n, m) => n + m.content.length, 0);
  expect(() => composeContext(conversation, baselineSize, now)).not.toThrow();
  // The product prompt is now longer than v1 (health policy, 12 November), so test v1 at
  // one character below its own size: it must refuse rather than truncate silently.
  const candidateSize = candidate.reduce((n, m) => n + m.content.length, 0);
  expect(() =>
    composeContext(conversation, candidateSize - 1, now, "constraints-v1"),
  ).toThrow("nothing has been silently truncated");
  expect(() =>
    composeContext(conversation, 8000, now, "unknown" as never),
  ).toThrow("Unknown answer policy");
});

it("replaces conflicting crisis instructions only in v2 and counts its full context", () => {
  const conversation = emptyConversation();
  conversation.messages.push(
    newMessage("user", "Please keep every requirement."),
  );
  const now = new Date("2026-10-08T00:00:00Z");
  const v1 = composeContext(conversation, 8000, now, "constraints-v1");
  const v2 = composeContext(conversation, 8000, now, "constraints-v2");
  expect(v1[0].content).toContain(
    "give a short immediate safety step and connect",
  );
  expect(v2[0].content).not.toContain(
    "give a short immediate safety step and connect",
  );
  expect(v2[0].content).toContain(
    "Do not prepend another task or offer a menu",
  );
  expect(v2[0].content).toContain(
    "object, recipient, timing, condition and degree of certainty",
  );
  expect(v2[0].content).toContain("Add warmth only when requested");
  expect(v2.slice(1)).toEqual(v1.slice(1));
  const size = v2.reduce((n, m) => n + m.content.length, 0);
  expect(() =>
    composeContext(conversation, size - 1, now, "constraints-v2"),
  ).toThrow("nothing has been silently truncated");
});

it("product (default) policy answers health questions with safe emergency wording; v1-v4 stay frozen", async () => {
  const { createHash } = await import("node:crypto");
  const c = emptyConversation();
  const now = new Date("2026-10-08T00:00:00Z");
  const product = composeContext(c, 10000, now)[0].content;
  for (const phrase of [
    "do not refuse or deflect harmless health questions",
    "check the label or ask a pharmacist",
    "own symptoms, medication or treatment decisions, add one short note to see a doctor or pharmacist",
    "not in every reply and not for general knowledge questions",
    "Never claim to be a medical product",
    "emergency 112",
    'not "your local emergency number"',
    "also encourage talking to a doctor or therapist",
    "on-call doctor 116 117",
    "Telefonseelsorge crisis support 0800 111 0 111 or 0800 111 0 222",
    "Keep that urgent human connection in follow-ups",
  ])
    expect(product).toContain(phrase);
  expect(product).not.toContain("Do not diagnose or replace expert help");
  // The helpline numbers look like phone numbers to the device masker; verified-chat
  // skips the fixed policy prefix when masking (tests/browser-transport.test.ts covers it).
  const { createMaskingSession } = await import("../src/identifier-masking");
  expect(createMaskingSession().mask(product)).not.toBe(product);
  // Evaluation records name v1-v4; their system prompts must not change.
  const frozen = {
    "constraints-v1": "2e1afb75e89dc41f414bbe53d2959db95e28b85ab2cf5d483708d6772e39bef7",
    "constraints-v2": "cd575e4b04d4f9f611239649400bbb98eca80288ba2b8d718d39ed7b9379bffe",
    "constraints-v3": "63236a52511fa273977cc88ef204d87eae1585638dd7939c8cd3edc4fe2bef2d",
    "constraints-v4": "542e47ee1892f499bf6113f51ae58ab7fea6c0548ff9148e63a0c76c7d7c0e49",
  } as const;
  for (const [variant, sha] of Object.entries(frozen)) {
    const text = composeContext(c, 10000, now, variant as keyof typeof frozen)[0].content;
    expect(createHash("sha256").update(text).digest("hex")).toBe(sha);
    expect(text).not.toContain("112");
  }
});

it("product prompt: no unasked counts, unsure German rules point to the official source, web answers never claim no browsing", () => {
  const c = emptyConversation();
  c.messages.push(newMessage("user", "Please shorten the notice."));
  const now = new Date("2026-11-12T00:00:00Z");
  // The size limit still holds: the product prompt and a short message fit in 8,000.
  const product = composeContext(c, 8000, now)[0].content;
  expect(product).toContain(
    "Do not state word or character counts unless the user asks for them.",
  );
  expect(product).toContain(
    "For German rules, fees and deadlines you are not sure of, say that you are not sure and point to the official source instead of giving a number.",
  );
  expect(product).toContain(
    "training data with an unpublished end date and may be out of date, and offer a web search",
  );
  // Health and maths handling are unchanged.
  expect(product).toContain("Answer health questions helpfully and concretely");
  expect(product).toContain("Check quantities, units, time and dependencies");
  for (const variant of [
    "constraints-v1",
    "constraints-v2",
    "constraints-v3",
    "constraints-v4",
  ] as const) {
    const text = composeContext(c, 10000, now, variant)[0].content;
    expect(text).not.toContain("word or character counts");
    expect(text).not.toContain("unpublished end date");
  }
  c.attachments.push({
    id: "a",
    name: "Public search results",
    selected: true,
    kind: "research",
    sources: [
      {
        id: "abc123def456",
        title: "Synthetic",
        text: "Synthetic excerpt",
        url: "https://example.com/",
      },
    ],
  });
  const web = composeContext(c, 10000, now)[0].content;
  expect(web).not.toContain("You have no external tools");
  expect(web).toContain(
    "Never say you cannot browse or have no browsing or search tools.",
  );
  expect(web).toContain("say exactly what is missing and offer another search");
  expect(web).not.toContain("unpublished end date");
  expect(
    composeContext(c, 10000, now, "constraints-v1")[0].content,
  ).toContain("You have no external tools");
});
