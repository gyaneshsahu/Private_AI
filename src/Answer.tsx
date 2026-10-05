import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import type { Source } from "../shared/contracts";
import { displayMath, sourceCitations } from "./answer-format";

export function Answer({
  text,
  sources,
  open,
}: {
  text: string;
  sources: Source[];
  open: (source: Source) => void;
}) {
  return (
    <div className="message-text">
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
