import { readFile, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { z } from "zod";
import Decimal from "decimal.js";
import { composeContext, newMessage } from "../src/conversation";
import { emptyConversation } from "../shared/contracts";
const text = z.string().min(1).max(3000);
const bytes = await readFile("evaluation/cases/readiness-transfer.json");
const cases = z
  .array(
    z
      .object({
        id: z.string().regex(/^readiness-[a-z-]+$/),
        family: z.enum(["personal", "writing", "documents"]),
        synthetic: z.literal(true),
        turns: z.array(text).length(2),
        mandatoryFacts: z.array(text).min(1),
        forbiddenConclusions: z.array(text).min(1),
        sources: z.array(z.object({ id: text, text }).strict()),
      })
      .strict(),
  )
  .length(12)
  .parse(JSON.parse(bytes.toString()));
const turns = cases.flatMap((c) => c.turns);
if (new Set(turns).size !== 24 || new Set(cases.map((c) => c.id)).size !== 12)
  throw Error("Duplicate case");
for (const file of await readdir("evaluation/cases")) {
  if (!file.endsWith(".json") || file === "readiness-transfer.json") continue;
  const prior = JSON.parse(await readFile("evaluation/cases/" + file, "utf8"));
  const entries = Array.isArray(prior) ? prior : (prior.cases ?? []);
  const exposed = new Set(
    entries.flatMap((c: { turns?: string[] }) => c.turns ?? []),
  );
  if (turns.some((t) => exposed.has(t))) throw Error("Reused exposed prompt");
}
let reserve = new Decimal(0);
for (const c of cases)
  for (const variant of [undefined, "constraints-v2"] as const) {
    const conversation = emptyConversation();
    if (c.sources.length)
      conversation.attachments.push({
        id: "fixture",
        name: "Synthetic development references",
        selected: true,
        sources: c.sources.map((s) => ({
          ...s,
          title: "Synthetic development reference",
        })),
      });
    conversation.messages.push(newMessage("user", c.turns[0]));
    const firstCharacters = composeContext(
      conversation,
      8000,
      new Date(),
      variant,
    ).reduce((n, m) => n + m.content.length, 0);
    reserve = reserve.plus(
      new Decimal(firstCharacters)
        .plus(8000)
        .mul(4)
        .mul(".4")
        .plus(8192)
        .div(1e6),
    );
  }
console.log(
  JSON.stringify({
    kind: "PREPARED_FIXTURE_CHECK_ONLY",
    cases: 12,
    maximumRequests: 48,
    reserveUSD: reserve.toFixed(8),
    maximumCumulativeUSD: reserve.plus("2.288624").toFixed(8),
    fixtureSHA256: createHash("sha256").update(bytes).digest("hex"),
    permitsIssued: 0,
    modelRequests: 0,
    quality: "NOT_EVALUATED",
  }),
);
