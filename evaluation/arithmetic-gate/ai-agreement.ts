// Cross-check of the unseen-v3 paste batches against ChatGPT and Claude
// (12 November 2026). Reads the owner's saved replies from
// paste-batches-v3-unseen/answers-chatgpt/batch-NN.md and answers-claude/batch-NN.md
// (whichever exist), scores every "<id>: <final answer>" line with the frozen
// scorer against the code key, and prints Markdown: each AI's wrong lines, and
// the lines where both AIs give the same figures but the key differs (key
// items to review). Truth is the key; the AIs are only a cross-check.
//
//   node --import tsx evaluation/arithmetic-gate/ai-agreement.ts [--self-check]
//
// Ids: <case id>a is turn 1, <case id>b is turn 2 restated as one question.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import unseenV3 from "./unseen-v3-20261023.json";
import { D, extractMentions, type Dec, type Mention } from "./numbers";
import { scoreTurn, type ExpectedItem, type GateCase } from "./scorer";

const DIR = "evaluation/arithmetic-gate/paste-batches-v3-unseen";
const AIS = ["chatgpt", "claude"] as const;
type Ai = (typeof AIS)[number];
const cases = unseenV3.cases as unknown as GateCase[];

export const questionIds = cases.flatMap((c) => [`${c.id}a`, `${c.id}b`]);
const lookup = (id: string) => {
  const c = cases.find((x) => x.id === id.slice(0, -1))!;
  const turn = id.endsWith("a") ? 0 : 1;
  return { c, turn, expected: c.expected[turn], forbidden: c.forbidden[turn] };
};

