// The report's card in the chat (docs/report-card-20261125.md): a file-like row that opens the
// report in the side panel, the report's own first paragraph, and its sections as links into it.
import type { Message } from "../../shared/contracts";
import { Icon } from "../Icon";
import { useText } from "../i18n";
import { reportText } from "../text/report";
import { readMinutes, reportSections, reportSummary, reportTitle } from "./report";
import "./report.css";

export function ReportCard(props: { message: Message; question: string; onOpen(section?: number): void }) {
  const t = useText(reportText);
  const { message } = props;
  const writing = message.status !== "complete";
  const title = reportTitle(message.text, props.question);
  const sources = (message.sourceSnapshot ?? []).filter((source) => source.url).length;
  const summary = writing ? "" : reportSummary(message.text);
  const sections = writing ? [] : reportSections(message.text);
  return (
    <div className="report-card-block">
      <button type="button" className="report-card" aria-label={t.open(title)} onClick={() => props.onOpen()}>
        <span className="report-card-icon" aria-hidden="true">
          <Icon name="file" />
        </span>
        <span className="report-card-text">
          <strong>{title}</strong>
          <span className="muted">
            {writing ? t.writing : [t.kind, sources ? t.sources(sources) : "", t.minutes(readMinutes(message.text))].filter(Boolean).join(" · ")}
          </span>
        </span>
        <Icon name="open" />
      </button>
      {summary && <p className="report-card-summary">{summary}</p>}
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
