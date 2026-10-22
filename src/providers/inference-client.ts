// Provider-neutral browser contract for confidential inference (launch
// direction of 22 October 2026). src/verified-chat.ts owns masking, context,
// contracts and reply consumption; everything that depends on the supplier
// (verification library, encrypted transport, routing headers, model-specific
// request options) lives behind this interface in one adapter, selected by the
// qualification report's `provider`.
import type { Qualification } from "../../shared/contracts";

export type InferenceProviderId = Qualification["provider"];

/** Used only when a policy object carries no provider (older test fixtures); reports always name one. */
export const defaultInferenceProvider: InferenceProviderId = "tinfoil";

/** The subset of the qualification report an adapter needs, plus model options. */
export type ClientPolicy = Pick<
  Qualification,
  "provider" | "origin" | "repository" | "releaseDigests" | "model"
> & {
  deepSeekThinking?: boolean;
  deepSeekReasoningEffort?: "low";
  gemmaThinking?: boolean;
  glmReasoningEffort?: "low" | "high" | "max";
  gptOssReasoningEffort?: "low" | "medium" | "high";
};

export interface VerificationEvidence {
  host: string;
  releaseDigest: string;
}

/** An encrypted channel to the verified destination; one per request. */
export interface EncryptedTransport {
  request(url: string, init: RequestInit): Promise<Response>;
}

export interface VerifiedDestination {
  evidence: VerificationEvidence;
  /** A fresh transport bound to the verified key; callers never see the key. */
  transport(): Promise<EncryptedTransport>;
}

export interface InferenceClientAdapter {
  readonly id: InferenceProviderId;
  /** Fetches and verifies attestation evidence for the destination, refusing on mismatch. */
  verify(
    policy: ClientPolicy,
    signal: AbortSignal,
    onStatus: (text: string) => void,
  ): Promise<VerifiedDestination>;
  /** Routing headers the relay uses to pin destination and model. */
  requestHeaders(policy: ClientPolicy): Record<string, string>;
  /** Supplier- and model-specific fields of the request body (reasoning switches). */
  modelOptions(policy: ClientPolicy): Record<string, unknown>;
}

const adapters = new Map<InferenceProviderId, () => InferenceClientAdapter>();

export function registerInferenceClient(
  id: InferenceProviderId,
  factory: () => InferenceClientAdapter,
) {
  adapters.set(id, factory);
}

export function inferenceClientFor(
  id: InferenceProviderId,
): InferenceClientAdapter {
  const factory = adapters.get(id);
  if (!factory)
    throw new Error(`No inference client adapter for provider "${id}".`);
  return factory();
}
