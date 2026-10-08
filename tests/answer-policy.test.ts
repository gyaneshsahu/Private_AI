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
  expect(() =>
    composeContext(conversation, baselineSize, now, "constraints-v1"),
  ).toThrow("nothing has been silently truncated");
  expect(() =>
    composeContext(conversation, 8000, now, "unknown" as never),
  ).toThrow("Unknown answer policy");
});
