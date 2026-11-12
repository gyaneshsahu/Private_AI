// Privatemode adapter for the browser (Stage 3). The Privatemode SDK owns attestation and
// encryption (Wasm). This file adds what our design needs on top: the browser holds only a
// placeholder key and talks to our relay, which injects the real key; the deployment manifest
// is the one the qualification report approved (SHA-256 in releaseDigests); a manifest the SDK
// swaps in by itself stops the client before anything is sent. Every SDK call carries the
// session's CSRF token, so attestation and key exchange pass the same gates as chat.
import { abortable } from "../abortable";
import {
  registerInferenceClient,
  type InferenceClientAdapter,
} from "./inference-client";

/** Where our server serves the approved manifest and the pinned Wasm; the relay holds the key. */
export const PRIVATEMODE_RELAY_PATH = "/api/inference/privatemode";
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
        // Hash-named path: the server lets the browser cache it for a year (plan point 6).
        browserWasmURL: `${PRIVATEMODE_RELAY_PATH}/privatemode-${PRIVATEMODE_WASM_SHA256}.wasm`,
        expectedWasmHash: PRIVATEMODE_WASM_SHA256,
        enableWasmLogging: false,
        // Stated explicitly (equal to the SDK 1.63.0 default) so an SDK upgrade cannot loosen it:
        // only good NVIDIA OCSP statuses, no grace for revoked certificates.
        nvidiaOCSPPolicy: { allowUnknown: false, revokedGracePeriodHours: 0 },
        // The key is a placeholder; the real one stays on our relay.
        dangerouslyAllowBrowser: true,
        openAIOptions: {
          // Sent on attestation, key exchange and chat (the SDK's extra HTTP headers).
          defaultHeaders: policy.csrf ? { "X-PrivateAI-CSRF": policy.csrf } : {},
          // Never resend on its own: one user action is one request (and one allowance unit).
          maxRetries: 0,
        },
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
      // shortcut: the per-request SDK client is not closed after its reply (small Wasm state per
      // client; the module itself loads once per page); close it on stream end if phones show growth.
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
              try {
                // Our headers (CSRF, answer mode, continuation approval) reach the relay; the SDK
                // drops content-type and accept and sets its own.
                return await client.chat.completions
                  .create(body, {
                    signal: init.signal ?? undefined,
                    headers: Object.fromEntries(new Headers(init.headers)),
                  })
                  .asResponse();
              } catch (error) {
                // The SDK turns a refused reply into an error; hand the app's stream parser the
                // status and the relay's failure class, as the Tinfoil transport does.
                const { status, headers } = error as { status?: unknown; headers?: unknown };
                if (typeof status === "number" && status >= 400 && status <= 599)
                  return new Response(null, {
                    status,
                    headers: headers instanceof Headers ? headers : undefined,
                  });
                throw error;
              }
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
    // Privatemode isolates prompt caches by salt; one stable salt per account keeps each
    // account's cache apart from every other (Privatemode email, 12 November).
    cacheOptions(policy) {
      if (!policy.cacheSalt || policy.cacheSalt.length < 32)
        throw new Error("No prompt-cache salt for this account. Nothing was sent.");
      return { cache_salt: policy.cacheSalt };
    },
  };
}

registerInferenceClient("privatemode", createPrivatemodeClientAdapter);
