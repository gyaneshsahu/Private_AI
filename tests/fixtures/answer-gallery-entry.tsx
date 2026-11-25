// Answer design (docs/answer-design-20261125.md): the real answers captured from the live model
// (evaluation/answer-design/replies-20261125.json), drawn by the app's own answer renderer, so
// tests/answer-design-ui.test.ts can look at them with the design on and off, in light and dark.
// ?designed=1|0 &theme=light|dark &ids=fact,how-to (all when absent).
import React from "react";
import { createRoot } from "react-dom/client";
import { LangProvider } from "../../src/i18n";
import { Answer } from "../../src/Answer";
import replies from "../../evaluation/answer-design/replies-20261125.json";
import "../../src/styles.css";
import "../../src/chat-design.css";

const params = new URLSearchParams(location.search);
const designed = params.get("designed") !== "0";
const theme = params.get("theme") === "dark" ? "dark" : "light";
const ids = params.get("ids")?.split(",");
const rows = replies.rows.filter((row) => row.answer && (!ids || ids.includes(row.id)));

function Gallery() {
  return (
    <div className="app-shell chat-design" data-theme={theme} style={{ display: "block", minHeight: "100vh", background: "var(--bg)", color: "var(--ink)" }}>
      <main style={{ maxWidth: 800, margin: "0 auto", padding: "20px 16px 60px" }}>
        {rows.map((row) => (
          <section key={row.id} data-answer={row.id} style={{ margin: "0 0 44px" }}>
            <p className="muted" style={{ margin: "0 0 10px", fontSize: 13 }}>
              {row.question}
            </p>
            <article className="message assistant">
              <Answer text={row.answer} sources={[]} open={() => {}} complete designed={designed} />
            </article>
          </section>
        ))}
      </main>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <LangProvider>
    <Gallery />
  </LangProvider>,
);
