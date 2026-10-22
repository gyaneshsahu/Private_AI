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
  | { ok: true; model: string; encapsulatedKey: string }
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
    encapsulatedKey: string;
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
