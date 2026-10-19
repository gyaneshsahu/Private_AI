import { SqliteUsageLedger } from "../../server/usage-ledger";
const [path, prefix] = process.argv.slice(2);
if (!path || !prefix) throw Error("Synthetic worker arguments required");
const ledger = new SqliteUsageLedger(path, () => 5);
try {
  let admitted = 0;
  for (let i = 0; i < 30; i++)
    if (ledger.reserve("synthetic", `${prefix}-${i}`)) admitted++;
  process.stdout.write(String(admitted));
} finally {
  ledger.close();
}
