// Keyboard shortcuts checks (tests/shortcuts-ui.test.ts): useShortcuts and ShortcutHelp inside the
// app's design classes, with a message box, a confirmation to open and, like WorkspaceNavigation on
// phones, a sidebar drawer (a modal dialog opened in an effect) holding the chat search box.
// Every action records its name in window.ran; search, sidebar and help do what the App wiring would.
import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { LangProvider } from "../../src/i18n";
import { ConfirmDialog } from "../../src/ConfirmDialog";
import { ShortcutHelp } from "../../src/ShortcutHelp";
import { useShortcuts, type ShortcutId } from "../../src/use-shortcuts";
import "../../src/styles.css";
import "../../src/chat-design.css";

const ran: string[] = [];
(window as unknown as { ran: string[] }).ran = ran;
const record = (id: ShortcutId) => () => void ran.push(id);
const searchBox = () => document.querySelector<HTMLInputElement>(".history-search input");

function Drawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (open) dialog.current?.showModal();
    else dialog.current?.close();
  }, [open]);
  return (
    <dialog
      ref={dialog}
      className="navigation-drawer"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <button type="button" onClick={onClose}>
        Close navigation
      </button>
      <label className="history-search">
        Search chats
        <input type="search" />
      </label>
    </dialog>
  );
}

function Screen() {
  const [help, setHelp] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [drawer, setDrawer] = useState(false);
  useShortcuts({
    newChat: record("newChat"),
    search: () => {
      ran.push("search");
      if (searchBox()?.checkVisibility()) return searchBox()!.focus();
      setDrawer(true);
      requestAnimationFrame(() => searchBox()?.focus());
    },
    sidebar: () => {
      ran.push("sidebar");
      setDrawer((open) => !open);
    },
    composer: () => {
      ran.push("composer");
      setDrawer(false);
      requestAnimationFrame(() => document.getElementById("message-input")?.focus());
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
      <Drawer open={drawer} onClose={() => setDrawer(false)} />
      <main className="content-view">
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
