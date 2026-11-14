// PDF export through the browser's own print dialog (owner, 14 November 2026): a print-only view
// of one answer or the whole open conversation. On the device only; no PDF library.
// docs/read-aloud-and-pdf-export-20261114.md says what this is and is not.
import { useEffect } from "react";
import { createPortal } from "react-dom";
import type { Message } from "../shared/contracts";
import { Answer } from "./Answer";
import { completenessWarning } from "./arithmetic/completeness";
import { GERMAN_RULES } from "./german-rules";
import { useLang, type Lang } from "./i18n";
import { appText } from "./text/app";
import { arithmeticText } from "./text/arithmetic";
import { deviceText } from "./text/device-features";
import "./print.css";

/** The app's own notices on a message, as the conversation screen shows them above the text. */
function notices(message: Message, lang: Lang): string[] {
  const check = message.arithmeticCheck;
  return [
    message.status === "partial" && deviceText[lang].incomplete,
    message.status === "error" && appText[lang].noAnswer,
    check && check.mismatches > 0 && arithmeticText[lang].mismatch,
    check && (check.ambiguous ?? 0) > 0 && arithmeticText[lang].ambiguous,
    !!message.completenessCheck?.missing.length &&
      completenessWarning(message.completenessCheck.missing, lang),
    message.uncheckedFigures && GERMAN_RULES.warning,
    message.noOfficialSource && GERMAN_RULES.noOfficial,
    message.passagesUsed,
    message.keptOnDevice && `${message.keptOnDevice} ${appText[lang].keptNote}`,
    message.failure && appText[lang].failure(message.failure),
  ].filter((note): note is string => !!note);
}

export interface ExportContent {
  title: string;
  createdAt: string;
  messages: Message[];
}

/** The printed page. It gets only the messages it is given: no account, vault or other conversation. */
export function ExportView({ title, createdAt, messages, now = new Date() }: ExportContent & { now?: Date }) {
  const { lang } = useLang();
  const t = deviceText[lang];
  const date = (value: Date) => value.toLocaleDateString(lang, { dateStyle: "long" });
  return (
    <div className="print-root" lang={lang}>
      <header>
        <p className="print-brand">CometRow</p>
        <h1>{title}</h1>
        <p>{t.conversationFrom(date(new Date(createdAt)))}</p>
      </header>
      {messages.map((message) => (
        <section key={message.id} className={`print-message ${message.role}`}>
          <h2>
            {message.role === "user" ? t.question : t.answer}
            {message.answeredBy ? ` · ${message.answeredBy}` : ""}
          </h2>
          {notices(message, lang).map((note) => (
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
                  <li key={source.id}>
                    {source.title}
                    {source.page ? `, p. ${source.page}` : ""}
                    {source.url ? `: ${source.url}` : ""}
                  </li>
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
