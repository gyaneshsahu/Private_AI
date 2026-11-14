/**
 * Canvas (docs/canvas-20261114.md): one editable document per conversation, in a panel beside the
 * chat. Pure rules live here: the limits, the Markdown table grid, the text of an "ask for
 * changes" message, which answer is a proposed change, and the undo list. No page, no network.
 * A change request is an ordinary message sent through the app's one send path.
 */
import type { Conversation, Message } from "../shared/contracts";

export const CANVAS_LIMITS = {
  /** Characters in the canvas. With `instruction` and the note, a request stays inside the 20,000 character message limit. */
  characters: 18000,
  /** Characters in one "ask for changes" instruction. */
  instruction: 1500,
  /** Earlier versions kept for undo, in memory, per conversation. */
  undo: 20,
  rows: 200,
  columns: 30,
} as const;

export type CanvasProblem = "empty" | "long" | "instruction" | "noInstruction" | "tableFull";
export class CanvasError extends Error {
  constructor(public problem: CanvasProblem) {
    super(`Canvas: ${problem}`);
  }
}

// ---- Markdown table <-> grid ----

export interface Grid {
  header: string[];
  /** One delimiter cell per column: "---", ":---", "---:" or ":---:". */
  align: string[];
  rows: string[][];
}

const DELIMITER = /^:?-+:?$/;
function cells(line: string): string[] {
  let text = line.trim();
  if (text.startsWith("|")) text = text.slice(1);
  if (text.endsWith("|") && !text.endsWith("\\|")) text = text.slice(0, -1);
  return text.split(/(?<!\\)\|/).map((cell) => cell.trim().replace(/\\\|/g, "|"));
}

/** The grid when the whole text is one Markdown table, else undefined. */
export function parseTable(text: string): Grid | undefined {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2 || lines.some((line) => !line.includes("|")))
    return undefined;
  const header = cells(lines[0]);
  const marks = cells(lines[1]);
  if (marks.length !== header.length || !marks.every((mark) => DELIMITER.test(mark))) return undefined;
  if (header.length > CANVAS_LIMITS.columns || lines.length - 2 > CANVAS_LIMITS.rows) return undefined;
  return {
    header,
    align: marks.map((mark) => `${mark.startsWith(":") ? ":" : ""}---${mark.endsWith(":") ? ":" : ""}`),
    // A short row is filled up and a long one cut, as the renderer does.
    rows: lines.slice(2).map((line) => {
      const row = cells(line).slice(0, header.length);
      return [...row, ...Array<string>(header.length - row.length).fill("")];
    }),
  };
}

const cellText = (value: string) => value.replace(/\s*\r?\n\s*/g, " ").trim().replace(/\|/g, "\\|");
const line = (row: string[]) => `| ${row.map(cellText).join(" | ")} |`;
export const serializeTable = (grid: Grid): string =>
  [line(grid.header), `| ${grid.align.join(" | ")} |`, ...grid.rows.map(line)].join("\n");

/** Text copied from a spreadsheet: rows by line, cells by tab, a quoted cell may hold tabs, lines and "" for a quote. */
export function parseTsv(text: string): string[][] {
  const rows: string[][] = [[]];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') (cell += '"'), i++;
      else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"' && !cell) quoted = true;
    else if (c === "\t") rows.at(-1)!.push(cell), (cell = "");
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      rows.at(-1)!.push(cell);
      cell = "";
      rows.push([]);
    } else cell += c;
  }
  rows.at(-1)!.push(cell);
  // A spreadsheet ends the copy with a line break.
  if (rows.length > 1 && rows.at(-1)!.length === 1 && !rows.at(-1)![0]) rows.pop();
  return rows;
}

/** Writes a pasted block with its top left corner at a cell; row -1 is the heading row. The table grows as needed. */
export function pasteInto(grid: Grid, row: number, column: number, block: string[][]): Grid {
  const width = Math.max(grid.header.length, column + Math.max(...block.map((r) => r.length)));
  const height = Math.max(grid.rows.length, row + block.length);
  if (width > CANVAS_LIMITS.columns || height > CANVAS_LIMITS.rows) throw new CanvasError("tableFull");
  const wide = (r: string[]) => [...r, ...Array<string>(width - r.length).fill("")];
  const next: Grid = {
    header: wide(grid.header),
    align: [...grid.align, ...Array<string>(width - grid.align.length).fill("---")],
    rows: [...grid.rows.map(wide), ...Array.from({ length: height - grid.rows.length }, () => wide([]))],
  };
  block.forEach((values, r) =>
    values.forEach((value, c) => {
      (row + r < 0 ? next.header : next.rows[row + r])[column + c] = value.replace(/\s*\r?\n\s*/g, " ").trim();
    }),
  );
  return next;
}

