// A report (docs/report-card-20261125.md): what the chat's card shows of a long answer that opens
// in the side panel. Everything is read from the report's own text: no second request to the model.

/** Markdown marks and source codes taken out of one line of prose. */
const plain = (line: string) =>
  line
    .replace(/[\[【][^\]】\n]{1,120}[\]】]/g, "") // [source-id], [id, page 3]
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[*_`~]+/g, "")
    .replace(/\s+([.,;:!?])/g, "$1")
    .replace(/\s{2,}/g, " ")
    .trim();

/** Lines outside code fences. */
function proseLines(text: string): string[] {
  let fenced = false;
  return text.split("\n").filter((line) => {
    if (/^ {0,3}(`{3,}|~{3,})/.test(line)) {
      fenced = !fenced;
      return false;
    }
    return !fenced;
  });
}

/** The report's own first heading, or the question it answers. */
export function reportTitle(text: string, question: string): string {
  const heading = proseLines(text).find((line) => /^#{1,2}\s+\S/.test(line));
  const title = plain((heading ?? question).replace(/^#+\s+/, "")) || plain(question);
  return title.length > 90 ? `${title.slice(0, 87).trimEnd()}…` : title;
}

/** The first paragraph of running text, cut at a sentence end near 320 characters. */
export function reportSummary(text: string): string {
  const paragraph = proseLines(text)
    .map((line) => line.trim())
    .find((line) => line.length > 40 && !/^(#|[-*+]\s|\d+[.)]\s|>|\||[-=_*]{3,}$)/.test(line));
  const prose = plain(paragraph ?? "");
  if (prose.length <= 320) return prose;
  const cut = prose.slice(0, 320);
  const end = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("! "), cut.lastIndexOf("? "));
  return end > 120 ? cut.slice(0, end + 1) : `${cut.slice(0, cut.lastIndexOf(" ")).trimEnd()}…`;
}

/** The report's sections: its second-level headings (first-level ones when it has no others), at most eight. */
export function reportSections(text: string): string[] {
  const lines = proseLines(text);
  const level = lines.some((line) => /^##\s+\S/.test(line)) ? "##" : "#";
  return lines
    .filter((line) => line.startsWith(`${level} `))
    .map((line) => plain(line.slice(level.length)))
    .filter(Boolean)
    .slice(0, 8);
}

/** Reading time at about 220 words a minute, never under one minute. */
export const readMinutes = (text: string) => Math.max(1, Math.round(text.trim().split(/\s+/).length / 220));
