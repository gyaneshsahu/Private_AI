// Whiteboard (owner, 17 November): one board per chat, next to the chat. Stored with the conversation
// in the vault as a small vector scene (never a picture), so it syncs like the rest of the chat. When
// the user asks a question while the board has changed, the board goes with it as a picture through
// the existing picture path, with its typed words; nothing about it is kept on the server.
import { z } from "zod";

/** A fixed drawing area; the panel scales it to fit. */
export const BOARD_SIZE = { width: 1600, height: 1000 } as const;
/** Colours are indexes so one board reads in light and dark: 0 is the theme's ink, then blue, red, green. */
export const BOARD_COLOURS = 4;
export const BOARD_LIMITS = {
  items: 2000,
  /** Numbers in one pen stroke (x, y pairs). */
  points: 4000,
  textCharacters: 500,
  /** The whole board as JSON; far under a synced chat's 4 MiB. */
  jsonCharacters: 1_000_000,
  /** The board's typed words sent with a question. */
  sentText: 2000,
} as const;

const coord = z.number().int().min(-10_000).max(10_000);
const id = z.string().min(1).max(40);
const colour = z.number().int().min(0).max(BOARD_COLOURS - 1);
const text = z.string().min(1).max(BOARD_LIMITS.textCharacters);

export const boardItemSchema = z.discriminatedUnion("kind", [
  z.object({ id, kind: z.literal("pen"), colour, width: z.number().int().min(1).max(40), points: z.array(coord).min(2).max(BOARD_LIMITS.points) }).strict(),
  z.object({ id, kind: z.literal("box"), colour, x: coord, y: coord, w: coord, h: coord }).strict(),
  z.object({ id, kind: z.literal("arrow"), colour, x1: coord, y1: coord, x2: coord, y2: coord }).strict(),
  z.object({ id, kind: z.literal("text"), colour, x: coord, y: coord, text }).strict(),
  z.object({ id, kind: z.literal("note"), x: coord, y: coord, text }).strict(),
]);
export type BoardItem = z.infer<typeof boardItemSchema>;

export const boardSchema = z
  .object({
    items: z.array(boardItemSchema).max(BOARD_LIMITS.items),
    changedAt: z.string().datetime(),
    /** When the board last went with a question; it goes again only after a change. */
    sentAt: z.string().datetime().optional(),
  })
  .strict()
  .refine((b) => JSON.stringify(b).length <= BOARD_LIMITS.jsonCharacters, "The whiteboard is too large.");
export type Board = z.infer<typeof boardSchema>;

export const emptyBoard = (at = new Date().toISOString()): Board => ({ items: [], changedAt: at });

/** True when the board has something on it that has not gone with a question yet. */
export const boardUnsent = (board: Board | undefined): board is Board =>
  !!board?.items.length && (!board.sentAt || board.sentAt < board.changedAt);

/** The board's typed words (text and notes), top to bottom, left to right, for the question. */
export function boardText(board: Board): string {
  const typed = board.items
    .filter((i): i is Extract<BoardItem, { text: string }> => i.kind === "text" || i.kind === "note")
    .sort((a, b) => a.y - b.y || a.x - b.x)
    .map((i) => (i.kind === "note" ? `Note: ${i.text}` : i.text).replace(/\s+/g, " ").trim());
  return typed.join("\n").slice(0, BOARD_LIMITS.sentText);
}

/** The line in front of a question that had the board with it (see IMAGE_GONE_NOTE). */
export const boardNote = (typed?: string) =>
  `[The picture is the user's whiteboard.${typed ? ` Typed text on it:\n${typed}\n` : ""}]\n`;
