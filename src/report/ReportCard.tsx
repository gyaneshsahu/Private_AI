// The report in the chat (docs/report-card-20261125.md): a document card. Its head carries the
// title, Download and Open; under it the beginning of the report itself is shown and fades out,
// so the chat shows what the report is without holding all of it. Open (or a click on the
// preview) puts the whole report into the side panel. Under the card: its sections as links.
import { lazy, Suspense } from "react";
import type { Message } from "../../shared/contracts";
import { Icon } from "../Icon";
import { useText } from "../i18n";
import { reportText } from "../text/report";
import { downloadReport, readMinutes, reportPreview, reportSections, reportTitle } from "./report";
import "./report.css";

const Answer = lazy(() => import("../Answer").then((m) => ({ default: m.Answer })));

export function ReportCard(props: { message: Message; question: string; onOpen(section?: number): void }) {
  const t = useText(reportText);
  const { message } = props;
  const writing = message.status !== "complete";
  const title = reportTitle(message.text, props.question);
  const sources = (message.sourceSnapshot ?? []).filter((source) => source.url).length;
  const sections = writing ? [] : reportSections(message.text);
  const preview = reportPreview(message.text);
  return (
    <div className="report-card-block">
      <p className="muted report-card-meta" role={writing ? "status" : undefined}>
        {writing ? t.writing : [t.kind, sources ? t.sources(sources) : "", t.minutes(readMinutes(message.text))].filter(Boolean).join(" · ")}
      </p>
      <div className="report-preview">
        <header>
          <span className="report-preview-icon" aria-hidden="true">
            <Icon name="file" />
          </span>
          <strong>{title}</strong>
          {!writing && (
            <button type="button" aria-label={t.downloadReport} title={t.downloadReport} onClick={() => downloadReport(title, message.text)}>
              <Icon name="download" />
            </button>
          )}
          <button type="button" className="report-card" aria-label={t.open(title)} title={t.openShort} onClick={() => props.onOpen()}>
            <Icon name="open" />
          </button>
        </header>
        {preview && (
          // The preview is a picture of the report's beginning: nothing in it takes focus or a click of its own.
          <div className="report-preview-body" onClick={() => props.onOpen()}>
            <div inert>
              <Suspense fallback={<div className="message-text">{preview}</div>}>
                <Answer text={preview} complete={!writing} sources={message.sourceSnapshot ?? []} open={() => {}} />
              </Suspense>
            </div>
          </div>
        )}
      </div>
      {sections.length > 1 && (
        <nav className="report-card-sections" aria-label={t.inReport}>
          <span className="muted">{t.inReport}</span>
          <ol>
            {sections.map((name, index) => (
              <li key={`${index}-${name}`}>
                <button type="button" aria-label={t.section(name)} onClick={() => props.onOpen(index)}>
                  {name}
                </button>
              </li>
            ))}
          </ol>
        </nav>
      )}
    </div>
  );
}
