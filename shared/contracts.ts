import { z } from "zod";

export const checks = [
  "browserVerification",
  "freshnessAndRevocation",
  "protectedWorkerChain",
  "retentionAndLogs",
  "noExternalTools",
  "liveStreaming",
  "negativeTests",
  "usageAndBudget",
] as const;
/** Plain names for the review checks, used wherever the app says what is and is not checked. */
export const checkLabels: Record<(typeof checks)[number], string> = {
  browserVerification: "browser check of the secure server",
  freshnessAndRevocation: "freshness and revocation checks",
  protectedWorkerChain: "full hardware chain to the AI server",
  retentionAndLogs: "supplier retention and logs",
  noExternalTools: "no outside tools",
  liveStreaming: "live streaming",
  negativeTests: "failure tests",
  usageAndBudget: "usage and budget limits",
};
/** German names for the same checks (German interface). */
export const checkLabelsDe: Record<(typeof checks)[number], string> = {
  browserVerification: "Browserprüfung des sicheren Servers",
  freshnessAndRevocation: "Prüfungen auf Aktualität und Widerruf",
  protectedWorkerChain: "vollständige Hardware-Kette bis zum KI-Server",
  retentionAndLogs: "Aufbewahrung und Protokolle beim Anbieter",
  noExternalTools: "keine externen Werkzeuge",
  liveStreaming: "Live-Übertragung",
  negativeTests: "Fehlertests",
  usageAndBudget: "Nutzungs- und Budgetgrenzen",
};
const reviewEvidence = z.array(z.string().min(10)).min(1);
// A check either passed with evidence, or the owner accepted its known gap for a
// limited release with a dated, written reason. Acceptance is never shown as a pass.
const reviewCheck = z.discriminatedUnion("status", [
  z.object({ status: z.literal("pass"), evidence: reviewEvidence }),
  z.object({
    status: z.literal("accepted-by-owner"),
    evidence: reviewEvidence,
    acceptedAt: z.string().datetime(),
    reason: z.string().min(20),
  }),
]);
const modelName = z
  .string()
  .min(1)
  .refine(
    (value) => value !== "auto",
    "Automatic model routing is not qualified.",
  )
  // A family alias (glm-latest, glm-flash-latest) moves to a new version by itself, so the
  // reviewed model could change under the report (Privatemode email, 12 November). Exact IDs only.
  .refine(
    (value) => !/(^|-)latest$/i.test(value),
    "Family aliases are not qualified; name an exact model ID.",
  );
// Thinking models spend most of their output on hidden reasoning: at 4,096 the long-answer
// probe was cut off on every thinking arm; 16,384 completed (wide screen, 12 November).
const outputLimit = z.number().int().positive().max(16384);
// Model-specific settings the review covered. Without them in the schema, parsing dropped
// them and the model ran on the supplier's default (found by the T6 live run, 12 November).
const modelSettings = {
  gptOssReasoningEffort: z.enum(["low", "medium", "high"]).optional(),
  gemmaThinking: z.boolean().optional(),
  glmReasoningEffort: z.enum(["low", "high", "max"]).optional(),
  deepSeekThinking: z.boolean().optional(),
  deepSeekReasoningEffort: z.literal("low").optional(),
};
/** One answer mode: its model, an optional backup at the same provider, its own output limit and allowance cost. */
const modeTierSchema = z.object({
  model: modelName,
  backupModel: modelName.optional(),
  maxOutputTokens: outputLimit,
  /** Units of the account's request allowance one request in this mode uses. */
  allowanceCost: z.number().int().min(1).max(10),
  ...modelSettings,
});
export type ModeTier = z.infer<typeof modeTierSchema>;
export const answerModes = ["fast", "thinking"] as const;
export type AnswerMode = (typeof answerModes)[number];
/**
 * How long one message may take, per answer mode: `firstTextMs` until the first answer text
 * (thinking models reason silently first) and `totalMs` for the whole message, the one
 * backup retry included. A report without modes keeps the earlier timing: 90 s for the
 * model, then 90 s for its backup (plus 10 s for setup, so the retry still fits). Measured 13 November: docs/thinking-timeouts-20261113.md.
 */
export const REPLY_LIMITS: Record<
  AnswerMode | "default",
  { firstTextMs: number; totalMs: number }
