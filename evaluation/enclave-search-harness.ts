// Bounded in-enclave web search harness (launch plan 4.2): PREPARATION ONLY.
//
// This module validates an owner permit, derives the exact bounded request
// plan the evaluation of 21 October calls for, and describes the durable
// record that a run would leave. It performs no network call of any kind and
// has no `run` mode: running needs the owner to name the service, the current
// price and a specific cap first (approved-spend statement, 22 October), and
// the live sender will be added only against such a permit.
//
//   node --import tsx evaluation/enclave-search-harness.ts plan <permit.json>
//
// The plan is printed as JSON so it can be reviewed before any permit is signed.
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { z } from "zod";

const hostname = z
  .string()
  .regex(/^(?=.{1,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/);

/** Owner permit for at most three metered synthetic requests. */
export const enclaveSearchPermitSchema = z
  .object({
    purpose: z.literal("SYNTHETIC_ONLY_ENCLAVE_SEARCH_NOT_QUALIFICATION"),
    approvalId: z.string().regex(/^[a-zA-Z0-9_-]{8,80}$/),
    approvedAt: z.string().datetime(),
    expiresAt: z.string().datetime(),
    approvalEvidence: z.string().min(20),
    /** The three facts the owner must name before any paid step. */
    spend: z
      .object({
        service: z.literal("Tinfoil"),
        priceEvidence: z.string().min(20),
        priceCheckedAt: z.string().datetime(),
        capUSD: z.number().positive().max(5),
      })
      .strict(),
    policy: z
      .object({
        origin: z.literal("https://inference.tinfoil.sh"),
        repository: z.literal("tinfoilsh/confidential-model-router"),
        /** Exactly one fresh exact digest from a same-day development permit. */
        releaseDigest: z.string().regex(/^[a-f0-9]{64}$/),
        model: z.string().min(3).max(80),
        /** Named public hosts the search is confined to. */
        allowedDomains: z.array(hostname).min(1).max(5),
        maxAgeHours: z
          .number()
          .int()
          .positive()
          .max(24 * 30)
          .optional(),
        /** One public synthetic query; no private data, no identifiers. */
        query: z.string().min(2).max(400),
        maxRequests: z.number().int().min(1).max(3),
        maxOutputTokens: z.number().int().positive().max(1024),
      })
      .strict(),
  })
  .strict();
export type EnclaveSearchPermit = z.infer<typeof enclaveSearchPermitSchema>;

/**
 * Web search fee per request, USD. Supplier statement of 22 October 2026
 * (supplier email): "costs $0.05 per request. It works with all chat
 * models." Not yet read from the rendered pricing page nor observed in a
 * metered cost_usd; see docs/provider-qualification.md.
 */
export const WEB_SEARCH_FEE_USD = 0.05;

const identifierLike =
  /@|\b\d{6,}\b|\b[A-Z]{2}\d{2}[A-Z0-9]{10,30}\b|\b\d{4}[ -]?\d{4}[ -]?\d{4}[ -]?\d{2,4}\b/;

export function validateEnclaveSearchPermit(
  input: unknown,
  now = Date.now(),
): EnclaveSearchPermit {
  const permit = enclaveSearchPermitSchema.parse(input);
  const approved = Date.parse(permit.approvedAt);
  const expires = Date.parse(permit.expiresAt);
  if (!(approved <= now && now < expires) || expires - approved > 7 * 86400e3)
    throw Error(
      "The permit must be current and valid for at most seven days from approval.",
    );
  if (identifierLike.test(permit.policy.query))
    throw Error(
      "The synthetic query must contain no email address, account, card, IBAN or long number.",
    );
  if (Date.parse(permit.spend.priceCheckedAt) < approved - 86400e3)
    throw Error("The price must have been checked within a day of approval.");
  if (permit.spend.capUSD < permit.policy.maxRequests * WEB_SEARCH_FEE_USD)
    throw Error(
      "The cap must cover at least the web search fee for every planned request.",
    );
  return permit;
}

export interface PlannedRequest {
  ordinal: 1 | 2 | 3;
  path: "/v1/chat/completions";
  headers: Record<string, string>;
  /** Plaintext body before EHBP encryption in the browser; one optional field over the frozen shape. */
  body: {
    model: string;
    messages: { role: "user"; content: string }[];
    stream: true;
    stream_options: { include_usage: true };
    max_completion_tokens: number;
    web_search_options: {
      search_context_size: "low";
      filters: { allowed_domains: string[] };
      max_age_hours?: number;
      pii_check_options: Record<string, never>;
      prompt_injection_check_options: Record<string, never>;
    };
  };
  rule: string;
}

export interface HarnessPlan {
  approvalId: string;
  spend: EnclaveSearchPermit["spend"];
  releaseDigest: string;
  /** Search fees alone if every planned request searches; tokens come on top. */
  feeFloorUSD: number;
  requests: PlannedRequest[];
  sequence: string[];
  durableRecord: Record<string, string>;
  neverWritten: string[];
}

/** The exact bounded plan for review; deterministic for a given permit. */
export function planEnclaveSearchHarness(
  permit: EnclaveSearchPermit,
): HarnessPlan {
  const queryHash = createHash("sha256")
    .update(permit.policy.query)
    .digest("hex");
  const requests: PlannedRequest[] = [];
  for (let i = 1; i <= permit.policy.maxRequests; i++)
    requests.push({
      ordinal: i as 1 | 2 | 3,
      path: "/v1/chat/completions",
      headers: {
        "X-Tinfoil-Model": permit.policy.model,
        "X-Tinfoil-Request-Usage-Metrics": "true",
        // No X-Tinfoil-Events: markers inside delta.content are not parsed yet.
      },
      body: {
        model: permit.policy.model,
        messages: [{ role: "user", content: permit.policy.query }],
        stream: true,
        stream_options: { include_usage: true },
        max_completion_tokens: permit.policy.maxOutputTokens,
        web_search_options: {
          search_context_size: "low",
          filters: { allowed_domains: permit.policy.allowedDomains },
          ...(permit.policy.maxAgeHours !== undefined
            ? { max_age_hours: permit.policy.maxAgeHours }
            : {}),
          pii_check_options: {},
          prompt_injection_check_options: {},
        },
      },
      rule:
        i === 1
          ? "sent alone; the usage trailer is recorded before anything else is sent"
          : "sent only if the previous trailer was recorded and the running cost_usd stays under the cap",
    });
  return {
    approvalId: permit.approvalId,
    spend: permit.spend,
    releaseDigest: permit.policy.releaseDigest,
    feeFloorUSD: Number(
      (permit.policy.maxRequests * WEB_SEARCH_FEE_USD).toFixed(2),
    ),
    requests,
    sequence: [
      "browser verification against the exact release digest must pass the same day, with the usual negative checks, before request 1",
      "requests are sequential, never concurrent, never retried; any transport error ends the run",
      "the run stops when the running cost_usd from the trailers reaches the cap, or after maxRequests",
      "billing is read before and after the run and both readings are recorded",
      "no production allowlist, qualification record, account setting or privacy copy is changed by the run",
    ],
    durableRecord: {
      approvalId: "the permit's approval ID",
      releaseDigest: "the verified digest",
      queryHash: `sha256 of the synthetic query (${queryHash})`,
      perRequest:
        "ordinal, HTTP status, time to first delta, time to the usage frame, the raw X-Tinfoil-Usage-Metrics line, web_search_calls, cost_usd, count of url_citation annotations",
      totals: "requests sent, sum of cost_usd, billing before and after",
    },
    neverWritten: [
      "the model's reply text",
      "citation titles or URLs",
      "any query the model composed",
      "the API key or any header carrying it",
    ],
  };
}

if (process.argv[1]?.endsWith("enclave-search-harness.ts")) {
  const [mode, file] = process.argv.slice(2);
  if (mode !== "plan" || !file) {
    console.error(
      "Usage: node --import tsx evaluation/enclave-search-harness.ts plan <permit.json>\nThere is no run mode: running needs the owner to name the service, price and cap, and a live sender written against that permit.",
    );
    process.exit(2);
  }
  const permit = validateEnclaveSearchPermit(
    JSON.parse(readFileSync(file, "utf8")),
  );
  console.log(JSON.stringify(planEnclaveSearchHarness(permit), null, 2));
}
