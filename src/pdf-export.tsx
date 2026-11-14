// PDF export through the browser's own print dialog (owner, 14 November 2026): a print-only view
// of one answer or the whole open conversation. On the device only; no PDF library.
// docs/read-aloud-and-pdf-export-20261114.md says what this is and is not.
import { useEffect } from "react";
import { createPortal } from "react-dom";
import { Answer } from "./Answer";
import {
  exportDate,
  messageHeading,
  messageNotices,
  sourceLine,
  type ExportContent,
} from "./conversation-text";
import { useLang } from "./i18n";
import { deviceText } from "./text/device-features";
import "./print.css";

export type { ExportContent };

/** The printed page. It gets only the messages it is given: no account, vault or other conversation. */
export function ExportView({ title, createdAt, messages, now = new Date() }: ExportContent & { now?: Date }) {
  const { lang } = useLang();
  const t = deviceText[lang];
  const date = (value: Date) => exportDate(value, lang);
  return (
    <div className="print-root" lang={lang}>
      <header>
        <p className="print-brand">CometRow</p>
        <h1>{title}</h1>
        <p>{t.conversationFrom(date(new Date(createdAt)))}</p>
      </header>
      {messages.map((message) => (
        <section key={message.id} className={`print-message ${message.role}`}>
          <h2>{messageHeading(message, lang)}</h2>
          {messageNotices(message, lang).map((note) => (
            <p key={note} className="print-notice">
              {note}
            </p>
          ))}
          <Answer
            text={message.text}
            complete
            sources={message.sourceSnapshot ?? []}
            open={() => {}}
          />
          {!!message.sourceSnapshot?.length && (
            <div className="print-sources">
              <h3>{t.sources}</h3>
              <ol>
                {message.sourceSnapshot.map((source) => (
                  <li key={source.id}>{sourceLine(source)}</li>
                ))}
              </ol>
            </div>
          )}
        </section>
      ))}
      <footer>{t.footer(date(now))}</footer>
    </div>
  );
}

/** Mounts the view beside the app, opens the print dialog once, and reports when it closes. */
export default function PdfExport({ done, ...content }: ExportContent & { done: () => void }) {
  useEffect(() => {
    let live = true;
    const root = document.documentElement;
    root.classList.add("exporting-pdf");
    addEventListener("afterprint", done);
    // Wait for the math fonts, or formulas print with the wrong glyph widths.
    void document.fonts.ready.then(() => live && print());
    return () => {
      live = false;
      removeEventListener("afterprint", done);
      root.classList.remove("exporting-pdf");
    };
    // Once per mount: `done` is a new function on every render of the button.
  }, []);
  return createPortal(<ExportView {...content} />, document.body);
}
