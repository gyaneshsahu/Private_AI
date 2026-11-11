// Privatemode adapter for the browser (qualification spike, branch privatemode-eval).
// The Privatemode SDK owns attestation and encryption (Wasm). This file adds what our
// design needs on top: the browser holds only a placeholder key and talks to our relay,
// which injects the real key; the deployment manifest is the one the qualification
// report approved (SHA-256 in releaseDigests); a manifest the SDK swaps in by itself
// stops the client before anything is sent.
import { abortable } from "../abortable";
import {
  registerInferenceClient,
  type InferenceClientAdapter,
} from "./inference-client";

/** Where our server serves the approved manifest and the pinned Wasm; the relay holds the key. */
export const PRIVATEMODE_RELAY_PATH = "/api/privatemode";
/** SHA-256 of privatemode.wasm in privatemode-ai 1.63.0 (pinned in package.json). */
export const PRIVATEMODE_WASM_SHA256 =
  "71b9bf76fc48cfd892c16c74bf1526661bd4a4e377a01c28c3e0bbaa02cf7bd2";
const PLACEHOLDER_KEY = "relay-injects-the-key";

async function sha256Hex(bytes: Uint8Array<ArrayBuffer>) {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
}

export function createPrivatemodeClientAdapter(): InferenceClientAdapter {
  return {
    id: "privatemode",
    async verify(policy, signal, onStatus) {
      onStatus("Loading inference libraries…");
      const { PrivatemodeAI } = await abortable(import("privatemode-ai"), signal);
      onStatus("Fetching the approved deployment manifest…");
      const response = await fetch(`${PRIVATEMODE_RELAY_PATH}/manifest`, {
        signal,
        credentials: "same-origin",
        redirect: "error",
      });
      if (!response.ok) throw new Error("Deployment manifest unavailable.");
      const manifestBytes = new Uint8Array(await response.arrayBuffer());
      const digest = await sha256Hex(manifestBytes);
      if (!policy.releaseDigests.includes(digest))
        throw new Error(
          "The deployment manifest does not match the reviewed provider configuration. Nothing was sent.",
        );
      let changed = false;
      const client = new PrivatemodeAI({
        apiKey: PLACEHOLDER_KEY,
        // The SDK uses only the origin; the relay answers its paths at the site root.
        apiBaseURL: location.origin,
        manifestBytes,
        browserWasmURL: `${PRIVATEMODE_RELAY_PATH}/privatemode.wasm`,
        expectedWasmHash: PRIVATEMODE_WASM_SHA256,
        enableWasmLogging: false,
        // The key is a placeholder; the real one stays on our relay.
        dangerouslyAllowBrowser: true,
        onManifestUpdate: () => {
          // The SDK has already switched to a manifest we did not approve: release the
          // client so no request can be sent under it, then fail verification.
          changed = true;
          client.close();
          throw new Error("manifest changed");
        },
      });
      onStatus("Verifying the protected destination…");
      try {
        await abortable(client.verify(), signal);
      } catch (error) {
        client.close();
        throw changed
          ? new Error(
              "The provider's deployment differs from the reviewed one. Nothing was sent.",
            )
          : error;
      }
      return {
        evidence: {
          host: new URL(policy.origin).hostname,
          releaseDigest: digest,
        },
        async transport() {
          return {
            async request(_url, init) {
              if (changed)
                throw new Error(
                  "The provider's deployment differs from the reviewed one. Nothing was sent.",
                );
              const body = JSON.parse(String(init.body));
              return client.chat.completions
                .create(body, { signal: init.signal ?? undefined })
                .asResponse();
            },
          };
        },
      };
    },
    requestHeaders() {
      return {};
    },
    modelOptions(policy) {
      const effort = policy.gptOssReasoningEffort ?? policy.glmReasoningEffort;
      return effort ? { reasoning_effort: effort } : {};
    },
  };
}

registerInferenceClient("privatemode", createPrivatemodeClientAdapter);
