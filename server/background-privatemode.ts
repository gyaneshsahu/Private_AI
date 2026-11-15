// The server's own Privatemode client for background tasks (docs/background-tasks-20261115.md,
// section 2). The privatemode-ai SDK runs in Node with the server's API key: it verifies the
// deployment by remote attestation and encrypts each request end to end to the enclave, as in the
// browser. The same pins as the browser apply: the manifest the report approves (SHA-256 in
// releaseDigests), the report's Wasm hash, and the strict NVIDIA OCSP policy. A manifest the SDK
// swaps in by itself (a rotation) fails closed and blocks background runs for an hour, with an
// alert in the log. One verified client serves every background run for at most 10 minutes, and
// its attestation goes through the relay's shared queue, only when that queue is idle.
import { createHash } from "node:crypto";
import type { Qualification } from "../shared/contracts";
import { alertModelNotFound, MODEL_ALERT } from "./providers/inference-relay";

export interface BackgroundModelRequest {
  model: string;
  messages: { role: "system" | "user"; content: string }[];
  maxTokens: number;
  /** Model settings from the report (reasoning effort) and the account's cache salt. */
  options: Record<string, unknown>;
  signal: AbortSignal;
}
export interface BackgroundModelReply {
  text: string;
  usage?: { promptTokens: number; completionTokens: number };
}
export type BackgroundFailure =
  | "not-qualified"
  | "attestation-busy"
  | "deployment-changed"
  | "model-not-found"
  | "rejected"
  | "unavailable";
export class BackgroundModelError extends Error {
  constructor(readonly kind: BackgroundFailure) {
    super(`Background model request failed: ${kind}`);
  }
}
export interface BackgroundModelClient {
  /** Verifies (or reuses a verified client) before anything is spent; throws BackgroundModelError. */
  ready(signal: AbortSignal): Promise<void>;
  complete(request: BackgroundModelRequest): Promise<BackgroundModelReply>;
  close(): void;
}

/** The relay's attestation queue as this client uses it (server/providers/privatemode-attest-queue.ts). */
export interface SharedAttestQueue {
  idle(): boolean;
  run<R extends { statusCode: number; headers: Record<string, string | string[] | undefined>; body: { dump(): Promise<void> } }>(
    send: () => Promise<R>,
    signal: AbortSignal,
  ): Promise<R | "busy">;
}

/** The subset of the SDK this file uses, so tests can pass a fake. */
interface SdkClient {
  verify(): Promise<unknown>;
  refreshSecret(): Promise<void>;
  readonly manifestBytes: Uint8Array | null;
  chat: { completions: { create(body: Record<string, unknown>, options: { signal: AbortSignal }): Promise<unknown> } };
  close(): void;
}
export type SdkFactory = (options: Record<string, unknown>) => SdkClient | Promise<SdkClient>;

export const BACKGROUND_VERIFY_MAX_AGE_MS = 10 * 60_000;
const ROTATION_BLOCK_MS = 60 * 60_000;
const sha256 = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");
const rateLimited = (error: unknown) =>
  /unexpected status code:? 429\b/.test(`${(error as Error)?.message} ${(error as { cause?: Error })?.cause?.message}`);

