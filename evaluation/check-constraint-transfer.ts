import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import Decimal from "decimal.js";
import { z } from "zod";

const text = z.string().min(1).max(3000);
const bytes = await readFile("evaluation/cases/constraint-transfer.json");
const cases = z
  .array(
    z
      .object({
        id: z.string().regex(/^constraint-[a-z-]+$/),
        family: z.enum(["personal", "writing", "documents"]),
        turns: z.array(text).length(2),
        mandatoryFacts: z.array(text).min(1),
        forbiddenConclusions: z.array(text).min(1),
        sources: z.array(z.object({ id: text, text }).strict()),
        synthetic: z.literal(true),
      })
      .strict(),
  )
  .length(12)
  .parse(JSON.parse(bytes.toString()));
if (
  new Set(cases.map((c) => c.id)).size !== 12 ||
  new Set(cases.flatMap((c) => c.turns)).size !== 24
)
  throw Error("Duplicate proposed case or prompt");
for (const file of [
  "development",
  "heldout",
  "reliability-transfer",
  "trial-transfer",
  "safety-transfer",
]) {
  const prior = JSON.parse(
    await readFile(`evaluation/cases/${file}.json`, "utf8"),
  );
  const exposed = new Set(prior.flatMap((c: { turns: string[] }) => c.turns));
  if (cases.some((c) => c.turns.some((t) => exposed.has(t))))
    throw Error("Reused exposed prompt");
}
const requests = cases.length * 2 * 2;
const reserve = new Decimal(8000)
  .mul(4)
  .mul("0.4")
  .plus(2048)
  .div(1e6)
  .mul(requests);
console.log(
  JSON.stringify({
    status: "PREPARED_NOT_RUN",
    cases: cases.length,
    configurations: 2,
    maximumRequests: requests,
    maximumReserveUSD: reserve.toFixed(6),
    maximumCumulativeUSD: reserve.plus("1.961968").toFixed(6),
    requestedCumulativeCapUSD: 3,
    fixtureSHA256: createHash("sha256").update(bytes).digest("hex"),
    modelRequests: 0,
    permitsIssued: 0,
    quality: "NOT_EVALUATED",
  }),
);
