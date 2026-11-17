// Free, local check: does the app's on-device OCR (tesseract.js, the photo-to-text engine) read
// the handwriting on the synthetic whiteboards? No network: the language data comes from
// public/vendor/ocr. Prints the text and the confidence per sample.
//
//   node evaluation/whiteboard/ocr-check.mjs
import { readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createWorker } from "tesseract.js";

const dir = fileURLToPath(new URL("./samples/", import.meta.url));
const worker = await createWorker("eng", 1, {
  langPath: fileURLToPath(new URL("../../public/vendor/ocr/", import.meta.url)),
  cacheMethod: "none",
});
for (const file of readdirSync(dir).filter((f) => f.endsWith(".png")).sort()) {
  const started = performance.now();
  const { data } = await worker.recognize(dir + file);
  console.log(JSON.stringify({ file, ms: Math.round(performance.now() - started), confidence: Math.round(data.confidence), text: data.text.replace(/\s+/g, " ").trim() }));
}
await worker.terminate();
