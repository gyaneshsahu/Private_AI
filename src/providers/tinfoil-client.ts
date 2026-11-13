// Tinfoil adapter for the browser: the maintained verifier and the EHBP
// transport own attestation and cryptography; this file only wires them and
// holds the supplier's routing headers and per-model request switches.
import { textFor } from "../text/core";
import { chatErrorText } from "../text/chat-errors";
import { abortable } from "../abortable";
import {
  registerInferenceClient,
  type ClientPolicy,
  type InferenceClientAdapter,
} from "./inference-client";

export function assertVerification(
  doc: {
    securityVerified: boolean;
    releaseDigest: string;
    configRepo: string;
    hpkePublicKey: string;
    enclaveHost: string;
  },
  report: Pick<ClientPolicy, "origin" | "repository" | "releaseDigests">,
) {
  if (
    !doc.securityVerified ||
    !doc.hpkePublicKey ||
    doc.configRepo !== report.repository ||
    !report.releaseDigests.includes(doc.releaseDigest) ||
    doc.enclaveHost !== new URL(report.origin).hostname
  )
    throw new Error(
      textFor(chatErrorText).serverMismatch,
    );
}

export function createTinfoilClientAdapter(): InferenceClientAdapter {
  return {
    id: "tinfoil",
    async verify(policy, signal, onStatus) {
      onStatus(textFor(chatErrorText).loadingLibraries);
      const [{ Verifier, fetchAttestationBundle }, { Identity, Transport }] =
        await abortable(
          Promise.all([import("tinfoil"), import("ehbp")]),
          signal,
        );
      onStatus(textFor(chatErrorText).fetchingAttestation);
      const bundle = await abortable(
        fetchAttestationBundle({
          enclaveURL: policy.origin,
          configRepo: policy.repository,
        }),
        signal,
      );
      if (bundle.domain !== new URL(policy.origin).hostname)
        throw new Error(
          textFor(chatErrorText).unexpectedDestination,
        );
      onStatus(textFor(chatErrorText).checkingServer);
      const verifier = new Verifier({ configRepo: policy.repository });
      await abortable(verifier.verifyBundle(bundle), signal);
      const doc = verifier.getVerificationDocument();
      if (!doc) throw new Error(textFor(chatErrorText).evidenceUnavailable);
      assertVerification(doc, policy);
      return {
        evidence: { host: doc.enclaveHost, releaseDigest: doc.releaseDigest },
        async transport() {
          const identity = await abortable(
            Identity.fromPublicKeyHex(doc.hpkePublicKey),
            signal,
          );
          return new Transport(identity, location.host);
        },
      };
    },
    requestHeaders(policy) {
      return {
        "X-Tinfoil-Enclave-Url": policy.origin,
        "X-Tinfoil-Model": policy.model,
      };
    },
    modelOptions(policy) {
      return {
        ...(policy.gptOssReasoningEffort !== undefined
          ? { reasoning_effort: policy.gptOssReasoningEffort }
          : {}),
        ...(policy.deepSeekThinking !== undefined
          ? {
              chat_template_kwargs: {
                thinking: policy.deepSeekThinking,
                ...(policy.deepSeekReasoningEffort
                  ? { reasoning_effort: policy.deepSeekReasoningEffort }
                  : {}),
              },
            }
          : policy.gemmaThinking !== undefined
            ? {
                chat_template_kwargs: {
                  enable_thinking: policy.gemmaThinking,
                },
              }
            : policy.glmReasoningEffort !== undefined
              ? {
                  chat_template_kwargs: {
                    reasoning_effort: policy.glmReasoningEffort,
                  },
                }
              : {}),
      };
    },
    // A fresh secret per request: Tinfoil's cache is never shared between two requests.
    cacheOptions() {
      return { user_cache_secret: crypto.randomUUID() };
    },
  };
}

registerInferenceClient("tinfoil", createTinfoilClientAdapter);
