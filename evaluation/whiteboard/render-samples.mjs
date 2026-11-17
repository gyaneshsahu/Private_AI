// Renders the 15 synthetic whiteboard samples of docs/whiteboard-study-20261118.md.
// Each sample is a scene list (the data a real whiteboard would keep): hand strokes, shapes,
// arrows, handwriting and typed text. The scene is drawn as rough SVG in headless Chromium and
// saved as a PNG of 1,500 px on the long side, next to a JSON with the typed text, the question,
// the ground truth and the scene. Synthetic content only.
//
//   node evaluation/whiteboard/render-samples.mjs
import { mkdirSync, writeFileSync } from "node:fs";
import { chromium } from "playwright";

const OUT = new URL("./samples/", import.meta.url);
mkdirSync(OUT, { recursive: true });

// Seeded random numbers, so a rerun draws the same boards.
let seed = 7;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const j = (amount) => (rnd() - 0.5) * 2 * amount;

const HAND = "'Ink Free', 'Segoe Print', cursive";
const HAND2 = "'Segoe Print', 'Ink Free', cursive";
const TYPED = "'Segoe UI', Arial, sans-serif";

/** A wobbly line from a to b, as a smooth path. */
function roughLine([x1, y1], [x2, y2], wobble = 2.5) {
  const len = Math.hypot(x2 - x1, y2 - y1);
  const n = Math.max(2, Math.round(len / 40));
  const nx = -(y2 - y1) / (len || 1), ny = (x2 - x1) / (len || 1);
  const pts = [];
  let drift = 0;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    drift = drift * 0.6 + j(wobble);
    const d = i === 0 || i === n ? j(1) : drift;
    pts.push([x1 + (x2 - x1) * t + nx * d, y1 + (y2 - y1) * t + ny * d]);
  }
  return "M" + pts.map((p) => p.map((v) => v.toFixed(1)).join(" ")).join(" L");
}
const path = (d, color, width) =>
  `<path d="${d}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"/>`;
function roughPoly(points, close, color, width) {
  const all = close ? [...points, points[0]] : points;
  let out = "";
  for (let i = 0; i < all.length - 1; i++) {
    // Overshoot a little at the corners, as a hand does.
    const [a, b] = [all[i], all[i + 1]];
    const o = 4 + j(3);
    const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy);
    out += path(roughLine([a[0] - (dx / l) * o * rnd(), a[1] - (dy / l) * o * rnd()], [b[0] + (dx / l) * o * rnd(), b[1] + (dy / l) * o * rnd()]), color, width);
  }
  return out;
}
function roughEllipse(cx, cy, rx, ry, color, width) {
  const pts = [];
  const start = rnd() * Math.PI * 2;
  for (let i = 0; i <= 40; i++) {
    const a = start + (i / 40) * Math.PI * 2.08;
    const r = 1 + j(0.025);
    pts.push([cx + Math.cos(a) * rx * r, cy + Math.sin(a) * ry * r]);
  }
  return path("M" + pts.map((p) => p.map((v) => v.toFixed(1)).join(" ")).join(" L"), color, width);
}
function arrowHead([x1, y1], [x2, y2], color, width) {
  const a = Math.atan2(y2 - y1, x2 - x1);
  const s = 22;
  const l = [x2 - s * Math.cos(a - 0.45 + j(0.08)), y2 - s * Math.sin(a - 0.45 + j(0.08))];
  const r = [x2 - s * Math.cos(a + 0.45 + j(0.08)), y2 - s * Math.sin(a + 0.45 + j(0.08))];
  return path(roughLine(l, [x2, y2], 1), color, width) + path(roughLine([x2, y2], r, 1), color, width);
}
/** Handwriting: a hand font with each letter turned and lifted a little. */
function hand(text, x, y, size, color, font = HAND, anchor = "start") {
  const chars = [...text];
  const rotate = chars.map(() => j(7).toFixed(1)).join(" ");
  let prev = 0;
  const dy = chars.map(() => { const next = j(size * 0.06); const d = next - prev; prev = next; return d.toFixed(1); }).join(" ");
  const esc = text.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  return `<text x="${x}" y="${y}" font-family="${font}" font-size="${size}" fill="${color}" rotate="${rotate}" dy="${dy}" text-anchor="${anchor}" transform="rotate(${j(2).toFixed(1)} ${x} ${y})">${esc}</text>`;
}
const typed = (text, x, y, size, color = "#1f2328", anchor = "middle", weight = 500) =>
  `<text x="${x}" y="${y}" font-family="${TYPED}" font-size="${size}" font-weight="${weight}" fill="${color}" text-anchor="${anchor}" dominant-baseline="middle">${text.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</text>`;

