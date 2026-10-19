import "fake-indexeddb/auto";
import { it, expect } from "vitest";
import { emptyConversation, type Conversation } from "../shared/contracts";
import { branchConversation, switchBranch } from "../src/conversation-branches";
import { composeContext, newMessage } from "../src/conversation";
import {
  containsTemporaryResearch,
  savedConversationSchema,
} from "../src/saved-conversation";
import { findConversations } from "../src/conversation-library";
import { Vault } from "../src/vault";

function example(): Conversation {
  return {
    ...emptyConversation(),
    title: "SYNTHETIC branches",
    messages: [
      newMessage("user", "Original question"),
      {
        ...newMessage("assistant", "INCOMPLETE CANARY"),
        status: "partial",
        failure: "stopped",
      },
    ],
    attachments: [
      {
        id: "d",
        name: "Reference",
        selected: true,
        sources: [{ id: "s", title: "Reference", text: "ORIGINAL REFERENCE" }],
      },
    ],
    usage: [{ input: 1, output: 2, total: 3, estimatedUSD: 0.001 }],
  };
}

it("retry keeps the failed attempt, draft and source snapshot without sending inactive context", () => {
  const c = example();
  const retry = branchConversation(c, "DRAFT CANARY", c.messages[0].id);
  expect(retry.id).toBe(c.id);
  expect(retry.usage).toEqual(c.usage);
  expect(retry.messages).toEqual([]);
  expect(retry.branches!.archived[0].messages[1].failure).toBe("stopped");
  const sent = composeContext(
    { ...retry, messages: [newMessage("user", "Original question")] },
    10000,
  );
  expect(JSON.stringify(sent)).not.toMatch(/CANARY|branches|failure/);
  retry.attachments[0].sources[0].text = "CORRECTED";
  expect(retry.branches!.archived[0].attachments[0].sources[0].text).toBe(
    "ORIGINAL REFERENCE",
  );
  expect(c.attachments[0].sources[0].text).toBe("ORIGINAL REFERENCE");
});

it("edits preserve preceding context and switching restores independent drafts, selections and references", () => {
  const c = example();
  c.messages.push(
    newMessage("user", "Follow-up"),
    newMessage("assistant", "Later answer"),
  );
  const edited = branchConversation(
    c,
    "Original draft",
    c.messages[2].id,
    "Corrected follow-up",
  );
  expect(edited.messages.map((m) => m.text)).toEqual([
    "Original question",
    "INCOMPLETE CANARY",
    "Corrected follow-up",
  ]);
  edited.attachments[0].selected = false;
  const active = edited.branches!.activeId;
  const original = switchBranch(
    edited,
    "Edited draft",
    edited.branches!.archived[0].id,
  );
  expect(original.draft).toBe("Original draft");
  expect(original.messages.at(-1)?.text).toBe("Later answer");
  expect(original.attachments[0].selected).toBe(true);
  const back = switchBranch(original, "Changed original draft", active);
  expect(back.draft).toBe("Edited draft");
  expect(back.attachments[0].selected).toBe(false);
  expect(back.branches!.archived[0].draft).toBe("Changed original draft");
  expect(back.usage).toEqual(c.usage);
});

it("rejects invalid edits and enforces the branch cap without discarding history", () => {
  let c = example();
  expect(() => branchConversation(c, "", "missing", "replacement")).toThrow();
  expect(() => branchConversation(c, "", c.messages[0].id, " ")).toThrow();
  for (let i = 0; i < 19; i++)
    c = branchConversation(c, "", c.messages[0].id, `Question ${i}`);
  const before = JSON.stringify(c);
  expect(() => branchConversation(c, "", c.messages[0].id, "Overflow")).toThrow(
    "20 branches",
  );
  expect(JSON.stringify(c)).toBe(before);
  expect(() => switchBranch(c, "", "missing")).toThrow();
  expect(switchBranch(c, "", c.branches!.activeId)).toBe(c);
});

it("searches inactive branches locally and validates identities, bounds and flat history", () => {
  const c = example();
  const edited = branchConversation(c, "", c.messages[0].id, "Fresh");
  expect(
    findConversations([edited], "INCOMPLETE CANARY", "newest"),
  ).toHaveLength(1);
  expect(savedConversationSchema.safeParse(edited).success).toBe(true);
  expect(
    savedConversationSchema.safeParse({
      ...edited,
      branches: {
        ...edited.branches,
        activeId: edited.branches!.archived[0].id,
      },
    }).success,
  ).toBe(false);
  const nested = {
    ...edited,
    branches: {
      ...edited.branches!,
      archived: edited.branches!.archived.map((branch) => ({
        ...branch,
        branches: { archived: [] },
      })),
    },
  };
  expect(savedConversationSchema.safeParse(nested).success).toBe(false);
  expect(savedConversationSchema.safeParse(c).success).toBe(true);
});

it.each(["sticky", "query", "excerpt", "snapshot"])(
  "cannot save hidden temporary research: %s",
  async (kind) => {
    const c = example();
    const next = branchConversation(
      c,
      "",
      c.messages[0].id,
      "Clean active question",
    );
    const archived = next.branches!.archived[0];
    if (kind === "sticky") archived.temporarySearch = true;
    if (kind === "query")
      archived.attachments[0].researchQuery = "public query";
    if (kind === "excerpt")
      archived.attachments[0].sources[0].evidenceKind = "search-excerpt";
    if (kind === "snapshot")
      archived.messages[1].sourceSnapshot = [
        { id: "s", title: "S", text: "temporary", evidenceKind: "llm-context" },
      ];
    expect(containsTemporaryResearch(next)).toBe(true);
    const store = new Vault();
    try {
      await expect(store.save(next)).rejects.toThrow("temporary");
    } finally {
      store.close();
    }
    expect(switchBranch(next, "", archived.id).temporarySearch).toBe(true);
  },
);

it("retains existing direct-page saving permission and carries branch history through encrypted portable restore", async () => {
  const c = example();
  c.attachments[0].sources[0].evidenceKind = "page";
  c.attachments[0].sources[0].url = "https://example.com/public";
  const next = branchConversation(
    c,
    "Source draft",
    c.messages[0].id,
    "Edited question",
  );
  expect(containsTemporaryResearch(next)).toBe(false);
  const source = new Vault(),
    target = new Vault();
  source.selectAccount(crypto.randomUUID());
  target.selectAccount(crypto.randomUUID());
  try {
    await source.unlock("synthetic source password");
    await target.unlock("synthetic target password");
    await source.save(next);
    const backup = await source.exportBackup();
    expect(backup).not.toContain("INCOMPLETE CANARY");
    await target.restoreBackup(backup, "synthetic source password");
    const restored = (await target.readAvailable()).conversations[0];
    expect(restored.id).not.toBe(next.id);
    expect(restored.branches).toEqual(next.branches);
    expect(
      switchBranch(restored, "", restored.branches!.archived[0].id).messages[1]
        .failure,
    ).toBe("stopped");
  } finally {
    source.close();
    target.close();
  }
});