/**
 * The table as CSV (RFC 4180: comma, CRLF, quotes doubled). A cell a spreadsheet would run as a
 * formula gets a leading apostrophe, so a table the model wrote cannot run anything when opened.
 * A plain number such as -5 or +3,50 stays as it is.
 */
export function toCsv(grid: Grid): string {
  const field = (value: string) => {
    const safe = /^[=@\t\r]/.test(value) || (/^[+-]/.test(value) && !/^[+-][\d.,\s]+%?$/.test(value)) ? `'${value}` : value;
    return /[",\r\n]|^\s|\s$/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
  };
  return [grid.header, ...grid.rows].map((row) => row.map(field).join(",")).join("\r\n") + "\r\n";
}

// ---- Ask for changes ----

// No digits in the notes: the whole message goes through identifier masking.
const NOTE =
  "[Canvas document from the user. Apply the request above to it. Reply with the complete revised document only, in Markdown, with no introduction, no explanation and no closing remark. Keep the language of the document unless the request says otherwise.]";
const END = "[End of canvas document]";

/**
 * The one message an "ask for changes" sends: the instruction, then the canvas text once.
 * Refused, with nothing sent, when the canvas is empty or over the limit or the instruction is.
 */
export function canvasRequest(instruction: string, canvas: string): string {
  if (!instruction.trim()) throw new CanvasError("noInstruction");
  if (instruction.trim().length > CANVAS_LIMITS.instruction) throw new CanvasError("instruction");
  if (!canvas.trim()) throw new CanvasError("empty");
  if (canvas.length > CANVAS_LIMITS.characters) throw new CanvasError("long");
  return `${instruction.trim()}\n\n${NOTE}\n${canvas.trim()}\n${END}`;
}
export const isCanvasRequest = (message: Message) =>
  message.role === "user" && message.text.includes(`\n\n${NOTE}\n`) && message.text.endsWith(END);

/**
 * The conversation a new request is sent from: earlier change requests and their answers are
 * taken out of the context (the ordinary "included" mark, visible in the context review), so the
 * canvas text goes out once, in the new request, and not again in every old one.
 */
export function withoutEarlierCanvas<C extends Conversation>(conversation: C): C {
  const { messages } = conversation;
  return {
    ...conversation,
    messages: messages.map((message, index) =>
      isCanvasRequest(message) || (message.role === "assistant" && index > 0 && isCanvasRequest(messages[index - 1]))
        ? { ...message, included: false }
        : message,
    ),
  };
}

/** The answer to the newest change request, until the user applied or discarded it. */
export function canvasProposal(conversation: Conversation): Message | undefined {
  const { messages } = conversation;
  let index = messages.length - 1;
  while (index >= 0 && !isCanvasRequest(messages[index])) index--;
  const answer = index < 0 ? undefined : messages[index + 1];
  return answer?.role === "assistant" && answer.id !== conversation.canvas?.resolved ? answer : undefined;
}

/** The document in an answer: a model sometimes wraps the whole reply in one ```markdown fence. */
export function proposedText(answer: string): string {
  const fenced = /^```(?:markdown|md)[ \t]*\r?\n([\s\S]*?)\r?\n```$/.exec(answer.trim());
  return (fenced ? fenced[1] : answer).trim();
}

// ---- The canvas on the conversation, and undo ----

/**
 * The conversation with new canvas text, as a pure update (safe inside a React state updater).
 * `resolved` marks a decided proposal and is kept otherwise. Callers check the limit first with
 * checkCanvas, so this never throws.
 */
export function withCanvas<C extends Conversation>(conversation: C, text: string, resolved?: string): C {
  const mark = resolved ?? conversation.canvas?.resolved;
  return { ...conversation, canvas: { text, ...(mark ? { resolved: mark } : {}) } };
}
/** The text, or a refusal when it is over the limit. */
export function checkCanvas(text: string): string {
  if (text.length > CANVAS_LIMITS.characters) throw new CanvasError("long");
  return text;
}
/** The canvas taken off the conversation. */
export const withoutCanvas = <C extends Conversation>({ canvas: _gone, ...conversation }: C): C =>
  conversation as C;

// Earlier versions, in memory only: gone on reload, never saved. Written by event handlers,
// never inside a state updater (React may run an updater twice).
const undo = new Map<string, string[]>();
export const undoCount = (id: string) => undo.get(id)?.length ?? 0;
/** Keeps the version that is about to be replaced (an apply or a new "Open in canvas"). */
export function keepForUndo(id: string, text: string | undefined) {
  if (text) undo.set(id, [...(undo.get(id) ?? []), text].slice(-CANVAS_LIMITS.undo));
}
/** The version before the last replacement, taken off the list. */
export function takeUndo(id: string): string | undefined {
  const list = undo.get(id) ?? [];
  const last = list.pop();
  undo.set(id, list);
  return last;
}
export const forgetUndo = (id: string) => undo.delete(id);
