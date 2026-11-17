// Whiteboard storage (shared/whiteboard.ts): the scene, its limits, what goes with a question, saving and sync merge.
import { expect, it } from "vitest";
import { emptyConversation } from "../shared/contracts";
import { BOARD_LIMITS, boardItemSchema, boardNote, boardSchema, boardText, boardUnsent, emptyBoard, type Board } from "../shared/whiteboard";
import { composeContext, IMAGE_GONE_NOTE, newMessage } from "../src/conversation";
import { savedConversationSchema } from "../src/saved-conversation";
import { mergeConversation } from "../src/sync/merge";

const at = "2026-11-17T10:00:00.000Z";
const board: Board = {
  changedAt: at,
  items: [
    { id: "a", kind: "box", colour: 0, x: 100, y: 100, w: 400, h: 300 },
    { id: "b", kind: "text", colour: 0, x: 140, y: 160, text: "Meeting room" },
    { id: "c", kind: "pen", colour: 1, width: 3, points: [10, 10, 20, 25, 30, 40] },
    { id: "d", kind: "note", x: 160, y: 520, text: "Budget max €4,000" },
    { id: "e", kind: "arrow", colour: 2, x1: 600, y1: 260, x2: 700, y2: 330 },
    { id: "f", kind: "text", colour: 3, x: 400, y: 160, text: "Kitchen" },
  ],
};

it("a scene of strokes, boxes, arrows, text and notes; colours are theme indexes; anything else is refused", () => {
  expect(boardSchema.parse(board)).toEqual(board);
  expect(boardItemSchema.safeParse({ id: "x", kind: "box", colour: 4, x: 0, y: 0, w: 1, h: 1 }).success).toBe(false);
  expect(boardItemSchema.safeParse({ id: "x", kind: "image", src: "data:image/png;base64,AAAA" }).success).toBe(false);
  expect(boardItemSchema.safeParse({ id: "x", kind: "pen", colour: 0, width: 2, points: [1.5, 2] }).success).toBe(false);
  expect(boardItemSchema.safeParse({ id: "x", kind: "text", colour: 0, x: 0, y: 0, text: "x".repeat(501) }).success).toBe(false);
  expect(boardSchema.safeParse({ ...board, extra: 1 }).success).toBe(false);
});

it("a board too large for a synced chat is refused", () => {
  const stroke = (i: number) => ({ id: `s${i}`, kind: "pen" as const, colour: 0, width: 2, points: Array.from({ length: BOARD_LIMITS.points }, (_, k) => 1000 + (k % 9000)) });
  const big = { changedAt: at, items: Array.from({ length: 60 }, (_, i) => stroke(i)) };
  expect(JSON.stringify(big).length).toBeGreaterThan(BOARD_LIMITS.jsonCharacters);
  expect(boardSchema.safeParse(big).success).toBe(false);
  expect(boardSchema.safeParse({ changedAt: at, items: Array.from({ length: BOARD_LIMITS.items + 1 }, (_, i) => ({ ...board.items[0], id: `i${i}` })) }).success).toBe(false);
});

it("typed words go top to bottom, left to right; the board goes again only after a change", () => {
  expect(boardText(board)).toBe("Meeting room\nKitchen\nNote: Budget max €4,000");
  expect(boardUnsent(undefined)).toBe(false);
  expect(boardUnsent(emptyBoard(at))).toBe(false);
  expect(boardUnsent(board)).toBe(true);
  expect(boardUnsent({ ...board, sentAt: "2026-11-17T10:01:00.000Z" })).toBe(false);
  expect(boardUnsent({ ...board, sentAt: "2026-11-17T09:59:00.000Z" })).toBe(true);
});

it("is saved with the chat, read back, and a question that had the board carries its typed words in later turns", () => {
  const question = { ...newMessage("user", "Does this layout fit 6 desks?"), image: true as const, board: { text: boardText(board) }, status: "complete" as const };
  const chat = { ...emptyConversation(), board, messages: [question] };
  const saved = savedConversationSchema.parse(JSON.parse(JSON.stringify(chat)));
  expect(saved.board).toEqual(board);
  expect(saved.messages[0].board).toEqual({ text: "Meeting room\nKitchen\nNote: Budget max €4,000" });
  expect(savedConversationSchema.parse(JSON.parse(JSON.stringify(emptyConversation()))).board).toBeUndefined();
  const sent = composeContext(chat, 100_000).find((m) => m.role === "user" && String(m.content).includes("6 desks"));
  expect(sent?.content).toBe(IMAGE_GONE_NOTE + boardNote(boardText(board)) + "Does this layout fit 6 desks?");
});

it("sync: the board is one field; when both devices changed it, the other device's board wins whole (as the canvas)", () => {
  const base = { ...emptyConversation(), board };
  const local = { ...base, board: { ...board, items: board.items.slice(0, 2), changedAt: "2026-11-17T11:00:00.000Z" } };
  const remote = { ...base, board: { ...board, items: board.items.slice(0, 3), changedAt: "2026-11-17T11:01:00.000Z" } };
  expect(mergeConversation(base, local, base).board).toEqual(local.board);
  expect(mergeConversation(base, local, remote).board).toEqual(remote.board);
});
