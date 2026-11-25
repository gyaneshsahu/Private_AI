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

/** The beginning of the report for the card's preview: whole lines, about 1,600 characters, never ending inside a code block. */
export function reportPreview(full: string): string {
  // Source codes are left out: the preview is a picture of the text, and its sources open in the report.
  const text = full.replace(/[ \t]*[\[【][a-zA-Z0-9-]{6,36}(?:[,†][^\]】\n]{0,90})?[\]】]/g, "");
  if (text.length <= 1600) return text;
  const cut = text.slice(0, 1600);
  const whole = cut.slice(0, Math.max(cut.lastIndexOf("\n"), 1));
  return (whole.match(/^ {0,3}(`{3,}|~{3,})/gm) ?? []).length % 2 ? whole.slice(0, whole.lastIndexOf("```")) : whole;
}

/** Saves the report as a Markdown file named after its title. */
export function downloadReport(title: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/markdown;charset=utf-8" }));
  const name = title.replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "").slice(0, 60) || "report";
  Object.assign(document.createElement("a"), { href: url, download: `${name}.md` }).click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Reading time at about 220 words a minute, never under one minute. */
export const readMinutes = (text: string) => Math.max(1, Math.round(text.trim().split(/\s+/).length / 220));
