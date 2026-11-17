// The whiteboard picture's SVG (src/whiteboard-render.ts): plain hex colours on white, escaped
// text, notes wrapped by hand, nothing that needs the app's styles or HTML inside the SVG.
import { expect, it } from "vitest";
import { boardSchema, type Board } from "../shared/whiteboard";
import { boardSvg, NOTE, noteLines } from "../src/whiteboard-render";

const board: Board = {
  changedAt: "2026-11-17T12:00:00.000Z",
  items: [
    { id: "p", kind: "pen", colour: 0, width: 5, points: [10, 10, 40, 40, 80, 20] },
    { id: "b", kind: "box", colour: 1, x: 100, y: 100, w: 300, h: 200 },
    { id: "a", kind: "arrow", colour: 2, x1: 500, y1: 500, x2: 700, y2: 400 },
    { id: "t", kind: "text", colour: 3, x: 50, y: 800, text: `Tom & Jerry <script> "quoted"` },
    { id: "n", kind: "note", x: 1000, y: 100, text: "Budget at most 4,000 euros for furniture and a supercalifragilistic table" },
  ],
};

it("is a standalone SVG with every colour inlined as hex on white", () => {
  expect(boardSchema.safeParse(board).success).toBe(true);
  const svg = boardSvg(board);
  expect(svg).toMatch(/^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" width="1600" height="1000"/);
  expect(svg).toContain('fill="#ffffff"');
  for (const hex of ["#101828", "#2456e6", "#e5484d", "#30a46c", "#fff6c7", "#3b3300"]) expect(svg).toContain(hex);
  expect(svg).toContain('font-family="Segoe UI, Arial, sans-serif"');
  expect(svg).not.toContain("var(");
  expect(svg).not.toContain("foreignObject");
  // Nothing on screen only: the eraser's hit strokes stay out of the picture.
  expect(svg).not.toContain("transparent");
});

it("escapes text for XML", () => {
  const svg = boardSvg(board);
  expect(svg).toContain("Tom &amp; Jerry &lt;script&gt; &quot;quoted&quot;");
  expect(svg).not.toContain("<script>");
  expect(boardSvg({ ...board, items: [{ id: `x"<&`, kind: "text", colour: 0, x: 1, y: 1, text: "a" }] })).toContain('data-id="x&quot;&lt;&amp;"');
});

it("wraps note text into lines that fit the note", () => {
  const lines = noteLines(board.items[4].kind === "note" ? board.items[4].text : "");
  expect(lines.length).toBeGreaterThan(3);
  // A word longer than a line is cut at the line length.
  expect(lines).toContain("supercalifragilis");
  for (const line of lines) expect(line.length).toBeLessThanOrEqual(NOTE.chars);
  expect(lines.join(" ").replace("supercalifragilis tic", "supercalifragilistic")).toBe(
    "Budget at most 4,000 euros for furniture and a supercalifragilistic table",
  );
  expect(noteLines("one\ntwo")).toEqual(["one", "two"]);
  const svg = boardSvg(board);
  expect(svg.match(/<tspan /g)?.length).toBe(lines.length);
});
