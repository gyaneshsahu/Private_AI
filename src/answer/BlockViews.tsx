// Answer blocks (docs/answer-blocks-20261126.md), drawn from the data in src/answer/blocks.ts:
// steps as cards on one line down the page, a diagram (a flow of boxes and arrows, or layers of
// parts), questions whose answers open on a tap, and tabs that show one case at a time. One
// accent colour and the theme's neutrals: structure is carried by shape and position, not colour.
import { useId, useState } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useText } from "../i18n";
import { answerBlocksText } from "../text/answer-blocks";
import { flowLayout, type DiagramData, type ExploreData, type FlowData, type LayersData, type QuizData, type StepsData } from "./blocks";
import "./blocks.css";

export function StepsBlock({ data }: { data: StepsData }) {
  return (
    <ol className="answer-steps">
      {data.items.map((item, index) => (
        <li key={index}>
          <span className="answer-step-number" aria-hidden="true">
            {index + 1}
          </span>
          <div>
            {item.tag && <span className="answer-step-tag">{item.tag}</span>}
            <strong>{item.title}</strong>
            {item.text && <p>{item.text}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}

export function QuizBlock({ data }: { data: QuizData }) {
  const t = useText(answerBlocksText);
  return (
    <ol className="answer-quiz" aria-label={t.quiz}>
      {data.items.map((item, index) => (
        <li key={index}>
          <p>{item.q}</p>
          <details>
            <summary>{t.showAnswer}</summary>
            <p>{item.a}</p>
          </details>
        </li>
      ))}
    </ol>
  );
}

/** A label on at most two lines of about 20 characters. */
function twoLines(label: string): string[] {
  if (label.length <= 20) return [label];
  const cut = label.lastIndexOf(" ", 20);
  const first = cut > 6 ? label.slice(0, cut) : label.slice(0, 20);
  const rest = label.slice(first.length).trim();
  return [first, rest.length > 22 ? `${rest.slice(0, 21)}…` : rest];
}

function Flow({ data }: { data: FlowData }) {
  const t = useText(answerBlocksText);
  const marker = useId();
  const { rows, back } = flowLayout(data);
  const W = 196;
  const H = 96;
  const BOX_W = 168;
  const BOX_H = 50;
  const side = back.size ? 44 : 12;
  const columns = Math.max(...rows.map((row) => row.length));
  const width = columns * W + side * 2;
  const height = rows.length * H - (H - BOX_H) + 12;
  const at = new Map<string, { x: number; y: number }>();
  rows.forEach((row, r) => row.forEach((id, i) => at.set(id, { x: side + (columns * W - row.length * W) / 2 + W / 2 + i * W, y: 6 + BOX_H / 2 + r * H })));
  const label = new Map(data.nodes.map((node) => [node.id, node.label]));
  const name = data.title ?? t.diagram;
  return (
    // Focusable, so the keyboard can scroll it sideways on a phone.
    <figure className="answer-diagram" tabIndex={0}>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={name} style={{ maxWidth: width }}>
        <defs>
          <marker id={marker} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0 0 10 5 0 10z" />
          </marker>
        </defs>
        {data.edges.map((edge, index) => {
          const a = at.get(edge.from)!;
          const b = at.get(edge.to)!;
          // A loop goes out to the nearer edge of the drawing and back in; everything else runs from box to box.
          const loop = back.has(index);
          const left = loop && a.x < width / 2 - 1;
          const out = left ? side / 2 : width - side / 2;
          const half = left ? -BOX_W / 2 : BOX_W / 2;
          const d = loop
            ? `M${a.x + half} ${a.y} H${out} V${b.y} H${b.x + half + (left ? -4 : 4)}`
            : a.y === b.y
              ? `M${a.x + (b.x > a.x ? BOX_W / 2 : -BOX_W / 2)} ${a.y} H${b.x + (b.x > a.x ? -BOX_W / 2 - 4 : BOX_W / 2 + 4)}`
              : `M${a.x} ${a.y + BOX_H / 2} L${b.x} ${b.y - BOX_H / 2 - 4}`;
          // The label sits beside its arrow, on the outer side of a slanted one.
          const lean = b.x < a.x ? -10 : 10;
          const mid = loop ? { x: out + (left ? 6 : -6), y: (a.y + b.y) / 2 } : { x: (a.x + b.x) / 2 + lean, y: (a.y + b.y) / 2 + (a.y === b.y ? -8 : 4) };
          return (
            <g key={index} className="answer-diagram-edge">
              <path d={d} markerEnd={`url(#${marker})`} />
              {edge.label && (
                <text x={mid.x} y={mid.y} textAnchor={(loop ? !left : b.x < a.x) ? "end" : "start"}>
                  {edge.label}
                </text>
              )}
            </g>
          );
        })}
        {data.nodes.map((node) => {
          const p = at.get(node.id)!;
          const lines = twoLines(node.label);
          return (
            <g key={node.id} className={node.decision ? "answer-diagram-node decision" : "answer-diagram-node"}>
              <rect x={p.x - BOX_W / 2} y={p.y - BOX_H / 2} width={BOX_W} height={BOX_H} rx={node.decision ? 25 : 12} />
              {lines.map((line, i) => (
                <text key={i} x={p.x} y={p.y + (lines.length === 1 ? 5 : i ? 14 : -3)} textAnchor="middle">
                  {line}
                </text>
              ))}
            </g>
          );
        })}
      </svg>
      {/* The same diagram in words, for screen readers (the drawing is one image to them). */}
      <ul className="sr-only">
        {data.edges.map((edge, index) => (
          <li key={index}>{t.leadsTo(label.get(edge.from)!, label.get(edge.to)!, edge.label)}</li>
        ))}
      </ul>
      {data.title && <figcaption>{data.title}</figcaption>}
    </figure>
  );
}

function Layers({ data }: { data: LayersData }) {
  const t = useText(answerBlocksText);
  return (
    <figure className="answer-diagram answer-layers" role="group" aria-label={data.title ?? t.diagram}>
      {data.rows.map((row, r) => (
        <div key={r} className="answer-layer" style={{ gridTemplateColumns: `repeat(${row.length}, minmax(0, 1fr))` }}>
          {row.map((cell, c) => (
            <div key={c}>
              <strong>{cell.label}</strong>
              {cell.note && <span>{cell.note}</span>}
            </div>
          ))}
        </div>
      ))}
      {data.title && <figcaption>{data.title}</figcaption>}
    </figure>
  );
}

export const DiagramBlock = ({ data }: { data: DiagramData }) => (data.type === "flow" ? <Flow data={data} /> : <Layers data={data} />);

export function ExploreBlock({ data }: { data: ExploreData }) {
  const t = useText(answerBlocksText);
  const id = useId();
  const [shown, setShown] = useState(0);
  const tab = data.tabs[shown];
  return (
    <div className="answer-explore">
      <div role="tablist" aria-label={t.explore}>
        {data.tabs.map((item, index) => (
          <button
            key={index}
            type="button"
            role="tab"
            id={`${id}-tab-${index}`}
            aria-selected={index === shown}
            aria-controls={`${id}-panel`}
            tabIndex={index === shown ? 0 : -1}
            onClick={() => setShown(index)}
            onKeyDown={(event) => {
              // Arrow keys move between tabs, as tabs do everywhere.
              const step = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
              if (!step) return;
              event.preventDefault();
              const next = (index + step + data.tabs.length) % data.tabs.length;
              setShown(next);
              document.getElementById(`${id}-tab-${next}`)?.focus();
            }}
          >
            {item.title}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`${id}-panel`} aria-labelledby={`${id}-tab-${shown}`} tabIndex={0}>
        {tab.diagram && <DiagramBlock data={tab.diagram} />}
        {/* A tab's text may use simple Markdown (bold, a short list); HTML in it stays text. */}
        <Markdown remarkPlugins={[remarkGfm]} allowedElements={["p", "strong", "em", "ul", "ol", "li", "code", "br"]} unwrapDisallowed>
          {tab.text}
        </Markdown>
      </div>
    </div>
  );
}
