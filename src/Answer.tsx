import Markdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import type { Source } from "../shared/contracts";
import { displayMath, sourceCitations } from "./answer-format";
import { auditResearchAnswer } from "./research-audit";
import { isValidElement, useMemo, useRef, useState, type ReactNode } from "react";
import { answerStructure, tableText } from "./answer/structure";
import { answerDesignEnabled } from "./device-features";
import "./answer/design.css";
import { CodeBlock } from "./CodeBlock";
import { AnswerChart, parseChart } from "./AnswerChart";
import { useText } from "./i18n";
import { answerText } from "./text/conversation-ui";

/** A check-list line the reader can tick (answer design). Kept while the answer is on screen, not saved. */
function Tick({ checked, label }: { checked: boolean; label: string }) {
  const [on, setOn] = useState(checked);
  return <input type="checkbox" checked={on} aria-label={label} onChange={(event) => setOn(event.target.checked)} />;
}
/** A table with "Copy table" over it (answer design): tab-separated, so it pastes into a spreadsheet as cells. */
function DesignedTable({ children, label, copy, copied }: { children: ReactNode; label: string; copy: string; copied: string }) {
  const region = useRef<HTMLDivElement>(null);
  const [done, setDone] = useState(false);
  return (
    <div className="answer-table-block">
      <button
        type="button"
        className="answer-table-copy"
        onClick={() => {
          const table = region.current?.querySelector("table");
          if (table) void navigator.clipboard.writeText(tableText(table)).then(() => (setDone(true), setTimeout(() => setDone(false), 1600)), () => {});
        }}
      >
        {done ? copied : copy}
      </button>
      <div className="answer-table" tabIndex={0} role="region" aria-label={label} ref={region}>
        <table>{children}</table>
      </div>
    </div>
  );
}

export function Answer({
  text,
  sources,
  open,
  complete = false,
  designed = answerDesignEnabled(),
}: {
  text: string;
  sources: Source[];
  open: (source: Source) => void;
  complete?: boolean;
  /** Answer design (docs/answer-design-20261125.md); the print view passes false and stays as it was. */
  designed?: boolean;
}) {
  const t = useText(answerText);
  // One set of components for the life of the answer: components defined inline are new types on every
  // render, so React rebuilt every code block each time (a "Copied" state, keyboard focus and a text
  // selection in the code were lost). Sources and the opener are read when used.
  const live = useRef({ sources, open });
  live.current = { sources, open };
  const components = useMemo(
    (): Components => ({
      pre: ({ children }) => {
        const code = isValidElement<{
          children?: ReactNode;
          className?: string;
        }>(children)
          ? children.props
          : undefined;
        const text = typeof code?.children === "string" ? code.children : "";
        const language =
          /^language-([\w+#.-]{1,32})$/.exec(code?.className ?? "")?.[1] ?? "";
        // A finished ```chart block with valid numbers is drawn; anything else stays code.
        const chart =
          language === "chart" && complete ? parseChart(text) : undefined;
        if (chart) return <AnswerChart chart={chart} />;
        return (
          <CodeBlock text={text} language={language} complete={complete}>
            {children}
          </CodeBlock>
        );
      },
      a: ({ href, children }) => {
        const { sources, open } = live.current;
        const citedPage =
          typeof children === "string"
            ? Number(
                /,\s*(?:page|p\.)\s*([1-9]\d{0,3})[\]】]$/i.exec(children)?.[1],
              ) || undefined
            : undefined;
        const code = href?.startsWith("#source-")
          ? href.slice(8).toLowerCase()
          : undefined;
        const source =
          code !== undefined
            ? sources.find((item) => item.id.toLowerCase() === code)
            : undefined;
        // A code that names no source (a shortened or invented id) is dropped from
        // the text; the evidence notice above still counts it. Codes without a
        // digit stay, since they are more likely placeholders such as [recipient].
        if (code && !source && sources.length && /\d/.test(code)) return null;
        const host = source?.url
          ? new URL(source.url).hostname.replace(/^www\./, "")
          : undefined;
        return source ? (
          <button
            className="citation"
            onClick={() => open(source)}
            title={host && source.title}
            aria-label={host && `${host}: ${source.title}`}
          >
            {host ?? source.title}
            {source.page ? t.page(source.page) : ""}
            {citedPage && citedPage !== source.page
              ? t.citedPage(citedPage)
              : ""}
            {typeof children === "string" && /†L\d/i.test(children)
              ? t.lineUnverified
              : ""}
          </button>
        ) : (
          <span>
            {children}
            {href &&
            !href.startsWith("#source-") &&
            children !== href &&
            `mailto:${children}` !== href
              ? ` (${href})`
              : ""}
          </span>
        );
      },
      img: ({ alt }) => (
        <span className="muted">{t.imageOmitted(alt ?? "")}</span>
      ),
      table: ({ children }) =>
        designed ? (
          <DesignedTable label={t.table} copy={t.copyTable} copied={t.tableCopied}>
            {children}
          </DesignedTable>
        ) : (
        <div
          className="answer-table"
          tabIndex={0}
          role="region"
          aria-label={t.table}
        >
          <table>{children}</table>
        </div>
      ),
      ...(designed
        ? {
            input: ({ type, checked }: { type?: string; checked?: boolean }) => (type === "checkbox" ? <Tick checked={!!checked} label={t.tick} /> : null),
          }
        : {}),
    }),
    [complete, t, designed],
  );
  const audit = sources.some((source) => source.url)
    ? auditResearchAnswer(text, sources)
    : undefined;
  return (
    <div className={designed ? "message-text designed" : "message-text"}>
      {audit &&
        (audit.unknownSourceReferences > 0 ||
          audit.unsupportedLineReferences > 0 ||
          audit.quotesNotFoundVerbatim > 0 ||
          audit.quotesNotFoundInCitedSources > 0) && (
          <p className="muted">
            {t.evidence(
              audit.unknownSourceReferences,
              audit.unsupportedLineReferences,
              audit.quotesNotFoundVerbatim,
              audit.quotesNotFoundInCitedSources,
            )}
          </p>
        )}
      <Markdown
        remarkPlugins={[
          remarkGfm,
          [remarkMath, { singleDollarTextMath: false }],
          sourceCitations,
          ...(designed ? [answerStructure] : []),
        ]}
        rehypePlugins={[
          [
            rehypeKatex,
            { trust: false, strict: "error", maxExpand: 100, maxSize: 20 },
          ],
        ]}
        components={components}
      >
        {displayMath(text)}
      </Markdown>
    </div>
  );
}
