// Read aloud and PDF export in a real page (tests/device-features-ui.test.ts): one answer with the
// two buttons inside a stand-in for the app's chrome, and a long synthetic conversation to export.
import React from "react";
import { createRoot } from "react-dom/client";
import type { Conversation, Message } from "../../shared/contracts";
import { Answer } from "../../src/Answer";
import { LangProvider } from "../../src/i18n";
import { PdfExportButton } from "../../src/PdfExportButton";
import { ReadAloudButton } from "../../src/ReadAloudButton";
import { spokenText } from "../../src/read-aloud";
import { deviceText } from "../../src/text/device-features";
import "../../src/styles.css";
import "../../src/chat-design.css";

const german = new URLSearchParams(location.search).get("answer") === "de";
const sources = [{ id: "src-000001", title: "Example page", text: "Body", url: "https://www.example.org/rules" }];
const answer = german
  ? "## Ergebnis\n\nDie Gebühr ist **nicht** hoch und wird mit der Rechnung für das Jahr fällig [src-000001].\n\n| Posten | Betrag |\n| --- | --- |\n| Gebühr | 3,50 Euro |\n\n```js\nconst geheim = 1;\n```\n\nEs gilt $$x^2$$ und das ist einfach. Mehr unter https://example.de/seite?a=1. Konto {{IBAN-1}}.\n\n- Erster Punkt\n- Zweiter Punkt"
  : `## Result\n\nThe fee is **not** high and it is due with the invoice for the year [src-000001].\n\n| Item | Amount | ${"Very long column heading ".repeat(3)} |\n| --- | --- | --- |\n| Fee | 3.50 euros | ${"averyveryverylongwordwithoutanybreak".repeat(6)} |\n\n\`\`\`js\nconst secret = "${"x".repeat(400)}";\n\`\`\`\n\nWe get $$x^2$$ and that is simple. More at [the page](https://example.org/page?a=1). Account {{IBAN-1}}.\n\n- First item\n- Second item`;

const message = (id: string, role: Message["role"], text: string, extra: Partial<Message> = {}): Message => ({
  id,
  role,
  text,
  status: "complete",
  included: true,
  ...extra,
});
const conversation: Conversation = {
  id: "c1",
  title: "Synthetic fees",
  createdAt: "2026-11-03T10:00:00.000Z",
  usage: [],
  attachments: [],
  messages: Array.from({ length: 12 }, (_, pair) => [
    message(`q${pair}`, "user", `Synthetic question ${pair + 1}?`),
    message(`a${pair}`, "assistant", `${answer}\n\n${"A further synthetic paragraph of plain text. ".repeat(25)}`, {
      answeredBy: "Auto · Thinking",
      uncheckedFigures: true,
      sourceSnapshot: sources,
    }),
  ]).flat(),
};

// The whole text the reader is given for the answer on the page, before it is cut into pieces.
Object.assign(window, {
  spokenFor: (lang: "de" | "en") => spokenText(document.querySelector(".message-text")!, deviceText[lang]),
});

createRoot(document.getElementById("root")!).render(
  <LangProvider>
    <div className="chat-design" data-theme="dark" style={{ background: "#111", color: "#eee" }}>
      <header id="chrome">App chrome</header>
      <article className="message assistant">
        <Answer text={answer} complete sources={sources} open={() => {}} />
        <div className="message-actions">
          <ReadAloudButton id="m1" disabled={false} />
          <PdfExportButton conversation={conversation} disabled={false} />
        </div>
      </article>
      <textarea id="composer" defaultValue="Composer" />
    </div>
  </LangProvider>,
);
