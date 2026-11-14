// What one chat request carries, per part, without any network call (docs/prompt-size-20261114.md).
// Runs the app's own streamVerifiedConversation with a stand-in Privatemode adapter whose transport
// records the request body instead of sending it, so the body is exactly what the app would send.
//
//   npx tsx evaluation/prompt-size/measure.ts          tables (Markdown)
//   npx tsx evaluation/prompt-size/measure.ts --json   one JSON object per case
//
// Tokens are an ESTIMATE: characters / 3.6 for English text and JSON, / 3.2 for German text. The
// chat template adds a few tokens per message on top; pictures are counted by the provider, not here.
// Under tsx `import.meta.env` is empty, so the memory and project switches are off: that case
// puts the real memoryBlock and project wrapper in front of the question the way composeContext does.
import { emptyConversation, type Conversation } from "../../shared/contracts";
import { newMessage } from "../../src/conversation";
import { streamVerifiedConversation, type VerifiedChatPolicy } from "../../src/verified-chat";
import {
  inferenceClientFor,
  registerInferenceClient,
} from "../../src/providers/inference-client";
import { memoryBlock } from "../../src/memory";
import { INSTRUCTIONS_NOTE } from "../../src/projects";

(globalThis as { location?: unknown }).location = { host: "localhost", origin: "http://localhost" };

// The stand-in: the real adapter's body fields (reasoning effort, cache salt), no verification and no send.
const real = inferenceClientFor("privatemode");
class Captured extends Error {
  constructor(readonly body: Record<string, unknown>) {
    super("captured");
  }
}
registerInferenceClient("privatemode", () => ({
  id: "privatemode",
  requestHeaders: real.requestHeaders,
  modelOptions: real.modelOptions,
  cacheOptions: real.cacheOptions,
  async verify() {
    return {
      evidence: { host: "offline", releaseDigest: "0".repeat(64) },
      async transport() {
        return {
          async request(_url: string, init: RequestInit) {
            throw new Captured(JSON.parse(String(init.body)));
          },
        };
      },
    };
  },
}));

const policy = (mode: "fast" | "thinking"): VerifiedChatPolicy => ({
  provider: "privatemode",
  origin: "https://offline.invalid",
  repository: "offline",
  releaseDigests: ["0".repeat(64)],
  model: "glm-5.3",
  glmReasoningEffort: mode === "fast" ? "low" : "high",
  maxInputCharacters: 200_000,
  maxOutputTokens: mode === "fast" ? 2048 : 8192,
  pricing: { inputPerMillion: 1, outputPerMillion: 1, currency: "USD" },
  cacheSalt: "s".repeat(43),
  answerMode: mode,
});

/** Composes and records the body of the first request for one case. */
async function body(
  conversation: Conversation,
  mode: "fast" | "thinking",
  extra: Partial<VerifiedChatPolicy> = {},
  code = false,
) {
  try {
    await streamVerifiedConversation(
      conversation,
      { ...policy(mode), ...(code ? { codeTool: true } : {}), ...extra },
      "csrf",
      new AbortController().signal,
      () => {},
      () => {},
      () => {},
      undefined, undefined, undefined, undefined, undefined, undefined, undefined,
      code ? { run: async () => ({ output: "" }), onRuns: () => {} } : undefined,
    );
  } catch (error) {
    if (error instanceof Captured) return error.body as { messages: Msg[]; tools?: unknown; tool_choice?: unknown };
    throw error;
  }
  throw Error("Nothing was sent.");
}
type Msg = { role: string; content: string | { type: string; text?: string }[]; tool_calls?: unknown };

