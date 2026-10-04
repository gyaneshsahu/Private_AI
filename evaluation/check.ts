import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { z } from "zod";
const family = z.enum([
  "writing",
  "planning",
  "personal",
  "bills",
  "documents",
  "research",
]);
const casesSchema = z
  .array(
    z.object({
      id: z.string(),
      family,
      turns: z.array(z.string().min(1)).min(2),
      mandatoryFacts: z.array(z.string()).min(1),
      forbiddenConclusions: z.array(z.string()).min(1),
      sources: z.array(z.object({ id: z.string(), text: z.string() })),
      synthetic: z.literal(true),
    }),
  )
  .length(24);
const manifest = JSON.parse(
  await readFile("evaluation/frozen-manifest.json", "utf8"),
) as Record<string, string>;
const ids = new Set<string>();
for (const name of ["development.json", "heldout.json"]) {
  const bytes = await readFile(`evaluation/cases/${name}`);
  if (createHash("sha256").update(bytes).digest("hex") !== manifest[name])
    throw new Error(
      `Frozen fixture changed: ${name}. Retire used held-out cases explicitly; never silently rewrite the baseline.`,
    );
  const cases = casesSchema.parse(JSON.parse(bytes.toString()));
  for (const c of cases) {
    if (ids.has(c.id)) throw new Error("Duplicate case");
    ids.add(c.id);
  }
  for (const f of family.options)
    if (cases.filter((c) => c.family === f).length !== 4)
      throw new Error(`Insufficient coverage: ${name}/${f}`);
}
console.log(
  "Fixture integrity: 24 development + 24 reserved held-out conversations, six families. Model runs: 0. Quality gate: UNRUN. This command is not an answer-quality evaluation.",
);
