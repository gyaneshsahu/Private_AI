/**
 * File upload from the file to the attachment: the real extraction worker code and the real
 * `extract` in src/documents.ts, joined by a stand-in for the browser's Worker. Runs in Node, so
 * it does not cover the PDF paths (pdfjs needs a real worker and, for scans, a canvas).
 */
import { afterAll, beforeAll, expect, it, vi } from "vitest";
import { TextReader, Uint8ArrayWriter, ZipWriter } from "@zip.js/zip.js";
import { COUNT_STOP, DOCUMENT_ACCEPT } from "../src/document-formats";
import { extract } from "../src/documents";
import { createMaskingSession } from "../src/identifier-masking";
import { documentMessage, documentText, overLimitText } from "../src/text/documents";
import { extractXlsx } from "../src/xlsx";
import { docxFixture } from "./fixtures/docx";

const main = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";
const sheetXml = (rows: string) =>
  `<worksheet xmlns="${main}"><sheetData>${rows}</sheetData></worksheet>`;
async function xlsxFixture(
  sheets: Record<string, string>,
  strings: string[] = [],
  extra: Record<string, string> = {},
) {
  const names = Object.keys(sheets);
  const parts: Record<string, string> = {
    "xl/workbook.xml": `<workbook xmlns="${main}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${names
      .map(
        (name, i) =>
          `<sheet name="${name}" sheetId="${i + 1}" r:id="rId${i + 1}"${name === "Notes" ? ' state="hidden"' : ""}/>`,
      )
      .join("")}</sheets></workbook>`,
    "xl/_rels/workbook.xml.rels": `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${names
      .map(
        (_, i) =>
          `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`,
      )
      .join("")}</Relationships>`,
    "xl/sharedStrings.xml": `<sst xmlns="${main}">${strings.map((s) => `<si>${s}</si>`).join("")}</sst>`,
    ...Object.fromEntries(
      names.map((name, i) => [`xl/worksheets/sheet${i + 1}.xml`, sheets[name]]),
    ),
    ...extra,
  };
  const writer = new ZipWriter(new Uint8ArrayWriter(), { useWebWorkers: false });
  for (const [name, text] of Object.entries(parts))
    await writer.add(name, new TextReader(text));
  return writer.close();
}
const budget = () =>
  xlsxFixture(
    {
      Budget: sheetXml(
        '<row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c><c r="D1" t="inlineStr"><is><t>inline\ttext</t></is></c></row>' +
          '<row r="2"><c r="A2" t="s"><v>2</v></c><c r="B2"><v>1234.5</v></c><c r="C2" t="b"><v>1</v></c></row>' +
          '<row r="3"><c r="A3" t="str"><f>A2&amp;"!"</f><v>Rent!</v></c><c r="B3"><f>SUM(B2:B2)*2</f><v>2469</v></c><c r="C3" t="e"><f>1/0</f><v>#DIV/0!</v></c></row>' +
          '<row r="4"><c r="A4" s="1"/><c r="B4"><f>NOW()</f></c></row>' +
          '<row r="9"><c r="B9" s="2"><v>46332</v></c></row>',
      ),
      Notes: sheetXml(
        '<row><c t="s"><v>3</v></c></row>',
      ),
    },
    [
      "<t>Item</t>",
      "<t>Amount &amp; unit</t>",
      "<r><t>Re</t></r><r><t>nt</t></r><rPh><t>PHONETIC</t></rPh>",
      "<t>IBAN DE89 3704 0044 0532 0130 00</t>",
    ],
    {
      "xl/externalLinks/externalLink1.xml": "NEVER_READ",
      "xl/worksheets/_rels/sheet1.xml.rels":
        '<Relationships><Relationship Target="https://example.invalid/private" TargetMode="External"/></Relationships>',
    },
  );
const budgetText =
  "Sheet: Budget\nItem\tAmount & unit\t\tinline text\nRent\t1234.5\tTRUE\nRent!\t2469\t#DIV/0!\n\t46332\n\nSheet: Notes (hidden)\nIBAN DE89 3704 0044 0532 0130 00";

it("reads XLSX strings, numbers, booleans and saved formula results per sheet without evaluating anything", async () => {
  // The date cell B9 keeps its serial number 46332; formulas without a saved result stay empty.
  expect(await extractXlsx(await budget())).toBe(budgetText);
});

