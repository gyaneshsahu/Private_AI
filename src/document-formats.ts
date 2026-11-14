import { documentText, overLimitText, type OverLimitDetail } from "./text/documents";
export const MAX_DOCUMENT_CHARACTERS = 60000;
/**
 * Large documents (docs/large-documents-20261114.md): a PDF, Word or plain-text file with more
 * text than MAX_DOCUMENT_CHARACTERS is kept on the device in passages, and only the passages that
 * match a question are sent. Set to false to refuse such files as before (and 20 PDF pages).
 */
export const LARGE_DOCUMENTS: boolean = true;
export const MAX_LARGE_DOCUMENT_CHARACTERS = 500000;
export const MAX_PDF_PAGES = LARGE_DOCUMENTS ? 150 : 20;
// A reader over its limit keeps counting, without keeping text, so the refusal can say how far
// over the file is. It stops here, so a file built to expand cannot make it count forever.
export const COUNT_STOP = 3000000;
/** Spreadsheets, data and code are not prose: passage search fits them badly, so they keep the small limit. */
export function characterLimit(name: string): number {
  return LARGE_DOCUMENTS && /\.(pdf|docx|txt|md|markdown)$/i.test(name)
    ? MAX_LARGE_DOCUMENT_CHARACTERS
    : MAX_DOCUMENT_CHARACTERS;
}
export class OverLimit extends Error {
  constructor(readonly over: OverLimitDetail) {
    super(overLimitText(over, "", "en"));
  }
}
/** Collects extracted text up to `limit`; beyond it only the length, up to COUNT_STOP. */
export function textCollector(limit = MAX_DOCUMENT_CHARACTERS) {
  let text = "",
    length = 0;
  return {
    add(value: string) {
      length += value.length;
      if (length <= limit) text += value;
      else if (length > COUNT_STOP)
        throw new OverLimit({ characters: COUNT_STOP, limit, more: true });
    },
    get length() {
      return length;
    },
    /** The whole text, or the refusal with the real count. Never a shortened text. */
    text() {
      if (length > limit) throw new OverLimit({ characters: length, limit });
      return text;
    },
  };
}
export const TEXT_EXTENSIONS = [
  "txt",
  "md",
  "markdown",
  "csv",
  "tsv",
  "json",
  "jsonl",
  "yaml",
  "yml",
  "js",
  "jsx",
  "ts",
  "tsx",
  "py",
  "java",
  "c",
  "h",
  "cpp",
  "hpp",
  "cs",
  "go",
  "rs",
  "rb",
  "php",
  "swift",
  "kt",
  "sql",
  "css",
  "sh",
  "ps1",
] as const;
export const DOCUMENT_ACCEPT = [
  "pdf",
  "docx",
  "xlsx",
  "png",
  "jpg",
  "jpeg",
  ...TEXT_EXTENSIONS,
]
  .map((extension) => `.${extension}`)
  .join(",");

export function isTextDocument(name: string): boolean {
  const extension = name.split(".").pop()?.toLowerCase();
  return TEXT_EXTENSIONS.some((supported) => supported === extension);
}

export function checkTextSize(text: string, previousLength = 0): void {
  // Callers stop at the first text over the limit, so the file has at least this much.
  if (text.length + previousLength > MAX_DOCUMENT_CHARACTERS)
    throw new OverLimit({
      characters: text.length + previousLength,
      limit: MAX_DOCUMENT_CHARACTERS,
      more: true,
    });
}

export function decodeTextDocument(
  bytes: Uint8Array,
  limit = MAX_DOCUMENT_CHARACTERS,
): string {
  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new Error(
      documentText.en.notUtf8,
    );
  }
  if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/u.test(text))
    throw new Error(documentText.en.notPlain);
  if (text.length > limit)
    throw new OverLimit({ characters: text.length, limit });
  return text;
}
