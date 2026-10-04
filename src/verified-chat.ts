import { abortable } from "./abortable";
import {
  type Conversation,
  type Usage,
  type Qualification,
} from "../shared/contracts";
import { composeContext } from "./conversation";
import { completionEvents } from "./completion-events";
import { consumeReply } from "./reply-stream";

export type VerifiedChatPolicy = Pick<
  Qualification,
  | "origin"
  | "repository"
  | "releaseDigests"
  | "model"
  | "maxInputCharacters"
  | "maxOutputTokens"
  | "pricing"
>;

export function assertVerification(
  doc: {
    securityVerified: boolean;
    releaseDigest: string;
    configRepo: string;
    hpkePublicKey: string;
    enclaveHost: string;
  },
  report: Pick<VerifiedChatPolicy, "origin" | "repository" | "releaseDigests">,
) {
  if (
    !doc.securityVerified ||
    !doc.hpkePublicKey ||
    doc.configRepo !== report.repository ||
    !report.releaseDigests.includes(doc.releaseDigest) ||
    doc.enclaveHost !== new URL(report.origin).hostname
  )
    throw new Error(
      "The verified deployment does not match the reviewed provider configuration. Nothing was sent.",
    );
}
export async function streamVerifiedConversation(
  conversation: Conversation,
  report: VerifiedChatPolicy,
  csrf: string,
  signal: AbortSignal,
  onChunk: (text: string) => void,
  onStatus: (text: string) => void,
  authorize: () => void,
  onVerified?: (evidence: { host: string; releaseDigest: string }) => void,
): Promise<Usage | undefined> {
  authorize();
  signal = AbortSignal.any([signal, AbortSignal.timeout(90000)]);
  signal.throwIfAborted();
  const messages = composeContext(conversation, report.maxInputCharacters);
  onStatus("Loading inference libraries…");
  const [{ Verifier, fetchAttestationBundle }, { Identity, Transport }] =
    await abortable(Promise.all([import("tinfoil"), import("ehbp")]), signal);
  onStatus("Fetching attestation…");
  const bundle = await abortable(
    fetchAttestationBundle({
      enclaveURL: report.origin,
      configRepo: report.repository,
    }),
    signal,
  );
  if (bundle.domain !== new URL(report.origin).hostname)
    throw new Error("Unexpected verification destination. Nothing was sent.");
  onStatus("Verifying the protected destination…");
  const verifier = new Verifier({ configRepo: report.repository });
  await abortable(verifier.verifyBundle(bundle), signal);
  const doc = verifier.getVerificationDocument();
  if (!doc) throw new Error("Verification evidence unavailable.");
  assertVerification(doc, report);
  onVerified?.({ host: doc.enclaveHost, releaseDigest: doc.releaseDigest });
  signal.throwIfAborted();
  onStatus("Preparing encrypted transport…");
  const identity = await abortable(
    Identity.fromPublicKeyHex(doc.hpkePublicKey),
    signal,
  );
  const transport = new Transport(identity, location.host);
  onStatus("Receiving a protected response…");
  authorize();
  signal.throwIfAborted();
  // One fixed local route, one encrypted request, no automatic retries. The
  // maintained verifier and EHBP SDK still own attestation and cryptography.
  // Parse SSE locally to avoid SDK error paths logging decrypted provider data.
  const response = await transport.request(
    `${location.origin}/api/inference/v1/chat/completions`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
        "X-PrivateAI-CSRF": csrf,
        "X-Tinfoil-Enclave-Url": report.origin,
      },
      body: JSON.stringify({
        model: report.model,
        messages,
        stream: true,
        stream_options: { include_usage: true },
        max_completion_tokens: report.maxOutputTokens,
        user_cache_secret: crypto.randomUUID(),
      }),
      signal,
      credentials: "same-origin",
      redirect: "error",
    },
  );
  return consumeReply(
    completionEvents(response, signal),
    report.pricing,
    signal,
    onChunk,
  );
}