> = {
  fast: { firstTextMs: 30_000, totalMs: 90_000 },
  thinking: { firstTextMs: 120_000, totalMs: 300_000 },
  default: { firstTextMs: 90_000, totalMs: 190_000 },
};
export function replyLimits(mode?: AnswerMode) {
  return REPLY_LIMITS[mode ?? "default"];
}
const hex64 = z.string().regex(/^[a-f0-9]{64}$/);
/**
 * Privatemode-only evidence (Stage 3 plan): what the browser checks and the limits set outside
 * our code. Required exactly when the report names Privatemode.
 */
const privatemodeEvidence = z
  .object({
    /** Exact privatemode-ai version in package.json; its Wasm hash is below. */
    sdkVersion: z.string().regex(/^\d+\.\d+\.\d+$/),
    /** SHA-256 of privatemode.wasm; src/providers/privatemode-client.ts pins the same value (test). */
    wasmSha256: hex64,
    /** Reference-value kinds the approved manifest carries (for example snp, tdx). */
    manifestReferenceValues: z.array(z.string().min(1)).min(1),
    /** NVIDIA OCSP policy as the client sets it (today: unknown statuses refused, no grace period). */
    nvidiaOCSPPolicy: z.string().min(3),
    /** The dedicated alpha key's limits, set by the owner in the Privatemode portal. */
    portalKeyLimit: z
      .object({
        source: z.literal("owner-reported"),
        setAt: z.string().datetime(),
        /** The key stops working at this time; the server warns ahead of it. */
        expiresAt: z.string().datetime(),
        requestsPerMinute: z.number().int().positive().optional(),
        spendLimit: z
          .object({ amount: z.number().positive(), currency: z.enum(["EUR", "USD"]) })
          .strict()
          .optional(),
      })
      .strict(),
    /** Privatemode lists prices in EUR plus VAT; `pricing` stays USD, converted here. */
    priceConversion: z
      .object({
        inputPerMillionEUR: z.number().nonnegative(),
        outputPerMillionEUR: z.number().nonnegative(),
        vatRate: z.number().min(0).max(1),
        usdPerEUR: z.number().positive(),
        rateDate: z.string().min(10),
      })
      .strict(),
  })
  .strict();
