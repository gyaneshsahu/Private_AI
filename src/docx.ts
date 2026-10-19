import { Uint8ArrayReader, ZipReader, type FileEntry } from "@zip.js/zip.js";
import { SaxesParser } from "saxes";
import { checkTextSize } from "./document-formats";

const MAX_PART_BYTES = 4 * 1024 * 1024;
const MAX_EXPANDED_BYTES = 20 * 1024 * 1024;
const wordNamespaces = new Set([
  "http://schemas.openxmlformats.org/wordprocessingml/2006/main",
  "http://purl.oclc.org/ooxml/wordprocessingml/main",
]);
const unsupported = new Set([
  "ins",
  "del",
  "moveFrom",
  "moveTo",
  "altChunk",
  "object",
  "fldChar",
  "fldSimple",
  "instrText",
  "txbxContent",
]);

export function docxBodyText(xml: string): string {
  const parser = new SaxesParser({ xmlns: true });
  let text = "",
    depth = 0,
    bodyDepth = 0,
    textDepth = 0,
    cells = 0;
  let root = false,
    body = false;
  const append = (value: string) => {
    checkTextSize(value, text.length);
    text += value;
  };
  parser.on("doctype", () => {
    throw Error("DOCX does not support DTD declarations.");
  });
  parser.on("opentag", (tag) => {
    if (++depth > 128) throw Error("DOCX XML exceeds the nesting limit.");
    const word = wordNamespaces.has(tag.uri);
    if (depth === 1) {
      if (!word || tag.local !== "document")
        throw Error("Invalid DOCX document root.");
      root = true;
    }
    if (word && unsupported.has(tag.local))
      throw Error(
        "DOCX contains revisions, fields or embedded content that is not supported. Accept revisions and export a text PDF first.",
      );
    if (word && tag.local === "body") {
      if (body || depth !== 2) throw Error("Invalid DOCX body.");
      body = true;
      bodyDepth = depth;
    }
    if (!bodyDepth) return;
    if (word && tag.local === "tc") cells++;
    if (word && tag.local === "t") textDepth = depth;
    if (word && tag.local === "tab") append("\t");
    if (word && (tag.local === "br" || tag.local === "cr")) append("\n");
  });
  parser.on("text", (value) => {
    if (textDepth && bodyDepth) append(value);
  });
  parser.on("cdata", (value) => {
    if (textDepth && bodyDepth) append(value);
  });
  parser.on("closetag", (tag) => {
    const word = wordNamespaces.has(tag.uri);
    if (bodyDepth && word) {
      if (tag.local === "p") append(cells ? " " : "\n");
      if (tag.local === "tc") {
        append("\t");
        cells--;
      }
      if (tag.local === "tr") append("\n");
    }
    if (depth === textDepth) textDepth = 0;
    if (depth === bodyDepth) bodyDepth = 0;
    depth--;
  });
  parser.write(xml).close();
  if (!root || !body || !text.trim())
    throw Error("DOCX has no supported readable body text.");
  return text.trim();
}

async function readPart(entry: FileEntry): Promise<string> {
  if (entry.uncompressedSize > MAX_PART_BYTES)
    throw Error("DOCX part exceeds the 4 MB limit.");
  let size = 0;
  const chunks: Uint8Array[] = [];
  await entry.getData(
    new WritableStream<Uint8Array>({
      write(chunk) {
        size += chunk.byteLength;
        if (size > MAX_PART_BYTES)
          throw Error("DOCX expanded part exceeds the 4 MB limit.");
        chunks.push(chunk.slice());
      },
    }),
  );
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
}

export async function extractDocx(bytes: Uint8Array): Promise<string> {
  if (!bytes.length || bytes.length > 10 * 1024 * 1024)
    throw Error("DOCX exceeds the 10 MB limit.");
  const reader = new ZipReader(new Uint8ArrayReader(bytes), {
    useWebWorkers: false,
    strictness: "strict",
    checkCrc32: true,
    checkOverlappingEntry: true,
  });
  try {
    const parts = new Map<string, FileEntry>();
    let count = 0,
      expanded = 0;
    for await (const entry of reader.getEntriesGenerator()) {
      if (++count > 512) throw Error("DOCX exceeds the 512-entry limit.");
      expanded += entry.uncompressedSize;
      if (!Number.isSafeInteger(expanded) || expanded > MAX_EXPANDED_BYTES)
        throw Error("DOCX exceeds the 20 MB expanded-size limit.");
      if (entry.encrypted || /(?:^|\/)\.\.(?:\/|$)|\\|^\//.test(entry.filename))
        throw Error("Unsupported DOCX archive.");
      if (/vbaProject|word\/embeddings\//i.test(entry.filename))
        throw Error("DOCX macros and embedded files are not supported.");
      if (!entry.directory) {
        if (parts.has(entry.filename)) throw Error("Ambiguous DOCX archive.");
        parts.set(entry.filename, entry);
      }
    }
    const types = parts.get("[Content_Types].xml"),
      document = parts.get("word/document.xml");
    if (!types || !document) throw Error("Invalid DOCX package.");
    let valid = false;
    const parser = new SaxesParser({ xmlns: true });
    parser.on("doctype", () => {
      throw Error("Unsupported DOCX declaration.");
    });
    parser.on("opentag", (tag) => {
      if (
        tag.uri ===
          "http://schemas.openxmlformats.org/package/2006/content-types" &&
        tag.local === "Override"
      ) {
        const values = Object.values(tag.attributes);
        const part = values.find((a) => a.name === "PartName")?.value;
        const type = values.find((a) => a.name === "ContentType")?.value;
        if (
          part === "/word/document.xml" &&
          type ===
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"
        )
          valid = true;
        if (type?.toLowerCase().includes("macroenabled"))
          throw Error("DOCX macros are not supported.");
      }
    });
    parser.write(await readPart(types)).close();
    if (!valid) throw Error("Unsupported DOCX content type.");
    return docxBodyText(await readPart(document));
  } finally {
    await reader.close();
  }
}

export const DOCX_WARNING =
  "Word body text only; no reliable page numbers. Headers, footers, notes, comments, images, formatting and automatic list numbers are not included. Review table relationships, amounts and missing context before use.";
