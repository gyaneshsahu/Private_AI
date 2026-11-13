// The server's daily Privatemode model check, run by hand (docs/model-deprecation-runbook.md).
// One GET of the model list with the key: no prompt, no tokens, no user data. Exits 1 on any
// finding. Key from Windows Credential Manager, never printed:
//   Invoke-WithPrivateAiSecret -Name PRIVATEMODE_API_KEY -Action { npx tsx scripts/privatemode-models-check.ts }
//   ... --record            write server/privatemode-models-baseline.json (then commit and deploy)
//   ... --sdk               read the list through the Privatemode SDK instead of plain HTTPS
//   ... --models a,b        other model IDs (default glm-5.3,glm-5.3-flash)
import { writeFileSync } from "node:fs";
import {
  BASELINE_FILE,
  listedModels,
  modelAlerts,
  privatemodeModelList,
  recordedBaseline,
} from "../server/model-watch";

const ORIGIN = "https://api.privatemode.ai/";
const apiKey = process.env.PRIVATEMODE_API_KEY;
if (!apiKey) throw Error("Load PRIVATEMODE_API_KEY with scripts/WindowsSecrets.psm1");
const at = process.argv.indexOf("--models");
const watched = (at > 0 ? process.argv[at + 1] : "glm-5.3,glm-5.3-flash").split(",");
const sdk = process.argv.includes("--sdk");

let list: unknown;
if (sdk) {
  const client = new (await import("privatemode-ai")).PrivatemodeAI({ apiKey, enableWasmLogging: false });
  try {
    list = await client.models.list();
  } finally {
    client.close();
  }
} else list = await privatemodeModelList(ORIGIN, apiKey)();

const listed = listedModels(list);
console.log(`${listed.size} models listed (${sdk ? "SDK" : "plain HTTPS GET /v1/models"})`);
for (const id of watched) console.log(`${id}: ${listed.has(id) ? Object.keys(listed.get(id)!).sort().join(", ") : "NOT LISTED"}`);

if (process.argv.includes("--record")) {
  const missing = watched.filter((id) => !listed.has(id));
  if (missing.length) throw Error(`not recorded: ${missing.join(", ")} not in the list`);
  writeFileSync(
    BASELINE_FILE,
    JSON.stringify(
      {
        recordedAt: new Date().toISOString(),
        source: `${ORIGIN}v1/models (${sdk ? "SDK" : "plain HTTPS"})`,
        models: Object.fromEntries(watched.map((id) => [id, listed.get(id)])),
      },
      null,
      2,
    ) + "\n",
  );
  console.log("baseline written: server/privatemode-models-baseline.json. Run the check once more now; a key that already differs is recomputed per request (add it to VOLATILE in server/model-watch.ts).");
} else {
  const alerts = modelAlerts(list, watched, recordedBaseline());
  for (const alert of alerts) console.log(`ALERT ${alert}`);
  if (!alerts.length) console.log("no change since the baseline");
  process.exit(alerts.length ? 1 : 0);
}
