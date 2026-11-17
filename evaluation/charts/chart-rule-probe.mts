// Live check of the chart rule (docs/charts-20261118.md): the exact prompt tokens the rule adds, and
// whether GLM-5.3-Flash follows it on 20 questions (10 English, 10 German; half should get a chart).
// Synthetic questions only. Key from Windows Credential Manager, never printed:
//   Invoke-WithPrivateAiSecret -Name PRIVATEMODE_API_KEY -Action { npx tsx evaluation/charts/chart-rule-probe.mts }
// Writes evaluation/charts/results-20261118.json (answers cut to 600 characters).
import { writeFileSync } from "node:fs";
import { PrivatemodeAI } from "privatemode-ai";
import { composeContext, newMessage } from "../../src/conversation";
import { emptyConversation } from "../../shared/contracts";
import { parseChart } from "../../src/AnswerChart";
import { chatEuros, pricesAt } from "../../shared/usage-config";

const apiKey = process.env.PRIVATEMODE_API_KEY;
if (!apiKey) throw Error("PRIVATEMODE_API_KEY not loaded");
const MODEL = "glm-5.3-flash";
const RULE_START = " Add a chart only when";

const QUESTIONS: { lang: "en" | "de"; chart: boolean; q: string }[] = [
  { lang: "en", chart: true, q: "How did Germany's population change from 2015 to 2023? Give the yearly figures." },
  { lang: "en", chart: true, q: "Compare the average monthly rent per square metre in Berlin, Munich, Hamburg and Cologne." },
  { lang: "en", chart: true, q: "My electricity bills were 82, 91, 77, 95 and 88 euros from January to May. How did they develop?" },
  { lang: "en", chart: true, q: "What were Apple's annual revenues from 2019 to 2023?" },
  { lang: "en", chart: true, q: "Compare the calories in an apple, a banana, an orange and a pear." },
  { lang: "en", chart: false, q: "Write a short thank-you note to my neighbour for watering my plants." },
  { lang: "en", chart: false, q: "What is the capital of Australia?" },
  { lang: "en", chart: false, q: "How much is 15% of 240?" },
  { lang: "en", chart: false, q: "Explain how a heat pump works in simple words." },
  { lang: "en", chart: false, q: "Give me three tips for sleeping better." },
  { lang: "de", chart: true, q: "Wie hat sich die Inflationsrate in Deutschland von 2019 bis 2024 entwickelt? Bitte mit Jahreswerten." },
  { lang: "de", chart: true, q: "Vergleiche die Einwohnerzahlen von Berlin, Hamburg, München und Köln." },
  { lang: "de", chart: true, q: "Meine Heizkosten lagen 2021 bei 950, 2022 bei 1.420, 2023 bei 1.180 und 2024 bei 1.050 Euro. Wie haben sie sich entwickelt?" },
  { lang: "de", chart: true, q: "Wie viele Stunden Sonnenschein haben Hamburg, Frankfurt, München und Freiburg im Jahr ungefähr?" },
  { lang: "de", chart: true, q: "Vergleiche den Proteingehalt von Linsen, Kichererbsen, Tofu und Quark pro 100 Gramm." },
  { lang: "de", chart: false, q: "Schreib mir eine kurze Absage für ein Vorstellungsgespräch am Freitag." },
  { lang: "de", chart: false, q: "Was ist die Hauptstadt von Kanada?" },
  { lang: "de", chart: false, q: "Was sind 7 mal 8?" },
  { lang: "de", chart: false, q: "Erkläre einfach, was eine Steuer-ID ist." },
  { lang: "de", chart: false, q: "Gib mir drei Ideen für ein Abendessen ohne Fleisch." },
];

const systemFor = (q: string, lang: "en" | "de") => {
  const c = emptyConversation();
  c.messages.push(newMessage("user", q));
  return composeContext(c, 10000, new Date(), undefined, lang);
};

