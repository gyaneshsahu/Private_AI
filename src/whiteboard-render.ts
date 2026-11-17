// Whiteboard drawing as SVG markup (shared/whiteboard.ts). One renderer for the panel on screen and
// for the picture that goes with a question, so what is sent looks like what the user drew.
import { BOARD_SIZE, type Board, type BoardItem } from "../shared/whiteboard";
import { encodeForSending, sendSize, toAttachedImage, type AttachedImage } from "./image-upload";

export const FONT = "Segoe UI, Arial, sans-serif";
export const PEN_WIDTH = 5;
export const TEXT_SIZE = 40;
export const NOTE = { width: 300, minHeight: 200, pad: 20, font: 28, line: 36, chars: 17 } as const;

/** Colours by index (see BOARD_COLOURS), plus the sticky note's paper and ink. */
export interface Paint {
  colours: readonly string[];
  note: string;
  noteInk: string;
}
/** The picture: dark ink on white, plain hexes only (no theme variables outside the app). */
export const PICTURE_PAINT: Paint = {
  colours: ["#101828", "#2456e6", "#e5484d", "#30a46c"],
  note: "#fff6c7",
  noteInk: "#3b3300",
};

export const escapeXml = (text: string) =>
  text.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[c]!);

/** A note's text in lines of at most NOTE.chars characters, breaking at spaces where it can. */
export function noteLines(text: string): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split("\n")) {
    let line = "";
    for (let word of paragraph.split(/\s+/).filter(Boolean)) {
      while (word.length > NOTE.chars) {
        if (line) lines.push(line);
        lines.push(word.slice(0, NOTE.chars));
        word = word.slice(NOTE.chars);
        line = "";
      }
      if (!line) line = word;
      else if (line.length + 1 + word.length <= NOTE.chars) line += " " + word;
      else {
        lines.push(line);
        line = word;
      }
    }
    lines.push(line);
  }
  return lines;
}

/** Notes grow downward with their text. */
export const noteHeight = (text: string) => Math.max(NOTE.minHeight, 2 * NOTE.pad + noteLines(text).length * NOTE.line);

/** The two short strokes of an arrow head, ending at the tip. */
export function arrowHead(a: { x1: number; y1: number; x2: number; y2: number }): string {
  const angle = Math.atan2(a.y2 - a.y1, a.x2 - a.x1);
  const wing = (turn: number) =>
    `${(a.x2 - 26 * Math.cos(angle + turn)).toFixed(1)},${(a.y2 - 26 * Math.sin(angle + turn)).toFixed(1)}`;
  return `${wing(0.5)} ${a.x2},${a.y2} ${wing(-0.5)}`;
}

const line = (colour: string, width = PEN_WIDTH) =>
  `fill="none" stroke="${colour}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"`;
// On screen only: a wide invisible stroke so the eraser can hit thin lines.
const hitLine = `fill="none" stroke="transparent" stroke-width="28" pointer-events="stroke"`;

function itemMarkup(item: BoardItem, paint: Paint, hit: boolean): string {
  const open = `<g data-id="${escapeXml(item.id)}" data-kind="${item.kind}">`;
  switch (item.kind) {
    case "pen": {
      const points = item.points.join(" ");
      const shape = (attrs: string) => `<polyline points="${points}" ${attrs}/>`;
      return `${open}${shape(line(paint.colours[item.colour], item.width))}${hit ? shape(hitLine) : ""}</g>`;
    }
    case "box": {
      const shape = (attrs: string) => `<rect x="${item.x}" y="${item.y}" width="${item.w}" height="${item.h}" rx="6" ${attrs}/>`;
      return `${open}${shape(line(paint.colours[item.colour]))}${hit ? shape(hitLine) : ""}</g>`;
    }
    case "arrow": {
      const colour = paint.colours[item.colour];
      const shaft = (attrs: string) => `<line x1="${item.x1}" y1="${item.y1}" x2="${item.x2}" y2="${item.y2}" ${attrs}/>`;
      return `${open}${shaft(line(colour))}<polyline points="${arrowHead(item)}" ${line(colour)}/>${hit ? shaft(hitLine) : ""}</g>`;
    }
    case "text":
      return `${open}<text x="${item.x}" y="${item.y + Math.round(TEXT_SIZE * 0.8)}" font-size="${TEXT_SIZE}" fill="${paint.colours[item.colour]}">${escapeXml(item.text)}</text></g>`;
    case "note": {
      const lines = noteLines(item.text)
        .map((l, i) => `<tspan x="${item.x + NOTE.pad}" y="${item.y + NOTE.pad + Math.round(NOTE.font * 0.85) + i * NOTE.line}">${escapeXml(l)}</tspan>`)
        .join("");
      return `${open}<rect x="${item.x}" y="${item.y}" width="${NOTE.width}" height="${noteHeight(item.text)}" rx="6" fill="${paint.note}"/><text font-size="${NOTE.font}" fill="${paint.noteInk}">${lines}</text></g>`;
    }
  }
}

/** The items as SVG elements, in drawing order. `hit` adds the eraser's hit strokes. */
export const itemsMarkup = (items: readonly BoardItem[], paint: Paint, hit = false) =>
  items.map((item) => itemMarkup(item, paint, hit)).join("");

/** The board as a standalone SVG document: dark ink on white, every colour inlined. */
export function boardSvg(board: Board): string {
  const { width, height } = BOARD_SIZE;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" font-family="${FONT}">` +
    `<rect width="${width}" height="${height}" fill="#ffffff"/>${itemsMarkup(board.items, PICTURE_PAINT)}</svg>`
  );
}

/** The board as the JPEG the photo path sends: same encoder, size cap and metadata stripping. */
export async function boardPicture(board: Board, maxBytes: number): Promise<AttachedImage> {
  const url = URL.createObjectURL(new Blob([boardSvg(board)], { type: "image/svg+xml" }));
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    // sendSize: the picture's longest edge stays within IMAGE_MAX_EDGE (1568 px), like a photo.
    return await toAttachedImage(await encodeForSending(image, sendSize(BOARD_SIZE), [], maxBytes));
  } finally {
    URL.revokeObjectURL(url);
  }
}
