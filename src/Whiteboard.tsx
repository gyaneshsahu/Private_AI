// Whiteboard next to the chat (owner, 17 November; shared/whiteboard.ts). The user draws and writes
// while chatting; there is no send button: the app takes the board with the next message. Every
// finished action calls onChange once with a board that boardSchema accepts, or nothing changes.
import { useMemo, useRef, useState, type KeyboardEvent, type MouseEvent, type PointerEvent } from "react";
import { BOARD_LIMITS, BOARD_SIZE, boardSchema, type Board, type BoardItem } from "../shared/whiteboard";
import { ConfirmDialog } from "./ConfirmDialog";
import { Icon, type IconName } from "./Icon";
import { useText } from "./i18n";
import { questionText } from "./text/questions";
import { whiteboardText } from "./text/whiteboard";
import { FONT, NOTE, PEN_WIDTH, TEXT_SIZE, itemsMarkup, noteHeight, type Paint } from "./whiteboard-render";
import "./whiteboard.css";

type Tool = "pen" | "eraser" | "box" | "arrow" | "text" | "note";
const TOOLS: [Tool, IconName][] = [
  ["pen", "pen"],
  ["eraser", "eraser"],
  ["box", "square"],
  ["arrow", "arrow-tool"],
  ["text", "text-tool"],
  ["note", "note"],
];
const COLOUR_NAMES = ["colourInk", "colourBlue", "colourRed", "colourGreen"] as const;
const SCREEN_PAINT: Paint = {
  colours: ["var(--ink)", "#2456e6", "#e5484d", "#30a46c"],
  note: "var(--wb-sticky)",
  noteInk: "var(--wb-sticky-ink)",
};
const HISTORY = 50;
const newId = () => crypto.randomUUID().slice(0, 12);
const clamp = (n: number, max: number) => Math.min(max, Math.max(0, Math.round(n)));

interface Drag {
  x: number;
  y: number;
  /** The item under the pointer when the drag began, if any. */
  onKind?: string;
  item?: BoardItem;
  erased?: string[];
  /** Text or note tool: the field opens where the press ends. */
  place?: true;
  /** The eraser's previous screen position. */
  last?: { clientX: number; clientY: number };
}
interface Editing {
  /** Set when an existing text or note is edited. */
  id?: string;
  kind: "text" | "note";
  x: number;
  y: number;
  text: string;
  colour: number;
}

/** The item drawn under a screen point. Pointer capture sends every event to the svg, so ask the page. */
function itemAt(e: { clientX: number; clientY: number }) {
  const element = document.elementFromPoint(e.clientX, e.clientY)?.closest<SVGElement>("[data-id]");
  return element ? { id: element.dataset.id!, kind: element.dataset.kind! } : undefined;
}

