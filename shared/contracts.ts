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
export const qualificationSchema = z.object({
  provider: z.literal("tinfoil"),
  model: z
    .string()
    .min(1)
    .refine(
      (value) => value !== "auto",
      "Automatic model routing is not qualified.",
    ),
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
  repository: z.string().regex(/^tinfoilsh\/[a-zA-Z0-9_-]+$/),
  releaseDigests: z.array(z.string().regex(/^[a-f0-9]{64}$/)).min(1),
  reviewedAt: z.string().datetime(),
  validUntil: z.string().datetime(),
  review: z.record(
    z.enum(checks),
    z.object({
      status: z.literal("pass"),
      evidence: z.array(z.string().min(10)).min(1),
    }),
  ),
  maxInputCharacters: z.number().int().positive().max(100000),
  maxOutputTokens: z.number().int().positive().max(4096),
  pricing: z.object({
    inputPerMillion: z.number().nonnegative(),
    outputPerMillion: z.number().nonnegative(),
    currency: z.literal("USD"),
  }),
  approvedSpendUSD: z.number().positive(),
});
export type Qualification = z.infer<typeof qualificationSchema>;
export function validateQualification(
  input: unknown,
  now = Date.now(),
): Qualification {
  const report = qualificationSchema.parse(input);
  if (
    Date.parse(report.reviewedAt) > now ||
    Date.parse(report.validUntil) <= now ||
    Date.parse(report.validUntil) <= Date.parse(report.reviewedAt)
  )
    throw new Error("Provider review is expired or invalid.");
  return report;
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
}
export interface Attachment {
  id: string;
  name: string;
  sources: Source[];
  selected: boolean;
  warning?: string;
  kind?: "document" | "screenshot" | "research";
}
export interface Message {
  id: string;
  role: "user" | "assistant";
  text: string;
  status: "complete" | "partial" | "error";
  included: boolean;
  sourceSnapshot?: Source[];
}
export interface Usage {
  input: number;
  output: number;
  total: number;
  estimatedUSD: number;
}
export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  attachments: Attachment[];
  createdAt: string;
  usage: Usage[];
  /** Optional for snapshots saved before draft support. Never part of sent context. */
  draft?: string;
}
export interface AppStatus {
  csrf: string;
  inference: { ready: boolean; reason: string; qualification?: Qualification };
  search: boolean;
  publicPageHosts?: string[] | null;
}
export const emptyConversation = (): Conversation => ({
  id: crypto.randomUUID(),
  title: "New conversation",
  messages: [],
  attachments: [],
  createdAt: new Date().toISOString(),
  usage: [],
});