/**
 * Scene elements (what a whiteboard would store):
 *   { t: "hand", text, x, y, size, color? }           handwriting (pen strokes; NOT typed text)
 *   { t: "text", text, x, y, size?, color? }         typed with the text tool
 *   { t: "rect"|"ellipse"|"diamond", id?, x, y, w, h, label?, color?, fill? }  label is typed
 *   { t: "line"|"arrow", from:[x,y]|id, to:[x,y]|id, color? }
 *   { t: "stroke", points:[[x,y],...], color?, width? } free pen stroke
 *   { t: "sticky", x, y, text, color }               sticky note, typed text
 */
function draw(scene, width, height) {
  const byId = Object.fromEntries(scene.filter((e) => e.id).map((e) => [e.id, e]));
  const anchor = (end, other) => {
    if (Array.isArray(end)) return end;
    const e = byId[end];
    const c = [e.x + e.w / 2, e.y + e.h / 2];
    const o = Array.isArray(other) ? other : [byId[other].x + byId[other].w / 2, byId[other].y + byId[other].h / 2];
    // Stop at the shape's edge (box approximation), with a small gap.
    const dx = o[0] - c[0], dy = o[1] - c[1];
    const k = Math.min(Math.abs((e.w / 2 + 10) / (dx || 1e-9)), Math.abs((e.h / 2 + 10) / (dy || 1e-9)));
    return [c[0] + dx * k, c[1] + dy * k];
  };
  let svg = "";
  for (const e of scene) {
    const color = e.color ?? "#222";
    if (e.t === "hand") svg += hand(e.text, e.x, e.y, e.size ?? 54, color, e.font ?? HAND, e.anchor);
    else if (e.t === "text") svg += typed(e.text, e.x, e.y, e.size ?? 34, color, e.anchor ?? "middle");
    else if (e.t === "rect") {
      if (e.fill) svg += `<rect x="${e.x}" y="${e.y}" width="${e.w}" height="${e.h}" fill="${e.fill}" opacity="0.55"/>`;
      svg += roughPoly([[e.x, e.y], [e.x + e.w, e.y], [e.x + e.w, e.y + e.h], [e.x, e.y + e.h]], true, color, 4);
    } else if (e.t === "ellipse") svg += roughEllipse(e.x + e.w / 2, e.y + e.h / 2, e.w / 2, e.h / 2, color, 4);
    else if (e.t === "diamond")
      svg += roughPoly([[e.x + e.w / 2, e.y], [e.x + e.w, e.y + e.h / 2], [e.x + e.w / 2, e.y + e.h], [e.x, e.y + e.h / 2]], true, color, 4);
    else if (e.t === "line" || e.t === "arrow") {
      const a = anchor(e.from, e.to), b = anchor(e.to, e.from);
      const pts = e.via ? [a, ...e.via, b] : [a, b];
      for (let i = 0; i < pts.length - 1; i++) svg += path(roughLine(pts[i], pts[i + 1]), color, e.width ?? 4);
      if (e.t === "arrow") svg += arrowHead(pts[pts.length - 2], b, color, e.width ?? 4);
    } else if (e.t === "stroke") {
      for (let i = 0; i < e.points.length - 1; i++) svg += path(roughLine(e.points[i], e.points[i + 1], 1.5), color, e.width ?? 4);
    } else if (e.t === "sticky") {
      const w = 230, h = 170, r = j(3).toFixed(1);
      svg += `<g transform="rotate(${r} ${e.x + w / 2} ${e.y + h / 2})"><rect x="${e.x + 6}" y="${e.y + 8}" width="${w}" height="${h}" fill="#0002"/><rect x="${e.x}" y="${e.y}" width="${w}" height="${h}" fill="${e.color}"/>`;
      const words = e.text.split(" ");
      const lines = [];
      for (const w0 of words) (lines.length && (lines.at(-1) + " " + w0).length <= 12 ? (lines[lines.length - 1] += " " + w0) : lines.push(w0));
      lines.forEach((line, i) => (svg += typed(line, e.x + w / 2, e.y + h / 2 + (i - (lines.length - 1) / 2) * 38, 32)));
      svg += "</g>";
    }
    if (["rect", "ellipse", "diamond"].includes(e.t) && e.label) {
      const lines = e.label.split("\n");
      lines.forEach((line, i) => (svg += typed(line, e.x + e.w / 2, e.y + e.h / 2 + (i - (lines.length - 1) / 2) * 36, e.size ?? 30)));
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="#fbfbf8"/>${svg}</svg>`;
}

/** Typed text elements, in the order they were made (the order a whiteboard keeps). */
const typedText = (scene) =>
  scene.flatMap((e) => (e.t === "text" || e.t === "sticky" ? [e.text] : ["rect", "ellipse", "diamond"].includes(e.t) && e.label ? [e.label.replace(/\n/g, " ")] : []));

const BLUE = "#1d4ed8", RED = "#c62828", GREEN = "#2e7d32", BLACK = "#222";
const SAMPLES = [
  {
    id: "01-equation-linear", category: "equation", w: 1500, h: 1000,
    question: "Solve the equation on my whiteboard. Give the value of x.",
    groundTruth: "x = 6 (2x = 12).",
    scene: [
      { t: "hand", text: "2x + 5 = 17", x: 330, y: 420, size: 150, color: BLUE },
      { t: "hand", text: "x = ?", x: 560, y: 700, size: 120, color: BLUE },
      { t: "stroke", points: [[300, 470], [1250, 480]], color: BLUE, width: 3 },
    ],
  },
  {
    id: "02-equation-fraction", category: "equation", w: 1500, h: 1000,
    question: "Work out the sum written on my whiteboard. Give the result as a fraction in lowest terms.",
    groundTruth: "3/4 + 2/3 = 17/12 (= 1 5/12, about 1.417).",
    scene: [
      { t: "hand", text: "3", x: 400, y: 400, size: 150, color: BLACK },
      { t: "stroke", points: [[360, 450], [520, 455]], color: BLACK, width: 7 },
      { t: "hand", text: "4", x: 400, y: 610, size: 150, color: BLACK },
      { t: "hand", text: "+", x: 600, y: 520, size: 150, color: BLACK },
      { t: "hand", text: "2", x: 800, y: 400, size: 150, color: BLACK },
      { t: "stroke", points: [[760, 455], [920, 450]], color: BLACK, width: 7 },
      { t: "hand", text: "3", x: 800, y: 610, size: 150, color: BLACK },
      { t: "hand", text: "= ?", x: 1010, y: 520, size: 150, color: BLACK },
    ],
  },
  {
    id: "03-equation-quadratic", category: "equation", w: 1500, h: 1000,
    question: "Solve the equation on my whiteboard. Give all solutions.",
    groundTruth: "x = 2 and x = 3 ((x - 2)(x - 3) = 0).",
    scene: [
      { t: "text", text: "Solve for x", x: 750, y: 180, size: 54 },
      { t: "hand", text: "x² − 5x + 6 = 0", x: 220, y: 520, size: 140, color: GREEN },
    ],
  },
  {
    id: "04-right-triangle", category: "geometry", w: 1500, h: 1100,
    question: "How long is side c in the triangle on my whiteboard?",
    groundTruth: "c = 10 cm (hypotenuse; 6² + 8² = 100).",
    scene: [
      { t: "line", from: [300, 900], to: [300, 300] },
      { t: "line", from: [300, 900], to: [1100, 900] },
      { t: "line", from: [300, 300], to: [1100, 900] },
      { t: "stroke", points: [[300, 840], [360, 840], [360, 900]], width: 3 },
      { t: "text", text: "a = 6 cm", x: 180, y: 600, size: 40 },
      { t: "text", text: "b = 8 cm", x: 700, y: 960, size: 40 },
      { t: "hand", text: "c = ?", x: 760, y: 560, size: 80, color: RED },
    ],
  },
  {
    id: "05-flowchart", category: "diagram", w: 1500, h: 1200,
    question: "Follow the flowchart on my whiteboard. What happens when the temperature is 25?",
    groundTruth: "25 is not above 30, so the No branch: wait 5 min, then go back to Read temperature (a loop). The fan is not turned on.",
    scene: [
      { t: "ellipse", id: "s", x: 600, y: 60, w: 300, h: 110, label: "Start" },
      { t: "rect", id: "r", x: 560, y: 260, w: 380, h: 120, label: "Read temperature" },
      { t: "diamond", id: "d", x: 570, y: 470, w: 360, h: 260, label: "Temp > 30?" },
      { t: "rect", id: "f", x: 1060, y: 540, w: 340, h: 120, label: "Turn on fan" },
      { t: "rect", id: "w", x: 100, y: 540, w: 340, h: 120, label: "Wait 5 min" },
      { t: "arrow", from: "s", to: "r" },
      { t: "arrow", from: "r", to: "d" },
      { t: "arrow", from: [930, 600], to: "f" },
      { t: "arrow", from: [570, 600], to: "w" },
      { t: "arrow", from: [270, 540], to: [560, 320], via: [[270, 320]] },
      { t: "hand", text: "yes", x: 960, y: 570, size: 54, color: GREEN },
      { t: "hand", text: "no", x: 470, y: 570, size: 54, color: RED },
      { t: "ellipse", id: "e", x: 1080, y: 860, w: 300, h: 110, label: "End" },
      { t: "arrow", from: "f", to: "e" },
    ],
  },
  {
    id: "06-architecture", category: "diagram", w: 1500, h: 1000,
    question: "In the architecture sketch on my whiteboard, which parts does the browser talk to directly, and where is the data stored?",
    groundTruth: "The browser talks only to the API server (over HTTPS). The server talks to the database (stores the data) and to the cache; the browser never reaches the database directly.",
    scene: [
      { t: "rect", id: "db", x: 1100, y: 200, w: 300, h: 150, label: "Database" },
      { t: "rect", id: "b", x: 80, y: 380, w: 300, h: 150, label: "Browser" },
      { t: "rect", id: "s", x: 600, y: 380, w: 300, h: 150, label: "API server" },
      { t: "rect", id: "c", x: 1100, y: 620, w: 300, h: 150, label: "Cache" },
      { t: "arrow", from: "b", to: "s" },
      { t: "arrow", from: "s", to: "db" },
      { t: "arrow", from: "s", to: "c" },
      { t: "hand", text: "HTTPS", x: 410, y: 430, size: 48, color: BLUE },
      { t: "hand", text: "SQL", x: 930, y: 330, size: 48, color: BLUE },
      { t: "hand", text: "sessions", x: 930, y: 660, size: 48, color: BLUE },
    ],
  },
  {
    id: "07-messy-notes", category: "handwriting", w: 1100, h: 1500,
    question: "Which tasks on my whiteboard notes are still open, that is, not crossed out?",
    groundTruth: "Call plumber and fix bike tyre are open. Buy milk and return library book are crossed out.",
    scene: [
      { t: "hand", text: "To do sat", x: 120, y: 200, size: 90, color: BLACK, font: HAND2 },
      { t: "hand", text: "- buy milk", x: 140, y: 420, size: 72, color: BLACK },
      { t: "stroke", points: [[150, 400], [300, 395], [520, 405]], color: BLACK, width: 6 },
      { t: "hand", text: "- call plumber", x: 140, y: 620, size: 72, color: BLACK },
      { t: "hand", text: "- return library book", x: 140, y: 820, size: 72, color: BLACK },
      { t: "stroke", points: [[150, 800], [500, 790], [860, 805]], color: BLACK, width: 6 },
      { t: "hand", text: "- fix bike tyre!!", x: 140, y: 1020, size: 72, color: BLACK },
      { t: "hand", text: "(before 4)", x: 600, y: 1150, size: 56, color: "#555" },
    ],
  },
  {
    id: "08-bar-sketch", category: "chart", w: 1500, h: 1100,
    question: "Read the bar sketch on my whiteboard. Which day has the highest value, and what is the total of all four days?",
    groundTruth: "Wednesday is highest (15). Total 12 + 7 + 15 + 9 = 43.",
    scene: [
      { t: "text", text: "Cups sold per day", x: 750, y: 90, size: 46 },
      { t: "line", from: [200, 950], to: [200, 150] },
      { t: "line", from: [200, 950], to: [1350, 950] },
      { t: "rect", x: 280, y: 950 - 12 * 48, w: 180, h: 12 * 48, fill: "#93c5fd" },
      { t: "rect", x: 540, y: 950 - 7 * 48, w: 180, h: 7 * 48, fill: "#93c5fd" },
      { t: "rect", x: 800, y: 950 - 15 * 48, w: 180, h: 15 * 48, fill: "#93c5fd" },
      { t: "rect", x: 1060, y: 950 - 9 * 48, w: 180, h: 9 * 48, fill: "#93c5fd" },
      { t: "text", text: "Mon", x: 370, y: 1000, size: 38 },
      { t: "text", text: "Tue", x: 630, y: 1000, size: 38 },
      { t: "text", text: "Wed", x: 890, y: 1000, size: 38 },
      { t: "text", text: "Thu", x: 1150, y: 1000, size: 38 },
      { t: "hand", text: "12", x: 335, y: 950 - 12 * 48 - 20, size: 60, color: RED },
      { t: "hand", text: "7", x: 610, y: 950 - 7 * 48 - 20, size: 60, color: RED },
      { t: "hand", text: "15", x: 855, y: 950 - 15 * 48 - 20, size: 60, color: RED },
      { t: "hand", text: "9", x: 1130, y: 950 - 9 * 48 - 20, size: 60, color: RED },
    ],
  },
  {
    id: "09-mind-map", category: "diagram", w: 1500, h: 1000,
    question: "In the mind map on my whiteboard, which items belong to the Transport branch?",
    groundTruth: "Train and Bike (Picnic is under Food, EUR 200 under Budget).",
    scene: [
      { t: "ellipse", id: "fd", x: 1080, y: 120, w: 260, h: 110, label: "Food" },
      { t: "ellipse", id: "c", x: 560, y: 430, w: 380, h: 150, label: "Trip planning" },
      { t: "rect", id: "bike", x: 60, y: 700, w: 200, h: 90, label: "Bike" },
      { t: "ellipse", id: "tr", x: 180, y: 120, w: 300, h: 110, label: "Transport" },
      { t: "rect", id: "pic", x: 1180, y: 380, w: 220, h: 90, label: "Picnic" },
      { t: "rect", id: "train", x: 40, y: 380, w: 200, h: 90, label: "Train" },
      { t: "ellipse", id: "bu", x: 1040, y: 760, w: 260, h: 110, label: "Budget" },
      { t: "rect", id: "eur", x: 700, y: 820, w: 220, h: 90, label: "€200" },
      { t: "line", from: "c", to: "tr" },
      { t: "line", from: "c", to: "fd" },
      { t: "line", from: "c", to: "bu" },
      { t: "line", from: "tr", to: "train" },
      { t: "line", from: "train", to: "bike" },
      { t: "line", from: "fd", to: "pic" },
      { t: "line", from: "bu", to: "eur" },
    ],
  },
  {
    id: "10-hand-table", category: "table", w: 1500, h: 1000,
    question: "Using the table on my whiteboard, what is the total cost of the shopping (quantity times price, all rows)?",
    groundTruth: "3 x 0.50 + 1 x 2.20 + 2 x 3.10 = 1.50 + 2.20 + 6.20 = 9.90.",
    scene: [
      ...[200, 350, 500, 650, 800].map((y) => ({ t: "line", from: [150, y], to: [1350, y] })),
      ...[150, 650, 950, 1350].map((x) => ({ t: "line", from: [x, 200], to: [x, 800] })),
      { t: "text", text: "Item", x: 400, y: 275, size: 46 },
      { t: "text", text: "Qty", x: 800, y: 275, size: 46 },
      { t: "text", text: "Price each", x: 1150, y: 275, size: 46 },
      { t: "hand", text: "Apples", x: 200, y: 450, size: 70 },
      { t: "hand", text: "3", x: 780, y: 450, size: 70 },
      { t: "hand", text: "0.50", x: 1080, y: 450, size: 70 },
      { t: "hand", text: "Bread", x: 200, y: 600, size: 70 },
      { t: "hand", text: "1", x: 780, y: 600, size: 70 },
      { t: "hand", text: "2.20", x: 1080, y: 600, size: 70 },
      { t: "hand", text: "Cheese", x: 200, y: 750, size: 70 },
      { t: "hand", text: "2", x: 780, y: 750, size: 70 },
      { t: "hand", text: "3.10", x: 1080, y: 750, size: 70 },
    ],
  },
  {
    id: "11-timeline", category: "diagram", w: 1500, h: 900,
    question: "On the timeline on my whiteboard, what happened two years after the prototype?",
    groundTruth: "First users (2021); the prototype was in 2019.",
    scene: [
      { t: "arrow", from: [100, 500], to: [1420, 500], width: 5 },
      ...[250, 580, 910, 1240].map((x) => ({ t: "line", from: [x, 470], to: [x, 530] })),
      { t: "hand", text: "2019", x: 190, y: 620, size: 64, color: BLUE },
      { t: "hand", text: "2021", x: 520, y: 620, size: 64, color: BLUE },
      { t: "hand", text: "2023", x: 850, y: 620, size: 64, color: BLUE },
      { t: "hand", text: "2025", x: 1180, y: 620, size: 64, color: BLUE },
      { t: "text", text: "Launch", x: 1240, y: 380, size: 42 },
      { t: "text", text: "Prototype", x: 250, y: 380, size: 42 },
      { t: "text", text: "Funding", x: 910, y: 380, size: 42 },
      { t: "text", text: "First users", x: 580, y: 380, size: 42 },
      ...[250, 580, 910, 1240].map((x) => ({ t: "arrow", from: [x, 410], to: [x, 465], width: 3 })),
    ],
  },
  {
    id: "12-sticky-notes", category: "sticky", w: 1500, h: 1000,
    question: "Which tasks on my whiteboard are in the Done column?",
    groundTruth: "Set up repo and Draft budget.",
    scene: [
      { t: "sticky", x: 1100, y: 250, text: "Set up repo", color: "#fde68a" },
      { t: "text", text: "To do", x: 250, y: 120, size: 50 },
      { t: "sticky", x: 135, y: 250, text: "Write tests", color: "#fde68a" },
      { t: "sticky", x: 620, y: 250, text: "Design logo", color: "#bbf7d0" },
      { t: "text", text: "Done", x: 1215, y: 120, size: 50 },
      { t: "sticky", x: 135, y: 560, text: "Fix login bug", color: "#fbcfe8" },
      { t: "text", text: "Doing", x: 735, y: 120, size: 50 },
      { t: "sticky", x: 1100, y: 560, text: "Draft budget", color: "#bfdbfe" },
      { t: "line", from: [500, 80], to: [500, 940] },
      { t: "line", from: [1000, 80], to: [1000, 940] },
    ],
  },
  {
    id: "13-equation-system", category: "equation", w: 1500, h: 1000,
    question: "Solve the two equations on my whiteboard for x and y.",
    groundTruth: "x = 7, y = 3.",
    scene: [
      { t: "hand", text: "x + y = 10", x: 420, y: 380, size: 130, color: BLACK, font: HAND2 },
      { t: "hand", text: "x − y = 4", x: 420, y: 640, size: 130, color: BLACK, font: HAND2 },
      { t: "stroke", points: [[360, 270], [330, 420], [345, 560], [360, 690]], width: 5 },
    ],
  },
  {
    id: "14-circle-area", category: "geometry", w: 1500, h: 1500,
    question: "What is the area of the circle on my whiteboard?",
    groundTruth: "Radius 5 cm, so area = 25π ≈ 78.5 cm².",
    scene: [
      { t: "ellipse", x: 300, y: 350, w: 900, h: 900 },
      { t: "stroke", points: [[750, 800], [1200, 800]], width: 4 },
      { t: "stroke", points: [[740, 790], [760, 810]], width: 6 },
      { t: "hand", text: "r = 5 cm", x: 820, y: 770, size: 70, color: RED },
      { t: "text", text: "Area?", x: 750, y: 200, size: 56 },
    ],
  },
  {
    id: "15-venn", category: "diagram", w: 1500, h: 1000,
    question: "From the Venn diagram on my whiteboard, how many people like dogs in total?",
    groundTruth: "8 (5 dogs only + 3 both).",
    scene: [
      { t: "ellipse", x: 200, y: 200, w: 650, h: 600, color: BLUE },
      { t: "ellipse", x: 650, y: 200, w: 650, h: 600, color: RED },
      { t: "text", text: "Dogs", x: 1150, y: 160, size: 50 },
      { t: "text", text: "Cats", x: 350, y: 160, size: 50 },
      { t: "hand", text: "8", x: 400, y: 540, size: 110 },
      { t: "hand", text: "3", x: 720, y: 540, size: 110 },
      { t: "hand", text: "5", x: 1050, y: 540, size: 110 },
      { t: "text", text: "Who likes which pet", x: 750, y: 900, size: 40 },
    ],
  },];
// Stress set: harder boards added after the first 15 all came back correct (small cursive,
// low-contrast marker, crossing arrows, dense lists).
const SCRIPT = "'Segoe Script', 'Ink Free', cursive";
SAMPLES.push(
  {
    id: "s1-cursive-note", category: "stress", w: 1500, h: 1000,
    question: "According to the note on my whiteboard, when and where is the meeting now, and what revenue figure is mentioned?",
    groundTruth: "Thursday 14:30 in room 2B; revenue 48,250.",
    scene: [
      { t: "hand", text: "Meeting moved to Thursday 14:30,", x: 90, y: 300, size: 46, font: SCRIPT },
      { t: "hand", text: "room 2B (not 3A any more).", x: 90, y: 400, size: 46, font: SCRIPT },
      { t: "hand", text: "Bring the Q3 numbers - revenue 48,250", x: 90, y: 500, size: 46, font: SCRIPT },
      { t: "hand", text: "and the hiring plan.", x: 90, y: 600, size: 46, font: SCRIPT },
      { t: "stroke", points: [[700, 400], [880, 405]], width: 4 },
    ],
  },
  {
    id: "s2-faint-marker", category: "stress", w: 1500, h: 1000,
    question: "Solve the equation on my whiteboard for x.",
    groundTruth: "7x - 4 = 3x + 20, so 4x = 24, x = 6.",
    scene: [
      { t: "hand", text: "7x − 4 = 3x + 20", x: 520, y: 520, size: 64, color: "#e8cf3a" },
    ],
  },
  {
    id: "s3-crossing-arrows", category: "stress", w: 1500, h: 1000,
    question: "In the diagram on my whiteboard, which box does Billing point to, and which box points into Email?",
    groundTruth: "Billing points to Login. Cart points into Email (the two diagonal arrows cross).",
    scene: [
      { t: "rect", id: "login", x: 100, y: 120, w: 280, h: 120, label: "Login" },
      { t: "rect", id: "cart", x: 1100, y: 120, w: 280, h: 120, label: "Cart" },
      { t: "rect", id: "bill", x: 1100, y: 740, w: 280, h: 120, label: "Billing" },
      { t: "rect", id: "mail", x: 100, y: 740, w: 280, h: 120, label: "Email" },
      { t: "arrow", from: "login", to: "cart" },
      { t: "arrow", from: "cart", to: "mail" },
      { t: "arrow", from: "bill", to: "login" },
      { t: "arrow", from: "mail", to: "bill" },
    ],
  },
  {
    id: "s4-small-table", category: "stress", w: 1500, h: 1000,
    question: "Add up the Hours column in the table on my whiteboard.",
    groundTruth: "14 + 27 + 9 + 33 + 18 = 101.",
    scene: [
      ...[150, 280, 410, 540, 670, 800, 930].map((y) => ({ t: "line", from: [300, y], to: [1200, y] })),
      ...[300, 800, 1200].map((x) => ({ t: "line", from: [x, 150], to: [x, 930] })),
      { t: "hand", text: "Task", x: 340, y: 235, size: 44, font: SCRIPT },
      { t: "hand", text: "Hours", x: 840, y: 235, size: 44, font: SCRIPT },
      ...[["design", 14], ["build", 27], ["test", 9], ["docs", 33], ["deploy", 18]].flatMap(([name, h], i) => [
        { t: "hand", text: name, x: 340, y: 365 + i * 130, size: 44, font: SCRIPT },
        { t: "hand", text: String(h), x: 900, y: 365 + i * 130, size: 44, font: SCRIPT },
      ]),
    ],
  },
  {
    id: "s5-long-list", category: "stress", w: 1100, h: 1500,
    question: "On my whiteboard list, how many items are NOT crossed out, and which item is crossed out?",
    groundTruth: "9 items are not crossed out; 'paint fence' is crossed out (10 items in all).",
    scene: [
      ...["oil change", "renew passport", "paint fence", "book dentist", "water plants", "pay rent", "sort photos", "clean gutters", "buy stamps", "fix tap"].map((item, i) => ({ t: "hand", text: `${i + 1}. ${item}`, x: 120, y: 150 + i * 125, size: 50, font: i % 2 ? HAND : SCRIPT })),
      { t: "stroke", points: [[120, 385], [560, 375]], width: 5 },
    ],
  },
  {
    id: "s6-angles", category: "stress", w: 1500, h: 1000,
    question: "What is the missing angle in the triangle on my whiteboard?",
    groundTruth: "180 - 90 - 35 = 55 degrees.",
    scene: [
      { t: "line", from: [250, 850], to: [1250, 850] },
      { t: "line", from: [250, 850], to: [250, 200] },
      { t: "line", from: [250, 200], to: [1250, 850] },
      { t: "stroke", points: [[250, 800], [300, 800], [300, 850]], width: 3 },
      { t: "hand", text: "35°", x: 1040, y: 820, size: 48, color: BLUE },
      { t: "hand", text: "?", x: 280, y: 300, size: 60, color: RED },
    ],
  },
  {
    id: "s7-dense-small", category: "stress", w: 1500, h: 1000,
    question: "Three things on my whiteboard: what budget cap is written in the bottom-right note, which box does the arrow from QA review point to, and what is x in the small equation at the bottom left?",
    groundTruth: "Budget cap 3,450. QA review points to Release notes. 3x - 7 = 2x + 9 gives x = 16.",
    scene: [
      ...["Kick-off", "Scope draft", "Vendor list", "Risk log", "Design spec", "API stubs", "QA review", "Load test", "Release notes", "Training", "Go-live", "Retro"].map((label, i) => ({
        t: "rect", id: `b${i}`, x: 60 + (i % 4) * 360, y: 60 + Math.floor(i / 4) * 230, w: 230, h: 90, label, size: 18,
      })),
      { t: "arrow", from: "b0", to: "b1", width: 2 },
      { t: "arrow", from: "b1", to: "b5", width: 2 },
      { t: "arrow", from: "b6", to: "b8", width: 2 },
      { t: "arrow", from: "b4", to: "b9", width: 2 },
      { t: "arrow", from: "b7", to: "b10", width: 2 },
      { t: "hand", text: "ask Ola re: vendor", x: 1100, y: 190, size: 26, color: BLUE },
      { t: "hand", text: "risk: late API", x: 470, y: 420, size: 26, color: RED },
      { t: "hand", text: "3x − 7 = 2x + 9", x: 70, y: 820, size: 28 },
      { t: "hand", text: "x = ?", x: 100, y: 870, size: 28 },
      { t: "rect", x: 1150, y: 760, w: 300, h: 180, fill: "#fde68a" },
      { t: "hand", text: "budget cap:", x: 1175, y: 820, size: 28 },
      { t: "hand", text: "3,450 EUR", x: 1175, y: 880, size: 28 },
      { t: "text", text: "Q1 plan", x: 750, y: 960, size: 20 },
    ],
  },
);

const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 1, viewport: { width: 1500, height: 1500 } });
await page.setContent(`<div style="font-family:'Ink Free'">a</div><div style="font-family:'Segoe Print'">a</div>`);
const fonts = await page.evaluate(async () => {
  await document.fonts.ready;
  // document.fonts.check is true for missing fonts too; compare widths with a fallback instead.
  const width = (font) => { const c = document.createElement("canvas").getContext("2d"); c.font = `40px ${font}`; return c.measureText("Handwriting 2x+5").width; };
  return { inkFree: width("'Ink Free', monospace") !== width("monospace"), segoePrint: width("'Segoe Print', monospace") !== width("monospace") };
});
if (!fonts.inkFree || !fonts.segoePrint) throw Error(`Hand fonts missing: ${JSON.stringify(fonts)}`);
for (const s of SAMPLES) {
  await page.setViewportSize({ width: s.w, height: s.h });
  await page.setContent(`<html><body style="margin:0">${draw(s.scene, s.w, s.h)}</body></html>`);
  await page.evaluate(() => document.fonts.ready);
  const png = await page.locator("svg").screenshot({ type: "png" });
  if (Math.max(png.readUInt32BE(16), png.readUInt32BE(20)) < 1450) throw Error(`${s.id}: too small`);
  writeFileSync(new URL(`${s.id}.png`, OUT), png);
  const { w, h, scene, ...rest } = s;
  writeFileSync(new URL(`${s.id}.json`, OUT), JSON.stringify({ ...rest, width: png.readUInt32BE(16), height: png.readUInt32BE(20), pngBytes: png.length, typedText: typedText(scene), scene }, null, 2) + "\n");
  console.log(s.id, `${png.readUInt32BE(16)}x${png.readUInt32BE(20)}`, png.length, "bytes", JSON.stringify(typedText(scene)));
}
mkdirSync(new URL("small/", OUT), { recursive: true });
for (const s of SAMPLES) {
  const b64 = (await import("node:fs")).readFileSync(new URL(`${s.id}.png`, OUT)).toString("base64");
  const small = await page.evaluate(async (src) => {
    const img = new Image();
    img.src = src;
    await img.decode();
    const k = 1000 / Math.max(img.width, img.height);
    const c = document.createElement("canvas");
    c.width = Math.round(img.width * k);
    c.height = Math.round(img.height * k);
    const g = c.getContext("2d");
    g.imageSmoothingQuality = "high";
    g.drawImage(img, 0, 0, c.width, c.height);
    // JPEG at quality 0.85, the app's first encode step (src/image-upload.ts ENCODE_STEPS).
    return [c.toDataURL("image/png").split(",")[1], c.toDataURL("image/jpeg", 0.85).split(",")[1]];
  }, `data:image/png;base64,${b64}`);
  writeFileSync(new URL(`small/${s.id}.png`, OUT), Buffer.from(small[0], "base64"));
  writeFileSync(new URL(`small/${s.id}.jpg`, OUT), Buffer.from(small[1], "base64"));
}
await browser.close();
