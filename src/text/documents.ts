// Document import messages. The extraction worker writes English only (its error filter matches
// English words and it cannot see the chosen language); documents.ts turns what it posts into the
// interface language with documentMessage.
import { defineText, uiLang, type Lang } from "./core";

export const documentText = defineText({
  en: {
    cancelled: "Extraction cancelled.",
    size: "Choose a nonempty document of at most 10 MB.",
    slow: "Document processing took too long. Try a smaller file or a clearer screenshot.",
    notLocal: "Document could not be processed locally.",
    invalidResult: "Document processing returned an invalid result. Try another file.",
    noText:
      "No readable text found. Handwriting is not supported. For a scanned page, try the Photo to text tool or a clear screenshot.",
    tooMuchText: "Extracted text exceeds 60,000 characters. Choose a smaller document.",
    failed: "Extraction failed.",
    notUtf8: "This file is not UTF-8 text. Export it as UTF-8 and try again.",
    notPlain: "This file is not plain text.",
    readingWord: "Reading Word body text locally…",
    pdfPages: "PDF exceeds the 20-page limit.",
    readingPage: (page: number, pages: number) => `Reading page ${page} of ${pages} locally…`,
    pdfWarning:
      "Review extracted numbers and table relationships. PDF reading order may differ from the visual layout.",
    screenshotTooLarge: "Screenshot exceeds 12 megapixels. Resize it before importing.",
    readingScreenshot: (percent: number) => `Reading screenshot locally: ${percent}%`,
    ocrWarning: (confidence: number) =>
      `OCR is imperfect (reported confidence ${confidence}%). Check names, amounts and dates before using this text.`,
    textOnly:
      "Imported as text only. Code is not executed; data is not recalculated. Review structure and units before use.",
    formats:
      "Supported formats: Word .docx body text, Excel .xlsx cell values, PDF, UTF-8 text/Markdown/data/source-code files, PNG and JPEG screenshots. Macro-enabled files are not supported; save them as .docx, .xlsx or PDF.",
    legacy:
      "Older .doc and .xls files cannot be read. Open the file, save it as .docx, .xlsx or PDF, and add it again.",
    readingScan: (page: number, pages: number) =>
      `Reading scanned page ${page} of ${pages} by OCR locally…`,
    pdfOcrWarning: (read: number, pages: number) =>
      `This PDF has no text layer. Pages read by OCR on this device: ${read} of ${pages}. The text may contain errors. OCR knows printed German and English. Check names, amounts and dates in the extracted text before sending.`,
    readingSheet: "Reading spreadsheet cells locally…",
    xlsxWarning:
      "Spreadsheet cell values only, one tab-separated block per sheet. Formulas are not recalculated; the last saved results are shown. Dates can appear as serial numbers. Number formats, charts, images and comments are not included. Review before use.",
    xlsxLimits:
      "XLSX exceeds a safety limit (10 MB file, 512 parts, 4 MB per part, 20 MB unpacked). Save a smaller workbook or export the sheet as CSV.",
    xlsxInvalid:
      "This XLSX file cannot be read. It may be damaged, password-protected or macro-enabled. Save it again as a plain .xlsx workbook.",
    xlsxEmpty: "XLSX has no readable cell values.",
    extractionFailed:
      "Extraction failed. The file may be encrypted, malformed, unsupported or unreadable.",
    docxWarning:
      "Word body text only; no reliable page numbers. Headers, footers, notes, comments, images, formatting and automatic list numbers are not included. Review table relationships, amounts and missing context before use.",
    docxDtd: "DOCX does not support DTD declarations.",
    docxNesting: "DOCX XML exceeds the nesting limit.",
    docxEquations:
      "DOCX equations and alternate representations are not supported. Export a reviewed text PDF first.",
    docxRoot: "Invalid DOCX document root.",
    docxRevisions:
      "DOCX contains revisions, fields or embedded content that is not supported. Accept revisions and export a text PDF first.",
    docxNoBody: "DOCX has no supported readable body text.",
    docxPart: "DOCX part exceeds the 4 MB limit.",
    docxExpandedPart: "DOCX expanded part exceeds the 4 MB limit.",
    docxSize: "DOCX exceeds the 10 MB limit.",
    docxEntries: "DOCX exceeds the 512-entry limit.",
    docxExpanded: "DOCX exceeds the 20 MB expanded-size limit.",
    docxMacrosEmbedded: "DOCX macros and embedded files are not supported.",
    docxTypesNesting: "DOCX content types exceed the nesting limit.",
    docxTypesRoot: "Invalid DOCX content-types root.",
    docxAmbiguousMain: "Ambiguous DOCX main document declarations.",
    docxMacros: "DOCX macros are not supported.",
    docxContentType: "Unsupported DOCX content type.",
  },
  de: {
    cancelled: "Auslesen abgebrochen.",
    size: "Wählen Sie ein nicht leeres Dokument mit höchstens 10 MB.",
    slow: "Die Verarbeitung des Dokuments hat zu lange gedauert. Versuchen Sie eine kleinere Datei oder einen deutlicheren Screenshot.",
    notLocal: "Das Dokument konnte auf diesem Gerät nicht verarbeitet werden.",
    invalidResult:
      "Die Verarbeitung des Dokuments lieferte ein ungültiges Ergebnis. Versuchen Sie eine andere Datei.",
    noText:
      "Kein lesbarer Text gefunden. Handschrift wird nicht unterstützt. Versuchen Sie bei einer gescannten Seite das Werkzeug Foto zu Text oder einen deutlichen Screenshot.",
    tooMuchText:
      "Der ausgelesene Text ist länger als 60.000 Zeichen. Wählen Sie ein kleineres Dokument.",
    failed: "Auslesen fehlgeschlagen.",
    notUtf8:
      "Diese Datei ist kein UTF-8-Text. Exportieren Sie sie als UTF-8 und versuchen Sie es erneut.",
    notPlain: "Diese Datei ist kein reiner Text.",
    readingWord: "Der Haupttext des Word-Dokuments wird auf diesem Gerät gelesen…",
    pdfPages: "Das PDF überschreitet die Grenze von 20 Seiten.",
    readingPage: (page: number, pages: number) =>
      `Seite ${page} von ${pages} wird auf diesem Gerät gelesen…`,
    pdfWarning:
      "Prüfen Sie ausgelesene Zahlen und Tabellenbezüge. Die Lesereihenfolge im PDF kann von der sichtbaren Anordnung abweichen.",
    screenshotTooLarge:
      "Der Screenshot ist größer als 12 Megapixel. Verkleinern Sie ihn vor dem Import.",
    readingScreenshot: (percent: number) =>
      `Screenshot wird auf diesem Gerät gelesen: ${percent} %`,
    ocrWarning: (confidence: number) =>
      `Die Texterkennung ist nicht fehlerfrei (gemeldete Sicherheit ${confidence} %). Prüfen Sie Namen, Beträge und Daten, bevor Sie diesen Text verwenden.`,
    textOnly:
      "Nur als Text importiert. Code wird nicht ausgeführt; Daten werden nicht neu berechnet. Prüfen Sie Aufbau und Einheiten vor der Verwendung.",
    formats:
      "Unterstützte Formate: Haupttext aus Word (.docx), Zellwerte aus Excel (.xlsx), PDF, UTF-8-Text-, Markdown-, Daten- und Quellcodedateien, PNG- und JPEG-Screenshots. Dateien mit Makros werden nicht unterstützt; speichern Sie sie als .docx, .xlsx oder PDF.",
    legacy:
      "Ältere .doc- und .xls-Dateien können nicht gelesen werden. Öffnen Sie die Datei, speichern Sie sie als .docx, .xlsx oder PDF und fügen Sie sie erneut hinzu.",
    readingScan: (page: number, pages: number) =>
      `Gescannte Seite ${page} von ${pages} wird auf diesem Gerät per Texterkennung gelesen…`,
    pdfOcrWarning: (read: number, pages: number) =>
      `Dieses PDF enthält keinen Text. Auf diesem Gerät per Texterkennung gelesene Seiten: ${read} von ${pages}. Der Text kann Fehler enthalten. Die Texterkennung kennt gedrucktes Deutsch und Englisch. Prüfen Sie Namen, Beträge und Daten im ausgelesenen Text vor dem Senden.`,
    readingSheet: "Die Zellen der Tabelle werden auf diesem Gerät gelesen…",
    xlsxWarning:
      "Nur Zellwerte der Tabelle, je Blatt ein Block mit Tabulatoren. Formeln werden nicht neu berechnet; gezeigt werden die zuletzt gespeicherten Ergebnisse. Datumsangaben können als fortlaufende Zahlen erscheinen. Zahlenformate, Diagramme, Bilder und Kommentare sind nicht enthalten. Vor der Verwendung prüfen.",
    xlsxLimits:
      "Die XLSX-Datei überschreitet eine Sicherheitsgrenze (10 MB Datei, 512 Teile, 4 MB pro Teil, 20 MB entpackt). Speichern Sie eine kleinere Arbeitsmappe oder exportieren Sie das Blatt als CSV.",
    xlsxInvalid:
      "Diese XLSX-Datei kann nicht gelesen werden. Sie ist möglicherweise beschädigt, mit einem Kennwort geschützt oder enthält Makros. Speichern Sie sie erneut als einfache .xlsx-Arbeitsmappe.",
    xlsxEmpty: "Die XLSX-Datei enthält keine lesbaren Zellwerte.",
    extractionFailed:
      "Auslesen fehlgeschlagen. Die Datei ist möglicherweise verschlüsselt, beschädigt, nicht unterstützt oder unlesbar.",
    docxWarning:
      "Nur Haupttext aus Word; keine verlässlichen Seitenzahlen. Kopf- und Fußzeilen, Anmerkungen, Kommentare, Bilder, Formatierung und automatische Listennummern sind nicht enthalten. Prüfen Sie Tabellenbezüge, Beträge und fehlenden Zusammenhang vor der Verwendung.",
    docxDtd: "DOCX-Dateien mit DTD-Deklarationen werden nicht unterstützt.",
    docxNesting: "Das XML der DOCX-Datei ist zu tief verschachtelt.",
    docxEquations:
      "Formeln und alternative Darstellungen in DOCX werden nicht unterstützt. Exportieren Sie zuerst ein geprüftes Text-PDF.",
    docxRoot: "Ungültiger Dokumentstamm in der DOCX-Datei.",
    docxRevisions:
      "Die DOCX-Datei enthält Änderungen, Felder oder eingebettete Inhalte, die nicht unterstützt werden. Nehmen Sie die Änderungen an und exportieren Sie zuerst ein Text-PDF.",
    docxNoBody: "Die DOCX-Datei hat keinen unterstützten lesbaren Haupttext.",
    docxPart: "Ein Teil der DOCX-Datei überschreitet die Grenze von 4 MB.",
    docxExpandedPart: "Ein entpackter Teil der DOCX-Datei überschreitet die Grenze von 4 MB.",
    docxSize: "Die DOCX-Datei überschreitet die Grenze von 10 MB.",
    docxEntries: "Die DOCX-Datei überschreitet die Grenze von 512 Einträgen.",
    docxExpanded: "Die entpackte DOCX-Datei überschreitet die Grenze von 20 MB.",
    docxMacrosEmbedded: "Makros und eingebettete Dateien in DOCX werden nicht unterstützt.",
    docxTypesNesting: "Die Inhaltstypen der DOCX-Datei sind zu tief verschachtelt.",
    docxTypesRoot: "Ungültiger Stamm der Inhaltstypen in der DOCX-Datei.",
    docxAmbiguousMain: "Mehrdeutige Angaben zum Hauptdokument in der DOCX-Datei.",
    docxMacros: "Makros in DOCX werden nicht unterstützt.",
    docxContentType: "Nicht unterstützter Inhaltstyp der DOCX-Datei.",
  },
});

