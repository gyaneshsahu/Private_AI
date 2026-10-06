import type { Attachment, Source } from "../shared/contracts";
import { z } from "zod";

const workerResult = z.union([
  z.object({ progress: z.string().min(1).max(200) }).strict(),
  z.object({ error: z.string().min(1).max(500) }).strict(),
  z
    .object({
      pages: z
        .array(
          z
            .object({
              text: z.string(),
              page: z.number().int().positive().optional(),
            })
            .strict(),
        )
        .max(20),
      warning: z.string().max(500).optional(),
    })
    .strict(),
]);
export async function extract(
  file: File,
  signal: AbortSignal,
  progress: (value: string) => void,
): Promise<Attachment> {
  if (signal.aborted) throw new Error("Extraction cancelled.");
  if (file.size > 10 * 1024 * 1024 || file.size === 0)
    throw new Error("Choose a nonempty document of at most 10 MB.");
  const worker = new Worker(
    new URL("./extraction.worker.ts", import.meta.url),
    { type: "module" },
  );
  return new Promise((resolve, reject) => {
    let settled = false;
    const deadline = setTimeout(() => {
      if (!finish()) return;
      reject(
        new Error(
          "Document processing took too long. Try a smaller file or a clearer screenshot.",
        ),
      );
    }, 90000);
    const finish = () => {
      if (settled) return false;
      settled = true;
      clearTimeout(deadline);
      signal.removeEventListener("abort", abort);
      worker.terminate();
      return true;
    };
    const abort = () => {
      if (!finish()) return;
      reject(new Error("Extraction cancelled."));
    };
    if (signal.aborted) {
      abort();
      return;
    }
    signal.addEventListener("abort", abort, { once: true });
    worker.onerror = () => {
      if (!finish()) return;
      reject(new Error("Document could not be processed locally."));
    };
    worker.onmessage = (event: MessageEvent<unknown>) => {
      if (settled) return;
      const parsed = workerResult.safeParse(event.data);
      if (!parsed.success) {
        if (finish())
          reject(
            new Error(
              "Document processing returned an invalid result. Try another file.",
            ),
          );
        return;
      }
      const data = parsed.data;
      if ("progress" in data) {
        progress(data.progress);
        return;
      }
      if (!finish()) return;
      if ("error" in data) {
        reject(new Error(data.error));
        return;
      }
      const sources: Source[] = data.pages.map((page) => ({
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
        warning: data.warning,
        kind: file.type.startsWith("image/") ? "screenshot" : "document",
      });
    };
    try {
      worker.postMessage(file);
    } catch {
      if (finish())
        reject(new Error("Document could not be processed locally."));
    }
  });
}
