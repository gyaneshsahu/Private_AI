import { describe, expect, it } from "vitest";
import type { Conversation } from "../shared/contracts";
import {
  containsTemporaryResearch,
  savedConversationSchema,
  stripLiveSearch,
} from "../src/saved-conversation";
import { emptyConversation } from "../shared/contracts";

const excerpt = {
  id: "s1",
  title: "SYNTHETIC result",
  text: "SYNTHETIC excerpt text",
  url: "https://example.com/synthetic",
  evidenceKind: "search-excerpt" as const,
};
const page = {
  id: "p1",
  title: "SYNTHETIC page",
  text: "SYNTHETIC passage the user opened",
  url: "https://example.com/opened-page",
  evidenceKind: "page" as const,
};

function liveSearchConversation(): Conversation {
  const c = emptyConversation();
  c.temporarySearch = true;
  c.messages.push(
    {
      id: "u",
      role: "user",
      text: "Synthetic question",
      status: "complete",
      included: true,
    },
    {
      id: "a",
      role: "assistant",
      text: "SYNTHETIC written answer [s1]",
      status: "complete",
      included: true,
      sourceSnapshot: [excerpt, page],
    },
  );
  c.attachments.push(
    {
      id: "r",
      name: "Public search results",
      selected: true,
      kind: "research",
      researchQuery: "synthetic public query",
      sources: [excerpt],
    },
    {
      id: "pg",
      name: "Public page",
      selected: true,
      kind: "research",
      sources: [page],
    },
  );
  return c;
}

describe("what a save keeps of a live search (launch plan 4.1, owner decision 22 October)", () => {
  it("keeps the written answer and the approved query, drops results and links, keeps opened pages", () => {
    const now = new Date("2026-10-23T00:30:00Z");
    const stripped = stripLiveSearch(liveSearchConversation(), now);
    expect(stripped.temporarySearch).toBeUndefined();
    expect(stripped.messages[1].text).toBe("SYNTHETIC written answer [s1]");
    expect(stripped.messages[1].sourceSnapshot).toEqual([page]);
    expect(stripped.attachments[0]).toEqual({
      id: "r",
      name: "Public search results",
      selected: true,
      kind: "research",
      researchQuery: "synthetic public query",
      liveSearch: { strippedAt: "2026-10-23T00:30:00.000Z" },
      sources: [],
    });
    expect(stripped.attachments[1].sources).toEqual([page]);
    expect(stripped.attachments[1].liveSearch).toBeUndefined();
    const text = JSON.stringify(stripped);
    expect(text).not.toContain("SYNTHETIC excerpt text");
    expect(text).not.toContain("example.com/synthetic");
    expect(text).toContain("example.com/opened-page");
    expect(containsTemporaryResearch(stripped)).toBe(false);
    expect(savedConversationSchema.safeParse(stripped).success).toBe(true);
  });

  it("does not alter the in-session conversation and keeps an earlier strip time on a second save", () => {
    const original = liveSearchConversation();
    const first = stripLiveSearch(original, new Date("2026-10-23T00:30:00Z"));
    expect(containsTemporaryResearch(original)).toBe(true);
    expect(original.attachments[0].sources).toHaveLength(1);
    const second = stripLiveSearch(first, new Date("2026-10-24T00:00:00Z"));
    expect(second.attachments[0].liveSearch?.strippedAt).toBe(
      "2026-10-23T00:30:00.000Z",
    );
    expect(second).toEqual(first);
  });

  it("strips archived branches as well and leaves a conversation without research untouched", () => {
    const c = liveSearchConversation();
    const archived = {
      id: "b1",
      label: "Earlier",
      draft: "",
      temporarySearch: true,
      messages: c.messages,
      attachments: c.attachments,
    };
    c.branches = {
      activeId: "main",
      activeLabel: "Main",
      archived: [archived],
    };
    const stripped = stripLiveSearch(c);
    expect(containsTemporaryResearch(stripped)).toBe(false);
    expect(stripped.branches?.archived[0].temporarySearch).toBeUndefined();
    expect(
      stripped.branches?.archived[0].attachments[0].liveSearch,
    ).toBeDefined();
    const plain = emptyConversation();
    plain.attachments.push({
      id: "d",
      name: "Doc",
      selected: true,
      sources: [page],
    });
    expect(stripLiveSearch(plain)).toEqual(plain);
  });

  it("drops search results that carry no evidence kind label, by their attachment", () => {
    const c = liveSearchConversation();
    const unlabelled = {
      id: "u1",
      title: "SYNTHETIC unlabelled",
      text: "x",
      url: "https://example.com/u",
    };
    c.attachments[0].sources = [unlabelled];
    c.messages[1].sourceSnapshot = [unlabelled, page];
    const stripped = stripLiveSearch(c);
    expect(stripped.attachments[0].sources).toEqual([]);
    expect(stripped.messages[1].sourceSnapshot).toEqual([page]);
    expect(containsTemporaryResearch(stripped)).toBe(false);
    delete c.temporarySearch;
    expect(containsTemporaryResearch(c)).toBe(true);
  });

  it("still treats a query without the saved marker, or any remaining result, as temporary", () => {
    const c = emptyConversation();
    c.attachments.push({
      id: "r",
      name: "Research",
      selected: true,
      kind: "research",
      researchQuery: "hand-crafted",
      sources: [],
    });
    expect(containsTemporaryResearch(c)).toBe(true);
    c.attachments[0].liveSearch = { strippedAt: "2026-10-23T00:00:00.000Z" };
    expect(containsTemporaryResearch(c)).toBe(false);
    c.attachments[0].sources = [excerpt];
    expect(containsTemporaryResearch(c)).toBe(true);
  });
});
