// FE-06 (owner, 16 November): web searches do not count toward the file limit. A chat holds at most
// FILE_LIMIT files (SCREENSHOT_LIMIT of them pictures) and keeps its newest RESEARCH_KEEP searches:
// a new search replaces the oldest one. Old answers keep their own source snapshots.
import type { Attachment } from "../shared/contracts";

export const FILE_LIMIT = 5;
export const SCREENSHOT_LIMIT = 3;
export const RESEARCH_KEEP = 5;

const isResearch = (a: Attachment) => a.kind === "research";

/** Files and screenshots in the chat; searches and opened pages are not counted. */
export const fileCount = (attachments: readonly Attachment[]) => attachments.filter((a) => !isResearch(a)).length;
export const screenshotCount = (attachments: readonly Attachment[]) => attachments.filter((a) => a.kind === "screenshot").length;

/** The attachments with a new search or page added; at RESEARCH_KEEP searches the oldest search goes. */
export function withResearch(attachments: readonly Attachment[], added: Attachment): Attachment[] {
  // Only searches are replaced: a page the user opened is their own and is kept (and saved).
  const research = attachments.filter((a) => a.researchQuery !== undefined);
  const oldest = added.researchQuery !== undefined && research.length >= RESEARCH_KEEP ? research[0] : undefined;
  return [...attachments.filter((a) => a !== oldest), added];
}