const en = documentText.en;
/** A worker message in the interface language; text it does not know is shown as sent. */
export function documentMessage(text: string, lang: Lang = uiLang()): string {
  const de = documentText[lang];
  if (lang === "en") return text;
  for (const [key, value] of Object.entries(en))
    if (value === text) return de[key as keyof typeof en] as string;
  let m = /^Reading page (\d+) of (\d+) locally…$/.exec(text);
  if (m) return de.readingPage(Number(m[1]), Number(m[2]));
  m = /^Reading screenshot locally: (\d+)%$/.exec(text);
  if (m) return de.readingScreenshot(Number(m[1]));
  m = /^OCR is imperfect \(reported confidence (\d+)%\)/.exec(text);
  if (m && text === en.ocrWarning(Number(m[1]))) return de.ocrWarning(Number(m[1]));
  m = /^Reading scanned page (\d+) of (\d+) by OCR locally…$/.exec(text);
  if (m) return de.readingScan(Number(m[1]), Number(m[2]));
  m = /^This PDF has no text layer\. Pages read by OCR on this device: (\d+) of (\d+)\./.exec(text);
  if (m && text === en.pdfOcrWarning(Number(m[1]), Number(m[2])))
    return de.pdfOcrWarning(Number(m[1]), Number(m[2]));
  return text;
}