export function WhiteboardPanel({ board, onChange, onClose }: { board: Board; onChange(next: Board): void; onClose(): void }) {
  const t = useText(whiteboardText);
  const q = useText(questionText);
  const [tool, setTool] = useState<Tool>("pen");
  const [colour, setColour] = useState(0);
  const [history, setHistory] = useState<BoardItem[][]>([]);
  const [editing, setEditingState] = useState<Editing | null>(null);
  const [clearing, setClearing] = useState(false);
  const [full, setFull] = useState(false);
  const [, redraw] = useState(0);
  const svg = useRef<SVGSVGElement>(null);
  const undoButton = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLElement>(null);
  // Refs, not state: pointer events can arrive faster than React renders, and Enter then blur must commit once.
  const drag = useRef<Drag | null>(null);
  const editingRef = useRef<Editing | null>(null);

  const setEditing = (next: Editing | null) => {
    editingRef.current = next;
    setEditingState(next);
  };

  function commit(items: BoardItem[]) {
    const next: Board = { ...board, items, changedAt: new Date().toISOString() };
    // Also covers the JSON size limit; an action that would break the board is dropped.
    if (!boardSchema.safeParse(next).success) return setFull(true);
    setFull(false);
    setHistory((h) => [...h, board.items].slice(-HISTORY));
    onChange(next);
  }

  function undo() {
    const previous = history.at(-1);
    if (!previous) return;
    setHistory(history.slice(0, -1));
    setFull(false);
    onChange({ ...board, items: previous, changedAt: new Date().toISOString() });
  }

  const point = (e: { clientX: number; clientY: number }) => {
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(svg.current!.getScreenCTM()!.inverse());
    return { x: clamp(p.x, BOARD_SIZE.width), y: clamp(p.y, BOARD_SIZE.height) };
  };

  function edit(id: string) {
    const item = board.items.find((i) => i.id === id);
    if (item?.kind === "text" || item?.kind === "note")
      setEditing({ id, kind: item.kind, x: item.x, y: item.y, text: item.text, colour: item.kind === "text" ? item.colour : 0 });
  }

  function down(e: PointerEvent<SVGSVGElement>) {
    if (!e.isPrimary || e.button !== 0 || drag.current || (e.target as Element).closest("foreignObject")) return;
    // A press outside an open text field commits it and does nothing else.
    if (editingRef.current)
      return finish(svg.current!.querySelector<HTMLInputElement>("foreignObject :is(input, textarea)")?.value ?? "");
    const { x, y } = point(e);
    if (tool === "text" || tool === "note") {
      // No focus change on press (it would blur the new field at once); the field opens on release.
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);
      drag.current = { x, y, place: true };
      return;
    }
    if (tool !== "eraser" && board.items.length >= BOARD_LIMITS.items) return setFull(true);
    e.currentTarget.setPointerCapture(e.pointerId);
    const under = itemAt(e);
    const id = newId();
    drag.current = {
      x,
      y,
      onKind: under?.kind,
      erased: tool === "eraser" ? (under ? [under.id] : []) : undefined,
      last: { clientX: e.clientX, clientY: e.clientY },
      item:
        tool === "pen"
          ? { id, kind: "pen", colour, width: PEN_WIDTH, points: [x, y] }
          : tool === "box"
            ? { id, kind: "box", colour, x, y, w: 0, h: 0 }
            : tool === "arrow"
              ? { id, kind: "arrow", colour, x1: x, y1: y, x2: x, y2: y }
              : undefined,
    };
    redraw((n) => n + 1);
  }

  function move(e: PointerEvent<SVGSVGElement>) {
    const d = drag.current;
    if (!d || !e.isPrimary) return;
    if (d.erased) {
      // Look every few pixels along the move, so a fast drag cannot jump over a thin line.
      const from = d.last ?? { clientX: e.clientX, clientY: e.clientY };
      const steps = Math.max(1, Math.ceil(Math.hypot(e.clientX - from.clientX, e.clientY - from.clientY) / 3));
      d.last = { clientX: e.clientX, clientY: e.clientY };
      const before = d.erased.length;
      for (let i = 1; i <= steps; i++) {
        const under = itemAt({ clientX: from.clientX + ((e.clientX - from.clientX) * i) / steps, clientY: from.clientY + ((e.clientY - from.clientY) * i) / steps });
        if (under && !d.erased.includes(under.id)) d.erased = [...d.erased, under.id];
      }
      if (d.erased.length === before) return;
    } else if (d.item?.kind === "pen") {
      const { x, y } = point(e);
      const points = d.item.points;
      // Points closer than 2 units add nothing visible; the stroke stops at the limit.
      if (points.length >= BOARD_LIMITS.points || Math.hypot(x - points.at(-2)!, y - points.at(-1)!) < 2) return;
      d.item = { ...d.item, points: [...points, x, y] };
    } else if (d.item?.kind === "box") {
      const { x, y } = point(e);
      d.item = { ...d.item, x: Math.min(d.x, x), y: Math.min(d.y, y), w: Math.abs(x - d.x), h: Math.abs(y - d.y) };
    } else if (d.item?.kind === "arrow") {
      const { x, y } = point(e);
      d.item = { ...d.item, x2: x, y2: y };
    } else return;
    redraw((n) => n + 1);
  }

  function up(e: PointerEvent<SVGSVGElement>) {
    const d = drag.current;
    if (!d || !e.isPrimary) return;
    drag.current = null;
    redraw((n) => n + 1);
    if (e.type === "pointercancel") return;
    if (d.place) return place(d, itemAt(e));
    if (d.erased) {
      if (d.erased.length) commit(board.items.filter((i) => !d.erased!.includes(i.id)));
      return;
    }
    let item = d.item;
    if (item?.kind === "pen" && item.points.length === 2) {
      // A tap draws a dot, except on text or a note: that is the first half of a double-click to edit it.
      if (d.onKind === "text" || d.onKind === "note") return;
      item = { ...item, points: [...item.points, ...item.points] };
    }
    if (item?.kind === "box" && (item.w < 4 || item.h < 4)) return;
    if (item?.kind === "arrow" && Math.hypot(item.x2 - item.x1, item.y2 - item.y1) < 8) return;
    if (item) commit([...board.items, item]);
  }

  /** Text or note tool: a press on existing text edits it, anywhere else opens a new field. */
  function place({ x, y }: Drag, under?: { id: string; kind: string }) {
    if (under?.kind === "text" || under?.kind === "note") return edit(under.id);
    if (board.items.length >= BOARD_LIMITS.items) return setFull(true);
    const kind = tool === "note" ? "note" : "text";
    // Keep the new field inside the board.
    const room = kind === "note" ? { w: NOTE.width, h: NOTE.minHeight } : { w: 240, h: TEXT_SIZE * 1.4 };
    setEditing({ kind, x: Math.min(x, BOARD_SIZE.width - room.w), y: Math.min(y, BOARD_SIZE.height - room.h), text: "", colour });
  }

  function doubleClick(e: MouseEvent<SVGSVGElement>) {
    const under = itemAt(e);
    if (under?.kind === "text" || under?.kind === "note") edit(under.id);
  }

  /** `null` cancels. Empty text adds nothing; emptying an existing one removes it. */
  function finish(value: string | null) {
    const open = editingRef.current;
    if (!open) return;
    setEditing(null);
    if (value === null) return;
    const text = value.trim().slice(0, BOARD_LIMITS.textCharacters);
    if (text === open.text) return;
    const id = open.id ?? newId();
    const item: BoardItem =
      open.kind === "note"
        ? { id, kind: "note", x: open.x, y: open.y, text }
        : { id, kind: "text", colour: open.colour, x: open.x, y: open.y, text };
    if (!open.id) commit([...board.items, item]);
    else if (!text) commit(board.items.filter((i) => i.id !== id));
    else commit(board.items.map((i) => (i.id === id ? item : i)));
  }

  function fieldKeys(e: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) {
    if (e.nativeEvent.isComposing || (e.key !== "Escape" && (e.key !== "Enter" || e.shiftKey))) return;
    // Escape cancels the text only; the panel stays open.
    e.preventDefault();
    e.stopPropagation();
    finish(e.key === "Escape" ? null : e.currentTarget.value);
    // The field goes away: keep focus in the panel so Ctrl+Z still works.
    panel.current?.focus();
  }

  function panelKeys(e: KeyboardEvent<HTMLElement>) {
    if (!(e.ctrlKey || e.metaKey) || e.shiftKey || e.key.toLowerCase() !== "z") return;
    // Inside a text field Ctrl+Z undoes typing, as everywhere else.
    if ((e.target as HTMLElement).closest("input, textarea")) return;
    e.preventDefault();
    undo();
  }

  const d = drag.current;
  const hidden = new Set([...(d?.erased ?? []), ...(editing?.id ? [editing.id] : [])]);
  const shown = hidden.size ? board.items.filter((i) => !hidden.has(i.id)) : board.items;
  const markup = useMemo(() => itemsMarkup(shown, SCREEN_PAINT, tool === "eraser"), [shown, tool]);

  return (
    // tabIndex -1: a click on the board keeps focus in the panel, so Ctrl+Z still reaches it.
    <aside ref={panel} className="side-panel whiteboard-panel" aria-label={t.title} tabIndex={-1} onKeyDown={panelKeys}>
      <div className="wb-head">
        <h2>{t.title}</h2>
        <button ref={undoButton} type="button" className="wb-button" aria-label={t.undo} title={t.undo} disabled={!history.length} onClick={undo}>
          <Icon name="undo" />
        </button>
        <button type="button" className="wb-button" aria-label={t.clear} title={t.clear} disabled={!board.items.length} onClick={() => setClearing(true)}>
          <Icon name="trash" />
        </button>
        <button type="button" className="wb-button" aria-label={t.close} title={t.close} onClick={onClose}>
          <Icon name="close" />
        </button>
      </div>
      <div className="wb-board">
        <svg
          ref={svg}
          className="wb-svg"
          data-tool={tool}
          viewBox={`0 0 ${BOARD_SIZE.width} ${BOARD_SIZE.height}`}
          aria-label={t.board}
          fontFamily={FONT}
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={up}
          onDoubleClick={doubleClick}
        >
          <defs>
            <pattern id="wb-dots" width="40" height="40" patternUnits="userSpaceOnUse">
              <circle cx="20" cy="20" r="2.4" fill="var(--wb-dots)" />
            </pattern>
          </defs>
          <rect className="wb-area" rx="24" width={BOARD_SIZE.width} height={BOARD_SIZE.height} />
          <rect rx="24" width={BOARD_SIZE.width} height={BOARD_SIZE.height} fill="url(#wb-dots)" />
          <g dangerouslySetInnerHTML={{ __html: markup }} />
          {d?.item && <g className="wb-draft" dangerouslySetInnerHTML={{ __html: itemsMarkup([d.item], SCREEN_PAINT) }} />}
          {editing && (
            <foreignObject
              x={editing.x}
              y={editing.y}
              width={editing.kind === "note" ? NOTE.width : Math.min(900, BOARD_SIZE.width - editing.x)}
              height={editing.kind === "note" ? noteHeight(editing.text) : TEXT_SIZE * 1.4}
            >
              {editing.kind === "note" ? (
                <textarea
                  className="wb-note-input"
                  aria-label={t.noteLabel}
                  autoFocus
                  defaultValue={editing.text}
                  maxLength={BOARD_LIMITS.textCharacters}
                  style={{ fontSize: NOTE.font, lineHeight: `${NOTE.line}px`, padding: NOTE.pad }}
                  onKeyDown={fieldKeys}
                  onBlur={(e) => finish(e.currentTarget.value)}
                />
              ) : (
                <input
                  className="wb-text-input"
                  aria-label={t.textLabel}
                  autoFocus
                  defaultValue={editing.text}
                  maxLength={BOARD_LIMITS.textCharacters}
                  style={{ fontSize: TEXT_SIZE, color: SCREEN_PAINT.colours[editing.colour] }}
                  onKeyDown={fieldKeys}
                  onBlur={(e) => finish(e.currentTarget.value)}
                />
              )}
            </foreignObject>
          )}
        </svg>
        <div className="wb-tools" role="group" aria-label={t.tools}>
          {TOOLS.map(([name, icon]) => (
            <button key={name} type="button" className="wb-tool" aria-label={t[name]} title={t[name]} aria-pressed={tool === name} onClick={() => setTool(name)}>
              <Icon name={icon} />
            </button>
          ))}
          <span className="wb-sep" />
          {COLOUR_NAMES.map((name, i) => (
            <button
              key={name}
              type="button"
              className="wb-colour"
              aria-label={t[name]}
              title={t[name]}
              aria-pressed={colour === i}
              style={{ ["--dot" as string]: SCREEN_PAINT.colours[i] }}
              onClick={() => setColour(i)}
            />
          ))}
        </div>
        <p className="wb-full" role="status">
          {full ? t.full : ""}
        </p>
      </div>
      {clearing && (
        <ConfirmDialog
          title={t.clearTitle}
          text={t.clearText}
          confirmLabel={t.clearConfirm}
          cancelLabel={q.cancel}
          // The Clear button is disabled once the board is empty.
          fallback={() => undoButton.current}
          onClose={(yes) => {
            setClearing(false);
            if (yes) commit([]);
          }}
        />
      )}
    </aside>
  );
}
