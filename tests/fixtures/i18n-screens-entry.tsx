// German interface checks: renders one screen (?screen=...) with synthetic data inside the
// language provider, so tests/i18n-screens-ui.test.ts can read it without the full workspace.
import React from "react";
import { createRoot } from "react-dom/client";
import type { Conversation, RequestAllowance } from "../../shared/contracts";
import { LangProvider } from "../../src/i18n";
import { WorkspaceNavigation } from "../../src/WorkspaceNavigation";
import { AccountUsagePage } from "../../src/AccountUsagePage";
import { SupportPanel } from "../../src/SupportPanel";
import { VaultBackup } from "../../src/VaultBackup";
import { VaultSecurity } from "../../src/VaultSecurity";
import { ConversationLibrary } from "../../src/ConversationLibrary";
import { ConversationBranches } from "../../src/ConversationBranches";
import { ContextReview } from "../../src/ContextReview";
import { Answer } from "../../src/Answer";
import { PhotoCapture } from "../../src/PhotoCapture";
import "../../src/styles.css";
import "../../src/chat-design.css";

const allowance: RequestAllowance = {
  state: "active",
  limit: 50,
  used: 8,
  remaining: 42,
  pending: 1,
  uncertain: 2,
  resetsAt: "2026-11-20T00:00:00.000Z",
  meteredRequests: 5,
  promptTokens: 12345,
  completionTokens: 678,
  costUsd: "0.0123",
  unmeteredRequests: 3,
};
const message = (id: string, role: "user" | "assistant", text: string, status = "complete") =>
  ({ id, role, text, status, included: true }) as Conversation["messages"][number];
const conversation: Conversation = {
  id: "c1",
  title: "Synthetic tax question",
  createdAt: "2026-11-13T09:00:00.000Z",
  usage: [],
  draft: "Synthetic draft",
  pinned: true,
  messages: [
    message("m1", "user", "Synthetic question about a deadline"),
    message("m2", "assistant", "", "partial"),
  ],
  attachments: [
    {
      id: "a1",
      name: "synthetic-notice.pdf",
      selected: true,
      sources: [{ id: "s1", title: "Notice", text: "Synthetic passage." }],
    },
  ],
  branches: {
    activeId: "b2",
    activeLabel: "Edit 1",
    archived: [
      {
        id: "b1",
        label: "Original",
        messages: [message("m3", "user", "Older synthetic question", "partial")],
        attachments: [],
        draft: "",
      },
    ],
  },
};
const noop = () => {};
const screens: Record<string, () => React.ReactElement> = {
  nav: () => (
    <WorkspaceNavigation
      open
      collapsed={false}
      onClose={noop}
      onCollapse={noop}
      onExpand={noop}
      conversations={[conversation]}
      projects={[{ id: "p1", name: "Steuern" } as never]}
      unlocked
      busy={false}
      newDisabled={false}
      currentId="c1"
      status={{ csrf: "SYNTHETIC", inference: { ready: false, reason: "OFFLINE" }, search: false, requestAllowance: allowance }}
      onOpen={noop}
      onNew={noop}
      onNewIncognito={noop}
      onNavigate={noop}
      onSettings={noop}
      onSignOut={noop}
      onCreateProject={async () => undefined}
      onEditProject={async () => false}
      onOrganize={noop}
    />
  ),
  usage: () => (
    <AccountUsagePage
      allowance={allowance}
      consumer
      billing={{ csrf: "SYNTHETIC", onNavigate: noop }}
    />
  ),
  support: () => <SupportPanel />,
  vault: () => (
    <>
      <VaultBackup busy={false} canExport onExport={async () => {}} onRestore={async () => {}} />
      <VaultSecurity busy={false} blocked={false} onChange={async () => {}} />
    </>
  ),
  library: () => (
    <>
      <ConversationLibrary conversations={[conversation]} busy={false} onOpen={noop} onDelete={noop} />
      <ConversationBranches conversation={conversation} busy={false} open={noop} />
      <ContextReview
        expanded
        conversation={conversation}
        size={{
          characters: 1500,
          messages: 2,
          breakdown: { instructions: 1200, references: 200, conversation: 85, draft: 15 },
          passageNotes: [],
          includedMessages: 1,
          excludedMessages: 1,
          sourceCount: 1,
        }}
        limit={1000}
        busy={false}
        includeMessage={noop}
        includeAttachment={noop}
      />
    </>
  ),
  answer: () => (
    <Answer
      complete
      text={
        "“An invented quotation.” [notice-01]\n\n```python\nprint(1234)\n```\n\n![Diagramm](https://example.com/x.png)\n\n| A | B |\n| - | - |\n| 1 | 2 |"
      }
      sources={[{ id: "notice-01", title: "Notice", url: "https://example.com/notice", text: "Something else.", page: 2 }]}
      open={noop}
    />
  ),
  photo: () => <PhotoCapture onClose={noop} onUse={noop} />,
};
const screen = new URL(location.href).searchParams.get("screen") ?? "";
createRoot(document.getElementById("root")!).render(
  <LangProvider>{(screens[screen] ?? (() => <p>Unknown screen</p>))()}</LangProvider>,
);
