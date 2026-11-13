import { documentText } from "./text/documents";
import { Uint8ArrayReader, ZipReader, type FileEntry } from "@zip.js/zip.js";
import { SaxesParser, type SaxesTagNS } from "saxes";
import { checkTextSize } from "./document-formats";
import { readPart } from "./docx";

const MAX_EXPANDED_BYTES = 20 * 1024 * 1024;
const sheetNamespaces = new Set([
  "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
  "http://purl.oclc.org/ooxml/spreadsheetml/main",
]);
const invalid = () => Error(documentText.en.xlsxInvalid);
const attr = (tag: SaxesTagNS, local: string) =>
  Object.values(tag.attributes).find((a) => a.local === local)?.value;

function parse(
  xml: string,
  open: (tag: SaxesTagNS) => void,
  text?: (value: string) => void,
  close?: (tag: SaxesTagNS) => void,
) {
  const parser = new SaxesParser({ xmlns: true });
  let depth = 0;
  parser.on("doctype", () => {
    throw invalid();
  });
  parser.on("opentag", (tag) => {
    if (++depth > 128) throw invalid();
    open(tag);
  });
  if (text) {
    parser.on("text", text);
    parser.on("cdata", text);
  }
  parser.on("closetag", (tag) => {
    depth--;
    close?.(tag);
  });
  parser.write(xml).close();
}

/** The text of every shared string, in file order. Phonetic guides (rPh) are left out. */
export function sharedStrings(xml: string): string[] {
  const strings: string[] = [];
  let current = "",
    inText = false,
    phonetic = 0;
  parse(
    xml,
    (tag) => {
      if (!sheetNamespaces.has(tag.uri)) return;
      if (tag.local === "si") current = "";
      if (tag.local === "rPh") phonetic++;
      if (tag.local === "t") inText = true;
    },
    (value) => {
      if (inText && !phonetic) current += value;
    },
    (tag) => {
      if (!sheetNamespaces.has(tag.uri)) return;
      if (tag.local === "t") inText = false;
      if (tag.local === "rPh") phonetic--;
      if (tag.local === "si") strings.push(current);
    },
  );
  return strings;
}

/**
 * Calls `line` with each non-empty row as tab-separated text. Formulas are never evaluated: the
 * value Excel saved with the cell is used.
 * shortcut: a date cell keeps its serial number (a correct date needs the number formats in
 * styles.xml and the workbook's 1900/1904 setting); upgrade when users ask for dates.
 */
export function sheetRows(
  xml: string,
  strings: readonly string[],
  line: (text: string) => void,
): void {
  let row: string[] = [],
    column = 0,
    type = "",
    value = "",
    capture = false,
    phonetic = 0;
  parse(
    xml,
    (tag) => {
      if (!sheetNamespaces.has(tag.uri)) return;
      if (tag.local === "row") row = [];
      else if (tag.local === "c") {
        const ref = /^([A-Z]{1,3})\d+$/.exec(attr(tag, "r") ?? "");
        column = ref
          ? [...ref[1]].reduce((n, c) => n * 26 + c.charCodeAt(0) - 64, 0) - 1
          : row.length;
        if (column > 16383) throw invalid();
        type = attr(tag, "t") ?? "n";
        value = "";
      } else if (tag.local === "rPh") phonetic++;
      else if (tag.local === "v" || (tag.local === "t" && type === "inlineStr"))
        capture = true;
    },
    (text) => {
      if (capture && !phonetic) value += text;
    },
    (tag) => {
      if (!sheetNamespaces.has(tag.uri)) return;
      if (tag.local === "v" || tag.local === "t") capture = false;
      else if (tag.local === "rPh") phonetic--;
      else if (tag.local === "c") {
        const text =
          type === "s"
            ? strings[Number(value)]
            : type === "b"
              ? value === "1"
                ? "TRUE"
                : "FALSE"
              : value;
        if (text === undefined) throw invalid();
        // Only a cell with text pads its row, so every tab added here is counted by the size limit.
        if (text) {
          while (row.length < column) row.push("");
          row[column] = text.replace(/[\t\r\n]+/g, " ");
        }
        type = "";
      } else if (tag.local === "row") {
        if (row.length) line(row.join("\t"));
        row = [];
      }
    },
  );
}

export async function extractXlsx(bytes: Uint8Array): Promise<string> {
  const t = documentText.en;
  if (!bytes.length || bytes.length > 10 * 1024 * 1024)
    throw Error(t.xlsxLimits);
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
      expanded += entry.uncompressedSize;
      if (
        ++count > 512 ||
        !Number.isSafeInteger(expanded) ||
        expanded > MAX_EXPANDED_BYTES
      )
        throw Error(t.xlsxLimits);
      if (
        entry.encrypted ||
        /(?:^|\/)\.\.(?:\/|$)|\\|^\/|vbaProject/i.test(entry.filename) ||
        parts.has(entry.filename)
      )
        throw invalid();
      if (!entry.directory) parts.set(entry.filename, entry);
    }
    const part = (name: string) => {
      const entry = parts.get(name);
      if (!entry) throw invalid();
      return readPart(entry, t.xlsxLimits, t.xlsxLimits);
    };
    // shortcut: the workbook, its relationships and the shared strings are read from the names
    // Excel, LibreOffice and Google Sheets all write; a workbook that moves them is refused.
    // Only worksheet parts inside the file are read. External links are never followed.
    const targets = new Map<string, string>();
    parse(await part("xl/_rels/workbook.xml.rels"), (tag) => {
      const id = attr(tag, "Id"),
        target = attr(tag, "Target");
      if (
        tag.local === "Relationship" &&
        id &&
        target &&
        /\/worksheet$/.test(attr(tag, "Type") ?? "") &&
        attr(tag, "TargetMode") !== "External"
      )
        targets.set(id, target.startsWith("/") ? target.slice(1) : `xl/${target}`);
    });
    const sheets: { name: string; path: string; hidden: boolean }[] = [];
    parse(await part("xl/workbook.xml"), (tag) => {
      if (!sheetNamespaces.has(tag.uri) || tag.local !== "sheet") return;
      const path = targets.get(attr(tag, "id") ?? "");
      if (path)
        sheets.push({
          name: attr(tag, "name") ?? "",
          path,
          hidden: (attr(tag, "state") ?? "visible") !== "visible",
        });
    });
    const strings = parts.has("xl/sharedStrings.xml")
      ? sharedStrings(await part("xl/sharedStrings.xml"))
      : [];
    let text = "",
      rows = 0;
    const append = (line: string) => {
      checkTextSize(line, text.length + 1);
      text += line + "\n";
    };
    for (const sheet of sheets) {
      append(`${text ? "\n" : ""}Sheet: ${sheet.name}${sheet.hidden ? " (hidden)" : ""}`);
      sheetRows(await part(sheet.path), strings, (line) => {
        rows++;
        append(line);
      });
    }
    if (!rows) throw Error(t.xlsxEmpty);
    return text.trim();
  } catch (error) {
    // Text from the XML parser or the ZIP reader is not shown; only this file's own messages are.
    throw error instanceof Error && /XLSX|exceeds/.test(error.message)
      ? error
      : invalid();
  } finally {
    await reader.close();
  }
}