export function createPrivatemodeBackgroundClient(input: {
  apiKey: string;
  qualification: () => Qualification | undefined;
  manifest?: Uint8Array;
  attestQueue?: SharedAttestQueue;
  log: (line: string) => void;
  sdk?: SdkFactory;
  now?: () => number;
}): BackgroundModelClient {
  const now = input.now ?? Date.now;
  const sdk: SdkFactory =
    input.sdk ?? (async (options) => new (await import("privatemode-ai")).PrivatemodeAI(options as never) as unknown as SdkClient);
  let cached: { client: SdkClient; key: string; verifiedAt: number } | undefined;
  let blockedUntil = 0;
  const discard = () => {
    cached?.client.close();
    cached = undefined;
  };
  const rotated = () => {
    discard();
    blockedUntil = now() + ROTATION_BLOCK_MS;
    input.log(
      `${MODEL_ALERT} background tasks: Privatemode offered a deployment manifest the report does not approve. Background runs are stopped for an hour at a time until a report approving the new manifest is deployed (docs/model-deprecation-runbook.md).`,
    );
    return new BackgroundModelError("deployment-changed");
  };

  async function ready(signal: AbortSignal): Promise<SdkClient> {
    const q = input.qualification();
    if (!q || q.provider !== "privatemode" || !q.privatemode || !input.manifest) throw new BackgroundModelError("not-qualified");
    if (now() < blockedUntil) throw new BackgroundModelError("deployment-changed");
    const digest = sha256(input.manifest);
    if (!q.releaseDigests.includes(digest)) throw new BackgroundModelError("deployment-changed");
    const key = JSON.stringify([q.origin, q.releaseDigests, q.privatemode.wasmSha256]);
    if (cached && (cached.key !== key || now() - cached.verifiedAt >= BACKGROUND_VERIFY_MAX_AGE_MS)) discard();
    if (cached) return cached.client;
    // Users first: background attestation waits for a quiet queue instead of joining a line.
    if (input.attestQueue && !input.attestQueue.idle()) throw new BackgroundModelError("attestation-busy");
    let changed = false;
    const client = await sdk({
      apiKey: input.apiKey,
      apiBaseURL: new URL(q.origin).origin,
      manifestBytes: input.manifest,
      expectedWasmHash: q.privatemode.wasmSha256,
      enableWasmLogging: false,
      nvidiaOCSPPolicy: { allowUnknown: false, revokedGracePeriodHours: 0 },
      openAIOptions: { maxRetries: 0 },
      onManifestUpdate: () => {
        changed = true;
        throw new Error("manifest changed");
      },
    });
    const verify = async () => {
      try {
        await client.verify();
        // Without the secret now, the first request would verify a second time by itself.
        await client.refreshSecret();
        return { statusCode: 200, headers: {}, body: { dump: async () => {} } };
      } catch (error) {
        if (rateLimited(error)) return { statusCode: 429, headers: {}, body: { dump: async () => {} } };
        throw error;
      }
    };
    try {
      const reply = input.attestQueue ? await input.attestQueue.run(verify, signal) : await verify();
      if (reply === "busy" || reply.statusCode === 429) throw new BackgroundModelError("attestation-busy");
    } catch (error) {
      client.close();
      if (changed || /active manifest does not match|fetching manifest/i.test(String((error as Error)?.message))) throw rotated();
      if (error instanceof BackgroundModelError) throw error;
      throw new BackgroundModelError("unavailable");
    }
    // Belt and braces: the bytes in use must still be the approved ones.
    if (changed || !client.manifestBytes || !q.releaseDigests.includes(sha256(client.manifestBytes))) {
      client.close();
      throw rotated();
    }
    cached = { client, key, verifiedAt: now() };
    return client;
  }

  return {
    async ready(signal) {
      await ready(signal);
    },
    async complete(request) {
      const client = await ready(request.signal);
      try {
        const reply = (await client.chat.completions.create(
          { model: request.model, messages: request.messages, max_tokens: request.maxTokens, ...request.options },
          { signal: request.signal },
        )) as {
          choices?: { message?: { content?: unknown } }[];
          usage?: { prompt_tokens?: unknown; completion_tokens?: unknown };
        };
        const text = reply.choices?.[0]?.message?.content;
        if (typeof text !== "string" || !text.trim()) throw new BackgroundModelError("unavailable");
        const p = Number(reply.usage?.prompt_tokens),
          c = Number(reply.usage?.completion_tokens);
        return {
          text,
          ...(Number.isInteger(p) && Number.isInteger(c) && p >= 0 && c >= 0 ? { usage: { promptTokens: p, completionTokens: c } } : {}),
        };
      } catch (error) {
        if (error instanceof BackgroundModelError) {
          discard();
          throw error;
        }
        const status = (error as { status?: unknown }).status;
        const message = String((error as Error)?.message ?? "");
        if (status === 404 || (typeof status === "number" && status < 500 && /model.{0,80}(not[ _]found|does not exist)|unknown model/i.test(message))) {
          alertModelNotFound(request.model, status);
          throw new BackgroundModelError("model-not-found");
        }
        // A refusal says nothing about the verified deployment: the client is kept, as in the browser.
        if (typeof status === "number" && status >= 400 && status < 500) throw new BackgroundModelError("rejected");
        discard();
        throw new BackgroundModelError("unavailable");
      }
    },
    close: discard,
  };
}
