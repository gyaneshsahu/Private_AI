// Canvas (docs/canvas-20261114.md): the panel beside the chat (a full-screen sheet below 1100 px).
// It edits conversation.canvas only. "Ask for changes" calls back into App, which sends through
// the one send path; nothing here talks to the network.
import { Suspense, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { Conversation } from "../shared/contracts";
import {
  CANVAS_LIMITS,
  CanvasError,
  canvasProposal,
  canvasRequest,
  checkCanvas,
  forgetUndo,
  keepForUndo,
  parseTable,
  parseTsv,
  pasteInto,
  proposedText,
  serializeTable,
  takeUndo,
  toCsv,
  undoCount,
  withCanvas,
  withoutCanvas,
  type Grid,
} from "./canvas";
import { useText } from "./i18n";
import { importFresh, LoadBoundary, retryLazy } from "./LoadBoundary";
import { messageText } from "./text/message";
import { canvasText } from "./text/canvas";

const Answer = retryLazy(() =>
  importFresh(() => import("./Answer")).then((module) => ({ default: module.Answer })),
);
const PdfExport = retryLazy(() => importFresh(() => import("./pdf-export")));

/** Below this width the panel covers the chat; the page behind it is made inert. */
export const CANVAS_OVERLAY = "(max-width: 1099px)";

type Update = (change: (conversation: Conversation) => Conversation) => void;

function download(name: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = Object.assign(document.createElement("a"), { href: url, download: name });
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function TableEditor({ text, update, fail }: { text: string; update: Update; fail: (e: unknown) => void }) {
  const t = useText(canvasText);
  // The grid is kept here while typing: reading it back from the Markdown would trim a space
  // typed at the end of a cell before the next letter arrives.
  const [grid, setGrid] = useState<Grid | undefined>(() => parseTable(text));
  const written = useRef(text);
  const [at, setAt] = useState({ row: -1, column: -1 });
  useEffect(() => {
    if (text !== written.current) (written.current = text), setGrid(parseTable(text));
  }, [text]);
  if (!grid) return null;
  const save = (next: Grid) => {
    try {
      const markdown = checkCanvas(serializeTable(next));
      update((c) => withCanvas(c, markdown));
      written.current = markdown;
      setGrid(next);
    } catch (error) {
      fail(error);
    }
  };
  const width = grid.header.length;
  const row = at.row >= 0 && at.row < grid.rows.length ? at.row : grid.rows.length - 1;
  const column = at.column >= 0 && at.column < width ? at.column : width - 1;
  const set = (r: number, c: number, value: string) =>
    save({
      ...grid,
      header: r < 0 ? grid.header.map((v, i) => (i === c ? value : v)) : grid.header,
      rows: grid.rows.map((cells, i) => (i === r ? cells.map((v, j) => (j === c ? value : v)) : cells)),
    });
  const cell = (r: number, c: number, value: string) => (
    <input
      value={value}
      aria-label={t.cell(r + 1, c + 1)}
      onFocus={() => setAt({ row: r, column: c })}
      onChange={(event) => set(r, c, event.target.value)}
      onPaste={(event) => {
        const pasted = event.clipboardData.getData("text/plain");
        if (!/[\t\n]/.test(pasted)) return;
        event.preventDefault();
        try {
          save(pasteInto(grid, r, c, parseTsv(pasted)));
        } catch (error) {
          fail(error);
        }
      }}
    />
  );
  return (
    <div className="canvas-table">
      <p className="muted">{t.pasteHint}</p>
      <div className="canvas-grid-scroll">
        <table>
          <thead>
            <tr>{grid.header.map((value, c) => <th key={c}>{cell(-1, c, value)}</th>)}</tr>
          </thead>
          <tbody>
            {grid.rows.map((cells, r) => (
              <tr key={r}>{cells.map((value, c) => <td key={c}>{cell(r, c, value)}</td>)}</tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="canvas-actions">
        <button
          type="button"
          onClick={() => {
            if (grid.rows.length >= CANVAS_LIMITS.rows) return fail(new CanvasError("tableFull"));
            save({ ...grid, rows: [...grid.rows, Array<string>(width).fill("")] });
          }}
        >
          {t.addRow}
        </button>
        <button
          type="button"
          onClick={() => {
            if (width >= CANVAS_LIMITS.columns) return fail(new CanvasError("tableFull"));
            save({
              header: [...grid.header, ""],
              align: [...grid.align, "---"],
              rows: grid.rows.map((cells) => [...cells, ""]),
            });
          }}
        >
          {t.addColumn}
        </button>
        <button
          type="button"
          disabled={!grid.rows.length}
          onClick={() => save({ ...grid, rows: grid.rows.filter((_, i) => i !== row) })}
        >
          {t.removeRow(row + 1)}
        </button>
        <button
          type="button"
          disabled={width < 2}
          onClick={() =>
            save({
              header: grid.header.filter((_, i) => i !== column),
              align: grid.align.filter((_, i) => i !== column),
              rows: grid.rows.map((cells) => cells.filter((_, i) => i !== column)),
            })
          }
        >
          {t.removeColumn(column + 1)}
        </button>
      </div>
    </div>
  );
}

export function CanvasPanel({
  conversation,
  update,
  busy,
  ready,
  cost,
  onAsk,
  onNotice,
  onClose,
}: {
  conversation: Conversation;
  update: Update;
  busy: boolean;
  ready: boolean;
  /** Units the request would use, as the composer shows them; undefined when unknown. */
  cost: (message: string) => number | undefined;
  /** Sends one ordinary message through App's send path. */
  onAsk: (message: string) => void;
  onNotice: (text: string) => void;
  onClose: () => void;
}) {
  const t = useText(canvasText);
  const mt = useText(messageText);
  const panel = useRef<HTMLElement>(null);
  const text = conversation.canvas?.text ?? "";
  const isTable = !!parseTable(text);
  const [view, setView] = useState<"edit" | "preview" | "table">(isTable ? "table" : "edit");
  const shown = view === "table" && !isTable ? "edit" : view;
  const [instruction, setInstruction] = useState("");
  const [problem, setProblem] = useState("");
  const [printing, setPrinting] = useState(0);
  const fail = (error: unknown) =>
    setProblem(error instanceof CanvasError ? t.problem(error.problem) : (error as Error).message);
  const proposal = canvasProposal(conversation);
  const waiting = !!proposal && busy && proposal.status === "partial" && proposal === conversation.messages.at(-1);

  // Focus moves into the panel and goes back to where it came from when the panel closes. As a
  // full-screen sheet the page behind must not take focus or clicks (inert), and is usable again
  // before the focus goes back.
  useLayoutEffect(() => {
    const from = document.activeElement as HTMLElement | null;
    const query = matchMedia(CANVAS_OVERLAY);
    const others = [...(panel.current?.parentElement?.children ?? [])].filter(
      (el): el is HTMLElement => el !== panel.current && el instanceof HTMLElement && !el.inert,
    );
    const apply = () => others.forEach((el) => (el.inert = query.matches));
    apply();
    query.addEventListener("change", apply);
    panel.current?.querySelector<HTMLElement>("h2")?.focus();
    return () => {
      query.removeEventListener("change", apply);
      others.forEach((el) => (el.inert = false));
      if (from?.isConnected && from !== document.body) from.focus();
      else document.getElementById("message-input")?.focus();
    };
  }, []);

  const change = (next: (c: Conversation) => Conversation, notice?: string) => {
    update(next);
    setProblem("");
    if (notice) onNotice(notice);
  };
  const askCost = (() => {
    try {
      return cost(canvasRequest(instruction || ".", text));
    } catch {
      return undefined;
    }
  })();
  const name = (conversation.title.trim() || "canvas").replace(/[\\/:*?"<>|\s]+/g, "-").slice(0, 60);

  return (
    <aside
      ref={panel}
      className="canvas-panel"
      aria-labelledby="canvas-heading"
      onKeyDown={(event) => {
        if (event.key === "Escape" && !event.defaultPrevented) {
          event.preventDefault();
          onClose();
        }
      }}
    >
      <div className="canvas-head">
        <button type="button" className="canvas-back" onClick={onClose}>
          ← {t.back}
        </button>
        <h2 id="canvas-heading" tabIndex={-1}>
          {t.title}
        </h2>
        <button type="button" className="canvas-close" aria-label={t.close} title={t.close} onClick={onClose}>
          ×
        </button>
      </div>
      <div className="canvas-body">
        <div className="canvas-views" role="group" aria-label={t.view}>
          {(["edit", "preview", ...(isTable ? ["table" as const] : [])] as const).map((v) => (
            <button key={v} type="button" aria-pressed={shown === v} onClick={() => setView(v)}>
              {t[v]}
            </button>
          ))}
        </div>
        {shown === "edit" && (
          <>
            <label htmlFor="canvas-text" className="sr-only">
              {t.textLabel}
            </label>
            <textarea
              id="canvas-text"
              className="canvas-text"
              value={text}
              maxLength={CANVAS_LIMITS.characters}
              spellCheck
              onChange={(event) => {
                const value = event.target.value;
                change((c) => withCanvas(c, value));
              }}
            />
          </>
        )}
        {shown === "preview" && (
          <div className="canvas-preview">
            {text.trim() ? (
              <LoadBoundary placeholder={<div className="message-text">{text}</div>}>
                <Suspense fallback={<div className="message-text">{text}</div>}>
                  <Answer text={text} complete sources={[]} open={() => {}} />
                </Suspense>
              </LoadBoundary>
            ) : (
              <p className="muted">{t.emptyPreview}</p>
            )}
          </div>
        )}
        {shown === "table" && <TableEditor text={text} update={update} fail={fail} />}
        <p className="muted canvas-count">
          {t.count(text.length, CANVAS_LIMITS.characters)} · {t.note}
        </p>
        {problem && (
          <p className="warning" role="alert">
            {problem}
          </p>
        )}

        {proposal ? (
          <section className="canvas-proposal" aria-labelledby="canvas-proposal-heading">
            <h3 id="canvas-proposal-heading">{t.proposal}</h3>
            {waiting ? (
              <p className="muted">{t.waiting}</p>
            ) : proposal.status === "complete" && proposal.text ? (
              <>
                <div className="canvas-preview">
                  <LoadBoundary placeholder={<div className="message-text">{proposal.text}</div>}>
                    <Suspense fallback={<div className="message-text">{proposal.text}</div>}>
                      <Answer text={proposedText(proposal.text)} complete sources={[]} open={() => {}} />
                    </Suspense>
                  </LoadBoundary>
                </div>
                <div className="canvas-actions">
                  <button
                    type="button"
                    className="primary"
                    onClick={() => {
                      try {
                        const next = checkCanvas(proposedText(proposal.text));
                        keepForUndo(conversation.id, text);
                        change((c) => withCanvas(c, next, proposal.id), t.applied);
                      } catch (error) {
                        fail(error);
                      }
                    }}
                  >
                    {t.apply}
                  </button>
                  <button type="button" onClick={() => change((c) => withCanvas(c, c.canvas?.text ?? "", proposal.id))}>
                    {t.discard}
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="muted">{t.failed}</p>
                <button type="button" onClick={() => change((c) => withCanvas(c, c.canvas?.text ?? "", proposal.id))}>
                  {t.dismiss}
                </button>
              </>
            )}
          </section>
        ) : (
          <form
            className="canvas-ask"
            onSubmit={(event) => {
              event.preventDefault();
              try {
                const message = canvasRequest(instruction, text);
                if (busy || !ready) return;
                setProblem("");
                onAsk(message);
                setInstruction("");
              } catch (error) {
                fail(error);
              }
            }}
          >
            <label htmlFor="canvas-instruction">{t.askLabel}</label>
            <textarea
              id="canvas-instruction"
              rows={2}
              maxLength={CANVAS_LIMITS.instruction}
              placeholder={t.askPlaceholder}
              value={instruction}
              onChange={(event) => setInstruction(event.target.value)}
            />
            <p className="muted">{t.askNote}</p>
            <button type="submit" className="primary" disabled={busy || !ready}>
              {askCost === undefined ? t.ask : `${t.ask} (${mt.uses(askCost)})`}
            </button>
          </form>
        )}

        <div className="canvas-actions canvas-export">
          <button
            type="button"
            disabled={!undoCount(conversation.id)}
            onClick={() => {
              const before = takeUndo(conversation.id);
              if (before !== undefined) change((c) => withCanvas(c, before), t.undone);
            }}
          >
            {t.undo}
          </button>
          <button
            type="button"
            disabled={!text}
            onClick={() =>
              void navigator.clipboard.writeText(text).then(
                () => onNotice(t.copied),
                (error) => fail(error),
              )
            }
          >
            {t.copy}
          </button>
          <button type="button" disabled={!text} onClick={() => download(`${name}.md`, text, "text/markdown;charset=utf-8")}>
            {t.downloadMd}
          </button>
          {isTable && (
            <button
              type="button"
              // The byte order mark makes spreadsheet programs read umlauts correctly.
              onClick={() => download(`${name}.csv`, "﻿" + toCsv(parseTable(text)!), "text/csv;charset=utf-8")}
            >
              {t.downloadCsv}
            </button>
          )}
          <button type="button" disabled={!text} onClick={() => setPrinting((n) => Math.abs(n) + 1)}>
            {t.pdf}
          </button>
          <button
            type="button"
            onClick={() => {
              if (!window.confirm(t.removeConfirm)) return;
              forgetUndo(conversation.id);
              update(withoutCanvas);
              onClose();
            }}
          >
            {t.remove}
          </button>
        </div>
      </div>
      {printing > 0 && (
        <LoadBoundary>
          <Suspense>
            <PdfExport
              key={printing}
              title={conversation.title}
              createdAt={conversation.createdAt}
              messages={[{ id: "canvas", role: "assistant", text, status: "complete", included: true, createdAt: conversation.createdAt } as never]}
              plain
              done={() => setPrinting((n) => -n)}
            />
          </Suspense>
        </LoadBoundary>
      )}
    </aside>
  );
}
