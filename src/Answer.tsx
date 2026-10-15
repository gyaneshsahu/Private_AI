import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import type { Source } from "../shared/contracts";
import { displayMath, sourceCitations } from "./answer-format";
import { auditResearchAnswer } from "./research-audit";

export function Answer({
  text,
  sources,
  open,
}: {
  text: string;
  sources: Source[];
  open: (source: Source) => void;
}) {
  const audit = sources.some((source) => source.url)
    ? auditResearchAnswer(text, sources)
    : undefined;
  return (
    <div className="message-text">
      {audit &&
        (audit.unknownSourceReferences > 0 ||
          audit.unsupportedLineReferences > 0 ||
          audit.quotesNotFoundVerbatim > 0 ||
          audit.quotesNotFoundInCitedSources > 0) && (
          <p className="muted">
            Evidence needs review: {audit.unknownSourceReferences} unknown
            source references, {audit.unsupportedLineReferences} unverified line
            references, {audit.quotesNotFoundVerbatim} quoted passages not
            matched verbatim to selected sources.
            {audit.quotesNotFoundInCitedSources > 0 &&
              ` ${audit.quotesNotFoundInCitedSources} quoted passages not found in their adjacent cited sources.`}
            These checks do not establish factual accuracy.
          </p>
        )}
      <Markdown
        remarkPlugins={[
          remarkGfm,
          [remarkMath, { singleDollarTextMath: false }],
          sourceCitations,
        ]}
        rehypePlugins={[
          [
            rehypeKatex,
            { trust: false, strict: "error", maxExpand: 100, maxSize: 20 },
          ],
        ]}
        components={{
          a: ({ href, children }) => {
            const citedPage =
              typeof children === "string"
                ? Number(
                    /,\s*(?:page|p\.)\s*([1-9]\d{0,3})[\]】]$/i.exec(
                      children,
                    )?.[1],
                  ) || undefined
                : undefined;
            const source = href?.startsWith("#source-")
              ? sources.find((item) => item.id === href.slice(8))
              : undefined;
            return source ? (
              <button className="citation" onClick={() => open(source)}>
                {source.title}
                {source.page ? ` · p${source.page}` : ""}
                {citedPage && citedPage !== source.page
                  ? ` · cited p${citedPage}`
                  : ""}
                {typeof children === "string" && /†L\d/i.test(children)
                  ? " · line reference unverified"
                  : ""}
              </button>
            ) : (
              <span>
                {children}
                {href && !href.startsWith("#source-") && children !== href
                  ? ` (${href})`
                  : ""}
              </span>
            );
          },
          img: ({ alt }) => (
            <span className="muted">
              [Image omitted{alt ? `: ${alt}` : ""}]
            </span>
          ),
          table: ({ children }) => (
            <div
              className="answer-table"
              tabIndex={0}
              role="region"
              aria-label="Answer table"
            >
              <table>{children}</table>
            </div>
          ),
        }}
      >
        {displayMath(text)}
      </Markdown>
    </div>
  );
}
