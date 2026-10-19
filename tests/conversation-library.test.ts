import { describe, expect, it } from "vitest";
import { emptyConversation } from "../shared/contracts";
import {
  conversationTitle,
  findConversations,
} from "../src/conversation-library";

describe("unlocked conversation library", () => {
  it("searches all query terms across saved fields without rewriting snapshots", () => {
    const first = {
      ...emptyConversation(),
      id: "a",
      title: "Holiday ideas",
      draft: "SYNTHETIC rail journey",
      createdAt: "2026-10-18T00:00:00Z",
    };
    const second = {
      ...emptyConversation(),
      id: "b",
      title: "TypeScript notes",
      createdAt: "2026-10-19T00:00:00Z",
    };
    const records = [first, second];
    const original = structuredClone(records);
    expect(findConversations(records, " HOLIDAY rail ", "newest")).toEqual([
      first,
    ]);
    expect(findConversations(records, "missing", "newest")).toEqual([]);
    expect(findConversations(records, "", "newest")).toEqual([second, first]);
    expect(findConversations(records, "", "oldest")).toEqual([first, second]);
    expect(records).toEqual(original);
  });
  it("uses readable legacy draft titles and searches filenames/messages", () => {
    const conversation = {
      ...emptyConversation(),
      draft: "SYNTHETIC legacy draft",
      messages: [
        {
          id: "m",
          role: "user" as const,
          status: "complete" as const,
          included: true,
          text: "check indexing",
        },
      ],
      attachments: [
        { id: "f", name: "notes.txt", selected: false, sources: [] },
      ],
    };
    expect(conversationTitle(conversation)).toBe("SYNTHETIC legacy draft");
    expect(
      findConversations([conversation], "indexing notes.txt", "title"),
    ).toEqual([conversation]);
  });
});