/** "<id>: answer" lines from a pasted reply; tolerant of Markdown bullets, bold and code marks. */
export function parseReplies(text: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const line of text.split(/\r?\n/)) {
    const m = /^[\s>*`_-]*(unseen3-\d{2}[ab])[\s*`_]*[:\-–][\s*`_]*(.+)$/i.exec(line);
    if (m && !out.has(m[1].toLowerCase())) out.set(m[1].toLowerCase(), m[2].trim());
  }
  return out;
}

/** The AI's figure for each expected item: the n-th mention of the item's kind, in reply order. */
function figures(reply: string, expected: ExpectedItem[], locale: GateCase["locale"]): (string | undefined)[] {
  const { mentions } = extractMentions(reply, locale);
  const pools: Record<string, Mention[]> = {
    money: mentions.filter((m) => m.kind === "number" && !m.percent && (m.currency || m.decimals > 0)),
    number: mentions.filter((m) => m.kind === "number" && !m.percent),
    percent: mentions.filter((m) => m.kind === "number" && m.percent),
    time: mentions.filter((m) => m.kind === "time"),
    date: mentions.filter((m) => m.kind === "date"),
    duration: mentions.filter((m) => m.kind === "duration"),
  };
  const used: Record<string, number> = {};
  return expected.map((e) => {
    const m = pools[e.kind][(used[e.kind] = (used[e.kind] ?? -1) + 1)];
    if (!m) return undefined;
    const round = (v: Dec) => (e.rounding ? v.toDecimalPlaces(e.rounding.decimals, D.ROUND_HALF_UP) : v).toString();
    return m.kind === "number" ? round(m.value) : m.kind === "time" ? String(m.minutes) : m.kind === "date" ? m.candidates.join("|") : round(m.minutes);
  });
}

export type Analysis = {
  answered: Record<Ai, number>;
  wrong: Record<Ai, { id: string; reply: string; key: string }[]>;
  missing: Record<Ai, string[]>;
  bothAgreeAgainstKey: { id: string; chatgpt: string; claude: string; key: string }[];
};

export function analyse(replies: Record<Ai, Map<string, string>>): Analysis {
  const a: Analysis = { answered: { chatgpt: 0, claude: 0 }, wrong: { chatgpt: [], claude: [] }, missing: { chatgpt: [], claude: [] }, bothAgreeAgainstKey: [] };
  for (const id of questionIds) {
    const { c, turn, expected, forbidden } = lookup(id);
    const key = c.mandatoryFacts[turn];
    const pass: Partial<Record<Ai, boolean>> = {};
    for (const ai of AIS) {
      const reply = replies[ai].get(id);
      if (!reply) {
        if (replies[ai].size) a.missing[ai].push(id);
        continue;
      }
      a.answered[ai]++;
      pass[ai] = scoreTurn(reply, expected, forbidden, c.locale).pass;
      if (!pass[ai]) a.wrong[ai].push({ id, reply, key });
    }
    const g = replies.chatgpt.get(id), k = replies.claude.get(id);
    if (g && k && pass.chatgpt === false && pass.claude === false) {
      const fg = figures(g, expected, c.locale), fk = figures(k, expected, c.locale);
      if (fg.every((v, i) => v !== undefined && v === fk[i])) a.bothAgreeAgainstKey.push({ id, chatgpt: g, claude: k, key });
    }
  }
  return a;
}

export function report(a: Analysis): string {
  const n = questionIds.length;
  const out = ["## AI cross-check (ChatGPT and Claude, paste batches)", ""];
  if (!a.answered.chatgpt && !a.answered.claude) return [...out, "Pending owner pastes: no saved replies found.", ""].join("\n");
  out.push("Truth is the code key; a wrong line below is the AI's error unless it also appears under key items to review.", "");
  out.push("| AI | Answered | Correct against the key | Wrong | Missing |", "| --- | --- | --- | --- | --- |");
  for (const ai of AIS) out.push(`| ${ai} | ${a.answered[ai]} of ${n} | ${a.answered[ai] - a.wrong[ai].length} | ${a.wrong[ai].length} | ${a.missing[ai].length} |`);
  out.push("", `**Key items to review (both AIs give the same figures, the key differs): ${a.bothAgreeAgainstKey.length}**`, "");
  for (const r of a.bothAgreeAgainstKey) out.push(`- ${r.id}: key "${r.key}"; ChatGPT "${r.chatgpt}"; Claude "${r.claude}"`);
  for (const ai of AIS) {
    out.push("", `**${ai} wrong against the key: ${a.wrong[ai].length}**`, "");
    for (const r of a.wrong[ai]) out.push(`- ${r.id}: answered "${r.reply}"; key "${r.key}"`);
    if (a.missing[ai].length) out.push(`- missing lines: ${a.missing[ai].join(", ")}`);
  }
  return out.join("\n") + "\n";
}

function readAnswers(ai: Ai): Map<string, string> {
  const dir = `${DIR}/answers-${ai}`;
  const all = new Map<string, string>();
  if (!existsSync(dir)) return all;
  for (const f of readdirSync(dir).filter((f) => /^batch-\d{2}\.md$/.test(f)).sort())
    for (const [id, text] of parseReplies(readFileSync(`${dir}/${f}`, "utf8"))) all.set(id, text);
  return all;
}

/** The key's own fact lines must score 60 of 60 and agree; one altered figure must be caught on both sides. */
function selfCheck() {
  const keyText = questionIds.map((id) => `**${id}:** ${lookup(id).c.mandatoryFacts[id.endsWith("a") ? 0 : 1]}`).join("\n");
  const perfect = analyse({ chatgpt: parseReplies(keyText), claude: parseReplies(keyText) });
  if (perfect.answered.chatgpt !== questionIds.length || perfect.wrong.chatgpt.length || perfect.wrong.claude.length || perfect.bothAgreeAgainstKey.length)
    throw Error(`self-check: the key's own lines did not score clean: ${JSON.stringify(perfect).slice(0, 400)}`);
  const altered = keyText.replace("unseen3-01a:** Steuer: 1219,80 EUR", "unseen3-01a:** Steuer: 1219,90 EUR");
  const one = analyse({ chatgpt: parseReplies(altered), claude: parseReplies(altered) });
  if (one.bothAgreeAgainstKey.map((r) => r.id).join() !== "unseen3-01a" || one.wrong.claude.length !== 1)
    throw Error(`self-check: an altered figure was not caught: ${JSON.stringify(one.bothAgreeAgainstKey)}`);
  const differ = analyse({ chatgpt: parseReplies(altered), claude: parseReplies(keyText.replace("Steuer: 1219,80 EUR", "Steuer: 1219,70 EUR")) });
  if (differ.bothAgreeAgainstKey.length) throw Error("self-check: two different wrong figures were reported as agreeing");
  console.log("self-check passed");
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("ai-agreement.ts")) {
  if (process.argv.includes("--self-check")) selfCheck();
  else console.log(report(analyse({ chatgpt: readAnswers("chatgpt"), claude: readAnswers("claude") })));
}
