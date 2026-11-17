// What a chat has produced or holds, for the Outputs panel (src/OutputsPanel.tsx). React-free so it
// runs in Node tests; the words come from src/text/outputs.ts.
import type { Conversation } from "../shared/contracts";
import type { Lang } from "./text/core";
import { outputsText } from "./text/outputs";

export type OutputItem =
  | { kind: "board"; id: "board"; title: string; detail: string; at: string }
  | { kind: "canvas"; id: "canvas"; title: string; detail: string }
  | { kind: "image"; id: string; title: string; detail: string; at?: string; image: { type: string; data: string } }
  | { kind: "file"; id: string; title: string; detail: string };

const formats = {
  en: new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }),
  de: new Intl.DateTimeFormat("de-DE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }),
};
/** Day and time, local: a time alone would mislead for a board last changed days ago. Kept on one line in a narrow panel. */
export const formatWhen = (iso: string | undefined, lang: Lang) => {
  const date = iso ? new Date(iso) : undefined;
  return date && !Number.isNaN(date.getTime()) ? formats[lang].format(date).replace(/\s/g, "\u00a0") : "";
};

const clip = (text: string, max: number) => (text.length > max ? text.slice(0, max - 1).trimEnd() + "…" : text);

/** The canvas's first Markdown heading, or else its first line. */
function canvasTitle(text: string) {
  const heading = /^#{1,6}\s+(.+)$/m.exec(text)?.[1];
  const line = heading ?? text.split("\n").find((l) => l.trim()) ?? "";
  return clip(line.replace(/\s+/g, " ").trim(), 60);
}

export function chatOutputs(conversation: Conversation, lang: Lang): OutputItem[] {
  const t = outputsText[lang];
  const items: OutputItem[] = [];
  const board = conversation.board;
  if (board?.items.length)
    items.push({ kind: "board", id: "board", title: t.board, detail: t.boardDetail(board.items.length, formatWhen(board.changedAt, lang)), at: board.changedAt });
  const canvas = conversation.canvas?.text;
  if (canvas?.trim()) items.push({ kind: "canvas", id: "canvas", title: canvasTitle(canvas) || t.canvas, detail: t.canvasDetail(canvas.length) });
  for (const message of [...conversation.messages].reverse()) {
    const created = message.createdImage;
    if (!created) continue;
    items.push({
      kind: "image",
      id: message.id,
      title: clip(created.prompt.replace(/\s+/g, " ").trim(), 80),
      detail: t.imageDetail(formatWhen(message.at, lang)),
      at: message.at,
      image: { type: created.type, data: created.data },
    });
  }
  // Search results are attachments too, but they are web results, not files.
  for (const file of conversation.attachments)
    if (file.kind !== "research")
      items.push({
        kind: "file",
        id: file.id,
        title: file.name,
        detail: file.kind === "screenshot" ? t.screenshot : file.large ? t.largeDocument : t.document,
      });
  return items;
}
