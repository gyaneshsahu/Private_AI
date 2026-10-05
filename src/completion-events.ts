import type { ChatCompletionChunk } from "openai/resources/chat/completions";
import { StreamProtocolError } from "./stream-failure";

const MAX_FRAME_CHARACTERS = 256 * 1024;

// Parse only the chat-completion SSE protocol. No raw provider error, malformed
// JSON or decrypted frame is sent to console/loggers. Named tool/thread events
// are not part of this API and fail closed. Limits apply before JSON parsing.
export async function* completionEvents(
  response: Response,
  signal: AbortSignal,
): AsyncGenerator<ChatCompletionChunk> {
  if (!response.ok || !response.body) {
    await response.body?.cancel();
    throw new StreamProtocolError("HTTP_RESPONSE_INVALID");
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let buffer = "";
  let ended = false;
  let eof = false;
  const abort = () => {
    void reader.cancel().catch(() => {});
  };
  signal.addEventListener("abort", abort, { once: true });
  try {
    signal.throwIfAborted();
    while (true) {
      const { done, value } = await reader.read();
      signal.throwIfAborted();
      if (done) {
        eof = true;
        break;
      }
      // Bound temporary decode allocations even when a transport returns a
      // large chunk containing many small valid frames.
      for (let offset = 0; offset < value.length; offset += 16384) {
        buffer += decoder.decode(value.subarray(offset, offset + 16384), {
          stream: true,
        });
        let boundary: RegExpExecArray | null;
        while ((boundary = /\r?\n\r?\n/.exec(buffer))) {
          const frame = buffer.slice(0, boundary.index);
          buffer = buffer.slice(boundary.index + boundary[0].length);
          if (frame.length > MAX_FRAME_CHARACTERS)
            throw new StreamProtocolError("FRAME_TOO_LARGE");
          const lines = frame.split(/\r?\n/);
          const data: string[] = [];
          for (const line of lines) {
            if (!line || line.startsWith(":")) continue;
            const colon = line.indexOf(":");
            const field = colon < 0 ? line : line.slice(0, colon);
            const raw = colon < 0 ? "" : line.slice(colon + 1);
            const content = raw.startsWith(" ") ? raw.slice(1) : raw;
            if (field === "data") data.push(content);
            else if (field === "event" && content !== "message")
              throw new StreamProtocolError("UNSUPPORTED_EVENT");
            // SSE id/retry fields do not grant permissions or trigger retries.
          }
          if (!data.length) continue;
          if (ended) throw new StreamProtocolError("DATA_AFTER_DONE");
          const payload = data.join("\n");
          if (payload === "[DONE]") {
            ended = true;
            continue;
          }
          let event: unknown;
          try {
            event = JSON.parse(payload);
          } catch {
            throw new StreamProtocolError("INVALID_JSON");
          }
          if (
            !event ||
            typeof event !== "object" ||
            "error" in event ||
            !Array.isArray((event as { choices?: unknown }).choices)
          )
            throw new StreamProtocolError("INVALID_EVENT");
          yield event as ChatCompletionChunk;
        }
        if (buffer.length > MAX_FRAME_CHARACTERS)
          throw new StreamProtocolError("FRAME_TOO_LARGE");
      }
    }
    buffer += decoder.decode();
    if (buffer.trim() || !ended) throw new StreamProtocolError("MISSING_DONE");
  } finally {
    signal.removeEventListener("abort", abort);
    if (!eof) await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}
