// Live check for voice input (docs/voice-to-text-20261114.md): sends audio files you name through
// the Privatemode SDK, with ONE verification for a chat call and all transcriptions, and prints
// the response shape, the text and the time. NOT run by the agent: it needs the owner's key and
// calls Privatemode. Key from Windows Credential Manager, never printed. Synthetic audio only:
// record a made-up sentence, never real personal content.
//
//   Invoke-WithPrivateAiSecret -Name PRIVATEMODE_API_KEY -Action {
//     npx tsx evaluation/privatemode/voice-probe.ts sample-de.webm sample-en.mp4
//   }
//   ... --models whisper-large-v3,voxtral-mini-3b   (default: both)
//   ... --chat-model glm-5.3-flash                  (the chat call that shares the session)
//
// For the chunk size check (15 November), record 2 s, 10 s and 30 s chunks of a made-up sentence
// in Chrome (WebM/Opus) and Safari (MP4) and pass them here: each line prints `encryptedBytes`,
// which must stay under voiceChunkLimit(units): 24,192 bytes for 2 s, 88,192 for 10 s, 248,192 for 30 s.
//
// Each transcription is billed by audio length (owner's notes: EUR 0.014 or 0.004 per minute).
import { readFileSync } from "node:fs";
import { basename, extname } from "node:path";
import { PrivatemodeAI } from "privatemode-ai";

const apiKey = process.env.PRIVATEMODE_API_KEY;
if (!apiKey) throw Error("PRIVATEMODE_API_KEY not loaded");
const flag = (name: string, fallback: string) => {
  const at = process.argv.indexOf(name);
  return at > 0 ? process.argv[at + 1] : fallback;
};
const models = flag("--models", "whisper-large-v3,voxtral-mini-3b").split(",");
const chatModel = flag("--chat-model", "glm-5.3-flash");
const files = process.argv.slice(2).filter((arg, i, all) => !arg.startsWith("--") && !all[i - 1]?.startsWith("--"));
if (!files.length) throw Error("Name at least one audio file (webm, mp4, ogg, wav or mp3).");
const TYPES: Record<string, string> = {
  ".webm": "audio/webm",
  ".mp4": "audio/mp4",
  ".m4a": "audio/mp4",
  ".ogg": "audio/ogg",
  ".wav": "audio/wav",
  ".mp3": "audio/mpeg",
};

// The encrypted body size of each transcription request (15 November: the relay checks each
// chunk's size against its reported length; docs/voice-to-text-20261114.md, live check 4). The
// SDK's Wasm sends through the global fetch, so the size is read there; content is never printed.
const encryptedSizes: (number | string)[] = [];
const realFetch = globalThis.fetch;
globalThis.fetch = (input, init) => {
  const url = String(input instanceof Request ? input.url : input);
  if (url.includes("/v1/audio/transcriptions")) {
    const body = init?.body;
    encryptedSizes.push(
      body instanceof Uint8Array || body instanceof ArrayBuffer
        ? body.byteLength
        : body instanceof Blob
          ? body.size
          : typeof body === "string"
            ? Buffer.byteLength(body)
            : `unknown (${Object.prototype.toString.call(body)})`,
    );
  }
  return realFetch(input, init);
};

let verifications = 0;
const client = new PrivatemodeAI({ apiKey, enableWasmLogging: false, openAIOptions: { maxRetries: 0 } });
try {
  await client.verify();
  verifications++;
  await client.refreshSecret();
  // Does one verified session serve chat and transcription? Any further verification the SDK
  // makes by itself would show as an extra attest call in the Privatemode portal.
  const chat = await client.chat.completions.create({
    model: chatModel,
    max_tokens: 16,
    messages: [{ role: "user", content: "Reply with the single word: ready" }],
  });
  console.log(JSON.stringify({ step: "chat", model: chat.model, content: chat.choices[0]?.message?.content }));
  for (const path of files) {
    const bytes = readFileSync(path);
    const type = TYPES[extname(path).toLowerCase()] ?? "application/octet-stream";
    for (const model of models) {
      const started = performance.now();
      try {
        const { data, response } = await client.audio.transcriptions
          .create(
            { file: new File([bytes], basename(path), { type }), model, response_format: "json" },
            { headers: { "privatemode-target-model": model } },
          )
          .withResponse();
        console.log(
          JSON.stringify({
            step: "transcription",
            file: basename(path),
            type,
            bytes: bytes.length,
            // What our relay would see; compare with voiceChunkLimit(units) in shared/voice.ts.
            encryptedBytes: encryptedSizes.at(-1),
            model,
            ms: Math.round(performance.now() - started),
            responseKeys: Object.keys(data as object),
            responseHeaders: [...response.headers.keys()],
            text: (data as { text?: unknown }).text,
          }),
        );
      } catch (error) {
        const { status, message } = error as { status?: unknown; message?: unknown };
        console.log(
          JSON.stringify({ step: "transcription", file: basename(path), type, model, failed: true, status, message }),
        );
      }
    }
  }
  console.log(JSON.stringify({ step: "done", verificationsMadeByThisScript: verifications }));
} finally {
  client.close();
}
