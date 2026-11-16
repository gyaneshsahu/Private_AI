// Audit harness only (evaluation/audit-harness.ts): replaces src/inference.ts in the harness build,
// never in dist/ or a deployed build. The real path is attested and encrypted end to end, so a reply
// cannot be faked by route interception alone. This stand-in asks the same origin for the answer
// (POST /__audit/reply, answered by evaluation/audit-fakes.ts in the browser's route handler) and
// runs that answer through the app's REAL stream parser and reply checks, so errors, drops and
// stops show the app's own wording. Nothing is sent anywhere else.
import type * as Real from "../src/inference";
import { completionEvents } from "../src/completion-events";
import { consumeReply } from "../src/reply-stream";
import type { Qualification } from "../shared/contracts";

export const assertVerification: typeof Real.assertVerification = () => {};

/** Re-emit the SSE body one frame at a time, `ms` apart, so the answer streams and Stop can cut it. */
function paced(response: Response, ms: number, signal: AbortSignal): Response {
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      const frames = (await response.text()).split(/(?<=\n\n)/);
      for (const frame of frames) {
        if (signal.aborted) break;
        controller.enqueue(encoder.encode(frame));
        await new Promise((r) => setTimeout(r, ms));
      }
      controller.close();
    },
  });
  return new Response(body, { status: response.status, headers: response.headers });
}

export const streamReply: typeof Real.streamReply = async (
  conversation,
  qualification,
  _csrf,
  signal,
  onChunk,
  onStatus,
  _calculationSession,
  _onKeptOnDevice,
  modelChoice = "primary",
  mode,
  _cacheSalt,
  image,
  code,
  research,
) => {
  const report = qualification as Partial<Qualification> | undefined;
  const sources = conversation.attachments.flatMap((a) => a.sources.map((s) => s.id));
  const response = await fetch("/__audit/reply", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      question: conversation.messages.at(-1)?.text ?? "",
      messages: conversation.messages.length,
      mode,
      modelChoice,
      research,
      image: !!image,
      code: !!code,
      sources,
    }),
    signal,
  });
  // Code execution: the fake names the Python the "model" asks for; it runs in the app's real worker.
  const source = response.headers.get("x-audit-code");
  if (source && code) {
    onStatus("Running code");
    const python = decodeURIComponent(source);
    const result = await code.run(python, signal);
    code.onRuns([{ code: python, ...result }], false);
  }
  const frameMs = Number(response.headers.get("x-audit-frame-ms") ?? "0");
  const stream = frameMs > 0 ? paced(response, frameMs, signal) : response;
  return consumeReply(
    completionEvents(stream, signal),
    report?.pricing ?? { inputPerMillion: 0, outputPerMillion: 0, currency: "USD" },
    signal,
    onChunk,
  );
};
