// Real answers to judge the answer design on (docs/answer-design-20261125.md): 12 made-up
// questions through the product's own system message, once. The answers are kept whole as
// fixtures; styling is then checked against what the model really writes, not against test text.
// Key from Windows Credential Manager, never printed:
//   Invoke-WithPrivateAiSecret -Name PRIVATEMODE_API_KEY -Action { npx tsx evaluation/answer-design/capture.mts }
import { writeFileSync } from "node:fs";
import { PrivatemodeAI } from "privatemode-ai";
import { composeContext, newMessage } from "../../src/conversation";
import { emptyConversation } from "../../shared/contracts";
import { chatEuros, pricesAt } from "../../shared/usage-config";

const apiKey = process.env.PRIVATEMODE_API_KEY;
if (!apiKey) throw Error("PRIVATEMODE_API_KEY not loaded");
const FAST = "glm-5.3-flash";
const THINKING = "glm-5.3";

const QUESTIONS: { id: string; lang: "en" | "de"; model: string; q: string }[] = [
  { id: "fact", lang: "en", model: FAST, q: "Why is the sky blue?" },
  { id: "how-to", lang: "en", model: FAST, q: "How do I set up automatic backups of my laptop to an external drive on Windows? Step by step." },
  { id: "comparison", lang: "en", model: FAST, q: "Compare a heat pump and a gas boiler for a 70 square metre flat: cost to buy, cost to run, and what to check before deciding." },
  { id: "numbers", lang: "en", model: FAST, q: "My electricity bills were 82, 91, 77, 95, 88 and 102 euros from January to June. How did they develop, and what is the average?" },
  { id: "study-guide", lang: "en", model: THINKING, q: "I have an exam on photosynthesis next week. Make me a question bank: learning goals, six questions of mixed difficulty, and the answers at the end." },
  { id: "decision", lang: "en", model: FAST, q: "Should I lease or buy a car if I drive about 8,000 km a year and keep cars for a long time?" },
  { id: "code", lang: "en", model: FAST, q: "Write a Python function that removes duplicate lines from a text file but keeps the order, and explain it briefly." },
  { id: "email", lang: "en", model: FAST, q: "Write a short, friendly email to my landlord asking when the broken heating will be repaired." },
  { id: "erklaerung", lang: "de", model: FAST, q: "Was ist der Unterschied zwischen Steuer-ID und Steuernummer?" },
  { id: "vergleich", lang: "de", model: FAST, q: "Vergleiche Mieten und Kaufen einer Wohnung in einer deutschen Großstadt: Vorteile, Nachteile, und für wen sich was eignet." },
  { id: "lernplan", lang: "de", model: THINKING, q: "Ich schreibe in zehn Tagen eine Klausur in Mikroökonomie. Erstelle mir einen Lernplan mit Tageszielen und einer Checkliste." },
  { id: "lang", lang: "de", model: FAST, q: "Erkläre ausführlich, wie eine Wärmepumpe funktioniert, mit den einzelnen Schritten des Kreislaufs und typischen Kennzahlen." },
];

const client = new PrivatemodeAI({ apiKey, enableWasmLogging: false, openAIOptions: { maxRetries: 0 } });
await client.verify();
await client.refreshSecret();
const prices = pricesAt();
let euros = 0;
const rows = [];
for (const item of QUESTIONS) {
  const c = emptyConversation();
  c.messages.push(newMessage("user", item.q));
  const started = performance.now();
  const reply = await client.chat.completions.create({ model: item.model, max_tokens: 3000, messages: composeContext(c, 10000, new Date(), undefined, item.lang) });
  euros += chatEuros(prices, item.model, reply.usage?.prompt_tokens ?? 0, reply.usage?.completion_tokens ?? 0) ?? 0;
  const answer = reply.choices[0]?.message?.content ?? "";
  rows.push({ id: item.id, lang: item.lang, model: item.model, question: item.q, ms: Math.round(performance.now() - started), usage: reply.usage, finish: reply.choices[0]?.finish_reason, answer });
  console.log(JSON.stringify({ id: item.id, model: item.model, characters: answer.length, finish: reply.choices[0]?.finish_reason, tokens: reply.usage?.total_tokens }));
}
writeFileSync(new URL("./replies-20261125.json", import.meta.url), JSON.stringify({ capturedAt: new Date().toISOString(), listPriceEuros: Number(euros.toFixed(4)), rows }, null, 2) + "\n");
console.log(JSON.stringify({ done: rows.length, listPriceEuros: Number(euros.toFixed(4)) }));
