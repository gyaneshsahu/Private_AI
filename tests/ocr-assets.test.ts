// German and English OCR data come from our own server (owner decision of 14 November 2026):
// both files are copied from lockfile-installed packages, and the worker never names another host.
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { createWorker } from "tesseract.js";
import { expect, it } from "vitest";

const worker = readFileSync("src/extraction.worker.ts", "utf8");

it("copies the German and the English OCR data into the vendor folder", () => {
  execFileSync(process.execPath, ["scripts/assets.mjs"]);
  for (const lang of ["deu", "eng"]) {
    const copy = readFileSync(`public/vendor/ocr/${lang}.traineddata.gz`);
    expect(copy.equals(readFileSync(`node_modules/@tesseract.js-data/${lang}/4.0.0/${lang}.traineddata.gz`))).toBe(true);
    expect(gunzipSync(copy).length).toBeGreaterThan(10_000_000);
  }
  expect(statSync("public/vendor/ocr/worker.min.js").size).toBeGreaterThan(0);
  expect(readFileSync("public/vendor/ocr/LICENSE", "utf8")).toContain("Apache License");
});

it("points every OCR path at /vendor/ocr on our own origin and names no other host", () => {
  expect(worker).toMatch(/createWorker\(\["deu", "eng"\], 1, \{/);
  for (const key of ["workerPath", "corePath", "langPath"])
    expect(worker).toMatch(new RegExp(`${key}: "/vendor/ocr(/worker\\.min\\.js)?"`));
  // Without workerBlobURL: false the worker script would be wrapped in a blob that imports by URL.
  expect(worker).toContain("workerBlobURL: false");
  expect(worker).not.toMatch(/https?:|cdn|jsdelivr|unpkg|projectnaptha/i);
});

// Owner decision of 14 November 2026: the browser keeps the language data after the first run.
it("keeps the language data in the browser under a name that carries the data version", () => {
  const versions = ["deu", "eng"].map(
    (lang) => JSON.parse(readFileSync(`node_modules/@tesseract.js-data/${lang}/package.json`, "utf8")).version,
  );
  expect(new Set(versions).size).toBe(1);
  // The folder scripts/assets.mjs copies from; a new package or folder needs a new name here.
  const folder = /@tesseract\.js-data\/\$\{lang\}\/([\d.]+)\//.exec(readFileSync("scripts/assets.mjs", "utf8"))![1];
  expect(worker).toContain(`const OCR_CACHE = "ocr-data-${versions[0]}-${folder}";`);
  expect(worker).toContain("cachePath: OCR_CACHE,");
  // The engine's own cache is on (its default), never switched off again.
  expect(worker).not.toMatch(/cacheMethod: "(none|readOnly)"/);
  // A failed start is tried once more with a fresh download that skips the kept copy.
  expect(worker).toContain('start().catch(() => start("refresh"))');
  // The engine reads the copy inside a try and downloads when that fails (blocked storage, a
  // private window), a failed write is only logged, and a copy it cannot start with is deleted.
  const engine = readFileSync("node_modules/tesseract.js/src/worker-script/index.js", "utf8");
  expect(engine).toMatch(/try \{\s+const _data = await readCache\(`\$\{cachePath \|\| '\.'\}\/\$\{lang\}\.traineddata`\);/);
  expect(engine).toMatch(/try \{\s+await adapter\.writeCache\(`\$\{cachePath \|\| '\.'\}\/\$\{lang\}\.traineddata`, data\);\s+\} catch/);
  expect(engine).toContain("adapter.deleteCache(`${loadLanguageOptionsWorker.cachePath || '.'}/${lang}.traineddata`)");
});

it("keeps the OCR data out of the page: only the extraction worker names the OCR folder", () => {
  expect(readFileSync("index.html", "utf8")).not.toMatch(/vendor\/ocr|traineddata/);
  const naming = (readdirSync("src", { recursive: true }) as string[])
    .filter((file) => /\.tsx?$/.test(file) && /vendor\/ocr|traineddata/.test(readFileSync(`src/${file}`, "utf8")));
  expect(naming).toEqual(["extraction.worker.ts"]);
});

it("reads German umlauts, ß and the euro sign from a printed line with the vendor copy", async () => {
  const ocr = await createWorker(["deu", "eng"], 1, { langPath: "public/vendor/ocr", cacheMethod: "none" });
  try {
    const { data } = await ocr.recognize(readFileSync("tests/fixtures/ocr-umlaut.png"));
    expect(data.text.trim()).toBe("Größe Müllerstraße Gebühr 12,50 €");
  } finally {
    await ocr.terminate();
  }
}, 60_000);
