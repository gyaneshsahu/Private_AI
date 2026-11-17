// Live whiteboard study (docs/whiteboard-study-20261118.md): one question per synthetic sample to
// glm-5.3-flash through the Privatemode SDK, ONE verification for the whole run.
//   a = image only
//   b = image + the typed text elements as plain text
//   a1000 = image only, at 1,000 px on the long side (samples/small)
//   j1000 = as a1000, but JPEG quality 0.85 (the app's image path sends JPEG only)
//   c = image + typed text + a structured description of shapes and connections (diagram samples)
// Plus one text-only call, so the picture's prompt tokens can be worked out.
// Every reply is appended to results.jsonl as it arrives; a rerun skips finished items, so a crash
// never pays twice. A running euro guard stops the run before EUR 0.15.
//
//   Import-Module ./scripts/WindowsSecrets.psm1; Invoke-WithPrivateAiSecret -Name PRIVATEMODE_API_KEY -Action { npx tsx evaluation/whiteboard/whiteboard-probe.mts }
//   ... --only 01-equation-linear --arms a      (smoke one call first)
//   ... --rerun-empty --max-tokens 2000         (ask again only where the answer came back empty)
// Key from Windows Credential Manager, never printed. Synthetic samples only.
import { appendFileSync, existsSync, readdirSync, readFileSync } from "node:fs";
import { PrivatemodeAI } from "privatemode-ai";
import { chatEuros, pricesAt } from "../../shared/usage-config.ts";

const MODEL = "glm-5.3-flash";
const STOP_EUROS = 0.15;
const DIR = new URL("./samples/", import.meta.url);
const RESULTS = new URL("./results.jsonl", import.meta.url);
const flag = (name: string) => {
  const at = process.argv.indexOf(name);
  return at > 0 ? process.argv[at + 1] : undefined;
};
const only = flag("--only")?.split(",");
const arms = (flag("--arms") ?? "a,b,c").split(",");
const maxTokens = Number(flag("--max-tokens") ?? 700);
const rerunEmpty = process.argv.includes("--rerun-empty");
const DIAGRAMS = new Set(["05-flowchart", "06-architecture", "09-mind-map", "11-timeline", "12-sticky-notes", "15-venn", "08-bar-sketch", "s3-crossing-arrows"]);

type Element = { t: string; id?: string; x?: number; y?: number; w?: number; h?: number; label?: string; text?: string; from?: unknown; to?: unknown };
type Sample = { id: string; question: string; typedText: string[]; width: number; height: number; scene: Element[] };

/** Typed text as the app would send it next to the picture. */
const typedBlock = (s: Sample) =>
  s.typedText.length
    ? `\n\nTyped text on the whiteboard (made with the text tool, in the order it was added; handwriting is not included):\n${s.typedText.map((t) => `- ${t}`).join("\n")}`
    : "";

/** A structured description built from the scene (what the whiteboard's own data knows): shapes with typed labels and positions, and which shapes are joined. */
function structure(s: Sample) {
  const shapes = s.scene.filter((e) => ["rect", "ellipse", "diamond", "sticky", "text"].includes(e.t));
  const box = (e: Element) => (e.t === "sticky" ? { x: e.x!, y: e.y!, w: 230, h: 170 } : e.t === "text" ? { x: e.x! - 1, y: e.y! - 1, w: 2, h: 2 } : { x: e.x!, y: e.y!, w: e.w!, h: e.h! });
  const where = (e: Element) => {
    const b = box(e);
    return `x ${Math.round(((b.x + b.w / 2) / s.width) * 100)}%, y ${Math.round(((b.y + b.h / 2) / s.height) * 100)}%`;
  };
  const name = (e: Element) => e.label?.replace(/\n/g, " ") ?? e.text ?? e.t;
  const nearest = (end: unknown) => {
    if (typeof end === "string") return s.scene.find((e) => e.id === end);
    const [px, py] = end as [number, number];
    let best: Element | undefined, bestD = 80; // only shapes within 80 px of the line's end
    for (const e of shapes.filter((e) => e.t !== "text")) {
      const b = box(e);
      const d = Math.hypot(Math.max(b.x - px, 0, px - b.x - b.w), Math.max(b.y - py, 0, py - b.y - b.h));
      if (d < bestD) [best, bestD] = [e, d];
    }
    return best;
  };
  const lines = shapes.filter((e) => e.t !== "text" && name(e) !== e.t).map((e) => `- ${e.t === "rect" ? "box" : e.t} "${name(e)}" at ${where(e)}`);
  lines.push(...shapes.filter((e) => e.t === "text").map((e) => `- text "${name(e)}" at ${where(e)}`));
  for (const e of s.scene.filter((e) => e.t === "arrow" || e.t === "line")) {
    const a = nearest(e.from), b = nearest(e.to);
    if (a && b) lines.push(`- ${e.t === "arrow" ? "arrow" : "line"}: "${name(a)}" ${e.t === "arrow" ? "->" : "--"} "${name(b)}"`);
  }
  return `\n\nShapes on the whiteboard (from the board's data; positions in % of width and height; handwriting is not included):\n${lines.join("\n")}`;
}