// System-message parts, by the words each starts with. Old and new wording both listed; a part
// whose marker is absent is simply not there.
const PARTS: [string, string][] = [
  ["identity and accuracy", "You are CometRow"],
  ["evidence and citations (now only with sources)", " Cite supplied evidence"],
  ["no-tools line", " You have no external tools."],
  ["advice calibration", " Calibrate consequential advice"],
  ["health and emergency", " Answer health questions"],
  ["urgent follow-ups", " Keep that urgent human connection"],
  ["refusals and sexual content", " Refuse help enabling"],
  ["Markdown", " Use Markdown"],
  ["word counts", " Do not state word or character counts"],
  ["German rules fallback", " For German rules, fees and deadlines you are not sure of"],
  ["device date and purchases", " Device date (UTC)"],
  ["knowledge date", " When an answer may depend on recent"],
  ["knowledge date", " For recent or changing information"],
  ["web results", " The web results below"],
  ["answer language", " Reply in the language of"],
  ["German rules (no source)", " This question is about German rules"],
  ["German rules (sourced)", " For this question about German rules"],
  ["web research rules", " For web research"],
  ["web research rules", " Place [source-id] immediately"],
  ["masking", " Some identifiers were replaced"],
  ["picture", " The latest message has a picture."],
  ["code instruction", " You have one tool, python"],
];
function systemParts(system: string) {
  const found = PARTS.map(([name, marker]) => [name, system.indexOf(marker)] as const)
    .filter(([, at]) => at >= 0)
    .sort((a, b) => a[1] - b[1]);
  if (found[0]?.[1] !== 0) found.unshift(["(unlabelled start)", 0]);
  return found.map(([name, at], i) => [name, system.slice(at, found[i + 1]?.[1] ?? system.length)] as const);
}

const GERMAN = /[äöüß]|\b(der|die|das|und|ist|wie|ich|nicht|für|mit)\b/i;
const tokens = (text: string, json = false) =>
  Math.round(text.length / (!json && GERMAN.test(text) ? 3.2 : 3.6));
const textOf = (m: Msg) =>
  typeof m.content === "string" ? m.content : m.content.map((p) => p.text ?? "").join("");

type Row = { part: string; chars: number; tokens: number; fixed: boolean };
function measure(b: Awaited<ReturnType<typeof body>>): Row[] {
  const rows: Row[] = [];
  const [system, ...rest] = b.messages;
  for (const [part, text] of systemParts(textOf(system)))
    rows.push({ part: `system: ${part}`, chars: text.length, tokens: tokens(text), fixed: true });
  if (b.tools) {
    const json = JSON.stringify({ tools: b.tools, tool_choice: b.tool_choice });
    rows.push({ part: "tool definition (JSON)", chars: json.length, tokens: tokens(json, true), fixed: true });
  }
  for (const m of rest) {
    const text = textOf(m) + (m.tool_calls ? JSON.stringify(m.tool_calls) : "");
    const label =
      m.role === "user" && text.startsWith("Selected reference material") ? "reference material"
      : m.role === "tool" ? "tool result (replayed)"
      : m.tool_calls ? "tool call (replayed)"
      : `${m.role} turn`;
    rows.push({ part: label, chars: text.length, tokens: tokens(text, !!m.tool_calls), fixed: false });
  }
  return rows;
}

