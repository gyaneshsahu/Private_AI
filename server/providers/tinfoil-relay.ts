// Tinfoil adapter for the relay: every supplier-specific header, pin and
// metering format lives here. server/app.ts never names the supplier.
import type { IncomingHttpHeaders } from "node:http";
import type { Qualification } from "../../shared/contracts";
import { parseUsageMetrics } from "../usage-metrics";
import { attestationAuditGuard } from "../attestation-audit";
import {
  registerInferenceRelay,
  type InferenceRelayAdapter,
  type UpstreamReply,
} from "./inference-relay";

const single = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

/** Hosts the browser verifier contacts for attestation evidence. */
export const TINFOIL_VERIFICATION_HOSTS = [
  "https://atc.tinfoil.sh",
  "https://github-proxy.tinfoil.sh",
  "https://kds-proxy.tinfoil.sh",
  "https://tuf-repo-cdn.sigstore.dev",
] as const;

export function createTinfoilRelayAdapter(): InferenceRelayAdapter {
  return {
    id: "tinfoil",
    verificationHosts(qualification) {
      return [
        ...TINFOIL_VERIFICATION_HOSTS,
        new URL(qualification.origin).origin,
      ];
    },
    admit(headers: IncomingHttpHeaders, body, qualification) {
      const encapsulatedKey = String(headers["ehbp-encapsulated-key"] ?? "");
      if (
        headers["x-tinfoil-enclave-url"] !== qualification.origin ||
        !/^[a-f0-9]{64}$/i.test(encapsulatedKey) ||
        !Buffer.isBuffer(body) ||
        body.length < 16
      )
        return {
          ok: false,
          error:
            "Only encrypted requests to the qualified destination are accepted.",
        };
      // The relay names the qualified model itself and the enclave rejects a
      // body that disagrees; a client may not name a different model.
      const requested = headers["x-tinfoil-model"];
      const allowed = new Set([
        qualification.model,
        ...(qualification.fallbackModel ? [qualification.fallbackModel] : []),
      ]);
      if (
        requested !== undefined &&
        (typeof requested !== "string" || !allowed.has(requested))
      )
        return { ok: false, error: "Only the qualified model is accepted." };
      return {
        ok: true,
        model: typeof requested === "string" ? requested : qualification.model,
        encapsulatedKey,
      };
    },
    upstream({ qualification, apiKey, model, encapsulatedKey }) {
      return {
        url: new URL("/v1/chat/completions", qualification.origin),
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          Accept: "text/event-stream",
          "Ehbp-Encapsulated-Key": encapsulatedKey,
          // The enclave checks this against the encrypted body and rejects a mismatch.
          "X-Tinfoil-Model": model,
          // Completed-request metering arrives as a response header or stream trailer.
          "X-Tinfoil-Request-Usage-Metrics": "true",
        },
      };
    },
    accept(reply: UpstreamReply) {
      const nonce = single(reply.headers["ehbp-response-nonce"]);
      const passthrough: Record<string, string> = {};
      if (reply.statusCode !== 200 || !nonce) return { ok: false, passthrough };
      passthrough["Ehbp-Response-Nonce"] = nonce;
      passthrough["Content-Type"] =
        single(reply.headers["content-type"]) ?? "application/octet-stream";
      return { ok: true, passthrough };
    },
    classifyFailure(reply) {
      return reply.statusCode >= 400 && reply.statusCode < 500
        ? "rejected"
        : "unavailable";
    },
    usage(reply) {
      return parseUsageMetrics(
        single(reply.trailers["x-tinfoil-usage-metrics"]) ??
          single(reply.headers["x-tinfoil-usage-metrics"]),
      );
    },
    guard() {
      return attestationAuditGuard();
    },
  };
}

registerInferenceRelay("tinfoil", createTinfoilRelayAdapter);
