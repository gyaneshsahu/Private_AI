import type { Attachment, Source } from "../shared/contracts";
export async function extract(
  file: File,
  signal: AbortSignal,
  progress: (value: string) => void,
): Promise<Attachment> {
  if (file.size > 10 * 1024 * 1024 || file.size === 0)
    throw new Error("Choose a nonempty document of at most 10 MB.");
  const worker = new Worker(
    new URL("./extraction.worker.ts", import.meta.url),
    { type: "module" },
  );
  return new Promise((resolve, reject) => {
    const finish = () => {
      signal.removeEventListener("abort", abort);
      worker.terminate();
    };
    const abort = () => {
      finish();
      reject(new Error("Extraction cancelled."));
    };
    if (signal.aborted) {
      abort();
      return;
    }
    signal.addEventListener("abort", abort, { once: true });
    worker.onerror = () => {
      finish();
      reject(new Error("Document could not be processed locally."));
    };
    worker.onmessage = (
      event: MessageEvent<{
        progress?: string;
        error?: string;
        pages?: Array<{ text: string; page?: number }>;
        warning?: string;
      }>,
    ) => {
      if (!event.data.progress && !event.data.error && !event.data.pages)
        return;
      if (event.data.progress) {
        progress(event.data.progress);
        return;
      }
      finish();
      if (event.data.error) {
        reject(new Error(event.data.error));
        return;
      }
      const sources: Source[] = (event.data.pages ?? []).map((page) => ({
        ...page,
        id: crypto.randomUUID().slice(0, 8),
        title: file.name,
      }));
      if (!sources.length || sources.every((s) => !s.text.trim())) {
        reject(
          new Error(
            "No readable text found. Scanned PDFs and handwriting are not supported; try a clear screenshot.",
          ),
        );
        return;
      }
      if (sources.reduce((n, s) => n + s.text.length, 0) > 60000) {
        reject(
          new Error(
            "Extracted text exceeds 60,000 characters. Choose a smaller document.",
          ),
        );
        return;
      }
      resolve({
        id: crypto.randomUUID(),
        name: file.name,
        selected: true,
        sources,
        warning: event.data.warning,
        kind: file.type.startsWith("image/") ? "screenshot" : "document",
      });
    };
    worker.postMessage(file);
  });
}
