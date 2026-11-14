// Live check for image questions (docs/images-20261114.md): sends one picture with a question
// through the Privatemode SDK, in the content-part format the app uses, and prints the reply, the
// usage and the time. It also asks the same question without the picture, so the difference in
// prompt tokens shows how a picture is counted. NOT run by the agent: it needs the owner's key and
// calls Privatemode. Key from Windows Credential Manager, never printed. Synthetic pictures only:
// never a real document, face or screenshot.
//
//   Invoke-WithPrivateAiSecret -Name PRIVATEMODE_API_KEY -Action {
//     npx tsx evaluation/privatemode/image-probe.ts
//   }
// With no file it makes a small PNG itself (a red square and a blue bar on white).
//   ... image-probe.ts german-text.jpg big-1568.jpg     (PNG or JPEG files, one request each)
//   ... --model glm-5.3-flash                           (default; glm-5.3 should be refused or blind)
//   ... --question "Welcher Text steht auf dem Bild?"
//
// Each call is billed as a chat request (owner's notes: EUR 0.20 in, 0.65 out per 1M tokens).
import { readFileSync } from "node:fs";
import { basename, extname } from "node:path";
import { deflateSync } from "node:zlib";
import { PrivatemodeAI } from "privatemode-ai";

const apiKey = process.env.PRIVATEMODE_API_KEY;
if (!apiKey) throw Error("PRIVATEMODE_API_KEY not loaded");
const flag = (name: string, fallback: string) => {
  const at = process.argv.indexOf(name);
  return at > 0 ? process.argv[at + 1] : fallback;
};
const model = flag("--model", "glm-5.3-flash");
const question = flag("--question", "Describe this picture in one sentence. Name the shapes and their colours.");
const files = process.argv.slice(2).filter((arg, i, all) => !arg.startsWith("--") && !all[i - 1]?.startsWith("--"));

/** A 256 x 160 PNG made here: white ground, a red square on the left, a blue bar on the right. */
function syntheticPng(): Buffer {
  const width = 256;
  const height = 160;
  const rows = Buffer.alloc(height * (1 + width * 3));
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const red = x >= 30 && x < 110 && y >= 40 && y < 120;
      const blue = x >= 150 && x < 230 && y >= 70 && y < 90;
      rows.set(red ? [220, 30, 30] : blue ? [30, 60, 200] : [255, 255, 255], y * (1 + width * 3) + 1 + x * 3);
    }
  const table = Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  const chunk = (type: string, data: Buffer) => {
    const body = Buffer.concat([Buffer.from(type, "latin1"), data]);
    let crc = 0xffffffff;
    for (const byte of body) crc = table[(crc ^ byte) & 255] ^ (crc >>> 8);
    const out = Buffer.alloc(body.length + 8);
    out.writeUInt32BE(data.length, 0);
    body.copy(out, 4);
    out.writeUInt32BE((crc ^ 0xffffffff) >>> 0, body.length + 4);
    return out;
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header.set([8, 2, 0, 0, 0], 8); // 8 bits, RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(rows)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const pictures = files.length
  ? files.map((path) => ({
      name: basename(path),
      type: /\.jpe?g$/i.test(extname(path)) ? "image/jpeg" : "image/png",
      bytes: readFileSync(path),
    }))
  : [{ name: "synthetic.png (made by this script)", type: "image/png", bytes: syntheticPng() }];

const client = new PrivatemodeAI({ apiKey, enableWasmLogging: false, openAIOptions: { maxRetries: 0 } });
try {
  await client.verify();
  await client.refreshSecret();
  const ask = async (step: string, content: unknown, extra: Record<string, unknown>) => {
    const started = performance.now();
    try {
      const chat = await client.chat.completions.create(
        { model, max_tokens: 300, messages: [{ role: "user", content }] } as never,
        { headers: { "privatemode-target-model": model } },
      );
      console.log(
        JSON.stringify({
          step,
          ...extra,
          model: chat.model,
          ms: Math.round(performance.now() - started),
          finish: chat.choices[0]?.finish_reason,
          reply: chat.choices[0]?.message?.content,
          usage: chat.usage,
        }),
      );
      return chat.usage?.prompt_tokens;
    } catch (error) {
      const { status, message } = error as { status?: unknown; message?: unknown };
      console.log(JSON.stringify({ step, ...extra, model, failed: true, status, message }));
      return undefined;
    }
  };
  // The baseline: the same question as plain text.
  const textTokens = await ask("text-only", question, {});
  for (const picture of pictures) {
    const url = `data:${picture.type};base64,${picture.bytes.toString("base64")}`;
    const tokens = await ask(
      "image",
      // The format the app sends (src/verified-chat.ts): one text part, one image part.
      [
        { type: "text", text: question },
        { type: "image_url", image_url: { url } },
      ],
      { file: picture.name, type: picture.type, bytes: picture.bytes.length, dataUrlCharacters: url.length },
    );
    if (tokens !== undefined && textTokens !== undefined)
      console.log(JSON.stringify({ step: "image-tokens", file: picture.name, promptTokensForThePicture: tokens - textTokens }));
  }
  console.log(JSON.stringify({ step: "done" }));
} finally {
  client.close();
}
