// A retired or unknown model fails closed in the browser: its own message in English and German,
// and no retry on the backup model (docs/model-deprecation-runbook.md). The relay half is in
// tests/privatemode-relay.test.ts.
import { afterEach, expect, it, vi } from "vitest";
import { shouldRetryOnBackup } from "../src/answer-modes";
import { completionEvents } from "../src/completion-events";
import { consumeReply, IncompleteReplyError } from "../src/reply-stream";
import { modelNotFound } from "../server/providers/inference-relay";

afterEach(() => vi.unstubAllGlobals());
const pricing = { inputPerMillion: 1, outputPerMillion: 1, currency: "USD" as const };
const signal = () => new AbortController().signal;
const refused = () =>
  consumeReply(
    completionEvents(
      new Response("PRIVATE_ERROR_BODY", { status: 502, headers: { "X-PrivateAI-Upstream": "model-not-found" } }),
      signal(),
    ),
    pricing,
    signal(),
    () => {},
  ).then(
    () => {
      throw Error("expected a failure");
    },
    (error: unknown) => error as IncompleteReplyError,
  );

it("shows the model-not-found message in English and never retries on the backup model", async () => {
  const error = await refused();
  expect(error).toBeInstanceOf(IncompleteReplyError);
  expect(error.diagnostic).toMatchObject({ code: "HTTP_MODEL_NOT_FOUND", textCharacters: 0 });
  expect(error.message).toContain(
    "The AI model for this answer mode is not available on the secure server. No answer was received, and no other model was used in its place.",
  );
  expect(error.message).toContain("No automatic retry was made.");
  expect(error.message).not.toContain("PRIVATE_ERROR_BODY");
  // Full time left, no text, not stopped: an outage would retry here; a retired model does not.
  for (const mode of ["fast", "thinking"] as const)
    expect(shouldRetryOnBackup(error, false, false, 10 * 60_000, mode)).toBe(false);
});

it("shows the message in German", async () => {
  vi.stubGlobal("navigator", { languages: ["de-DE"] });
  const error = await refused();
  expect(error.message).toContain(
    "Das KI-Modell für diesen Antwortmodus ist auf dem sicheren Server nicht verfügbar. Es kam keine Antwort, und es wurde kein anderes Modell an seiner Stelle verwendet.",
  );
});

it("the relay recognises a retired model by HTTP 404 or by the provider's wording on another 4xx, and nothing else", async () => {
  const body = (text: string) => [new TextEncoder().encode(text)] as unknown as AsyncIterable<Uint8Array>;
  expect(await modelNotFound(404, body(""))).toBe(true);
  for (const text of [
    '{"error":{"code":"model_not_found"}}',
    "model not found",
    "The model `glm-5.3` does not exist.",
    "unknown model glm-5.3",
  ])
    expect(await modelNotFound(400, body(text)), text).toBe(true);
  expect(await modelNotFound(400, body("invalid request"))).toBe(false);
  expect(await modelNotFound(429, body("rate limit"))).toBe(false);
  expect(await modelNotFound(503, body("model not found"))).toBe(false);
});
