// The Memory screen and the project screen on their own, with ?storage=local|secure|max
// (tests/storage-copy-ui.test.ts). ?view=project shows the project screen. Nothing is saved or sent.
import React from "react";
import { createRoot } from "react-dom/client";
import { LangProvider } from "../../src/i18n";
import { holdMemories } from "../../src/memory";
import { MemorySettings } from "../../src/MemorySettings";
import { ProjectPanel } from "../../src/ProjectPanel";
import type { Storage } from "../../src/text/mode-copy";
import type { Vault } from "../../src/vault";
import "../../src/styles.css";
import "../../src/chat-design.css";

const params = new URLSearchParams(location.search);
const storage = (params.get("storage") ?? "local") as Storage;
const at = new Date(0).toISOString();
holdMemories([
  { id: "00000000-0000-4000-8000-000000000001", text: "I am vegetarian.", at },
  { id: "00000000-0000-4000-8000-000000000002", text: "I live in Leipzig.", at, pinned: true },
]);

function Page() {
  if (params.get("view") === "project")
    return (
      <ProjectPanel
        vault={{} as Vault}
        storage={storage}
        project={{ id: "00000000-0000-4000-8000-0000000000aa", name: "Tenancy", instructions: "Answer briefly." }}
        chats={[]}
        busy={false}
        onClose={() => {}}
        onNewChat={() => {}}
        onOpenChat={() => {}}
        onRename={async () => true}
        onRenameChat={() => {}}
        onDelete={async () => false}
        onChange={async () => {}}
      />
    );
  return (
    <div className="chat-design" style={{ padding: 16 }}>
      <MemorySettings vault={null} unlocked storage={storage} />
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <LangProvider>
    <Page />
  </LangProvider>,
);
