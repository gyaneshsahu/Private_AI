// Provider-neutral relay contract (launch direction of 22 October 2026).
//
// The relay in server/app.ts owns admission, allowances, concurrency and
// settlement; everything that depends on a particular confidential-inference
// supplier (routing headers, model pins, encrypted-transport headers, usage
// metering format, release audits, browser verification hosts) lives behind
// this interface in one adapter. A second supplier is added by writing another
// adapter and naming it in the qualification report's `provider`; no change to
// the relay is expected.
import type { IncomingHttpHeaders } from "node:http";
import type { RequestHandler } from "express";
import type { Qualification } from "../../shared/contracts";
import type { UsageMetrics } from "../usage-metrics";

export type InferenceProviderId = Qualification["provider"];

export type RelayAdmission =
  | { ok: true; model: string; upstreamHeaders: Record<string, string> }
  | { ok: false; error: string };

export interface UpstreamRequestPlan {
  url: URL;
  headers: Record<string, string>;
}

export interface UpstreamReply {
  statusCode: number;
  headers: IncomingHttpHeaders;
  trailers: Record<string, string | string[] | undefined>;
}

export interface InferenceRelayAdapter {
  readonly id: InferenceProviderId;
  /** Origins the browser must reach for verification, for the content security policy. */
  verificationHosts(qualification: Qualification): string[];
  /**
   * Checks the client's routing headers and ciphertext against the
   * qualification. The relay names the model itself; a client may only choose
   * between the qualified model and its fallback.
   */
  admit(
    headers: IncomingHttpHeaders,
    body: unknown,
    qualification: Qualification,
  ): RelayAdmission;
  /** The upstream request for an admitted ciphertext body. */
  upstream(input: {
    qualification: Qualification;
    apiKey: string;
    model: string;
    /** Supplier headers the adapter admitted from the client (for Tinfoil, the EHBP key). */
    upstreamHeaders: Record<string, string>;
  }): UpstreamRequestPlan;
  /** Whether the upstream reply is an encrypted success, and the headers to pass back to the browser. */
  accept(reply: UpstreamReply): {
    ok: boolean;
    passthrough: Record<string, string>;
  };
  /** "rejected" means nothing ran or was billed, so the client may offer the fallback model. */
  classifyFailure(reply: UpstreamReply): "rejected" | "unavailable";
  /** Completed-request metering from the reply, once the stream has ended. */
  usage(reply: UpstreamReply): UsageMetrics | undefined;
  /** Optional block-only guard mounted before the relay route (release audits). */
  guard(): RequestHandler;
  /**
   * Paths the supplier's browser SDK calls at the site root. The app maps each one under
   * /api/inference before any gate, so session, CSRF, invite gate, request limits, the stop
   * switch and (for chat) allowance and spend apply exactly as on our own paths.
   */
  readonly rootPaths?: readonly string[];
  /**
   * Extra supplier endpoints under /api/inference (attestation, key exchange, approved
   * manifest, pinned Wasm). Mounted after session, CSRF and the stop switch.
   */
  routes?(context: ProviderRouteContext): RequestHandler;
}

export interface ProviderRouteContext {
  qualification: () => Qualification | undefined;
  apiKey: string;
  /** The approved deployment manifest bytes, for suppliers whose browser SDK verifies one. */
  manifest?: Uint8Array;
}

/** The log prefix the owner greps for: a model is gone, deprecated or changed (docs/model-deprecation-runbook.md). */
export const MODEL_ALERT = "CometRow model alert:";

/**
 * Whether a refused reply means the model is unknown or retired: HTTP 404, or another 4xx whose
 * text says so. Drains the body like dump(); at most 4 KB is kept, matched and then dropped,
 * never logged or reflected. An encrypted error body simply does not match.
 */
export async function modelNotFound(
  statusCode: number,
  body: AsyncIterable<Uint8Array>,
): Promise<boolean> {
  let text = "";
  try {
    for await (const chunk of body)
      if (text.length < 4096) text += Buffer.from(chunk).toString("latin1");
  } catch {
    /* an unreadable body is judged by its status alone */
  }
  return (
    statusCode === 404 ||
    (statusCode >= 400 &&
      statusCode < 500 &&
      /model.{0,80}(not[ _]found|does not exist)|unknown model/i.test(text))
  );
}

/** The operator alert for a refused request: the report's model ID and the status only, no content or account. */
export function alertModelNotFound(model: string, statusCode: number) {
  console.warn(
    `${MODEL_ALERT} the provider answered "model not found" for ${model} (HTTP ${statusCode}). Chat fails for this model; nothing was switched. See docs/model-deprecation-runbook.md.`,
  );
}

const adapters = new Map<InferenceProviderId, () => InferenceRelayAdapter>();

export function registerInferenceRelay(
  id: InferenceProviderId,
  factory: () => InferenceRelayAdapter,
) {
  adapters.set(id, factory);
}

export function inferenceRelayFor(
  id: InferenceProviderId,
): InferenceRelayAdapter {
  const factory = adapters.get(id);
  if (!factory) throw Error(`No inference relay adapter for provider "${id}".`);
  return factory();
}

export function registeredInferenceProviders(): InferenceProviderId[] {
  return [...adapters.keys()];
}