const client = new PrivatemodeAI({ apiKey, enableWasmLogging: false, openAIOptions: { maxRetries: 0 } });
await client.verify();
await client.refreshSecret();
const prices = pricesAt();
let euros = 0;
const add = (u?: { prompt_tokens?: number; completion_tokens?: number }) => {
  euros += chatEuros(prices, MODEL, u?.prompt_tokens ?? 0, u?.completion_tokens ?? 0) ?? 0;
};

// 1. The rule's exact cost: the same request with and without it, one output token each (skipped with --only).
const full = systemFor("hi", "en");
const without = full.map((m, i) => (i === 0 ? { ...m, content: m.content.replace(/ Add a chart only when[\s\S]*?"source"\}\./, "") } : m));
if (without[0].content === full[0].content || !full[0].content.includes(RULE_START)) throw Error("rule not found in the prompt");
let ruleTokens = 58; // measured 18 November
if (!process.argv.includes("--only")) {
  const a = await client.chat.completions.create({ model: MODEL, max_tokens: 1, messages: full });
  const b = await client.chat.completions.create({ model: MODEL, max_tokens: 1, messages: without });
  add(a.usage);
  add(b.usage);
  ruleTokens = (a.usage?.prompt_tokens ?? 0) - (b.usage?.prompt_tokens ?? 0);
  console.log(JSON.stringify({ step: "rule", ruleTokens, withRule: a.usage?.prompt_tokens, withoutRule: b.usage?.prompt_tokens }));
}

// 2. Does the model follow the rule? `--only 0,1,10` reruns some; `--max 2500` gives more room
// (900 was too little for three questions on 18 November: the answer stayed empty while reasoning).
const flag = (name: string) => (process.argv.includes(name) ? process.argv[process.argv.indexOf(name) + 1] : undefined);
const only = flag("--only")?.split(",").map(Number);
const maxTokens = Number(flag("--max") ?? 900);
const rows = [];
for (const [index, item] of QUESTIONS.entries()) {
  if (only && !only.includes(index)) continue;
  const started = performance.now();
  const reply = await client.chat.completions.create({ model: MODEL, max_tokens: maxTokens, messages: systemFor(item.q, item.lang) });
  add(reply.usage);
  const text = reply.choices[0]?.message?.content ?? "";
  const block = /```chart\s*\n([\s\S]*?)```/.exec(text)?.[1];
  const parsed = block ? parseChart(block.trim()) : undefined;
  const row = {
    lang: item.lang,
    expected: item.chart,
    gotBlock: !!block,
    drawable: !!parsed,
    type: parsed?.type,
    points: parsed?.values.length,
    source: parsed?.source,
    correct: item.chart ? !!parsed : !block,
    ms: Math.round(performance.now() - started),
    usage: reply.usage,
    question: item.q,
    answer: text.slice(0, 600),
  };
  rows.push(row);
  console.log(JSON.stringify({ lang: row.lang, expected: row.expected, gotBlock: row.gotBlock, drawable: row.drawable, type: row.type, correct: row.correct }));
}
const correct = rows.filter((r) => r.correct).length;
const summary = {
  model: MODEL,
  ruleTokens,
  ruleEurosPerRequest: chatEuros(prices, MODEL, ruleTokens, 0),
  correct,
  of: rows.length,
  chartAsked: rows.filter((r) => r.expected).length,
  chartGiven: rows.filter((r) => r.expected && r.drawable).length,
  noChartAsked: rows.filter((r) => !r.expected).length,
  noChartKept: rows.filter((r) => !r.expected && !r.gotBlock).length,
  totalEuros: Number(euros.toFixed(5)),
  verifications: 1,
};
console.log(JSON.stringify({ step: "summary", ...summary }));
writeFileSync(only ? "evaluation/charts/results-20261118-rerun.json" : "evaluation/charts/results-20261118.json", JSON.stringify({ summary, rows }, null, 2));
process.exit(0);
