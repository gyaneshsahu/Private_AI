// Does the model use the answer blocks where it should and leave them out where it should not?
// (docs/answer-blocks-20261126.md) 24 made-up questions, English and German, through the product's
// own system message with the block rules in place. Key from Windows Credential Manager, never printed:
//   Invoke-WithPrivateAiSecret -Name PRIVATEMODE_API_KEY -Action { npx tsx evaluation/answer-design/blocks-probe.mts }
// Writes evaluation/answer-design/blocks-probe-20261126.json (answers whole, for the fixtures).
import { writeFileSync } from "node:fs";
import { PrivatemodeAI } from "privatemode-ai";
import { composeContext, newMessage } from "../../src/conversation";
import { emptyConversation } from "../../shared/contracts";
import { chatEuros, pricesAt } from "../../shared/usage-config";
import { calloutKind, parseDiagram, parseExplore, parseQuiz, parseSteps } from "../../src/answer/blocks";
import { answerBlockRules } from "../../src/answer/rules";

const apiKey = process.env.PRIVATEMODE_API_KEY;
if (!apiKey) throw Error("PRIVATEMODE_API_KEY not loaded");
const FAST = "glm-5.3-flash";
const THINKING = "glm-5.3";
type Block = "note" | "steps" | "diagram" | "quiz" | "explore";

// `want`: at least one of these should appear. `none`: no block at all should appear.
const QUESTIONS: { id: string; lang: "en" | "de"; model: string; q: string; want?: Block[]; none?: true }[] = [
  { id: "capital", lang: "en", model: FAST, none: true, q: "What is the capital of Australia?" },
  { id: "percent", lang: "en", model: FAST, none: true, q: "How much is 15% of 240?" },
  { id: "note", lang: "en", model: FAST, none: true, q: "Write a short thank-you note to my neighbour for watering my plants." },
  { id: "translate", lang: "en", model: FAST, none: true, q: "Translate into German: The meeting is moved to Thursday at ten." },
  { id: "dinner", lang: "de", model: FAST, none: true, q: "Gib mir drei Ideen für ein Abendessen ohne Fleisch." },
  { id: "steuer-id", lang: "de", model: FAST, none: true, q: "Was ist eine Steuer-ID, in zwei Sätzen?" },
  { id: "email", lang: "de", model: FAST, none: true, q: "Schreib mir eine kurze Absage für ein Vorstellungsgespräch am Freitag." },
  { id: "grammar", lang: "en", model: FAST, none: true, q: "Fix the grammar: me and him goes to the store yesterday." },
  { id: "ci", lang: "en", model: FAST, want: ["diagram"], q: "Explain in detail how a CI/CD pipeline works, including what happens when the tests fail." },
  { id: "oauth", lang: "en", model: THINKING, want: ["diagram"], q: "Explain in detail how signing in with Google works on another website, step by step, including when something is refused." },
  { id: "mahnverfahren", lang: "de", model: FAST, want: ["diagram", "steps"], q: "Erkläre ausführlich, wie ein gerichtliches Mahnverfahren in Deutschland abläuft, mit den Entscheidungspunkten." },
  { id: "webapp", lang: "en", model: FAST, want: ["diagram"], q: "Explain in detail the parts a typical web application is made of and how they fit together." },
  { id: "agent", lang: "en", model: FAST, want: ["diagram", "note"], q: "Explain in detail how an AI agent works." },
  { id: "funding", lang: "en", model: FAST, want: ["steps"], q: "Explain the funding stages of a startup, from the first money to going public." },
  { id: "sleep", lang: "en", model: FAST, want: ["steps"], q: "Explain the stages of sleep in one night." },
  { id: "projekt", lang: "de", model: FAST, want: ["steps", "diagram"], q: "Erkläre die Phasen eines klassischen Projekts im Projektmanagement." },
  { id: "photosynthesis", lang: "en", model: THINKING, want: ["quiz"], q: "I have an exam on photosynthesis next week. Explain the light reactions and then test me." },
  { id: "artikel", lang: "de", model: FAST, want: ["quiz"], q: "Ich lerne Deutsch. Erkläre kurz, wann man den Akkusativ benutzt, und teste mich dann." },
  { id: "dreisatz", lang: "de", model: FAST, want: ["quiz"], q: "Erkläre mir den Dreisatz und stelle mir danach drei Übungsaufgaben mit Lösungen." },
  { id: "lease", lang: "en", model: FAST, want: ["note"], q: "Should I lease or buy a car if I drive about 8,000 km a year and keep cars for a long time? Give me your verdict with the reasons." },
  { id: "interest", lang: "en", model: FAST, want: ["note"], q: "Explain compound interest in detail to someone who has never heard of it." },
  { id: "bleach", lang: "en", model: FAST, want: ["note"], q: "Can I mix bleach and vinegar to clean the bathroom better? Explain." },
  { id: "sorting", lang: "en", model: FAST, want: ["explore", "steps"], q: "Explain bubble sort, merge sort and quicksort so that I can look at them one at a time and compare." },
  { id: "memory", lang: "en", model: FAST, want: ["explore", "diagram", "steps"], q: "Explain in detail the kinds of memory a computer has, from the fastest to the slowest." },
];

