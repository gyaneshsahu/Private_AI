// The report in the side panel (docs/report-card-20261125.md): the whole text as the chat would
// draw it, with its source buttons working, and what one does with a document: edit it in the
// canvas, copy it, download it, share it.
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import type { Message, Source } from "../../shared/contracts";
import { Icon } from "../Icon";
import { useText } from "../i18n";
import { reportText } from "../text/report";
import { downloadReport, reportSections, reportTitle } from "./report";
import "./report.css";

const Answer = lazy(() => import("../Answer").then((m) => ({ default: m.Answer })));

export function ReportPanel(props: {
  message: Message;
  question: string;
  /** The section to bring into view (an index into the report's sections); `at` changes with every request. */
  section?: { index: number; at: number };
  openSource(source: Source): void;
  /** Absent when the canvas is switched off or the report is too long for it. */
  onEdit?(): void;
  onShare?(): void;
  onClose(): void;
}) {
  const t = useText(reportText);
  const { message } = props;
  const body = useRef<HTMLDivElement>(null);
  const [note, setNote] = useState("");
  const title = reportTitle(message.text, props.question);
  const complete = message.status === "complete";
  useEffect(() => {
    if (!props.section) return;
    // The same headings the card listed, found again in the drawn report.
    const wanted = reportSections(message.text)[props.section.index];
    const heading = [...(body.current?.querySelectorAll("h1, h2") ?? [])].find((h) => h.textContent?.replace(/\s+/g, " ").trim() === wanted);
    heading?.scrollIntoView({ block: "start" });
  }, [props.section?.at, complete]);
  async function copy() {
    try {
      await navigator.clipboard.writeText(message.text);
      setNote(t.copied);
    } catch {
      setNote(t.copyFailed);
    }
  }
  return (
    <aside className="side-panel report-panel" aria-label={t.panel}>
      <header>
        <div>
          <span className="muted">{complete ? t.kind : t.writing}</span>
          <h2>{title}</h2>
        </div>
        <button type="button" className="icon-button" aria-label={t.close} title={t.close} onClick={props.onClose}>
          <Icon name="close" />
        </button>
      </header>
      {complete && (
        <div className="report-actions">
          {props.onEdit && (
            <button type="button" className="primary" onClick={props.onEdit}>
              <Icon name="edit" />
              {t.edit}
            </button>
          )}
          <button type="button" onClick={() => void copy()}>
            <Icon name="copy" />
            {t.copy}
          </button>
          <button type="button" onClick={() => downloadReport(title, message.text)}>
            <Icon name="download" />
            {t.download}
          </button>
          {props.onShare && (
            <button type="button" onClick={props.onShare}>
              <Icon name="share" />
              {t.share}
            </button>
          )}
          <span role="status" className="muted">
            {note}
          </span>
        </div>
      )}
      <div className="report-body" ref={body} tabIndex={0}>
        <Suspense fallback={<div className="message-text">{message.text}</div>}>
          <Answer text={message.text} complete={complete} sources={message.sourceSnapshot ?? []} open={props.openSource} />
        </Suspense>
        {message.passagesUsed && <p className="muted report-note">{message.passagesUsed}</p>}
      </div>
    </aside>
  );
}
