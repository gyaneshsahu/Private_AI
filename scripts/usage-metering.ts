// Usage metering for the owner (docs/usage-metering-20261115.md). Read-only; prints numbers only.
//
//   reconcile: the app's totals for a week, per feature and in total, in the units the Privatemode
//              portal shows (tokens as the free quota counts them, euros at list prices), and the
//              gap to the portal reading you type in. Replaces the arithmetic of the weekly step in
//              docs/week-one-monitoring.md (the portal has no interface the server can read).
//   suggest:   suggested weights from the recorded measurements (median per use, ratio to a Fast
//              message) and a proposal for the next version of shared/usage-weights.json. Nothing
//              changes until the owner approves and the agent appends the version.
//
// node --import tsx scripts/usage-metering.ts reconcile --from 2026-11-16 --to 2026-11-23 --database-url-file <file> [--portal-tokens N] [--portal-eur X]
// node --import tsx scripts/usage-metering.ts suggest --from 2026-11-16 --to 2026-11-23 --database-url-file <file> [--basis euros|tokens] [--weights-version N]
//
// Several weights versions: every record keeps the version it was charged under (version 1: voice 2
// units per recording part; version 2: 1). reconcile adds up the units each record was charged and
// prints them per version; an unreported request is estimated from its own version's basis when
// nothing was measured. suggest compares against the version in force (or --weights-version N, as
// a deployment that pins one) and proposes the next version number.
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { Pool } from "pg";
import { activeWeights, usageWeights, weightsVersion, type Feature, type WeightsFile, type WeightsVersion } from "../shared/usage-config";
import { VOICE_UNIT_SECONDS } from "../shared/voice";
import { voiceUnitsOf } from "../server/usage-contract";
import type { UsageRecord } from "../server/usage-records";
import { PostgresUsageRecords } from "../server/usage-records-postgres";

type Prices = WeightsFile["prices"];
const DAY = 86_400_000;

