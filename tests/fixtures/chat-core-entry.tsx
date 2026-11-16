// Chat core component fixes (16 November): the message component in a real page with synthetic
// data, so tests/chat-core-ui.test.ts can check it without the full workspace (?screen=messages).
// Every callback is recorded in window.__log.
import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { emptyConversation, type Conversation, type Message } from "../../shared/contracts";
import { LangProvider } from "../../src/i18n";
import { ChatMessage } from "../../src/ChatMessage";
import "../../src/styles.css";
import "../../src/chat-design.css";

const log = (entry: string) => ((window as unknown as { __log: string[] }).__log ??= []).push(entry);
const noop = () => {};
const at = (hoursAgo: number) => new Date(Date.now() - hoursAgo * 3_600_000).toISOString();
const message = (id: string, role: Message["role"], text: string, status: Message["status"] = "complete"): Message => ({
  id,
  role,
  text,
  status,
  included: status === "complete",
  at: at(0),
});

function Messages() {
  const [editId, setEditId] = useState<string>();
  const [copiedId, setCopiedId] = useState<string>();
  const messages = [
    message("u1", "user", "Synthetic question about a deadline"),
    message("a1", "assistant", "Synthetic **complete** answer."),
    message("a2", "assistant", "Synthetic half an answer", "partial"),
    message("a3", "assistant", "Synthetic arriving text", "partial"),
    message("a4", "assistant", "", "partial"),
  ];
  const conversation: Conversation = { ...emptyConversation(), id: "c1", title: "Synthetic", messages };
  // a1 offers Retry (Fast 1, Thinking 5); a3 and a4 are streaming.
  const streaming = new Set(["a3", "a4"]);
  return (
    <div className="app-shell chat-design">
      <main>
        <section className="chat-view">
          <div className="messages">
            {messages.map((m, index) => (
              <ChatMessage
                key={m.id}
                message={m}
                index={index}
                conversation={conversation}
                sourceHistory={new Map()}
                busy={false}
                ready
                openSource={noop}
                copied={copiedId === m.id}
                onCopy={() => (setCopiedId(m.id), log(`copy:${m.id}`))}
                editing={editId === m.id}
                onEdit={(open) => setEditId(open ? m.id : undefined)}
                onEditSend={(text) => log(`edit:${text}`)}
                editCost={() => 1}
                retry={m.id === "a1" || m.id === "u1" ? { cost: 1, thinkingCost: 5, run: (mode) => log(`retry:${m.id}:${mode ?? "same"}`) } : undefined}
                onRemember={() => log(`remember:${m.id}`)}
                onCanvas={() => log(`canvas:${m.id}`)}
                onReport={() => log(`report:${m.id}`)}
                onResize={noop}
                streaming={streaming.has(m.id)}
              />
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

const screens: Record<string, () => React.ReactElement> = { messages: () => <Messages /> };
const screen = new URL(location.href).searchParams.get("screen") ?? "";
createRoot(document.getElementById("root")!).render(
  <LangProvider>{(screens[screen] ?? (() => <p>Unknown screen</p>))()}</LangProvider>,
);
