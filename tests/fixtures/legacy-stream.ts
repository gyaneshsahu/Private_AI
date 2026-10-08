// HISTORICAL REPRODUCTION ONLY. Mirrors the OpenAI/EHBP streaming composition
// used by the first WSL experiment. Never imported by product/evaluation code.
import OpenAI from "openai";
import { Identity, Transport } from "ehbp";
import { Verifier, fetchAttestationBundle } from "tinfoil";
import { composeContext } from "../../src/conversation";
import { consumeReply } from "../../src/reply-stream";
import {
  assertVerification,
  type streamVerifiedConversation,
} from "../../src/verified-chat";
export const streamLegacyConversation: typeof streamVerifiedConversation =
  async (
    conversation,
    report,
    csrf,
    signal,
    onChunk,
    onStatus,
    authorize,
    onVerified,
  ) => {
    authorize();
    const bundle = await fetchAttestationBundle({
      enclaveURL: report.origin,
      configRepo: report.repository,
    });
    if (bundle.domain !== new URL(report.origin).hostname)
      throw new Error("TEST unexpected destination");
    const verifier = new Verifier({ configRepo: report.repository });
    await verifier.verifyBundle(bundle);
    const doc = verifier.getVerificationDocument();
    if (!doc) throw new Error("TEST missing verification");
    assertVerification(doc, report);
    onVerified?.({ host: doc.enclaveHost, releaseDigest: doc.releaseDigest });
    const transport = new Transport(
      await Identity.fromPublicKeyHex(doc.hpkePublicKey),
      location.host,
    );
    const client = new OpenAI({
      apiKey: "local-session",
      dangerouslyAllowBrowser: true,
      baseURL: `${location.origin}/api/inference/v1`,
      maxRetries: 0,
      timeout: 90000,
      fetch: async (url, init) => {
        const target = new URL(String(url));
        if (
          target.origin !== location.origin ||
          target.pathname !== "/api/inference/v1/chat/completions" ||
          target.search
        )
          throw new Error("TEST unexpected route");
        authorize();
        signal.throwIfAborted();
        const headers = new Headers(init?.headers);
        headers.delete("authorization");
        headers.set("X-PrivateAI-CSRF", csrf);
        headers.set("X-Tinfoil-Enclave-Url", report.origin);
        return transport.request(target.href, {
          ...init,
          headers,
          signal,
          credentials: "same-origin",
          redirect: "error",
        });
      },
    });
    onStatus("TEST legacy stream");
    const stream = await client.chat.completions.create({
      model: report.model,
      messages: composeContext(conversation, report.maxInputCharacters),
      stream: true,
      stream_options: { include_usage: true },
      max_completion_tokens: report.maxOutputTokens,
    });
    return consumeReply(stream, report.pricing, signal, onChunk);
  };
