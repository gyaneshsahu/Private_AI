// Outputs panel checks (tests/outputs-panel-ui.test.ts): the panel alone, with a synthetic chat.
// ?empty gives a new chat, ?theme=dark the dark tokens. Callback calls go to window.outputsCalls.
// The panel's place on the page comes from the app's own .side-panel rules (side-open side-outputs, as in the app).
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { emptyConversation, type Conversation, type Message } from "../../shared/contracts";
import type { Board } from "../../shared/whiteboard";
import { LangProvider } from "../../src/i18n";
import { OutputsPanel } from "../../src/OutputsPanel";
import "../../src/styles.css";
import "../../src/chat-design.css";

const PNG = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
const query = new URLSearchParams(location.search);
const calls: string[] = ((window as unknown as { outputsCalls: string[] }).outputsCalls = []);
const record = (name: string) => () => calls.push(name);

const board: Board = {
  items: [
    { id: "b1", kind: "box", colour: 1, x: 10, y: 10, w: 300, h: 200 },
    { id: "a1", kind: "arrow", colour: 0, x1: 320, y1: 100, x2: 600, y2: 100 },
    { id: "n1", kind: "note", x: 620, y: 60, text: "Synthetic note" },
  ],
  changedAt: "2026-11-17T13:05:00.000Z",
};
const created = (id: string, prompt: string, at: string): Message => ({
  id,
  role: "assistant",
  text: `[Created image: ${prompt}]`,
  status: "complete",
  included: true,
  at,
  createdImage: { type: "image/png", data: PNG, model: "synthetic", prompt },
});
const full: Conversation = {
  ...emptyConversation(),
  title: "Synthetic trip plan",
  board,
  canvas: { text: "# Synthetic packing list\n\n- Tent\n- Stove" },
  messages: [
    { id: "q1", role: "user", text: "Draw a fox", status: "complete", included: true },
    created("img-old", "A red fox sleeping in fresh snow under pine trees", "2026-11-17T09:00:00.000Z"),
    created("img-new", "A lighthouse at dusk with a long, winding coastal path and gulls overhead", "2026-11-17T12:30:00.000Z"),
  ],
  attachments: [
    { id: "doc1", name: "synthetic-itinerary.pdf", sources: [], selected: true, kind: "document" },
    { id: "res1", name: "Search: synthetic weather", sources: [], selected: true, kind: "research" },
  ],
};

// StrictMode as in src/main.tsx: its second mount is what breaks a blob URL made in useMemo.
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <LangProvider>
      <div className="app-shell chat-design side-open side-outputs" data-theme={query.get("theme") ?? undefined} style={{ minHeight: "100vh", background: "var(--bg)" }}>
        <main className="main-panel" style={{ padding: 24 }}>
          <p>Synthetic chat behind the panel.</p>
        </main>
        <OutputsPanel
          conversation={query.has("empty") ? emptyConversation() : full}
          onOpenBoard={record("openBoard")}
          onDownloadBoard={record("downloadBoard")}
          onOpenCanvas={record("openCanvas")}
          onShowMessage={(id) => calls.push(`show:${id}`)}
          onOpenFiles={record("openFiles")}
          onClose={record("close")}
        />
      </div>
    </LangProvider>
  </StrictMode>,
);
