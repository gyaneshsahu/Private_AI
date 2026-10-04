/// <reference lib="webworker" />
import { getDocument, PDFWorker } from "pdfjs-dist";
import { createWorker } from "tesseract.js";
self.onmessage = async (event: MessageEvent<File>) => {
  const file = event.data;
  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const magic = new TextDecoder().decode(bytes.slice(0, 5));
    if (magic === "%PDF-") {
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
        stopAtErrors: true,
      });
      try {
        const pdf = await task.promise;
        if (pdf.numPages > 20)
          throw new Error("PDF exceeds the 20-page limit.");
        const pages = [];
        for (let number = 1; number <= pdf.numPages; number++) {
          self.postMessage({
            progress: `Reading page ${number} of ${pdf.numPages} locally…`,
          });
          const content = await (await pdf.getPage(number)).getTextContent();
          pages.push({
            page: number,
            text: content.items
              .map((item) =>
                "str" in item ? item.str + (item.hasEOL ? "\n" : " ") : "",
              )
              .join("")
              .trim(),
          });
        }
        self.postMessage({
          pages,
          warning:
            "Review extracted numbers and table relationships. PDF reading order may differ from the visual layout.",
        });
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
          "Screenshot exceeds 12 megapixels. Resize it before importing.",
        );
      }
      bitmap.close();
      const worker = await createWorker("eng", 1, {
        workerPath: "/vendor/ocr/worker.min.js",
        corePath: "/vendor/ocr",
        langPath: "/vendor/ocr",
        cacheMethod: "none",
        workerBlobURL: false,
        logger: (info) =>
          self.postMessage({
            progress: `Reading screenshot locally: ${Math.round(info.progress * 100)}%`,
          }),
      });
      try {
        const { data } = await worker.recognize(file);
        self.postMessage({
          pages: [{ page: 1, text: data.text }],
          warning: `OCR is imperfect (reported confidence ${Math.round(data.confidence)}%). Check names, amounts and dates before using this text.`,
        });
      } finally {
        await worker.terminate();
      }
    } else if (file.type === "text/plain" || /\.txt$/i.test(file.name)) {
      const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
      if (text.includes("\0")) throw new Error("This file is not plain text.");
      self.postMessage({ pages: [{ text }] });
    } else
      throw new Error(
        "Supported formats: text PDFs, UTF-8 .txt, PNG and JPEG screenshots.",
      );
  } catch (error) {
    self.postMessage({
      error:
        error instanceof Error &&
        /limit|exceeds|not plain|Supported formats/.test(error.message)
          ? error.message
          : "Extraction failed. The file may be encrypted, malformed, unsupported or unreadable.",
    });
  }
};
