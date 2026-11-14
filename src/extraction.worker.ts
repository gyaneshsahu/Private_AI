/// <reference lib="webworker" />
import { documentText } from "./text/documents";
import { getDocument, PDFWorker } from "pdfjs-dist";
import { createWorker } from "tesseract.js";
import { extractDocx, DOCX_WARNING } from "./docx";
import { extractXlsx } from "./xlsx";
import {
  characterLimit,
  checkTextSize,
  COUNT_STOP,
  decodeTextDocument,
  isTextDocument,
  MAX_PDF_PAGES,
  OverLimit,
} from "./document-formats";
const MAX_OCR_PDF_PAGES = 5;
// pdfjs asks for scratch canvases while it draws; a worker has no document to create them with.
class WorkerCanvasFactory {
  create(width: number, height: number) {
    const canvas = new OffscreenCanvas(width, height);
    return { canvas, context: canvas.getContext("2d") };
  }
  reset(target: { canvas: OffscreenCanvas }, width: number, height: number) {
    target.canvas.width = width;
    target.canvas.height = height;
  }
  destroy(target: { canvas: OffscreenCanvas | null; context: unknown }) {
    if (target.canvas) target.canvas.width = target.canvas.height = 0;
    target.canvas = target.context = null;
  }
}
// The engine keeps the unpacked language data in this browser's IndexedDB (database
// "keyval-store") under this name, so later runs do not download it again. Public data only.
// The name carries the data version: tests/ocr-assets.test.ts fails until it is changed when the
// data packages change, so an old copy is never read for new data.
// shortcut: an old copy stays in the browser after such a change; delete the old keys then.
const OCR_CACHE = "ocr-data-1.0.0-4.0.0";
const ocrWorker = (progress?: (percent: number) => void) => {
  // German first, English second; both files come from /vendor/ocr on our own server.
  const start = (cacheMethod?: "refresh") =>
    createWorker(["deu", "eng"], 1, {
      workerPath: "/vendor/ocr/worker.min.js",
      corePath: "/vendor/ocr",
      langPath: "/vendor/ocr",
      cachePath: OCR_CACHE,
      cacheMethod,
      workerBlobURL: false,
      logger: (info) => progress?.(Math.round(info.progress * 100)),
    });
  // Blocked storage (a private window) is handled by the engine: it downloads instead. If the
  // start still fails, for example on a damaged kept copy, try once more with a fresh download.
  return start().catch(() => start("refresh"));
};
/**
 * Suggested cover-up boxes for a picture (src/image-upload.ts): the same on-device OCR, but the
 * words come back with their places. Only the words leave this worker, and only to the page.
 */
