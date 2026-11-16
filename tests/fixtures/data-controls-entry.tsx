// Data controls checks (tests/account-pages-ui.test.ts): DataControls with synthetic chats, inside
// the app's design classes, and the usage page with chat not ready. ?fail makes delete-all fail.
import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import type { Conversation } from "../../shared/contracts";
import { LangProvider } from "../../src/i18n";
import { DataControls } from "../../src/DataControls";
import { AccountUsagePage } from "../../src/AccountUsagePage";
import "../../src/styles.css";
import "../../src/chat-design.css";

const chat = (id: string, title: string, incognito = false): Conversation => ({
  id,
  title,
  createdAt: `2026-11-1${id.length}T09:00:00.000Z`,
  usage: [],
  attachments: [],
  ...(incognito ? { incognito: true } : {}),
  messages: [
    { id: `${id}-q`, role: "user", text: `Synthetic question ${id}`, status: "complete", included: true },
    { id: `${id}-a`, role: "assistant", text: `Synthetic answer ${id}`, status: "complete", included: true },
  ] as Conversation["messages"],
});

function Screen() {
  const [chats, setChats] = useState([chat("c1", "Synthetic tax question"), chat("c22", "Synthetic trip"), chat("c333", "Incognito", true)]);
  const fail = new URLSearchParams(location.search).has("fail");
  return (
    <div className="app-shell chat-design">
      <main className="content-view">
        <DataControls
          conversations={chats}
          onDeleteAll={async () => {
            (window as unknown as { deleteCalls: number }).deleteCalls = ((window as unknown as { deleteCalls?: number }).deleteCalls ?? 0) + 1;
            if (fail) throw Error("synthetic failure");
            setChats([]);
          }}
        />
        <AccountUsagePage chatReady={false} />
      </main>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <LangProvider>
    <Screen />
  </LangProvider>,
);
