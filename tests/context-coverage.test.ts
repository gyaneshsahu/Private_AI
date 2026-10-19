import { it, expect } from "vitest";
import { emptyConversation } from "../shared/contracts";
import {
  composeContext,
  measureContext,
  newMessage,
} from "../src/conversation";
import { streamVerifiedConversation } from "../src/verified-chat";
import {
  experimentRequestLimit,
  developmentCase,
} from "../evaluation/experiment";
it("accounts for exact composed context across drafts, exclusions, source formatting and policy variants", () => {
  for (const variant of [undefined, "constraints-v4"] as const) {
    const conversation = emptyConversation();
    conversation.messages = [
      newMessage("user", "Earlier fact"),
      newMessage("assistant", "Complete reply"),
      { ...newMessage("assistant", "Partial reply"), status: "partial" },
      { ...newMessage("user", "Excluded"), included: false },
    ];
    conversation.attachments = [
      {
        id: "included",
        name: "notes",
        selected: true,
        sources: [
          {
            id: "s1",
            title: "Dates",
            text: 'Update: 3 June.\nQuotation: "six".',
            url: "https://example.test/notes",
          },
        ],
      },
      {
        id: "excluded",
        name: "old notes",
        selected: false,
        sources: [{ id: "s2", title: "Old", text: "OMIT" }],
      },
    ];
    const draft = "  What changed?  ";
    const measured = measureContext(conversation, draft, variant);
    const payload = composeContext(
      {
        ...conversation,
        messages: [...conversation.messages, newMessage("user", draft.trim())],
      },
      100000,
      new Date(),
      variant,
    );
    expect(measured.characters).toBe(
      payload.reduce((sum, message) => sum + message.content.length, 0),
    );
    expect(
      Object.values(measured.breakdown).reduce((sum, value) => sum + value, 0),
    ).toBe(measured.characters);
    expect(measured.breakdown.conversation).toBe(
      "Earlier factComplete reply".length,
    );
    expect(measured.breakdown.references).toBe(payload[1].content.length);
    expect(measured.breakdown.draft).toBe(draft.trim().length);
    expect(measured).toMatchObject({
      includedMessages: 2,
      excludedMessages: 2,
      sourceCount: 1,
    });
    conversation.attachments[0].selected = false;
    expect(measureContext(conversation, "   ", variant)).toMatchObject({
      breakdown: { references: 0, draft: 0 },
      sourceCount: 0,
    });
  }
});
it("retains selected earlier/middle/recent facts and documents across80 messages, with exact limit rejection", () => {
  const c = emptyConversation();
  for (let i = 0; i < 80; i++)
    c.messages.push(
      newMessage(
        i % 2 ? "assistant" : "user",
        `fact-${i}: retained value ${i}`,
      ),
    );
  c.attachments.push({
    id: "doc",
    name: "synthetic",
    selected: true,
    sources: [{ id: "s", title: "manifest", text: "mass2.75kg" }],
  });
  c.messages.push({
    ...newMessage("assistant", "EXCLUDE_PARTIAL"),
    status: "partial",
  });
  c.messages.push({ ...newMessage("user", "EXCLUDE_MANUAL"), included: false });
  const n = measureContext(c).characters;
  const exact = composeContext(c, n);
  expect(exact.map((m) => m.content).join(" ")).toContain("fact-0");
  expect(exact.map((m) => m.content).join(" ")).toContain("fact-40");
  expect(exact.map((m) => m.content).join(" ")).toContain("fact-79");
  expect(exact[1].content).toContain("mass2.75kg");
  expect(JSON.stringify(exact)).not.toContain("EXCLUDE_");
  const before = JSON.stringify(c);
  expect(() => composeContext(c, n - 1)).toThrow("silently truncated");
  expect(JSON.stringify(c)).toBe(before);
});
it("rejects oversize before any verification or paid transport", async () => {
  const c = emptyConversation();
  c.messages.push(newMessage("user", "large"));
  let verified = 0;
  await expect(
    streamVerifiedConversation(
      c,
      {
        origin: "https://inference.tinfoil.sh",
        repository: "tinfoilsh/confidential-model-router",
        releaseDigests: ["a".repeat(64)],
        model: "gemma4-31b",
        maxInputCharacters: 1,
        maxOutputTokens: 4096,
        pricing: { inputPerMillion: 0.4, outputPerMillion: 1, currency: "USD" },
      },
      "synthetic",
      new AbortController().signal,
      () => {},
      () => {},
      () => {},
      () => verified++,
    ),
  ).rejects.toThrow("too large");
  expect(verified).toBe(0);
});
it("many-turn request limits derive only from frozen fixtures; old cases remain two-turn", () => {
  expect(
    experimentRequestLimit({
      scenario: "robustness_case",
      developmentCaseId: "coverage-long-1",
    }),
  ).toBe(10);
  expect(
    experimentRequestLimit({
      scenario: "robustness_case",
      developmentCaseId: "general-transfer-g01",
    }),
  ).toBe(2);
  expect(() =>
    developmentCase("unapproved-custom", "robustness_case"),
  ).toThrow();
});
it("v3 adds a general deliverable check while leaving default/v2 untouched", () => {
  const c = emptyConversation(),
    date = new Date("2026-10-08T00:00:00Z");
  const v2 = composeContext(c, 10000, date, "constraints-v2")[0].content;
  const v3 = composeContext(c, 10000, date, "constraints-v3")[0].content;
  expect(v2).not.toContain("Identify the requested deliverables");
  expect(v3).toContain("Identify the requested deliverables");
  expect(v3).toContain("If that contact proves unavailable");
});

it("v4 preserves v2 urgent policy and tests fixed constraints without changing previous variants", () => {
  const c = emptyConversation(),
    date = new Date("2026-10-08T00:00:00Z");
  const v4 = composeContext(c, 10000, date, "constraints-v4")[0].content;
  expect(v4).toContain("Retain constraint-bearing phrases verbatim");
  expect(v4).toContain("If that contact proves unavailable");
  expect(
    composeContext(c, 10000, date, "constraints-v2")[0].content,
  ).not.toContain("Retain constraint-bearing phrases verbatim");
  expect(composeContext(c, 10000, date, "constraints-v3")[0].content).toContain(
    "Identify the requested deliverables",
  );
});