export function median(values: number[]): number | undefined {
  if (!values.length) return undefined;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

const reported = (r: UsageRecord) => r.report === "accepted" && r.promptTokens !== undefined && r.completionTokens !== undefined;

/**
 * Audio seconds of a record: reported, or for a voice chunk the relay recorded, its 2-second units
 * from the request ID (voice-<units>-<uuid>, checked against the chunk's size before it was
 * forwarded). Rounded up per chunk, so at most 2 seconds above the real length. Only for a chunk
 * that was transcribed: a refused or interrupted one is counted as incomplete.
 */
export function audioSecondsOf(r: UsageRecord): number | undefined {
  if (r.audioSeconds !== undefined) return r.audioSeconds;
  if (r.feature !== "voice" || r.outcome !== "complete") return undefined;
  const units = voiceUnitsOf(r.requestId);
  return units > 0 ? units * VOICE_UNIT_SECONDS : undefined;
}

/** Tokens as Privatemode's free quota deducts them: cached prompt tokens at the cached:regular price ratio, audio at its tokens per minute. */
export function quotaTokens(r: UsageRecord, prices: Prices): number | undefined {
  const audio = audioSecondsOf(r);
  if (audio !== undefined) return Math.round((audio / 60) * prices.audioTokensPerMinute);
  if (!reported(r)) return undefined;
  const price = prices.models[r.model ?? ""];
  const cached = r.cachedTokens ?? 0;
  const ratio = price?.inputPerMillion && price.cachedPerMillion !== undefined ? price.cachedPerMillion / price.inputPerMillion : 1;
  return Math.round(r.promptTokens! - cached + cached * ratio + r.completionTokens!);
}

/** List-price euros (before VAT), or undefined without a report or a known price. */
export function euros(r: UsageRecord, prices: Prices): number | undefined {
  const price = prices.models[r.model ?? ""];
  if (!price) return undefined;
  const audio = audioSecondsOf(r);
  if (audio !== undefined) return price.perAudioMinute === undefined ? undefined : (audio / 60) * price.perAudioMinute;
  if (!reported(r) || price.inputPerMillion === undefined || price.outputPerMillion === undefined) return undefined;
  const cached = r.cachedTokens ?? 0;
  return (
    ((r.promptTokens! - cached) * price.inputPerMillion + cached * (price.cachedPerMillion ?? price.inputPerMillion) + r.completionTokens! * price.outputPerMillion) /
    1e6
  );
}

export interface FeatureTotals {
  feature: Feature | "total";
  requests: number;
  units: number;
  reported: number;
  flagged: number;
  /** Complete requests whose browser report is missing or flagged: estimated at the feature's median. */
  unreported: number;
  /** Interrupted or refused: Privatemode may have billed them; nothing can be counted. */
  incomplete: number;
  prompt: number;
  completion: number;
  cached: number;
  reasoning: number;
  quotaTokens: number;
  estimatedTokens: number;
  eur: number;
}

const empty = (feature: FeatureTotals["feature"]): FeatureTotals => ({
  feature, requests: 0, units: 0, reported: 0, flagged: 0, unreported: 0, incomplete: 0,
  prompt: 0, completion: 0, cached: 0, reasoning: 0, quotaTokens: 0, estimatedTokens: 0, eur: 0,
});

export function reconcile(
  records: UsageRecord[],
  prices: Prices,
  portal: { tokens?: number; eur?: number } = {},
  weights: WeightsVersion = activeWeights(),
  file: WeightsFile = usageWeights,
) {
  const byFeature = new Map<Feature, FeatureTotals>();
  const medians = new Map<Feature, number>();
  for (const feature of new Set(records.map((r) => r.feature))) {
    const m = median(records.filter((r) => r.feature === feature).map((r) => quotaTokens(r, prices)).filter((n): n is number => n !== undefined));
    if (m !== undefined) medians.set(feature, m);
  }
  // Nothing measured for a feature: the basis of the version the record was charged under (a voice
  // record of version 1 was a whole recording, of version 2 one chunk), else of `weights`.
  const estimate = (r: UsageRecord) =>
    medians.get(r.feature) ?? (weightsVersion(r.weightVersion, file) ?? weights).basis[r.feature]?.tokensPerUse ?? weights.basis[r.feature]?.tokensPerUse ?? 0;
  const byVersion = new Map<number, { version: number; requests: number; units: number }>();
  for (const r of records) {
    const v = byVersion.get(r.weightVersion) ?? { version: r.weightVersion, requests: 0, units: 0 };
    v.requests++;
    v.units += r.units;
    byVersion.set(r.weightVersion, v);
    const row = byFeature.get(r.feature) ?? empty(r.feature);
    row.requests++;
    row.units += r.units;
    if (r.report === "flagged") row.flagged++;
    const tokens = quotaTokens(r, prices);
    if (tokens !== undefined) {
      row.reported++;
      row.prompt += r.promptTokens ?? 0;
      row.completion += r.completionTokens ?? 0;
      row.cached += r.cachedTokens ?? 0;
      row.reasoning += r.reasoningTokens ?? 0;
      row.quotaTokens += tokens;
      row.eur += euros(r, prices) ?? 0;
    } else if (r.outcome === "complete") {
      row.unreported++;
      row.estimatedTokens += estimate(r);
    } else row.incomplete++;
    byFeature.set(r.feature, row);
  }
  const features = [...byFeature.values()].sort((a, b) => b.quotaTokens - a.quotaTokens);
  const total = empty("total");
  for (const row of features)
    for (const key of Object.keys(total) as (keyof FeatureTotals)[]) if (key !== "feature") (total[key] as number) += row[key] as number;
  const app = total.quotaTokens + total.estimatedTokens;
  return {
    features,
    total,
    versions: [...byVersion.values()].sort((a, b) => a.version - b.version),
    appTokens: app,
    ...(portal.tokens !== undefined
      ? { tokenGap: portal.tokens - app, tokenGapPercent: portal.tokens ? ((portal.tokens - app) / portal.tokens) * 100 : 0 }
      : {}),
    ...(portal.eur !== undefined ? { eurGap: portal.eur - total.eur } : {}),
  };
}

const n = (value: number) => Math.round(value).toLocaleString("en-US");
export function formatReconciliation(result: ReturnType<typeof reconcile>, from: string, to: string, portal: { tokens?: number; eur?: number } = {}) {
  const lines = [
    `CometRow usage, ${from} to ${to} (UTC, end exclusive). Numbers only.`,
    "",
    "feature            requests  units  reported  flagged  unreported  incomplete  prompt  completion  cached  quota-tokens  estimated  EUR",
  ];
  for (const r of [...result.features, result.total])
    lines.push(
      [
        r.feature.padEnd(18), String(r.requests).padStart(8), String(r.units).padStart(6), String(r.reported).padStart(9),
        String(r.flagged).padStart(8), String(r.unreported).padStart(11), String(r.incomplete).padStart(11), n(r.prompt).padStart(7),
        n(r.completion).padStart(11), n(r.cached).padStart(7), n(r.quotaTokens).padStart(13), n(r.estimatedTokens).padStart(10),
        r.eur.toFixed(4).padStart(8),
      ].join(" "),
    );
  lines.push(
    "",
    `App total: ${n(result.total.quotaTokens)} reported tokens + ${n(result.total.estimatedTokens)} estimated for ${result.total.unreported} unreported requests = ${n(result.appTokens)} tokens.`,
    `${result.total.incomplete} requests were interrupted or refused: Privatemode may have billed some of their tokens; they are not in the total.`,
    `Charged by weights version: ${result.versions.map((v) => `version ${v.version}: ${v.requests} requests, ${v.units} units`).join("; ") || "none"}.`,
    "Voice is measured by the relay (2-second steps per part, rounded up), not reported by the browser.",
  );
  if (portal.tokens !== undefined)
    lines.push(
      `Portal: ${n(portal.tokens)} tokens. Gap (portal minus app): ${n(result.tokenGap!)} tokens, ${result.tokenGapPercent!.toFixed(1)} % of the portal figure.`,
    );
  if (portal.eur !== undefined) lines.push(`Portal: EUR ${portal.eur.toFixed(2)}. Gap (portal minus app, list prices before VAT): EUR ${result.eurGap!.toFixed(2)}.`);
  lines.push(
    "Read the gap with docs/week-one-monitoring.md: within 10 % is normal (interrupted requests, rounding); clearly above means requests the app does not see.",
  );
  return lines.join("\n");
}

/** A paid message with the free code follow-ups after it, or a research plan with its answer: one use of the feature. */
function bundles(records: UsageRecord[], head: (r: UsageRecord) => boolean, tail: (r: UsageRecord) => boolean, windowMs: number) {
  const out: UsageRecord[][] = [];
  const open = new Map<string, UsageRecord[]>();
  for (const r of records) {
    const current = open.get(r.accountId);
    if (head(r)) {
      const group = [r];
      open.set(r.accountId, group);
      out.push(group);
    } else if (tail(r) && current && r.createdAt - current[0].createdAt <= windowMs) current.push(r);
  }
  return out;
}

export function suggestWeights(
  records: UsageRecord[],
  file: WeightsFile = usageWeights,
  options: { basis?: "euros" | "tokens"; minUses?: number; now?: number; weightsVersion?: number } = {},
) {
  const prices = file.prices;
  const current = activeWeights(options.now ?? Date.now(), file, options.weightsVersion);
  const minUses = options.minUses ?? 20;
  const complete = records.filter((r) => r.outcome === "complete");
  const cost = (group: UsageRecord[]) => {
    const tokens = group.map((r) => quotaTokens(r, prices));
    const eur = group.map((r) => euros(r, prices));
    return tokens.every((t) => t !== undefined) && eur.every((e) => e !== undefined)
      ? { tokens: tokens.reduce((a, b) => a! + b!, 0)!, eur: eur.reduce((a, b) => a! + b!, 0)! }
      : undefined;
  };
  const measure = (groups: UsageRecord[][]) => {
    const costs = groups.map(cost).filter((c): c is { tokens: number; eur: number } => !!c);
    return { uses: costs.length, tokens: median(costs.map((c) => c.tokens)), eur: median(costs.map((c) => c.eur)) };
  };
  const single = (feature: Feature) => measure(complete.filter((r) => r.feature === feature).map((r) => [r]));
  const isFollowUp = (r: UsageRecord) => r.feature === "code-followup";
  const turn = (mode: "chat-fast" | "chat-thinking") =>
    measure(bundles(complete, (r) => r.feature === mode, isFollowUp, 5 * 60_000).filter((g) => g.length > 1));
  const rows: { key: keyof WeightsVersion["units"] | "code-turn-fast" | "code-turn-thinking"; uses: number; tokens?: number; eur?: number }[] = [
    { key: "chat-fast", ...single("chat-fast") },
    { key: "chat-thinking", ...single("chat-thinking") },
    { key: "code-turn-fast", ...turn("chat-fast") },
    { key: "code-turn-thinking", ...turn("chat-thinking") },
    { key: "image", ...single("image") },
    { key: "voice", ...single("voice") },
    {
      key: "research-run",
      ...measure(bundles(complete, (r) => r.feature === "research-plan", (r) => r.feature === "research-answer", 30 * 60_000).filter((g) => g.length === 2)),
    },
  ];
  const fast = rows[0];
  const basis = options.basis ?? "euros";
  const units = { ...current.units };
  const table = rows.map((row) => {
    const tokenRatio = row.tokens !== undefined && fast.tokens ? row.tokens / fast.tokens : undefined;
    const euroRatio = row.eur !== undefined && fast.eur ? row.eur / fast.eur : undefined;
    const ratio = basis === "euros" ? euroRatio : tokenRatio;
    const enough = row.uses >= minUses && fast.uses >= minUses && ratio !== undefined;
    const key = row.key as keyof WeightsVersion["units"];
    const now = key in units ? units[key] : undefined;
    let suggested: number | undefined;
    if (enough && now !== undefined && key !== "chat-fast") {
      // Per-request weights are 1 to 10 units (shared/contracts.ts); a research run 2 to 20.
      suggested = key === "research-run" ? Math.min(20, Math.max(2, Math.round(ratio!))) : Math.min(10, Math.max(1, Math.round(ratio!)));
      units[key] = suggested;
    }
    return { ...row, tokenRatio, euroRatio, current: now, suggested, enough };
  });
  const measuredBasis = Object.fromEntries(
    table
      .filter((row) => row.tokens !== undefined)
      .map((row) => [row.key, { tokensPerUse: Math.round(row.tokens!), uses: row.uses, source: `median of accepted browser reports in the window (scripts/usage-metering.ts suggest, basis ${basis})` }]),
  );
  const proposal: WeightsVersion = {
    ...current,
    version: file.versions.length + 1,
    effectiveFrom: "SET_ON_APPROVAL",
    approvedBy: "PENDING OWNER APPROVAL: replace with who approved and when",
    units,
    basis: measuredBasis,
  };
  return { basis, current: current.version, table, proposal, changed: table.some((row) => row.suggested !== undefined && row.suggested !== row.current) };
}

export function formatSuggestion(result: ReturnType<typeof suggestWeights>) {
  const lines = [
    `Suggested weights from measurements (basis: ${result.basis}; current version ${result.current}). A Fast message is 1.`,
    "",
    "feature             uses  median-tokens  median-EUR  token-ratio  euro-ratio  current  suggested",
  ];
  const f = (value: number | undefined, digits = 1) => (value === undefined ? "-" : value.toFixed(digits));
  for (const row of result.table)
    lines.push(
      [
        row.key.padEnd(19), String(row.uses).padStart(4), f(row.tokens, 0).padStart(14), f(row.eur, 5).padStart(11),
        f(row.tokenRatio).padStart(12), f(row.euroRatio).padStart(11), String(row.current ?? "-").padStart(8),
        (row.enough ? String(row.suggested ?? "-") : "too few").padStart(10),
      ].join(" "),
    );
  lines.push(
    "",
    "code-turn rows are a paid message plus its free follow-ups: shown for review, charged by the message weight and freeCodeFollowUps.",
    result.changed
      ? "Proposal for the next version (the owner approves; then append it to shared/usage-weights.json with the date and approver):"
      : "No weight would change. Proposal shown with the measured basis only:",
    JSON.stringify(result.proposal, null, 2),
  );
  return lines.join("\n");
}

function argument(args: string[], name: string) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

export async function main(argv: string[]) {
  const [command, ...args] = argv;
  const from = argument(args, "--from"),
    to = argument(args, "--to"),
    urlFile = argument(args, "--database-url-file");
  const start = Date.parse(`${from}T00:00:00Z`),
    end = Date.parse(`${to}T00:00:00Z`);
  if (!["reconcile", "suggest"].includes(command) || !urlFile || !(start < end) || end - start > 92 * DAY)
    throw Error(
      "Usage: node --import tsx scripts/usage-metering.ts reconcile|suggest --from YYYY-MM-DD --to YYYY-MM-DD --database-url-file <file> [--portal-tokens N] [--portal-eur X] [--basis euros|tokens] [--weights-version N]",
    );
  const url = (await readFile(urlFile, "utf8")).trim();
  if (!/^postgres(ql)?:\/\//.test(url)) throw Error("URL file must hold one PostgreSQL URL.");
  const database = new Pool({ connectionString: url, max: 1, statement_timeout: 15000 });
  try {
    const records = await new PostgresUsageRecords(database).between(start, end);
    if (command === "suggest") {
      const basis = argument(args, "--basis") === "tokens" ? "tokens" : "euros";
      const pinned = argument(args, "--weights-version");
      return formatSuggestion(suggestWeights(records, usageWeights, { basis, ...(pinned ? { weightsVersion: Number(pinned) } : {}) }));
    }
    const portal = {
      ...(argument(args, "--portal-tokens") ? { tokens: Number(argument(args, "--portal-tokens")) } : {}),
      ...(argument(args, "--portal-eur") ? { eur: Number(argument(args, "--portal-eur")) } : {}),
    };
    return formatReconciliation(reconcile(records, usageWeights.prices, portal), from!, to!, portal);
  } finally {
    await database.end();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main(process.argv.slice(2)).then(
    (text) => console.log(text),
    (error) => {
      console.error((error as Error).message);
      process.exitCode = 1;
    },
  );
}
