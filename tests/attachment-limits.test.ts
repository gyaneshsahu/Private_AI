import { expect, it } from "vitest";
import type { Attachment } from "../shared/contracts";
import { fileCount, RESEARCH_KEEP, withResearch } from "../src/attachment-limits";

const file = (id: string): Attachment => ({ id, name: id, selected: true, kind: "document", sources: [] });
const search = (id: string): Attachment => ({ id, name: id, selected: true, kind: "research", researchQuery: id, sources: [] });

it("searches do not count as files, and a new search replaces the oldest one (FE-06)", () => {
  const files = ["f1", "f2", "f3", "f4", "f5"].map(file);
  const searches = Array.from({ length: RESEARCH_KEEP }, (_, i) => search(`s${i}`));
  const list = [files[0], ...searches.slice(0, 2), ...files.slice(1), ...searches.slice(2)];
  expect(fileCount(list)).toBe(5);
  const next = withResearch(list, search("new"));
  expect(next.map((a) => a.id)).toEqual(["f1", "s1", "f2", "f3", "f4", "f5", "s2", "s3", "s4", "new"]);
  expect(fileCount(next)).toBe(5);
  // Below the limit nothing goes.
  expect(withResearch(files, search("new")).map((a) => a.id)).toEqual(["f1", "f2", "f3", "f4", "f5", "new"]);
});
