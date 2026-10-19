import { ZipWriter, Uint8ArrayWriter, TextReader } from "@zip.js/zip.js";
export const wordNamespace =
  "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
export const documentXml = (body: string) =>
  `<w:document xmlns:w="${wordNamespace}"><w:body>${body}</w:body></w:document>`;
export async function docxFixture(
  body: string,
  extra: Record<string, string> = {},
) {
  const writer = new ZipWriter(new Uint8ArrayWriter(), {
    useWebWorkers: false,
  });
  const parts = {
    "[Content_Types].xml":
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>',
    "word/document.xml": documentXml(body),
    ...extra,
  };
  for (const [name, text] of Object.entries(parts))
    await writer.add(name, new TextReader(text));
  return writer.close();
}
