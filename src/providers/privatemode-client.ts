// Privatemode adapter for the browser (Stage 3). The Privatemode SDK owns attestation and
// encryption (Wasm). This file adds what our design needs on top: the browser holds only a
// placeholder key and talks to our relay, which injects the real key; the deployment manifest
// is the one the qualification report approved (SHA-256 in releaseDigests); a manifest the SDK
// swaps in by itself stops the client before anything is sent. Every SDK call carries the
// session's CSRF token, so attestation and key exchange pass the same gates as chat.
// Privatemode limits attestation per organisation, so one verified client serves the browser
// session (memory only): verified afresh after PRIVATEMODE_VERIFY_MAX_AGE_MS, after any failed
// request, and whenever the approved digests or the session's CSRF token change (owner, 12 Nov).
import { abortable } from "../abortable";
import {
  AttestationBusyError,
  registerInferenceClient,
  type ClientPolicy,
  type InferenceClientAdapter,
  type VerifiedDestination,
} from "./inference-client";

/** Where our server serves the approved manifest and the pinned Wasm; the relay holds the key. */
export const PRIVATEMODE_RELAY_PATH = "/api/inference/privatemode";
/** SHA-256 of privatemode.wasm in privatemode-ai 1.63.0 (pinned in package.json). */
export const PRIVATEMODE_WASM_SHA256 =
  "71b9bf76fc48cfd892c16c74bf1526661bd4a4e377a01c28c3e0bbaa02cf7bd2";
const PLACEHOLDER_KEY = "relay-injects-the-key";
/** A verified client is reused for less than this long after its last successful verification. */
export const PRIVATEMODE_VERIFY_MAX_AGE_MS = 10 * 60 * 1000;
const DEPLOYMENT_CHANGED =
  "The provider's deployment differs from the reviewed one. Nothing was sent.";

interface VerifiedSession {
  /** Origin, approved digests and CSRF token the client was verified under. */
  key: string;
  verifiedAt: number;
  destination: VerifiedDestination;
  discard(): void;
}
/** The one verified client of this browser session; never persisted. */
let session: VerifiedSession | undefined;

/** Closes and forgets the cached client; the next request verifies afresh. */
export function discardPrivatemodeSession() {
  session?.discard();
}

/**
 * The SDK's error when an attest call was refused for load: our relay's busy reply (503) or
 * Privatemode's own limit (429). The Wasm reports it as plain text, e.g. "updating mesh CA: doing
 * attest request: unexpected status code: 503", directly or as the cause of a connection error.
 */
function attestationBusy(error: unknown) {
  const { message, cause } = (error ?? {}) as { message?: unknown; cause?: { message?: unknown } };
  return /attest request: unexpected status code:? (429|503)\b/.test(`${message} ${cause?.message}`);
}

/**
 * Our own relay's refusal (429: allowance, spend, one request at a time, three per instance) never
 * reached Privatemode and says nothing about the verified deployment, so the client is kept.
 * Privatemode's own refusals carry X-PrivateAI-Upstream. Live check of 13 Nov: discarding on these
 * refusals added verifications and pushed the attestation allowance over its limit.
 */
function ownRelayRefusal(status: unknown, headers: unknown) {
  return status === 429 && headers instanceof Headers && !headers.has("x-privateai-upstream");
}

/** Passes the reply through; a read error or an early cancel (stop, refused reply) discards the client. */
function watchReply(response: Response, onFailure: () => void) {
  if (!response.ok || !response.body) {
    if (!ownRelayRefusal(response.status, response.headers)) onFailure();
    return response;
  }
  const reader = response.body.getReader();
  return new Response(
    new ReadableStream<Uint8Array>({
      async pull(controller) {
        try {
          const { done, value } = await reader.read();
          if (done) controller.close();
          else controller.enqueue(value);
        } catch (error) {
          onFailure();
          controller.error(error);
        }
      },
      cancel(reason) {
        onFailure();
        return reader.cancel(reason);
      },
    }),
    {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    },
  );
}

async function sha256Hex(bytes: Uint8Array<ArrayBuffer>) {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
}

