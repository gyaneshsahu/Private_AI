// Live check of one background task end to end (docs/background-tasks-20261115.md, section 12).
// NOT run by the build agent: it needs the owner's development key and calls Privatemode (and Brave
// when its key is loaded). Synthetic data only: the CV below is made up. Keys from Windows
// Credential Manager, never printed.
//
//   Invoke-WithPrivateAiSecret -Name PRIVATEMODE_API_KEY -Action {
//     Invoke-WithPrivateAiSecret -Name BRAVE_SEARCH_API_KEY -Action {
//       npx tsx evaluation/privatemode/background-probe.ts
//     }
//   }
//   ... --thinking        (Thinking mode instead of Fast)
//   ... --no-search       (no web search, the CV and instruction only)
//
// What it does, with the same code the server runs: verifies the deployment with the server's own
// SDK client (approved manifest and Wasm pins, shared attestation queue), stores one task sealed in
// memory, runs it (allowance reserved in an in-memory ledger, search with the approved text, one
// model request), prints the result, tokens and time, then runs it a second time a day later to show
// (a) the verified client is reused (no second attestation) and (b) only new search results are sent.
// Expected spend: about 10,000 to 25,000 tokens (two runs with a 30,000-character CV would be more;
// this CV is short), one or two Brave queries.
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { validateQualification } from "../../shared/contracts";
import { ephemeralKeyRing } from "../../server/background-crypto";
import { createPrivatemodeBackgroundClient } from "../../server/background-privatemode";
import { MemoryBackgroundStore } from "../../server/background-store";
import { BACKGROUND_CONSENT_VERSION, createBackgroundTasks } from "../../server/background-tasks";
import { takeCounts } from "../../server/counters";
import { createAttestQueue } from "../../server/providers/privatemode-attest-queue";
import { braveSearchProvider } from "../../server/providers/search";
import { SqliteUsageLedger } from "../../server/usage-ledger";

const apiKey = process.env.PRIVATEMODE_API_KEY;
if (!apiKey) throw Error("PRIVATEMODE_API_KEY not loaded");
const thinking = process.argv.includes("--thinking");
const withSearch = !process.argv.includes("--no-search") && !!process.env.BRAVE_SEARCH_API_KEY;
const qualification = validateQualification(JSON.parse(await readFile(process.env.PRIVATEAI_QUALIFICATION_FILE ?? ".local/qualification.json", "utf8")));
const manifest = new Uint8Array(await readFile(process.env.PRIVATEAI_PROVIDER_MANIFEST_FILE ?? ".local/privatemode-manifest.json"));
const CV = `SYNTHETIC CV FOR A TEST. NOT A REAL PERSON.
Profile: data analyst with five years of experience in retail and logistics.
Skills: SQL, Python (pandas), Power BI, A/B testing, German (native), English (fluent).
Experience: 2021-2026 analyst at a mid-sized online retailer in Leipzig; 2019-2021 junior analyst at a logistics firm.
Education: M.Sc. Economics, 2019.
Looking for: data analyst or BI analyst roles in Leipzig or remote in Germany, full time.
Contact: {{EMAIL-1}}, {{PHONE-1}}.`;

let clock = Date.now();
const account = "probe-account";
const usage = new SqliteUsageLedger(":memory:", () => clock);
usage.createAllowance({ accountId: account, periodId: "probe", startsAt: clock - 1000, endsAt: clock + 30 * 86_400_000, requestLimit: 150 });
let attestCalls = 0;
const queue = createAttestQueue();
const store = new MemoryBackgroundStore();
const model = createPrivatemodeBackgroundClient({
  apiKey,
  qualification: () => qualification,
  manifest,
  attestQueue: {
    idle: () => queue.idle(),
    run: (send, signal) => {
      attestCalls++;
      return queue.run(send, signal);
    },
  },
  log: (line) => console.log(line),
  now: () => clock,
});
const service = createBackgroundTasks({
  store,
  keys: ephemeralKeyRing(),
  settings: { maxAutoTasks: 3 },
  qualification: () => qualification,
  stopped: () => false,
  usage,
  ensureAllowance: async () => {},
  spendAllows: async () => true,
  claimSlot: () => () => {},
  search: withSearch ? braveSearchProvider(process.env.BRAVE_SEARCH_API_KEY!) : undefined,
  takeSearch: () => true,
  giveBackSearch: () => {},
  model,
  cacheSalt: () => "probe-salt-".padEnd(64, "x"),
  log: (line) => console.log(line),
  now: () => clock,
});
const id = randomUUID();
const created = await service.create(account, {
  task: {
    id,
    name: "Job search (synthetic probe)",
    instruction: "Find job offers that match the attached CV. List each new offer in one line: title, employer, place, link. Say plainly if none fits.",
    trigger: { every: 1, unit: "day", time: "08:00", timeZone: "Europe/Berlin" },
    mode: "auto",
    notify: { inApp: true, calendar: false },
    answerMode: thinking ? "thinking" : "fast",
    useSearch: withSearch,
    ...(withSearch ? { searchText: "Data Analyst Jobs Leipzig" } : {}),
    createdAt: new Date(clock).toISOString(),
    nextDueAt: new Date(clock).toISOString(),
  },
  consent: { version: BACKGROUND_CONSENT_VERSION, acceptedAt: new Date(clock).toISOString(), sensitive: true },
  attachment: { text: CV },
});
if (!("task" in created)) throw Error(`create refused: ${created.error}`);
console.log(JSON.stringify({ step: "created", nextDueAt: created.task.nextDueAt, mode: created.task.answerMode, search: withSearch }));
for (const day of [1, 2]) {
  clock = Date.parse(created.task.nextDueAt) + (day - 1) * 86_400_000 + 11 * 60_000;
  const started = performance.now();
  await service.tick();
  const results = await service.results(account);
  const last = results.at(-1);
  console.log(
    JSON.stringify({
      step: `run ${day}`,
      ms: Math.round(performance.now() - started),
      status: last?.status,
      reason: last?.reason,
      usage: last?.usage,
      attestCallsSoFar: attestCalls,
      allowanceUsed: (usage.summary(account) as { used?: number }).used,
    }),
  );
  if (last?.text) console.log(`--- answer (synthetic task) ---\n${last.text}\n---`);
  for (const r of results) await service.ack(account, r.id);
}
// The SDK's Wasm runs inside the server process: its memory matters on one Render instance.
console.log(JSON.stringify({ step: "counts", counts: takeCounts(), rssMB: Math.round(process.memoryUsage().rss / 1e6) }));
model.close();
