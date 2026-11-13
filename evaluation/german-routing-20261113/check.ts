// German routing and detection, offline (13 November 2026): Auto's rules, the German-rules
// detector and the when-to-search detector on a frozen prompt file. No model calls.
// Run from the repository root:
//   npx tsx evaluation/german-routing-20261113/check.ts prompts.json before
//   npx tsx evaluation/german-routing-20261113/check.ts holdout.json after
// Writes results-<label>-<file>.json next to this file and prints the summary and the misses.
import { readFileSync, writeFileSync } from "node:fs";
import { emptyConversation } from "../../shared/contracts";
import { autoDecision } from "../../src/answer-modes";
import { newMessage } from "../../src/conversation";
import { germanRulesQuestion } from "../../src/german-rules";
import { needsCurrentInformation } from "../../src/when-to-search";

type Prompt = {
  id: string;
  lang: "de" | "en";
  category: string;
  prompt: string;
  mode: "fast" | "thinking";
  rules: boolean;
  current: boolean | null;
};
const DIR = "evaluation/german-routing-20261113";
const [file = "prompts.json", label = "run"] = process.argv.slice(2);
const prompts = (JSON.parse(readFileSync(`${DIR}/${file}`, "utf8")) as { prompts: Prompt[] }).prompts;

const rows = prompts.map((p) => {
  const conversation = emptyConversation();
  conversation.messages.push(newMessage("user", p.prompt));
  const decision = autoDecision(conversation);
  const rules = germanRulesQuestion(p.prompt);
  const current = needsCurrentInformation(p.prompt);
  return { ...p, got: { mode: decision.mode, reason: decision.reason, rules, current } };
});

const share = (hit: number, of: number) => ({ hit, of, pct: of ? Math.round((1000 * hit) / of) / 10 : null });
const count = <T>(xs: T[], f: (x: T) => boolean) => xs.filter(f).length;
const summary = Object.fromEntries(
  (["de", "en"] as const).map((lang) => {
    const all = rows.filter((r) => r.lang === lang);
    const rulesRows = all.filter((r) => r.rules);
    const other = all.filter((r) => !r.rules);
    const scored = other.filter((r) => r.current !== null);
    const categories = [...new Set(all.map((r) => r.category))];
    return [
      lang,
      {
        routing: share(count(all, (r) => r.got.mode === r.mode), all.length),
        rulesRecall: share(count(rulesRows, (r) => r.got.rules), rulesRows.length),
        rulesFalseAlarms: share(count(other, (r) => r.got.rules), other.length),
        current: share(count(scored, (r) => r.got.current === r.current), scored.length),
        routingByCategory: Object.fromEntries(
          categories.map((c) => {
            const inC = all.filter((r) => r.category === c);
            return [c, share(count(inC, (r) => r.got.mode === r.mode), inC.length)];
          }),
        ),
      },
    ];
  }),
);
const misses = rows
  .filter((r) => r.got.mode !== r.mode || r.got.rules !== r.rules || (r.current !== null && r.got.current !== r.current))
  .map((r) => ({
    id: r.id,
    category: r.category,
    expected: `${r.mode}${r.rules ? " rules" : ""}${r.current ? " current" : ""}`,
    got: `${r.got.mode}/${r.got.reason}${r.got.rules ? " rules" : ""}${r.got.current ? " current" : ""}`,
    prompt: r.prompt.slice(0, 90),
  }));
writeFileSync(
  `${DIR}/results-${label}-${file}`,
  JSON.stringify({ file, label, summary, misses, rows }, null, 2).replace(/\n/g, "\r\n") + "\r\n",
);
console.log(JSON.stringify(summary, null, 1));
for (const m of misses) console.log(m.id.padEnd(6), m.category.padEnd(9), m.expected.padEnd(22), "->", m.got.padEnd(28), m.prompt);
