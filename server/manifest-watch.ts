// Checks Privatemode's live deployment manifest every 6 hours (docs/manifest-rotation-20261114.md).
// After a rotation the browser refuses the new deployment until the owner approves its digest,
// so chat fails. This check finds a rotation early, logs an alert, and makes /api/status say
// "paused" instead of letting messages fail. It can only make the status more restrictive.
// With `inference.liveManifest` it also keeps the attested live manifest for the relay, which
// serves it only when the report approves its digest. One attestation per check, no prompt.
import { createHash } from "node:crypto";
import type { Qualification } from "../shared/contracts";

export const MANIFEST_ALERT = "CometRow manifest alert:";
const DOC = "docs/manifest-rotation-20261114.md";
/** inference.reason (and the notice) while the live manifest is not the one browsers get. */
export const PROVIDER_UPDATE_PAUSE =
  "CometRow is checking an update from its AI provider. Chat is paused until the update is approved.";
// One attestation per run, against users' share of about one per 10 minutes per open session:
// four a day is noise for Privatemode's rate limit, and a rotation is seen within 6 hours.
export const MANIFEST_CHECK_MS = 6 * 3_600_000;

const sha256 = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");

interface WatchState {
  /** The last attested live manifest. */
  live?: { bytes: Uint8Array; digest: string };
  /** Set while browsers would get a manifest other than the live one. */
  paused?: string;
  serveLive: boolean;
}
let state: WatchState = { serveLive: false };

/** Whether the last check saw that browsers would get a manifest other than the live one. */
export const manifestPaused = () => !!state.paused;

/** The live manifest bytes for the relay, only with inference.liveManifest; the relay checks the digest again. */
export const liveManifestBytes = () => (state.serveLive ? state.live?.bytes : undefined);

/** For tests and a new schedule: forget everything. */
export function resetManifestWatch(serveLive = false) {
  state = { serveLive };
}

/** One check. A check that cannot run is an alert and leaves the status as it was. */
export async function runManifestCheck(
  readLive: () => Promise<Uint8Array>,
  approved: readonly string[],
  configured: Uint8Array | undefined,
  log: (line: string) => void,
): Promise<void> {
  let bytes: Uint8Array;
  try {
    bytes = await readLive();
  } catch (error) {
    log(
      `${MANIFEST_ALERT} the manifest check failed (${error instanceof Error ? error.message : "unknown reason"}). The live manifest was not checked; the chat status is unchanged (${DOC})`,
    );
    return;
  }
  const digest = sha256(bytes);
  state.live = { bytes, digest };
  const served = state.serveLive && approved.includes(digest) ? digest : configured && sha256(configured);
  if (!approved.includes(digest)) {
    state.paused = digest;
    log(`${MANIFEST_ALERT} Privatemode published a new deployment manifest ${digest}; chat is paused until the report approves it (${DOC})`);
  } else if (served !== digest) {
    state.paused = digest;
    log(
      `${MANIFEST_ALERT} the live Privatemode manifest ${digest} is approved, but the manifest file on the server is another one; chat is paused until the file is replaced (docs/render-deploy-and-live-checks-20261113.md section 2.5)`,
    );
  } else {
    state.paused = undefined;
    log(`CometRow manifest check: the live Privatemode manifest ${digest} is approved and served.`);
  }
}

/** Reads the live manifest through the attested SDK, as scripts/privatemode-manifest.ts does. */
export function privatemodeLiveManifest(q: Qualification, apiKey: string) {
  return async (): Promise<Uint8Array> => {
    const { PrivatemodeAI } = await import("privatemode-ai");
    const client = new PrivatemodeAI({
      apiKey,
      apiBaseURL: new URL(q.origin).origin,
      enableWasmLogging: false,
      ...(q.privatemode?.wasmSha256 ? { expectedWasmHash: q.privatemode.wasmSha256 } : {}),
    });
    try {
      await client.verify();
      if (!client.manifestBytes) throw Error("no manifest after verification");
      return new Uint8Array(client.manifestBytes);
    } finally {
      client.close();
    }
  };
}

/** Checks now and every 6 hours while the report names Privatemode; returns the stop function. */
export function scheduleManifestCheck(
  qualification: unknown,
  apiKey: string,
  configured: Uint8Array | undefined,
  log: (line: string) => void,
  options: { serveLive?: boolean; readLive?: () => Promise<Uint8Array> } = {},
): () => void {
  const q = qualification as Qualification | undefined;
  resetManifestWatch(!!options.serveLive);
  if (q?.provider !== "privatemode") return () => {};
  if (!Array.isArray(q.releaseDigests)) {
    log(`${MANIFEST_ALERT} the manifest check cannot start: the report's releaseDigests are unreadable (${DOC})`);
    return () => {};
  }
  const readLive = options.readLive ?? privatemodeLiveManifest(q, apiKey);
  let running = false;
  const run = () => {
    if (running) return; // a hung attestation never piles up a second one
    running = true;
    void runManifestCheck(readLive, q.releaseDigests, configured, log).finally(() => (running = false));
  };
  run();
  const timer = setInterval(run, MANIFEST_CHECK_MS);
  timer.unref();
  return () => clearInterval(timer);
}