it("refuses XLSX parts beyond the size limits, too much text and unsafe packages", async () => {
  const big = sheetXml(`<row><c t="inlineStr"><is><t>${"a".repeat(5 * 1024 * 1024)}</t></is></c></row>`);
  await expect(extractXlsx(await xlsxFixture({ A: big }))).rejects.toThrow(
    "safety limit",
  );
  const padding = Object.fromEntries(
    Array.from({ length: 6 }, (_, i) => [`xl/media/${i}.bin`, " ".repeat(4 * 1024 * 1024)]),
  );
  await expect(
    extractXlsx(await xlsxFixture({ A: sheetXml("") }, [], padding)),
  ).rejects.toThrow("safety limit");
  const long = sheetXml(
    `<row><c t="inlineStr"><is><t>${"a".repeat(30000)}</t></is></c></row>`.repeat(3),
  );
  await expect(extractXlsx(await xlsxFixture({ A: long }))).rejects.toThrow(
    "This file has 90,012 characters of text; the limit is 60,000 (about 50% too much).",
  );
  // A lone far-right cell per row is padded with tabs; the padding counts towards the limit.
  const wide = sheetXml('<row><c r="XFD1"><v>1</v></c></row>'.repeat(5));
  await expect(extractXlsx(await xlsxFixture({ A: wide }))).rejects.toThrow(
    "the limit is 60,000 (about 37% too much)",
  );
  for (const bytes of [
    new Uint8Array([1, 2, 3]),
    await xlsxFixture({ A: sheetXml("") }, [], { "xl/vbaProject.bin": "x" }),
    await xlsxFixture({
      A: `<!DOCTYPE x [<!ENTITY a "expanded">]>${sheetXml('<row><c t="inlineStr"><is><t>&a;</t></is></c></row>')}`,
    }),
    await xlsxFixture({ A: sheetXml('<row><c t="s"><v>7</v></c></row>') }),
    await docxFixture("<w:p><w:r><w:t>not a workbook</w:t></w:r></w:p>"),
  ])
    await expect(extractXlsx(bytes)).rejects.toThrow("cannot be read");
  await expect(
    extractXlsx(await xlsxFixture({ A: sheetXml('<row><c r="A1"/></row>') })),
  ).rejects.toThrow("no readable cell values");
});

// The worker file only talks to `self`; give it one, and a Worker that hands messages across.
const workerSelf: {
  onmessage?: (event: { data: File }) => Promise<void>;
  postMessage: (data: unknown) => void;
} = { postMessage: () => undefined };
class WorkerBridge {
  onmessage?: (event: { data: unknown }) => void;
  onerror?: () => void;
  terminate() {}
  postMessage(file: File) {
    workerSelf.postMessage = (data) => this.onmessage?.({ data });
    void workerSelf.onmessage?.({ data: file });
  }
}
beforeAll(async () => {
  vi.stubGlobal("self", workerSelf);
  vi.stubGlobal("Worker", WorkerBridge);
  await import("../src/extraction.worker");
});
afterAll(() => vi.unstubAllGlobals());
const read = (parts: BlobPart[], name: string, progress = vi.fn()) =>
  extract(new File(parts, name), new AbortController().signal, progress);

it("turns a DOCX, an XLSX, a CSV and a code file into reviewed text with the right note", async () => {
  const docx = await read(
    [await docxFixture("<w:p><w:r><w:t>Handover at 09:45</w:t></w:r></w:p>")],
    "note.docx",
  );
  expect(docx.sources[0].text).toBe("Handover at 09:45");
  expect(docx.warning).toBe(documentText.en.docxWarning);

  const progress = vi.fn();
  const xlsx = await read([await budget()], "Budget 2026.XLSX", progress);
  expect(xlsx.sources.map((source) => source.text)).toEqual([budgetText]);
  expect(xlsx.warning).toBe(documentText.en.xlsxWarning);
  expect(xlsx.kind).toBe("document");
  expect(progress).toHaveBeenCalledWith(documentText.en.readingSheet);

  const csv = "name;amount\r\nMüller;1.234,56\r\n";
  expect((await read([csv], "export.csv")).sources[0].text).toBe(csv);
  const code = "def total(a, b):\n\treturn a + b  # =SUM(A1:B1)\n";
  const python = await read([code], "total.py");
  expect(python.sources[0].text).toBe(code);
  expect(python.warning).toBe(documentText.en.textOnly);
});

it("masks identifiers in spreadsheet text exactly as in any other attachment text", async () => {
  const text = (await read([await budget()], "budget.xlsx")).sources[0].text;
  const masked = createMaskingSession().mask(text);
  expect(masked).toContain("IBAN {{IBAN-1}}");
  expect(masked).not.toContain("DE89 3704");
});