const ask = (...turns: string[]) => {
  const c = emptyConversation();
  turns.forEach((t, i) => c.messages.push(newMessage(i % 2 ? "assistant" : "user", t)));
  return c;
};
const web = (question: string) => {
  const c = ask(question);
  c.attachments.push({
    id: "w",
    name: "Public search results",
    selected: true,
    kind: "research",
    sources: [1, 2, 3].map((n) => ({
      id: `src${n}abcdef`,
      title: `Synthetic result ${n}`,
      text: "Synthetic excerpt about the question, about two hundred characters long, as a search result snippet would be. ".repeat(2),
      url: `https://example${n}.test/page`,
      retrievedAt: "2026-11-14T10:00:00Z",
    })),
  } as Conversation["attachments"][number]);
  return c;
};
const followUp = () => {
  const c = ask("What is 19 % VAT on 1234.50 EUR, and the gross amount?", "VAT: 234.56 EUR. Gross: 1469.06 EUR.", "And with 7 % instead?");
  c.messages[1].codeRuns = [
    {
      code: 'from decimal import Decimal, ROUND_HALF_UP\nnet = Decimal("1234.50")\nvat = (net * Decimal("0.19")).quantize(Decimal("0.01"), ROUND_HALF_UP)\nprint("VAT EUR:", vat)\nprint("gross EUR:", net + vat)',
      output: "VAT EUR: 234.56\ngross EUR: 1469.06",
    },
  ];
  return c;
};
const projectAndMemory = async () => {
  const b = await body(ask("Plan a vegetarian dinner for four on Saturday."), "fast");
  const last = b.messages[b.messages.length - 1];
  last.content =
    `${INSTRUCTIONS_NOTE}\nAnswer in short bullet points. Use metric units.\n[End of project instructions]\n\n` +
    memoryBlock(
      ["I am vegetarian and allergic to peanuts.", "Ich wohne in Leipzig.", "I prefer short answers."].map(
        (text) => ({ id: crypto.randomUUID(), text, at: "2026-11-14T10:00:00.000Z" }),
      ),
    ) +
    last.content;
  return b;
};

const cases: [string, () => ReturnType<typeof body>][] = [
  ["hello (Fast)", () => body(ask("hello"), "fast")],
  ["short question (Fast)", () => body(ask("What is the capital of Australia?"), "fast")],
  ["Thinking question", () => body(ask("Explain how a heat pump works and when it pays off in a flat."), "thinking")],
  ["German question (Fast)", () => body(ask("Wie lange dauert ein Flug von Berlin nach Lissabon?"), "fast")],
  ["rules question, search declined", () => body(ask("Wie hoch ist das Bußgeld, wenn ich innerorts 21 km/h zu schnell fahre?"), "fast")],
  ["answer with search results", () => body(web("Who won the Booker Prize this year?"), "fast")],
  ["rules question with search results", () => body(web("Wie hoch ist das Bußgeld, wenn ich innerorts 21 km/h zu schnell fahre?"), "fast")],
  ["code execution on (Fast)", () => body(ask("What is 19 % VAT on 1234.50 EUR, and the gross amount?"), "fast", {}, true)],
  ["code follow-up turn (tool replayed)", () => body(followUp(), "fast", {}, true)],
  ["picture (Fast)", () => body(ask("What does this sign say?"), "fast", { image: "data:image/jpeg;base64,/9j/" })],
  ["memory and project instructions", projectAndMemory],
  ["identifier masked", () => body(ask("Please write a short note asking Anna to call me back on +49 151 23456789."), "fast")],
];

const json = process.argv.includes("--json");
const summary: string[] = [];
for (const [name, make] of cases) {
  const rows = measure(await make());
  const sum = (fixed?: boolean) =>
    rows.filter((r) => fixed === undefined || r.fixed === fixed).reduce(
      (t, r) => ({ chars: t.chars + r.chars, tokens: t.tokens + r.tokens }),
      { chars: 0, tokens: 0 },
    );
  const fixed = sum(true);
  const all = sum();
  if (json) {
    console.log(JSON.stringify({ case: name, fixed, total: all, rows }));
    continue;
  }
  console.log(`\n### ${name}\n\n| Part | Characters | Tokens (est.) |\n|---|---:|---:|`);
  for (const r of rows) console.log(`| ${r.part} | ${r.chars} | ${r.tokens} |`);
  console.log(`| **fixed overhead (system + tools)** | **${fixed.chars}** | **${fixed.tokens}** |`);
  console.log(`| **whole request** | **${all.chars}** | **${all.tokens}** |`);
  summary.push(`| ${name} | ${fixed.chars} | ${fixed.tokens} | ${all.chars} | ${all.tokens} |`);
}
if (!json)
  console.log(
    `\n### Summary\n\n| Case | Fixed chars | Fixed tokens (est.) | Request chars | Request tokens (est.) |\n|---|---:|---:|---:|---:|\n${summary.join("\n")}`,
  );
