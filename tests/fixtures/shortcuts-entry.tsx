// Keyboard shortcuts checks (tests/shortcuts-ui.test.ts): useShortcuts and ShortcutHelp inside the
// app's design classes, with a message box, a chat search box and a confirmation to open.
// Every action records its name in window.ran; the help toggles like the wiring in App would.
import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { LangProvider } from "../../src/i18n";
import { ConfirmDialog } from "../../src/ConfirmDialog";
import { ShortcutHelp } from "../../src/ShortcutHelp";
import { useShortcuts, type ShortcutId } from "../../src/use-shortcuts";
import "../../src/styles.css";
import "../../src/chat-design.css";

const ran = ((window as unknown as { ran: string[] }).ran = []);
const record = (id: ShortcutId) => () => void ran.push(id);

function Screen() {
  const [help, setHelp] = useState(false);
  const [confirm, setConfirm] = useState(false);
  useShortcuts({
    newChat: record("newChat"),
    search: () => {
      ran.push("search");
      document.querySelector<HTMLInputElement>(".history-search input")?.focus();
    },
    sidebar: record("sidebar"),
    composer: () => {
      ran.push("composer");
      document.getElementById("message-input")?.focus();
    },
    copyAnswer: record("copyAnswer"),
    // Nothing to copy: the key stays the browser's.
    copyCode: () => false,
    help: () => {
      ran.push("help");
      setHelp((open) => !open);
    },
  });
  return (
    <div className="app-shell chat-design">
      <main className="content-view">
        <label className="history-search">
          Search chats
          <input type="search" />
        </label>
        <button type="button" onClick={() => setHelp(true)}>
          Open shortcuts
        </button>
        <button type="button" onClick={() => setConfirm(true)}>
          Open confirmation
        </button>
        <label>
          Message
          <textarea id="message-input" />
        </label>
        {help && <ShortcutHelp onClose={() => setHelp(false)} />}
        {confirm && (
          <ConfirmDialog title="Synthetic question" text="Synthetic text" confirmLabel="Yes" cancelLabel="No" onClose={() => setConfirm(false)} />
        )}
      </main>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <LangProvider>
    <Screen />
  </LangProvider>,
);
