import type { Attachment } from "../shared/contracts";
import { extract } from "./documents";

export type ImportOutcome = {
  name: string;
  status: "queued" | "reading" | "added" | "failed" | "cancelled";
  detail?: string;
};

export async function importDocuments(
  files: readonly File[],
  signal: AbortSignal,
  callbacks: {
    update: (outcomes: ImportOutcome[]) => void;
    added: (attachment: Attachment) => void;
    progress: (message: string) => void;
  },
  read: typeof extract = extract,
): Promise<void> {
  const outcomes: ImportOutcome[] = files.map((file) => ({
    name: file.name,
    status: "queued",
  }));
  const publish = () =>
    callbacks.update(outcomes.map((outcome) => ({ ...outcome })));
  publish();
  for (let index = 0; index < files.length; index++) {
    if (signal.aborted) break;
    outcomes[index].status = "reading";
    publish();
    try {
      const attachment = await read(files[index], signal, callbacks.progress);
      if (signal.aborted) break;
      callbacks.added(attachment);
      outcomes[index].status = "added";
    } catch (error) {
      if (signal.aborted) break;
      outcomes[index].status = "failed";
      outcomes[index].detail =
        error instanceof Error ? error.message : "Extraction failed.";
    }
    publish();
  }
  if (signal.aborted) {
    for (const outcome of outcomes)
      if (outcome.status === "queued" || outcome.status === "reading")
        outcome.status = "cancelled";
    publish();
  }
}