/** One full verification: approved manifest by digest, pinned Wasm, SDK attestation. */
async function verifySession(
  policy: ClientPolicy,
  key: string,
  signal: AbortSignal,
  onStatus: (text: string) => void,
): Promise<VerifiedSession> {
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
  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    client.close();
  };
  const discard = () => {
    if (session?.discard === discard) session = undefined;
    close();
  };
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
      discard();
      throw new Error("manifest changed");
    },
  });
  onStatus("Verifying the protected destination…");
  let refusal: unknown;
  try {
    await abortable(
      (async () => {
        await client.verify();
        // Without the secret now, the SDK's first chat verifies a second time by itself: two
        // attest calls per verification instead of one (live check, 13 November).
        await client.refreshSecret();
      })().catch((error: unknown) => {
        refusal = error; // abortable hides the SDK's error; keep it to tell a busy refusal apart
        throw error;
      }),
      signal,
    );
    // A stop that lands as verification ends still caches nothing.
    signal.throwIfAborted();
  } catch (error) {
    close();
    if (changed) throw new Error(DEPLOYMENT_CHANGED);
    throw attestationBusy(refusal) && !signal.aborted ? new AttestationBusyError() : error;
  }
  const verified: VerifiedSession = {
    key,
    verifiedAt: Date.now(),
    discard,
    destination: {
      evidence: {
        host: new URL(policy.origin).hostname,
        releaseDigest: digest,
      },
      async transport() {
        return {
          async request(_url, init) {
            if (changed) throw new Error(DEPLOYMENT_CHANGED);
            if (closed)
              throw new Error(
                "The verified connection was closed. Nothing was sent.",
              );
            const body = JSON.parse(String(init.body));
            try {
              // Our headers (CSRF, answer mode, continuation approval) reach the relay; the SDK
              // drops content-type and accept and sets its own.
              const response = await client.chat.completions
                .create(body, {
                  signal: init.signal ?? undefined,
                  headers: Object.fromEntries(new Headers(init.headers)),
                })
                .asResponse();
              return watchReply(response, discard);
            } catch (error) {
              // The SDK turns a refused reply into an error; hand the app's stream parser the
              // status and the relay's failure class, as the Tinfoil transport does.
              const { status, headers } = error as {
                status?: unknown;
                headers?: unknown;
              };
              // Any failure (transport, key exchange, refused reply) ends this client, except a
              // refusal by our own relay before anything reached Privatemode.
              if (!ownRelayRefusal(status, headers)) discard();
              if (typeof status === "number" && status >= 400 && status <= 599)
                return new Response(null, {
                  status,
                  headers: headers instanceof Headers ? headers : undefined,
                });
              // The SDK verifies again by itself when its secret lapses; that can be refused too.
              throw attestationBusy(error) ? new AttestationBusyError() : error;
            }
          },
        };
      },
    },
  };
  return verified;
}

export function createPrivatemodeClientAdapter(): InferenceClientAdapter {
  return {
    id: "privatemode",
    async verify(policy, signal, onStatus) {
      // The pin is part of the key: a client is reused only under the digests it was verified for.
      const key = JSON.stringify([
        policy.origin,
        policy.releaseDigests,
        policy.csrf ?? "",
      ]);
      if (
        session &&
        (session.key !== key ||
          Date.now() - session.verifiedAt >= PRIVATEMODE_VERIFY_MAX_AGE_MS)
      )
        session.discard();
      if (session) return session.destination;
      const fresh = await verifySession(policy, key, signal, onStatus);
      // A verification that ran alongside may have cached a client meanwhile, and a request may
      // be using it: keep that one and close ours. Only a client under another key is replaced.
      const meanwhile = session as VerifiedSession | undefined; // set during the await
      if (meanwhile?.key === key) {
        fresh.discard();
        return meanwhile.destination;
      }
      discardPrivatemodeSession();
      session = fresh;
      return fresh.destination;
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
        throw new Error(
          "No prompt-cache salt for this account. Nothing was sent.",
        );
      return { cache_salt: policy.cacheSalt };
    },
  };
}

registerInferenceClient("privatemode", createPrivatemodeClientAdapter);