it("says how far over a limit a file is and how to upload less of that kind of file", async () => {
  const cell = (text: string) => `<row><c t="inlineStr"><is><t>${text}</t></is></c></row>`;
  await expect(
    read([await xlsxFixture({ A: sheetXml(cell("a".repeat(20990)).repeat(4)) })], "plan.xlsx"),
  ).rejects.toThrow(
    "This file has 83,973 characters of text; the limit is 60,000 (about 40% too much). Upload fewer sheets, rows or columns, or export only the sheet that matters as CSV.",
  );
  await expect(
    read([await docxFixture(`<w:p><w:r><w:t>${"a".repeat(66000)}</w:t></w:r></w:p>`)], "book.docx"),
  ).rejects.toThrow(
    "This file has 66,001 characters of text; the limit is 60,000 (about 10% too much). Upload only the chapter or section that matters, or split the file into parts.",
  );
  await expect(read([new Uint8Array(13 * 1024 * 1024)], "scan.pdf")).rejects.toThrow(
    "This file is 13 MB; the limit is 10 MB. Upload only the page range that matters, or split the PDF into parts.",
  );
  // A workbook built to expand: one 40,000-character shared string in 100 cells. The reader
  // counts without keeping the text and gives up at COUNT_STOP instead of counting to the end.
  const bomb = await xlsxFixture(
    { A: sheetXml('<row><c t="s"><v>0</v></c></row>'.repeat(100)) },
    [`<t>${"a".repeat(40000)}</t>`],
  );
  await expect(read([bomb], "bomb.xlsx")).rejects.toThrow(
    `This file has more than ${COUNT_STOP.toLocaleString("en")} characters of text; the limit is 60,000. Upload fewer sheets`,
  );
  expect(overLimitText({ characters: 84000, limit: 60000 }, "plan.xlsx", "de")).toBe(
    "Diese Datei enthält 84.000 Zeichen Text; die Grenze liegt bei 60.000 (etwa 40 % zu viel). Laden Sie weniger Blätter, Zeilen oder Spalten hoch, oder exportieren Sie nur das benötigte Blatt als CSV.",
  );
  expect(overLimitText({ pages: 34, limit: 20 }, "report.pdf", "de")).toBe(
    "Dieses PDF hat 34 Seiten; die Grenze liegt bei 20. Laden Sie nur den benötigten Seitenbereich hoch, oder teilen Sie das PDF in mehrere Teile.",
  );
  expect(overLimitText({ pages: 34, limit: 20 }, "report.pdf", "en")).toBe(
    "This PDF has 34 pages; the limit is 20. Upload only the page range that matters, or split the PDF into parts.",
  );
  expect(overLimitText({ megabytes: 12.4 }, "notes.txt", "de")).toBe(
    "Diese Datei hat 12,4 MB; die Grenze liegt bei 10 MB. Laden Sie nur das benötigte Kapitel oder den benötigten Abschnitt hoch, oder teilen Sie die Datei in mehrere Teile.",
  );
});

it("refuses files over 10 MB, text over 60,000 characters and types it cannot read, and says what to do", async () => {
  await expect(
    read([new Uint8Array(10 * 1024 * 1024 + 1)], "big.csv"),
  ).rejects.toThrow("This file is 10.1 MB; the limit is 10 MB. Upload fewer sheets");
  await expect(read([], "empty.xlsx")).rejects.toThrow("at most 10 MB");
  expect(
    (await read(["a".repeat(60000)], "limit.csv")).sources[0].text,
  ).toHaveLength(60000);
  await expect(read(["a".repeat(60001)], "over.csv")).rejects.toThrow(
    "This file has 60,001 characters of text; the limit is 60,000 (about 1% too much).",
  );
  for (const name of ["old.xls", "OLD.DOC"])
    await expect(read(["ÐÏ\u0011à"], name)).rejects.toThrow(
      "save it as .docx, .xlsx or PDF",
    );
  for (const name of ["macros.xlsm", "page.html", "archive.zip", "README"])
    await expect(read(["plain"], name)).rejects.toThrow("Supported formats");
  const big = sheetXml(`<row><c t="inlineStr"><is><t>${"a".repeat(5 * 1024 * 1024)}</t></is></c></row>`);
  await expect(
    read([await xlsxFixture({ A: big })], "bomb.xlsx"),
  ).rejects.toThrow("safety limit");
  await expect(read(["not a zip"], "broken.xlsx")).rejects.toThrow(
    "cannot be read",
  );
});

it("offers .xlsx in the file picker and has German for every new worker message", () => {
  expect(DOCUMENT_ACCEPT.split(",")).toContain(".xlsx");
  expect(DOCUMENT_ACCEPT).not.toMatch(/\.(xls|doc)(,|$)/);
  const { en, de } = documentText;
  for (const key of [
    "legacy",
    "formats",
    "noText",
    "readingSheet",
    "xlsxWarning",
    "xlsxLimits",
    "xlsxInvalid",
    "xlsxEmpty",
  ] as const) {
    expect(de[key]).not.toBe(en[key]);
    expect(documentMessage(en[key], "de")).toBe(de[key]);
  }
  expect(documentMessage(en.readingScan(2, 5), "de")).toBe(de.readingScan(2, 5));
  expect(documentMessage(en.pdfOcrWarning(5, 12), "de")).toBe(
    de.pdfOcrWarning(5, 12),
  );
  expect(en.pdfOcrWarning(5, 12)).toContain("Pages read by OCR on this device: 5 of 12.");
  // src/documents.ts rejects a worker note longer than 500 characters.
  for (const lang of [en, de])
    for (const note of [lang.pdfOcrWarning(5, 20), lang.xlsxWarning])
      expect(note.length).toBeLessThanOrEqual(500);
});