export const qualificationSchema = z.object({
  provider: z.enum(["tinfoil", "privatemode"]),
  model: modelName,
  /** Optional backup model for the same deployment; tried once, automatically and labelled, when the model gives no answer. */
  fallbackModel: modelName.optional(),
  /**
   * Answer modes. Every model here is at this report's one provider, so a retry never
   * crosses providers. `pricing` must be the highest rate among all the report's models.
   */
  modes: z.object({ fast: modeTierSchema, thinking: modeTierSchema }).optional(),
  origin: z
    .string()
    .url()
    .refine((value) => {
      const u = new URL(value);
      return (
        u.protocol === "https:" &&
        !u.username &&
        !u.password &&
        u.port === "" &&
        u.pathname === "/" &&
        !u.search &&
        !u.hash
      );
    }),
  /** The release source: tinfoilsh/* for Tinfoil, edgelesssys/* for Privatemode (checked per provider below). */
  repository: z.string().regex(/^[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+$/),
  /** Tinfoil: router release digests. Privatemode: SHA-256 of the approved manifest bytes. */
  releaseDigests: z.array(hex64).min(1),
  reviewedAt: z.string().datetime(),
  validUntil: z.string().datetime(),
  review: z.record(z.enum(checks), reviewCheck),
  maxInputCharacters: z.number().int().positive().max(100000),
  maxOutputTokens: outputLimit,
  pricing: z.object({
    inputPerMillion: z.number().nonnegative(),
    outputPerMillion: z.number().nonnegative(),
    currency: z.literal("USD"),
  }),
  approvedSpendUSD: z.number().positive(),
  privatemode: privatemodeEvidence.optional(),
  ...modelSettings,
});
export type Qualification = z.infer<typeof qualificationSchema>;
/** Per-provider rules: where the provider is reached and where its releases come from. */
export const PROVIDER_RULES: Record<
  Qualification["provider"],
  { repository: RegExp; origin?: string }
> = {
  tinfoil: { repository: /^tinfoilsh\// },
  privatemode: { repository: /^edgelesssys\//, origin: "https://api.privatemode.ai/" },
};
/** Which models each setting belongs to (Tinfoil and Privatemode name GLM-5.3 differently). */
export const MODEL_SETTINGS: Record<keyof typeof modelSettings, readonly string[]> = {
  gptOssReasoningEffort: ["gpt-oss-120b"],
  gemmaThinking: ["gemma4-31b"],
  glmReasoningEffort: ["glm-5-3", "glm-5.3", "glm-5.3-flash"],
  deepSeekThinking: ["deepseek-v4-1-flash"],
  deepSeekReasoningEffort: ["deepseek-v4-1-flash"],
};
type Setting = keyof typeof MODEL_SETTINGS;
/** The report as one model's policy: that model's settings kept, every other model's removed. */
export function policyForModel(report: Qualification, model: string): Qualification {
  const policy: Qualification = { ...report, model };
  for (const [setting, owners] of Object.entries(MODEL_SETTINGS))
    if (!owners.includes(model)) delete policy[setting as Setting];
  return policy;
}
/** The tier a request runs in: one of the report's modes, or the report's own model when it has none. */
export function tierFor(report: Qualification, mode?: AnswerMode): ModeTier {
  if (mode && report.modes) return report.modes[mode];
  return {
    model: report.model,
    ...(report.fallbackModel ? { backupModel: report.fallbackModel } : {}),
    maxOutputTokens: report.maxOutputTokens,
    allowanceCost: 1,
  };
}
/** One request's policy: the tier's model or backup, the tier's output limit, and that model's settings only. */
export function policyForTier(
  report: Qualification,
  mode: AnswerMode | undefined,
  choice: "primary" | "backup",
): Qualification {
  const tier = tierFor(report, mode);
  const model = choice === "backup" ? tier.backupModel : tier.model;
  if (!model) throw Error("No backup model is qualified.");
  const settings = Object.fromEntries(
    Object.keys(MODEL_SETTINGS)
      .filter((k) => tier[k as Setting] !== undefined)
      .map((k) => [k, tier[k as Setting]]),
  );
  return policyForModel(
    { ...report, ...settings, maxOutputTokens: tier.maxOutputTokens },
    model,
  );
}
/** Every model the report qualifies; the relay admits exactly these. */
export function qualifiedModels(report: Qualification): Set<string> {
  return new Set(
    [
      report.model,
      report.fallbackModel,
      ...Object.values(report.modes ?? {}).flatMap((t) => [t.model, t.backupModel]),
    ].filter((m): m is string => !!m),
  );
}
/** The largest output limit any request under this report may use. */
export function largestOutputLimit(report: Qualification): number {
  return Math.max(
    report.maxOutputTokens,
    ...Object.values(report.modes ?? {}).map((t) => t.maxOutputTokens),
  );
}
export function validateQualification(
  input: unknown,
  now = Date.now(),
): Qualification {
  const report = qualificationSchema.parse(input);
  if (
    report.fallbackModel !== undefined &&
    report.fallbackModel === report.model
  )
    throw Error("The fallback model must differ from the qualified model.");
  const rules = PROVIDER_RULES[report.provider];
  if (
    !rules.repository.test(report.repository) ||
    (rules.origin !== undefined && report.origin !== rules.origin)
  )
    throw Error("The origin or repository does not belong to the report's provider.");
  if ((report.provider === "privatemode") !== (report.privatemode !== undefined))
    throw Error("The Privatemode evidence block is required for Privatemode and only for it.");
  const models = qualifiedModels(report);
  for (const [setting, owners] of Object.entries(MODEL_SETTINGS))
    if (report[setting as Setting] !== undefined && !owners.some((m) => models.has(m)))
      throw Error("A model setting names a model the report does not qualify.");
  for (const tier of Object.values(report.modes ?? {})) {
    if (tier.backupModel === tier.model)
      throw Error("The backup model must differ from the mode's model.");
    for (const [setting, owners] of Object.entries(MODEL_SETTINGS))
      if (
        tier[setting as Setting] !== undefined &&
        !owners.includes(tier.model) &&
        !(tier.backupModel !== undefined && owners.includes(tier.backupModel))
      )
        throw Error("A mode setting names a model that mode does not use.");
  }
  if (
    Date.parse(report.reviewedAt) > now ||
    Date.parse(report.validUntil) <= now ||
    Date.parse(report.validUntil) <= Date.parse(report.reviewedAt)
  )
    throw new Error("Provider review is expired or invalid.");
  for (const check of checks) {
    const entry = report.review[check];
    if (
      entry.status === "accepted-by-owner" &&
      (Date.parse(entry.acceptedAt) > now ||
        Date.parse(entry.acceptedAt) >= Date.parse(report.validUntil))
    )
      throw new Error("An owner acceptance is dated in the future or after the review expires.");
  }
  return report;
}

/** Checks the owner accepted instead of passing, in review order. */
export function acceptedChecks(report: Qualification) {
  return checks.filter((check) => report.review?.[check]?.status === "accepted-by-owner");
}

/** What the connection banner may say: "verified" only when every check is present and passed. */
export function verificationSummary(report: Qualification, lang: "de" | "en" = "en"): string {
  const accepted = acceptedChecks(report);
  // Privatemode reuses one verified client per session (src/providers/privatemode-client.ts).
  const privatemode = report.provider === "privatemode";
  const passed = checks.every((check) => report.review?.[check]?.status === "pass");
  if (lang === "de") {
    const when = privatemode
      ? "beim Start des Chats und danach mindestens alle 10 Minuten"
      : "vor jeder Anfrage";
    if (passed) return `Der sichere Server wird ${when} geprüft, und alle Prüfpunkte wurden bestanden.`;
    if (!accepted.length) return `Der sichere Server wird ${when} geprüft.`;
    return `Der sichere Server wird ${when} geprüft, aber nicht alle Prüfpunkte wurden bestanden. Vom Betreiber für diese eingeschränkte Freigabe akzeptiert, nicht überprüft: ${accepted.map((c) => checkLabelsDe[c]).join(", ")}.`;
  }
  const when = privatemode
    ? "when you start chatting and again at least every 10 minutes"
    : "before each request";
  if (passed) return `The secure server is checked ${when}, and every review check passed.`;
  if (!accepted.length) return `The secure server is checked ${when}.`;
  return `The secure server is checked ${when}, but not every check has passed. Accepted by the owner for this limited release, not verified: ${accepted.map((c) => checkLabels[c]).join(", ")}.`;
}

export const disclosureSchema = z.discriminatedUnion("kind", [
  z
    .object({
      kind: z.literal("search"),
      value: z.string().trim().min(2).max(400),
    })
    .strict(),
  z
    .object({ kind: z.literal("page"), value: z.string().url().max(2000) })
    .strict(),
]);
export type Disclosure = z.infer<typeof disclosureSchema>;
export interface Source {
  id: string;
  title: string;
  text: string;
  page?: number;
  url?: string;
  retrievedAt?: string;
  evidenceKind?: "search-excerpt" | "page" | "llm-context";
  /** Provider-reported page date; not necessarily publication or event time. */
  providerDate?: string;
  /** Local user correction; not an unmodified extraction or provider quotation. */
  userEdited?: boolean;
}
export interface Attachment {
  id: string;
  name: string;
  sources: Source[];
  selected: boolean;
  warning?: string;
  kind?: "document" | "screenshot" | "research";
  researchQuery?: string;
  /**
   * Set when this search attachment was saved: its results and links were
   * removed on this device (owner decision, 22 October 2026) and only the
   * approved query remains, so the user can search again for current sources.
   */
  liveSearch?: { strippedAt: string };
}
export interface Message {
  id: string;
  role: "user" | "assistant";
  text: string;
  status: "complete" | "partial" | "error";
  included: boolean;
  sourceSnapshot?: Source[];
  failure?: "stopped" | "timeout" | "incomplete" | "unavailable" | "empty";
  /** Plain-language note of identifiers masked on this device for this reply, e.g. "Kept on this device: 1 bank account." */
  keptOnDevice?: string;
  /** Creation time, ISO 8601; absent on messages saved before 22 October 2026. */
  at?: string;
  /** Which mode answered and whether the backup model did, e.g. "Auto · Thinking". Never a model name (older saves may hold one). */
  answeredBy?: string;
  /**
   * Local-only result of recalculating the arithmetic the reply writes out
   * (src/arithmetic/postcheck.ts): how many stated relations were checked and
   * how many did not add up. Never model context, never sent anywhere.
   */
  arithmeticCheck?: {
    relations: number;
    mismatches: number;
    ambiguous?: number;
  };
  /**
   * Local-only result of the completeness check (src/arithmetic/completeness.ts):
   * how many figures the user's question asked for and which of them (fixed keys,
   * never text) the answer seems to leave out. Never model context, never sent anywhere.
   */
  completenessCheck?: {
    requested: number;
    missing: string[];
  };
  /**
   * Local-only result of the German-rules check (src/german-rules.ts): the question was about
   * German rules, no web result was in context, and the answer states figures or deadlines.
   * Never model context, never sent or logged.
   */
  uncheckedFigures?: true;
  /**
   * Local-only (src/german-rules.ts): a German-rules question answered from web results of which
   * none is official. Never model context, never sent or logged.
   */
  noOfficialSource?: true;
}
export interface ConversationBranch {
  id: string;
  label: string;
  messages: Message[];
  attachments: Attachment[];
  draft: string;
  temporarySearch?: boolean;
}
export interface Usage {
  input: number;
  output: number;
  total: number;
  estimatedUSD: number;
}
export interface Conversation {
  /** Vault organization only; never model context. */
  pinned?: boolean;
  archived?: boolean;
  projectId?: string;
  /** Sticky for the whole conversation: replies may reproduce temporary search results. */
  temporarySearch?: boolean;
  /**
   * Device-only: never saved, cleared on lock, reload or sign-out. It changes
   * nothing about the sealed server's short-term memory or our request records.
   */
  incognito?: boolean;
  /**
   * Device-only: messages older than this window are deleted from this device
   * when the conversation is open or opened. Nothing is deleted anywhere else.
   */
  disappearAfter?: "hour" | "day" | "week";
  id: string;
  title: string;
  messages: Message[];
  attachments: Attachment[];
  createdAt: string;
  usage: Usage[];
  /** Optional for snapshots saved before draft support. Never part of sent context. */
  draft?: string;
  /** Inactive versions are local history, never implicitly model context. */
  branches?: {
    activeId: string;
    activeLabel: string;
    archived: ConversationBranch[];
  };
}
export interface AppStatus {
  billingRehearsal?: boolean;
  consumerWorkspace?: boolean;
  requestAllowance?: RequestAllowance;
  accountId?: string;
  accountEmail?: string;
  accessEpoch?: string;
  csrf: string;
  inference: {
    ready: boolean;
    reason: string;
    qualification?: Qualification;
    /** This account's prompt-cache salt (stable per account, never shared); sent only when ready. */
    cacheSalt?: string;
  };
  search: boolean;
  publicPageHosts?: string[] | null;
  /** Plain-text notice the operator shows to everyone (outage, announced provider switch). */
  operatorNotice?: string;
  /** Draft health-consent step (shared/health-consent.ts); off unless the server enables it. */
  healthConsentDraft?: boolean;
  /** Draft provider section for the privacy policy (shared/provider-disclosure.ts); off unless set. */
  providerDisclosureDraft?: "tinfoil" | "privatemode";
}
export type RequestAllowance =
  | { state: "unavailable" }
  | {
      state: "active" | "exhausted";
      limit: number;
      used: number;
      remaining: number;
      pending: number;
      uncertain: number;
      resetsAt: string;
      /** Settled requests whose provider metering (tokens, published cost) was recorded. */
      meteredRequests: number;
      /** Token totals over metered requests in this period; zero when none. */
      promptTokens: number;
      completionTokens: number;
      /** Published-rate cost summed over metered requests as a decimal string; absent when no metered request reported a cost. */
      costUsd?: string;
      /** Settled requests with no metering: interrupted, cancelled or uncertain. The provider bills them but nothing can be counted here. */
      unmeteredRequests: number;
    };
export const emptyConversation = (): Conversation => ({
  id: crypto.randomUUID(),
  title: "New conversation",
  messages: [],
  attachments: [],
  createdAt: new Date().toISOString(),
  usage: [],
});
