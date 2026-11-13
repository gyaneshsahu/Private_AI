import { documentText } from "./text/documents";
export const MAX_DOCUMENT_CHARACTERS = 60000;
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
  if (text.length + previousLength > MAX_DOCUMENT_CHARACTERS)
    throw new Error(
      documentText.en.tooMuchText,
    );
}

export function decodeTextDocument(bytes: Uint8Array): string {
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
  checkTextSize(text);
  return text;
}
