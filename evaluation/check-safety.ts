import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { z } from "zod";

const text = z.string().trim().min(1).max(3000);
const schema = z
  .object({
    schemaVersion: z.literal(1),
    purpose: z.literal("development-only"),
    status: z.literal("PREPARED_NOT_RUN"),
    language: z.literal("English"),
    reviewRequired: z.literal("human"),
    scopeNotes: z.array(text).min(1),
    cases: z
      .array(
        z
          .object({
            id: z.string().regex(/^safety-[a-z-]+$/),
            pair: z.string().regex(/^[a-z-]+$/),
            variant: z.enum(["risk", "benign"]),
            expectedResponse: z.enum([
              "support",
              "urgent-guidance",
              "refuse-enabling",
              "help",
            ]),
            turns: z.array(text).length(2),
            required: z.array(text).min(1),
            prohibited: z.array(text).min(1),
            synthetic: z.literal(true),
          })
          .strict(),
      )
      .min(12),
  })
  .strict();

const bytes = await readFile("evaluation/cases/safety-development.json");
const packet = schema.parse(JSON.parse(bytes.toString("utf8")));
const requiredPairs = [
  "self-harm",
  "health",
  "violence",
  "sexual-exploitation",
  "harassment",
  "cyber-privacy",
  "adult-explicit",
  "child-exploitation",
  "fraud",
];
if (requiredPairs.some((pair) => !packet.cases.some((c) => c.pair === pair)))
  throw Error("Missing required safety development category");
if (new Set(packet.cases.map((c) => c.id)).size !== packet.cases.length)
  throw Error("Duplicate safety development case");
for (const pair of new Set(packet.cases.map((c) => c.pair))) {
  const members = packet.cases.filter((c) => c.pair === pair);
  if (members.length !== 2 || new Set(members.map((c) => c.variant)).size !== 2)
    throw Error(
      `Safety category must contain one risk case and one benign control: ${pair}`,
    );
  if (
    members.some(
      (c) => (c.variant === "benign") !== (c.expectedResponse === "help"),
    )
  )
    throw Error(`Safety response expectation mismatches variant: ${pair}`);
}
console.log(
  JSON.stringify({
    fixtureValidation: "PASS",
    behavioralSafety: "NOT_EVALUATED",
    conversations: packet.cases.length,
    pairs: packet.cases.length / 2,
    sha256: createHash("sha256").update(bytes).digest("hex"),
    networkRequests: 0,
  }),
);

const transfer = z
  .array(
    z
      .object({
        id: z.string().regex(/^policy-transfer-[a-z-]+$/),
        family: z.enum(["writing", "planning"]),
        turns: z.array(text).length(2),
        mandatoryFacts: z.array(text).min(1),
        forbiddenConclusions: z.array(text).min(1),
        sources: z.array(z.never()).length(0),
        synthetic: z.literal(true),
      })
      .strict(),
  )
  .length(4)
  .parse(
    JSON.parse(await readFile("evaluation/cases/policy-transfer.json", "utf8")),
  );
if (new Set(transfer.map((c) => c.id)).size !== transfer.length)
  throw Error("Duplicate policy transfer case");
console.log(
  JSON.stringify({
    policyTransferFixtures: transfer.length,
    quality: "NOT_EVALUATED",
  }),
);
