import { z } from "zod";

/**
 * Provider usage metrics returned in the `X-Tinfoil-Usage-Metrics` response
 * header (non-streaming) or trailer (streaming) when the relay sends
 * `X-Tinfoil-Request-Usage-Metrics: true`. The relay never sees the encrypted
 * body, so this is the only per-request accounting signal it can record.
 * Figures use published rates and arrive only after the response ended; they
 * are metering of completed requests, not settlement of interrupted ones.
 */
export const usageMetricsSchema = z
  .object({
    promptTokens: z.number().int().nonnegative().max(100_000_000),
    completionTokens: z.number().int().nonnegative().max(100_000_000),
    model: z.string().regex(/^[a-zA-Z0-9._-]{1,64}$/),
    /** Decimal string as sent by the provider, or absent when any component is unknown. */
    costUsd: z
      .string()
      .regex(/^\d{1,9}(\.\d{1,12})?$/)
      .optional(),
    webSearchCalls: z.number().int().nonnegative().max(1_000_000).optional(),
  })
  .strict();
export type UsageMetrics = z.infer<typeof usageMetricsSchema>;

const integer = /^\d{1,9}$/;

/** Parses `prompt=1000,completion=500,model=x,cost_usd=0.052,...`; unknown or malformed input yields undefined. */
export function parseUsageMetrics(
  value: string | string[] | undefined,
): UsageMetrics | undefined {
  if (typeof value !== "string" || value.length > 1024) return undefined;
  const fields = new Map<string, string>();
  for (const part of value.split(",")) {
    const separator = part.indexOf("=");
    if (separator <= 0) continue;
    const key = part.slice(0, separator).trim();
    const field = part.slice(separator + 1).trim();
    if (!/^[a-z_]{1,32}$/.test(key) || fields.has(key)) return undefined;
    fields.set(key, field);
  }
  const prompt = fields.get("prompt");
  const completion = fields.get("completion");
  const model = fields.get("model");
  if (
    prompt === undefined ||
    completion === undefined ||
    model === undefined ||
    !integer.test(prompt) ||
    !integer.test(completion)
  )
    return undefined;
  const cost = fields.get("cost_usd");
  const searches = fields.get("web_search_calls");
  if (searches !== undefined && !integer.test(searches)) return undefined;
  const parsed = usageMetricsSchema.safeParse({
    promptTokens: Number(prompt),
    completionTokens: Number(completion),
    model,
    ...(cost !== undefined ? { costUsd: cost } : {}),
    ...(searches !== undefined ? { webSearchCalls: Number(searches) } : {}),
  });
  return parsed.success ? parsed.data : undefined;
}
