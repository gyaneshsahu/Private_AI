import { expect, it } from "vitest";
import { emptyConversation } from "../shared/contracts";
import { expireMessages, newMessage } from "../src/conversation";

const at = (minutesAgo: number, now: number) =>
  new Date(now - minutesAgo * 60_000).toISOString();

it("deletes only messages older than the chosen window, on every branch, and keeps undated ones", () => {
  const now = Date.parse("2026-10-22T12:00:00Z");
  const conversation = {
    ...emptyConversation(),
    disappearAfter: "hour" as const,
    messages: [
      { ...newMessage("user", "old"), at: at(61, now) },
      { ...newMessage("assistant", "edge"), at: at(60, now) },
      { ...newMessage("user", "recent"), at: at(59, now) },
      { ...newMessage("assistant", "undated"), at: undefined },
    ],
    branches: {
      activeId: "a",
      activeLabel: "A",
      archived: [
        {
          id: "b",
          label: "B",
          attachments: [],
          draft: "",
          messages: [
            { ...newMessage("user", "archived old"), at: at(600, now) },
            { ...newMessage("user", "archived new"), at: at(1, now) },
          ],
        },
      ],
    },
  };
  const result = expireMessages(conversation, now);
  expect(result.removed).toBe(3);
  expect(result.conversation.messages.map((m) => m.text)).toEqual([
    "recent",
    "undated",
  ]);
  expect(
    result.conversation.branches!.archived[0].messages.map((m) => m.text),
  ).toEqual(["archived new"]);
  // Unchanged input returns the same object; no window means nothing happens.
  expect(expireMessages(result.conversation, now).conversation).toBe(
    result.conversation,
  );
  const off = { ...conversation, disappearAfter: undefined };
  expect(expireMessages(off, now)).toEqual({ conversation: off, removed: 0 });
  expect(
    expireMessages({ ...conversation, disappearAfter: "week" }, now).removed,
  ).toBe(0);
  expect(
    expireMessages({ ...conversation, disappearAfter: "day" }, now).removed,
  ).toBe(0);
});

it("stamps new messages with a creation time", () => {
  const message = newMessage("user", "x");
  expect(Date.parse(message.at!)).toBeGreaterThan(Date.now() - 5_000);
});