const done = new Map<string, { content?: string; finish?: string }>();
if (existsSync(RESULTS))
  for (const line of readFileSync(RESULTS, "utf8").split("\n").filter(Boolean)) {
    const r = JSON.parse(line);
    done.set(`${r.id}/${r.arm}`, r);
  }
const samples: Sample[] = readdirSync(DIR)
  .filter((f) => f.endsWith(".json"))
  .sort()
  .map((f) => JSON.parse(readFileSync(new URL(f, DIR), "utf8")))
  .filter((s) => !only || only.includes(s.id));
const jobs: { s: Sample; arm: string }[] = [];
samples.forEach((s, i) => {
  // Alternate a and b first so warm-up does not favour one arm.
  const order = i % 2 ? ["b", "a", "c", "a1000", "j1000"] : ["a", "b", "c", "a1000", "j1000"];
  for (const arm of order.filter((a) => arms.includes(a))) {
    if (arm === "c" && !DIAGRAMS.has(s.id)) continue;
    const prev = done.get(`${s.id}/${arm}`);
    if (prev && !(rerunEmpty && !prev.content?.trim())) continue;
    jobs.push({ s, arm });
  }
});
const needBaseline = arms.includes("base") && !done.has("baseline/text");
console.log(JSON.stringify({ step: "plan", calls: jobs.length + (needBaseline ? 1 : 0), maxTokens }));
if (process.argv.includes("--dry")) {
  for (const { s, arm } of jobs) console.log(`--- ${s.id}/${arm}\n${s.question + (arm === "a" ? "" : typedBlock(s)) + (arm === "c" ? structure(s) : "")}`);
  process.exit(0);
}
if (!jobs.length && !needBaseline) process.exit(0);

const apiKey = process.env.PRIVATEMODE_API_KEY;
if (!apiKey) throw Error("PRIVATEMODE_API_KEY not loaded");
const prices = pricesAt();
let euros = [...done.values()].reduce((sum, r) => sum + ((r as { euros?: number }).euros ?? 0), 0);
const client = new PrivatemodeAI({ apiKey, enableWasmLogging: false, openAIOptions: { maxRetries: 0 } });
try {
  const verifyStart = performance.now();
  await client.verify();
  await client.refreshSecret();
  console.log(JSON.stringify({ step: "verified", ms: Math.round(performance.now() - verifyStart) }));
  const ask = async (id: string, arm: string, content: unknown, extra: Record<string, unknown> = {}) => {
    if (euros >= STOP_EUROS) throw Error(`Budget guard: EUR ${euros.toFixed(4)} spent, stopping before EUR ${STOP_EUROS}`);
    const started = performance.now();
    let row: Record<string, unknown>;
    try {
      const chat = await client.chat.completions.create(
        { model: MODEL, max_tokens: maxTokens, messages: [{ role: "user", content }] } as never,
        { headers: { "privatemode-target-model": MODEL } },
      );
      const message = chat.choices[0]?.message as { content?: string; reasoning_content?: string; reasoning?: string } | undefined;
      const u = chat.usage;
      const cost = u ? chatEuros(prices, MODEL, u.prompt_tokens, u.completion_tokens, u.prompt_tokens_details?.cached_tokens ?? 0) ?? 0 : 0;
      euros += cost;
      row = {
        id, arm, maxTokens, ...extra,
        ms: Math.round(performance.now() - started),
        finish: chat.choices[0]?.finish_reason,
        content: message?.content ?? "",
        reasoningChars: (message?.reasoning_content ?? message?.reasoning ?? "").length,
        usage: u,
        euros: cost,
      };
    } catch (error) {
      const { status, message } = error as { status?: unknown; message?: unknown };
      row = { id, arm, maxTokens, ...extra, failed: true, status, message: String(message).slice(0, 500), ms: Math.round(performance.now() - started) };
    }
    appendFileSync(RESULTS, JSON.stringify(row) + "\n");
    console.log(JSON.stringify({ id, arm, ms: row.ms, finish: row.finish, failed: row.failed, chars: String(row.content ?? "").length, tokens: row.usage, euros: Number(euros.toFixed(5)) }));
  };
  if (needBaseline) await ask("baseline", "text", samples[0]?.question ?? "Solve the equation on my whiteboard.");
  for (const { s, arm } of jobs) {
    // a1000 = image only, shrunk on the device to 1,000 px on the long side (fewer image tokens).
    // j1000 = the same as a1000 but JPEG quality 0.85, the format the app's image path sends.
    const png = readFileSync(new URL(`${arm.endsWith("1000") ? "small/" : ""}${s.id}.${arm === "j1000" ? "jpg" : "png"}`, DIR));
    const text = s.question + (arm.startsWith("a") ? "" : typedBlock(s)) + (arm === "c" ? structure(s) : "");
    await ask(s.id, arm, [
      { type: "text", text },
      { type: "image_url", image_url: { url: `data:image/${arm === "j1000" ? "jpeg" : "png"};base64,${png.toString("base64")}` } },
    ], { pngBytes: png.length, textChars: text.length });
  }
  console.log(JSON.stringify({ step: "done", euros: Number(euros.toFixed(5)) }));
} finally {
  client.close();
}
