import { readFile, writeFile } from "node:fs/promises";
import { consumeCalculatorTurn } from "../src/calculator-turn";
import { emptyConversation } from "../shared/contracts";
import { newMessage } from "../src/conversation";
import fixtures from "../evaluation/cases/research-tools.json";
const root = ".local/matched-remaining-20261016";
const j = JSON.parse(await readFile(root + "/results.json", "utf8"));
const c = j.results.find((c: any) => c.cell === "deepseek-calculator");
const r = c.replies[1];
const f = fixtures.find((f) => f.id === c.id)!;
const conversation = emptyConversation();
conversation.messages = f.turns.map((t) => newMessage("user", t));
async function* events() {
  for (const e of r.modelEvents) yield e;
}
let result;
try {
  await consumeCalculatorTurn(
    events(),
    { currency: "USD", inputPerMillion: 0, outputPerMillion: 0 },
    new AbortController().signal,
    f.sources as any,
    conversation,
  );
  throw Error("Expected rejection");
} catch (e: any) {
  if (e.validationDetail !== "DEPENDENCY") throw e;
  result = {
    status: "OFFLINE_REPLAY_NOT_LIVE_REPAIR",
    paidRequests: 0,
    originalLiveOutcome: "INCOMPLETE",
    calculatorFailure: e.calculatorFailure,
    validationDetail: e.validationDetail,
    explanation:
      "Requested result IDs abs_inc/pct_inc do not reference the defined diff/pct steps. Exact raw model events replayed without modifications.",
  };
}
await writeFile(
  root + "/offline-diagnostic.json",
  JSON.stringify(result, null, 2),
);
console.log(JSON.stringify(result));
