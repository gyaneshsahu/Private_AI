// Saved list checks (tests/saved-list-ui.test.ts): the sidebar alone with synthetic saved chats
// of known dates (?screen=nav) or none (?screen=empty). Pin and archive change local state.
import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import type { Conversation } from "../../shared/contracts";
import { LangProvider } from "../../src/i18n";
import { WorkspaceNavigation } from "../../src/WorkspaceNavigation";
import "../../src/styles.css";
import "../../src/chat-design.css";

// The test fixes the clock at Saturday 14 November 2026, 12:00 local time.
const chat = (id: string, title: string, day: number, more: Partial<Conversation> = {}) =>
  ({
    id,
    title,
    createdAt: new Date(2026, 10, day, 9).toISOString(),
    usage: [],
    messages: [],
    attachments: [],
    ...more,
  }) as Conversation;
const chats = [
  chat("c1", "Synthetic chat from today", 14),
  chat("c2", "Synthetic chat from yesterday", 13),
  chat("c3", "Synthetic chat from Tuesday", 10),
  chat("c4", "Synthetic chat from October", -20),
  chat("c5", "Synthetic pinned chat with a long title that has to wrap inside the narrow list", 2, {
    pinned: true,
  }),
];
const noop = () => {};

function Sidebar({ initial }: { initial: Conversation[] }) {
  const [saved, setSaved] = useState(initial);
  return (
    <div className="app-shell chat-design">
      <WorkspaceNavigation
        open
        collapsed={false}
        onClose={noop}
        onCollapse={noop}
        onExpand={noop}
        conversations={saved}
        projects={[]}
        unlocked
        busy={false}
        newDisabled={false}
        currentId="c1"
        onOpen={noop}
        onNew={() => {
          document.title = "new chat";
        }}
        onNewIncognito={noop}
        onNavigate={(tab) => {
          document.title = `opened ${tab}`;
        }}
        onSettings={noop}
        onSignOut={noop}
        onCreateProject={async () => undefined}
        onEditProject={async () => false}
        onOrganize={(c, change) =>
          setSaved((all) => all.map((item) => (item.id === c.id ? { ...item, ...change } : item)))
        }
      />
    </div>
  );
}

const screen = new URL(location.href).searchParams.get("screen");
createRoot(document.getElementById("root")!).render(
  <LangProvider>
    <Sidebar initial={screen === "empty" ? [] : chats} />
  </LangProvider>,
);
