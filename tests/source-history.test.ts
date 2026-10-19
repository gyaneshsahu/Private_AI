import { describe, it, expect } from "vitest";
import { emptyConversation, type Source } from "../shared/contracts";
import { correctSource, sourceHistoryStatus } from "../src/source-history";
import { composeContext, newMessage } from "../src/conversation";
import {
  containsTemporaryResearch,
  savedConversationSchema,
} from "../src/saved-conversation";

const original: Source = {
  id: "s1",
  title: "Synthetic notice",
  text: "Collection before 14:00",
  page: 1,
};
const fixture = () => ({
  ...emptyConversation(),
  attachments: [
    {
      id: "a1",
      name: "notice.txt",
      selected: true,
      sources: [structuredClone(original)],
    },
  ],
  messages: [
    {
      ...newMessage("assistant", "Collection before 14:00 [s1]"),
      sourceSnapshot: [structuredClone(original)],
    },
  ],
});

describe("source correction provenance", () => {
  it("preserves captured evidence while exposing corrected material and its provenance to the next request", () => {
    const before = fixture();
    const after = correctSource(before, "s1", "Collection before 15:00");
    expect(before.attachments[0].sources[0]).toEqual(original);
    expect(after.messages).toEqual(before.messages);
    expect(after.attachments[0].sources[0].userEdited).toBe(true);
    const payload = composeContext(after, 10000)[1].content;
    expect(payload).toContain('"userEdited":true');
    expect(payload).toContain("Collection before 15:00");
    expect(payload).not.toContain("Collection before 14:00");
    expect(
      sourceHistoryStatus(
        after.messages[0],
        new Map([["s1", after.attachments[0].sources[0]]]),
      ),
    ).toBe("changed");
    const restored = savedConversationSchema.parse(after);
    expect(restored.attachments[0].sources[0].userEdited).toBe(true);
    expect(restored.messages[0].sourceSnapshot?.[0]).toEqual(original);
  });

  it("distinguishes unrecorded legacy history, no-source answers, changed metadata and removed sources", () => {
    const message = fixture().messages[0];
    expect(sourceHistoryStatus(message, new Map([["s1", original]]))).toBe(
      "unchanged",
    );
    expect(sourceHistoryStatus(message, new Map())).toBe("changed");
    expect(
      sourceHistoryStatus(message, new Map([["s1", { ...original, page: 2 }]])),
    ).toBe("changed");
    expect(
      sourceHistoryStatus({ ...message, sourceSnapshot: undefined }, new Map()),
    ).toBe("unrecorded");
    expect(
      sourceHistoryStatus({ ...message, sourceSnapshot: [] }, new Map()),
    ).toBe("unchanged");
    expect(sourceHistoryStatus(newMessage("user", "My text"), new Map())).toBe(
      "unchanged",
    );
  });

  it("keeps search-derived corrections temporary after attachment removal and does not reset provenance", () => {
    const c = fixture();
    c.messages[0].sourceSnapshot[0] = {
      ...original,
      evidenceKind: "search-excerpt",
    };
    c.attachments[0].sources[0] = {
      ...original,
      evidenceKind: "search-excerpt",
    };
    const corrected = correctSource(c, "s1", "Changed text");
    const reverted = correctSource(corrected, "s1", original.text);
    expect(reverted.attachments[0].sources[0].userEdited).toBe(true);
    expect(containsTemporaryResearch({ ...reverted, attachments: [] })).toBe(
      true,
    );
    expect(
      correctSource(c, "s1", original.text).attachments[0].sources[0]
        .userEdited,
    ).toBeUndefined();
  });
});