function blocksIn(text: string): { found: Block[]; malformed: string[] } {
  const found = new Set<Block>();
  const malformed: string[] = [];
  for (const m of text.matchAll(/```(steps|diagram|quiz|explore)\s*\n([\s\S]*?)```/g)) {
    const ok = m[1] === "steps" ? parseSteps(m[2]) : m[1] === "diagram" ? parseDiagram(m[2]) : m[1] === "quiz" ? parseQuiz(m[2]) : parseExplore(m[2]);
    if (ok) found.add(m[1] as Block);
    else malformed.push(m[1]);
  }
  for (const m of text.matchAll(/^>\s*\*\*([^*\n]{2,40})\*\*/gm)) if (calloutKind(m[1])) found.add("note");
  return { found: [...found], malformed };
}

const client = new PrivatemodeAI({ apiKey, enableWasmLogging: false, openAIOptions: { maxRetries: 0 } });
await client.verify();
await client.refreshSecret();
const prices = pricesAt();
let euros = 0;
const only = process.argv.includes("--only") ? process.argv[process.argv.indexOf("--only") + 1].split(",") : undefined;
const rows = [];
for (const item of QUESTIONS) {
  if (only && !only.includes(item.id)) continue;
  const c = emptyConversation();
  c.messages.push(newMessage("user", item.q));
  const messages = composeContext(c, 10000, new Date(), undefined, item.lang);
  // The rules go where the app puts them while its switch is on: after the fixed opening (the chart rule ends it).
  const at = messages[0].content.indexOf('"source"}.') + 10;
  if (at < 10) throw Error("the opening of the system message has changed");
  messages[0] = { ...messages[0], content: messages[0].content.slice(0, at) + answerBlockRules + messages[0].content.slice(at) };
  // The product's own settings (docs/provider decision, November): Fast reasons little, Thinking at length with more room.
  const reply = await client.chat.completions.create({ model: item.model, max_tokens: item.model === FAST ? 4096 : 16384, reasoning_effort: item.model === FAST ? "low" : "max", messages } as never);
  euros += chatEuros(prices, item.model, reply.usage?.prompt_tokens ?? 0, reply.usage?.completion_tokens ?? 0) ?? 0;
  const answer = reply.choices[0]?.message?.content ?? "";
  const { found, malformed } = blocksIn(answer);
  const correct = item.none ? found.length === 0 && malformed.length === 0 : item.want!.some((b) => found.includes(b));
  rows.push({ id: item.id, lang: item.lang, model: item.model, expected: item.none ? "none" : item.want, found, malformed, correct, finish: reply.choices[0]?.finish_reason, usage: reply.usage, question: item.q, answer });
  console.log(JSON.stringify({ id: item.id, expected: item.none ? "none" : item.want, found, malformed, correct, characters: answer.length, finish: reply.choices[0]?.finish_reason }));
}
const summary = {
  capturedAt: new Date().toISOString(),
  listPriceEuros: Number(euros.toFixed(4)),
  correct: rows.filter((r) => r.correct).length,
  of: rows.length,
  shouldHaveNone: rows.filter((r) => r.expected === "none").length,
  hadNone: rows.filter((r) => r.expected === "none" && r.correct).length,
  shouldHaveOne: rows.filter((r) => r.expected !== "none").length,
  hadOne: rows.filter((r) => r.expected !== "none" && r.correct).length,
  malformed: rows.filter((r) => r.malformed.length).map((r) => `${r.id}: ${r.malformed.join(",")}`),
};
if (!only) writeFileSync(new URL("./blocks-probe-20261126.json", import.meta.url), JSON.stringify({ ...summary, rows }, null, 2) + "\n");
console.log(JSON.stringify(summary));