async function ocrWords(image: Blob) {
  const worker = await ocrWorker((percent) => self.postMessage({ percent }));
  try {
    const { data } = await worker.recognize(image, {}, { blocks: true });
    let line = 0;
    const words = (data.blocks ?? []).flatMap((block) =>
      block.paragraphs.flatMap((paragraph) =>
        paragraph.lines.flatMap((entry) => {
          line++;
          return entry.words.map((word) => ({ text: word.text, line, ...word.bbox }));
        }),
      ),
    );
    self.postMessage({ words });
  } catch {
    self.postMessage({ error: true });
  } finally {
    await worker.terminate();
  }
}
self.onmessage = async (event: MessageEvent<File | { ocrWords: Blob }>) => {
  if ("ocrWords" in event.data) return ocrWords(event.data.ocrWords);
  const file = event.data;
  const limit = characterLimit(file.name);
  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const magic = new TextDecoder().decode(bytes.slice(0, 5));
    if (/\.(doc|xls)$/i.test(file.name))
      throw new Error(documentText.en.legacy);
    if (/\.xlsx$/i.test(file.name)) {
      self.postMessage({ progress: documentText.en.readingSheet });
      self.postMessage({
        pages: [{ text: await extractXlsx(bytes) }],
        warning: documentText.en.xlsxWarning,
      });
    } else if (/\.docx$/i.test(file.name)) {
      self.postMessage({ progress: documentText.en.readingWord });
      self.postMessage({
        pages: [{ text: await extractDocx(bytes, limit) }],
        warning: DOCX_WARNING,
      });
    } else if (magic === "%PDF-") {
      const port = new Worker(
        new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url),
        { type: "module" },
      );
      const pdfWorker = PDFWorker.create({ port, verbosity: 0 });
      const task = getDocument({
        data: bytes,
        worker: pdfWorker,
        verbosity: 0,
        useSystemFonts: false,
        disableFontFace: true,
        useWorkerFetch: false,
        CanvasFactory: WorkerCanvasFactory,
        stopAtErrors: true,
      });
      try {
        const pdf = await task.promise;
        if (pdf.numPages > MAX_PDF_PAGES)
          throw new OverLimit({ pages: pdf.numPages, limit: MAX_PDF_PAGES });
        let pages = [];
        let extractedLength = 0;
        for (let number = 1; number <= pdf.numPages; number++) {
          self.postMessage({
            progress: documentText.en.readingPage(number, pdf.numPages),
          });
          const page = await pdf.getPage(number);
          const content = await page.getTextContent();
          page.cleanup();
          const text = content.items
            .map((item) =>
              "str" in item ? item.str + (item.hasEOL ? "\n" : " ") : "",
            )
            .join("")
            .trim();
          extractedLength += text.length;
          if (extractedLength > COUNT_STOP)
            throw new OverLimit({ characters: COUNT_STOP, limit, more: true });
          // Over the limit: the remaining pages are only counted, their text is not kept.
          pages.push({ page: number, text: extractedLength > limit ? "" : text });
        }
        if (extractedLength > limit)
          throw new OverLimit({ characters: extractedLength, limit });
        let warning = documentText.en.pdfWarning;
        if (pages.every((page) => !page.text)) {
          // A scan: no text layer on any page. Draw the first pages and read them like a screenshot.
          // shortcut: scans stored as JBIG2 or JPEG 2000 need pdfjs's wasm decoders, which are not
          // served; such a file ends in the "no readable text" refusal. Serve
          // node_modules/pdfjs-dist/wasm and set wasmUrl if invitees hit this.
          pages = pages.slice(0, MAX_OCR_PDF_PAGES);
          const ocr = await ocrWorker();
          try {
            for (const entry of pages) {
              self.postMessage({
                progress: documentText.en.readingScan(entry.page, pages.length),
              });
              const page = await pdf.getPage(entry.page);
              const size = page.getViewport({ scale: 1 });
              // About 216 dots per inch for A4, never more than 6 megapixels a page.
              const viewport = page.getViewport({
                scale: Math.min(3, Math.sqrt(6000000 / (size.width * size.height))),
              });
              const canvas = new OffscreenCanvas(
                Math.ceil(viewport.width),
                Math.ceil(viewport.height),
              );
              let image: Blob;
              try {
                await page.render({
                  canvas: null,
                  canvasContext: canvas.getContext(
                    "2d",
                  ) as unknown as CanvasRenderingContext2D,
                  viewport,
                  background: "#fff",
                }).promise;
                image = await canvas.convertToBlob();
              } catch {
                throw new Error(documentText.en.noText);
              }
              entry.text = (await ocr.recognize(image)).data.text.trim();
              checkTextSize(entry.text, extractedLength);
              extractedLength += entry.text.length;
              page.cleanup();
            }
          } finally {
            await ocr.terminate();
          }
          warning = documentText.en.pdfOcrWarning(pages.length, pdf.numPages);
        }
        self.postMessage({ pages, warning });
      } finally {
        await task.destroy();
        pdfWorker.destroy();
        port.terminate();
      }
    } else if (file.type === "image/png" || file.type === "image/jpeg") {
      const bitmap = await createImageBitmap(file);
      if (bitmap.width * bitmap.height > 12000000) {
        bitmap.close();
        throw new Error(
          documentText.en.screenshotTooLarge,
        );
      }
      bitmap.close();
      const worker = await ocrWorker((percent) =>
        self.postMessage({
          progress: documentText.en.readingScreenshot(percent),
        }),
      );
      try {
        const { data } = await worker.recognize(file);
        checkTextSize(data.text);
        self.postMessage({
          pages: [{ page: 1, text: data.text }],
          warning: documentText.en.ocrWarning(Math.round(data.confidence)),
        });
      } finally {
        await worker.terminate();
      }
    } else if (isTextDocument(file.name)) {
      const text = decodeTextDocument(bytes, limit);
      self.postMessage({
        pages: [{ text }],
        warning:
          documentText.en.textOnly,
      });
    } else
      throw new Error(
        documentText.en.formats,
      );
  } catch (error) {
    if (error instanceof OverLimit) {
      self.postMessage({ over: error.over });
      return;
    }
    self.postMessage({
      error:
        error instanceof Error &&
        /limit|exceeds|not plain|not UTF-8|Supported formats|DOCX|XLSX|\.xlsx|No readable text/.test(
          error.message,
        )
          ? error.message
          : documentText.en.extractionFailed,
    });
  }
};
