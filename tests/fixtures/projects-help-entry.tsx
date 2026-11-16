// Sidebar project rows, the account menu entry for keyboard shortcuts and the Help page
// (tests/projects-help-ui.test.ts), inside the app's design classes with synthetic data.
// Every callback records what the App wiring would do in window.ran.
import React from "react";
import { createRoot } from "react-dom/client";
import type { Conversation } from "../../shared/contracts";
import { LangProvider } from "../../src/i18n";
import { WorkspaceNavigation } from "../../src/WorkspaceNavigation";
import { SupportPanel } from "../../src/SupportPanel";
import "../../src/styles.css";
import "../../src/chat-design.css";

const ran: string[] = [];
(window as unknown as { ran: string[] }).ran = ran;
const record = (what: string) => () => void ran.push(what);
const noop = () => {};
const chat = (id: string, title: string, projectId?: string): Conversation =>
  ({ id, title, createdAt: "2026-11-16T09:00:00.000Z", usage: [], messages: [], attachments: [], projectId }) as never;
// A long name, so the "…" has to hold its place beside an ellipsis.
const project = { id: "p1", name: "Steuererklärung und Nebenkostenabrechnung 2026 für die Wohnung" };

const screens: Record<string, () => React.ReactElement> = {
  nav: () => (
    <WorkspaceNavigation
      open
      collapsed={false}
      onClose={noop}
      onCollapse={noop}
      onExpand={noop}
      conversations={[chat("c1", "Synthetic first chat", "p1"), chat("c2", "Synthetic second chat", "p1"), chat("c3", "Synthetic other chat")]}
      projects={[project as never, { id: "p2", name: "Kurz" } as never]}
      unlocked
      busy={false}
      newDisabled={false}
      currentId=""
      status={{ csrf: "SYNTHETIC", inference: { ready: false, reason: "OFFLINE" }, search: false }}
      onOpen={noop}
      onNew={noop}
      onNewIncognito={noop}
      onNavigate={noop}
      onSettings={noop}
      onSignOut={noop}
      onCreateProject={async () => {
        ran.push("create");
        return "p2";
      }}
      onEditProject={async (id, name) => {
        ran.push(`edit:${id}:${name ?? ""}`);
        return true;
      }}
      onOpenProject={(id) => void ran.push(`open:${id}`)}
      onDeleteProject={async (id, chats) => {
        ran.push(`delete:${id}:${chats}`);
        return true;
      }}
      onShortcuts={record("shortcuts")}
      onOrganize={noop}
    />
  ),
  help: () => <SupportPanel onDocument={(id) => void ran.push(id)} onShortcuts={record("shortcuts")} />,
  // As in the account pages: no links, and no contact line while the mailbox is not named.
  "help-plain": () => <SupportPanel supportAddress="not yet named" />,
};
const screen = new URL(location.href).searchParams.get("screen") ?? "";
createRoot(document.getElementById("root")!).render(
  <LangProvider>
    <div className="app-shell chat-design">{(screens[screen] ?? (() => <p>Unknown screen</p>))()}</div>
  </LangProvider>,
);
