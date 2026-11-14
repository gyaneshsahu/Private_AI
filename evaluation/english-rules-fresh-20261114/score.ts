import { readFileSync } from "node:fs";
import { germanRulesQuestion } from "../../src/german-rules";
const set = JSON.parse(readFileSync("evaluation/english-rules-fresh-20261114/prompts.json", "utf8")) as { id: string; lang: string; text: string; rules: boolean }[];
const hit = (t: string) => !!germanRulesQuestion(t);
const pos = set.filter((p) => p.rules), neg = set.filter((p) => !p.rules);
const caught = pos.filter((p) => hit(p.text)), alarms = neg.filter((p) => hit(p.text));
console.log(`recall ${caught.length}/${pos.length} (de ${caught.filter((p) => p.lang === "de").length}/${pos.filter((p) => p.lang === "de").length}, en ${caught.filter((p) => p.lang === "en").length}/${pos.filter((p) => p.lang === "en").length}); false alarms ${alarms.length}/${neg.length}`);
console.log("missed:", pos.filter((p) => !hit(p.text)).map((p) => p.id).join(" "));
console.log("false alarms:", alarms.map((p) => p.id).join(" "));
