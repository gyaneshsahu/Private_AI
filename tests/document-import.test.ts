import { expect, it, vi } from "vitest";
import { importDocuments, type ImportOutcome } from "../src/document-import";
import type { Attachment } from "../shared/contracts";

const files = ["first.txt", "broken.txt", "last.txt"].map(
  (name) => new File(["synthetic"], name),
);
const attachment = (name: string): Attachment => ({
  id: name,
  name,
  selected: true,
  kind: "document",
  sources: [],
});
it("preserves successful files, reports failures, and reads each independent file once", async () => {
  let outcomes: ImportOutcome[] = [];
  const added = vi.fn();
  const read = vi.fn(async (file: File) => {
    if (file.name === "broken.txt") throw new Error("Malformed file");
    return attachment(file.name);
  });
  await importDocuments(
    files,
    new AbortController().signal,
    {
      added,
      progress: vi.fn(),
      update: (next) => {
        outcomes = next;
      },
    },
    read,
  );
  expect(outcomes.map((item) => item.status)).toEqual([
    "added",
    "failed",
    "added",
  ]);
  expect(outcomes[1].detail).toBe("Malformed file");
  expect(added.mock.calls.map(([item]) => item.name)).toEqual([
    "first.txt",
    "last.txt",
  ]);
  expect(read).toHaveBeenCalledTimes(3);
});
it("stops queued files and discards late completed work after cancellation", async () => {
  const controller = new AbortController();
  let outcomes: ImportOutcome[] = [];
  const added = vi.fn();
  const read = vi.fn(async (file: File) => {
    if (file.name === "broken.txt") controller.abort();
    return attachment(file.name);
  });
  await importDocuments(
    files,
    controller.signal,
    {
      added,
      progress: vi.fn(),
      update: (next) => {
        outcomes = next;
      },
    },
    read,
  );
  expect(outcomes.map((item) => item.status)).toEqual([
    "added",
    "cancelled",
    "cancelled",
  ]);
  expect(added).toHaveBeenCalledTimes(1);
  expect(read).toHaveBeenCalledTimes(2);
});
