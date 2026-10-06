import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { z } from "zod";
import { families } from "./grade";

const file = "evaluation/cases/robustness-development.json";
const bytes = await readFile(file);
const caseSchema = z.array(
  z
    .object({
      id: z.string().regex(/^robustness-[a-z-]+$/),
      family: z.enum(families),
      pair: z.string().optional(),
      variant: z.enum(["clean", "noisy", "reasoning", "ambiguity"]),
      turns: z.array(z.string().min(1).max(3000)).length(2),
      mandatoryFacts: z.array(z.string().min(1)).min(1),
      forbiddenConclusions: z.array(z.string().min(1)).min(1),
      sources: z.array(
        z.object({ id: z.string().min(1), text: z.string().min(1) }),
      ),
      synthetic: z.literal(true),
    })
    .strict(),
);
const cases = caseSchema.length(8).parse(JSON.parse(bytes.toString()));
const transferBytes = await readFile("evaluation/cases/repair-transfer.json");
const transfer = caseSchema
  .length(2)
  .parse(JSON.parse(transferBytes.toString()));
const attributionBytes = await readFile(
  "evaluation/cases/attribution-transfer.json",
);
const attribution = caseSchema
  .length(1)
  .parse(JSON.parse(attributionBytes.toString()));
if (
  new Set([...cases, ...transfer, ...attribution].map((c) => c.id)).size !==
  cases.length + transfer.length + attribution.length
)
  throw Error("Duplicate transfer case");
if (new Set(cases.map((c) => c.id)).size !== cases.length)
  throw Error("Duplicate supplemental case");
for (const pair of new Set(cases.filter((c) => c.pair).map((c) => c.pair))) {
  const members = cases.filter((c) => c.pair === pair);
  if (
    members.length !== 2 ||
    new Set(members.map((c) => c.variant)).size !== 2 ||
    !members.every((c) => c.variant === "clean" || c.variant === "noisy") ||
    members[0].family !== members[1].family ||
    JSON.stringify(members[0].mandatoryFacts) !==
      JSON.stringify(members[1].mandatoryFacts) ||
    JSON.stringify(members[0].forbiddenConclusions) !==
      JSON.stringify(members[1].forbiddenConclusions) ||
    JSON.stringify(members[0].sources) !== JSON.stringify(members[1].sources)
  )
    throw Error("Clean/noisy pair changes rubric or source material");
}
if (
  cases.filter((c) => c.variant === "reasoning").length !== 2 ||
  cases.filter((c) => c.variant === "ambiguity").length !== 2
)
  throw Error("Missing reasoning or ambiguity coverage");
console.log(
  JSON.stringify({
    kind: "SUPPLEMENTAL_FIXTURE_VALIDATION",
    cases: cases.length,
    transferCases: transfer.length,
    attributionCases: attribution.length,
    attributionSHA256: createHash("sha256")
      .update(attributionBytes)
      .digest("hex"),
    transferSHA256: createHash("sha256").update(transferBytes).digest("hex"),
    sha256: createHash("sha256").update(bytes).digest("hex"),
    modelExecutions: 0,
    quality: "UNRUN",
    reservedGateContribution: 0,
  }),
);
