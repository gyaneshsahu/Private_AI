import { expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { docxBodyText, extractDocx } from "../src/docx";
import { documentXml, docxFixture, wordNamespace } from "./fixtures/docx";

it("reads an independently generated Office package and rejects its unresolved revision", async () => {
  const text = await extractDocx(
    await readFile("tests/fixtures/office/handover-python-docx.docx"),
  );
  for (const fact of [
    "strictly before 09:45 UTC",
    "Arrival at 09:45 does not qualify",
    "during use",
    "disconnect power before maintenance",
    "to the supervisor",
    "EUR 14.20",
    "EUR 5.75",
    "Tax rate and delivery cost are not supplied",
    "Check the serial number",
    "Record the handover time",
  ])
    expect(text).toContain(fact);
  expect(text).not.toContain("SYNTHETIC_HEADER");
  expect(text).not.toContain("SYNTHETIC_FOOTER");
  await expect(
    extractDocx(
      await readFile("tests/fixtures/office/revision-python-docx.docx"),
    ),
  ).rejects.toThrow("revisions");
});

it.each([
  '<m:oMath xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math"><m:r><m:t>2+2=4</m:t></m:r></m:oMath>',
  '<mc:AlternateContent xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"><mc:Choice Requires="w"><w:p><w:r><w:t>original</w:t></w:r></w:p></mc:Choice><mc:Fallback><w:p><w:r><w:t>different fallback</w:t></w:r></w:p></mc:Fallback></mc:AlternateContent>',
])(
  "rejects unsupported representation instead of silently dropping or doubling text",
  (body) => {
    expect(() =>
      docxBodyText(
        documentXml("<w:p><w:r><w:t>Ordinary text</w:t></w:r></w:p>" + body),
      ),
    ).toThrow("alternate representations");
  },
);

it("extracts body paragraphs, split runs, units, tabs and table cells without HTML rendering", async () => {
  const body =
    "<w:p><w:r><w:t>Invoice &amp; </w:t></w:r><w:r><w:t>€12.25</w:t><w:tab/><w:t>before 16:30</w:t></w:r></w:p><w:tbl><w:tr><w:tc><w:p><w:r><w:t>Quantity</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>2 kg</w:t></w:r></w:p></w:tc></w:tr></w:tbl>";
  expect(await extractDocx(await docxFixture(body))).toBe(
    "Invoice & €12.25\tbefore 16:30\nQuantity \t2 kg",
  );
});
it("keeps hyperlink labels as text without reading relationships, headers or external targets", async () => {
  const bytes = await docxFixture(
    "<w:p><w:hyperlink><w:r><w:t>&lt;script&gt;not executable&lt;/script&gt;</w:t></w:r></w:hyperlink></w:p>",
    {
      "word/_rels/document.xml.rels":
        '<Relationships><Relationship Target="https://example.invalid/private" TargetMode="External"/></Relationships>',
      "word/header1.xml": "HEADER_NOT_BODY",
    },
  );
  expect(await extractDocx(bytes)).toBe("<script>not executable</script>");
});
it.each([
  "ins",
  "del",
  "moveFrom",
  "altChunk",
  "object",
  "fldSimple",
  "fldChar",
  "instrText",
  "txbxContent",
])("rejects unsupported %s rather than guessing visible content", (tag) => {
  expect(() =>
    docxBodyText(
      documentXml(`<w:${tag}><w:r><w:t>uncertain</w:t></w:r></w:${tag}>`),
    ),
  ).toThrow("not supported");
});
it("rejects malformed XML, DTD/entity expansion, namespace spoofing and empty text", () => {
  for (const xml of [
    `<w:document xmlns:w="${wordNamespace}"><w:body><w:p></w:body></w:document>`,
    `<!DOCTYPE document [<!ENTITY a "expanded">]>${documentXml("<w:p><w:r><w:t>&a;</w:t></w:r></w:p>")}`,
    documentXml("<w:p><w:r><w:t>spoof</w:t></w:r></w:p>").replace(
      wordNamespace,
      "urn:not-word",
    ),
    documentXml(""),
  ])
    expect(() => docxBodyText(xml)).toThrow();
});
it("rejects overlong text without truncation", () => {
  expect(() =>
    docxBodyText(
      documentXml(`<w:p><w:r><w:t>${"a".repeat(60001)}</w:t></w:r></w:p>`),
    ),
  ).toThrow("60,000");
});
it("rejects excessive nesting and too many ZIP entries before body extraction", async () => {
  expect(() =>
    docxBodyText(documentXml("<w:p>".repeat(130) + "</w:p>".repeat(130))),
  ).toThrow("nesting limit");
  const extra = Object.fromEntries(
    Array.from({ length: 511 }, (_, i) => [`unused/${i}.xml`, "x"]),
  );
  await expect(
    extractDocx(
      await docxFixture("<w:p><w:r><w:t>safe</w:t></w:r></w:p>", extra),
    ),
  ).rejects.toThrow("512-entry");
});
it("rejects invalid ZIP, expanded XML and macro/embedded packages", async () => {
  await expect(extractDocx(new Uint8Array([1, 2, 3]))).rejects.toThrow();
  for (const name of ["word/vbaProject.bin", "word/embeddings/data.xlsx"]) {
    await expect(
      extractDocx(
        await docxFixture("<w:p><w:r><w:t>safe</w:t></w:r></w:p>", {
          [name]: "unsupported",
        }),
      ),
    ).rejects.toThrow("not supported");
  }
  await expect(
    extractDocx(await docxFixture("a".repeat(4 * 1024 * 1024))),
  ).rejects.toThrow("4 MB");
});

it("rejects conflicting main-part declarations and excessive metadata nesting", async () => {
  const valid =
    '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>';
  const types = (body: string) =>
    `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">${body}</Types>`;
  for (const [xml, message] of [
    [
      types(
        valid +
          '<Override PartName="/word/document.xml" ContentType="application/other"/>',
      ),
      "Ambiguous DOCX",
    ],
    [types("<x>".repeat(130) + "</x>".repeat(130)), "nesting limit"],
    ["<Other>" + valid + "</Other>", "root"],
  ]) {
    await expect(
      extractDocx(
        await docxFixture("<w:p><w:r><w:t>safe</w:t></w:r></w:p>", {
          "[Content_Types].xml": xml,
        }),
      ),
    ).rejects.toThrow(message);
  }
});
