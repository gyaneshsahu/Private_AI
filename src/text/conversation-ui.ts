// Conversation screens: code blocks, answers, context review, branches and the saved library.
import { defineText } from "./core";

export const codeBlockText = defineText({
  en: {
    code: "Code",
    copied: "Code copied. Review before running it.",
    copyFailed: "Copy unavailable. Select the code and copy it manually.",
    copy: "Copy code",
    blockLabel: (language: string) => `${language || "Plain text"} code block`,
  },
  de: {
    code: "Code",
    copied: "Code kopiert. Prüfen Sie ihn, bevor Sie ihn ausführen.",
    copyFailed: "Kopieren nicht möglich. Markieren Sie den Code und kopieren Sie ihn von Hand.",
    copy: "Code kopieren",
    blockLabel: (language: string) => `Codeblock: ${language || "Klartext"}`,
  },
});

export const answerText = defineText({
  en: {
    evidence: (unknown: number, lines: number, verbatim: number, cited: number) =>
      `Evidence needs review: ${unknown} unknown source references, ${lines} unverified line references, ${verbatim} quoted passages not matched verbatim to selected sources.${cited > 0 ? ` ${cited} quoted passages not found in their adjacent cited sources.` : ""} This check compares quotations only with selected sources, not your messages or proposed drafts. A mismatch alone does not establish an invented quotation. These checks do not establish factual accuracy.`,
    page: (page: number) => ` · p${page}`,
    citedPage: (page: number) => ` · cited p${page}`,
    lineUnverified: " · line reference unverified",
    imageOmitted: (alt: string) => `[Image omitted${alt ? `: ${alt}` : ""}]`,
    table: "Answer table",
  },
  de: {
    evidence: (unknown: number, lines: number, verbatim: number, cited: number) =>
      `Belege prüfen: ${unknown} unbekannte Quellenverweise, ${lines} ungeprüfte Zeilenverweise, ${verbatim} Zitate, die nicht wörtlich in den ausgewählten Quellen stehen.${cited > 0 ? ` ${cited} Zitate wurden nicht in den direkt daneben zitierten Quellen gefunden.` : ""} Diese Prüfung vergleicht Zitate nur mit ausgewählten Quellen, nicht mit Ihren Nachrichten oder vorgeschlagenen Entwürfen. Eine Abweichung allein belegt kein erfundenes Zitat. Diese Prüfungen belegen keine sachliche Richtigkeit.`,
    page: (page: number) => ` · S. ${page}`,
    citedPage: (page: number) => ` · zitiert S. ${page}`,
    lineUnverified: " · Zeilenverweis ungeprüft",
    imageOmitted: (alt: string) => `[Bild ausgelassen${alt ? `: ${alt}` : ""}]`,
    table: "Antworttabelle",
  },
});

export const contextReviewText = defineText({
  en: {
    summary: (messages: number, sources: number) =>
      `Review included context · ${messages} messages · ${sources} source passages`,
    intro:
      "These selections control your next request. They do not delete saved history or change what was sent earlier. Saved conversations are not recalled automatically.",
    noLimit: "The sending limit is unavailable until a chat configuration is qualified.",
    over: (characters: string) =>
      `Over the sending limit by ${characters} characters. Shorten your draft or deselect context; nothing will be shortened automatically.`,
    remain: (characters: string) =>
      `${characters} characters remain within this configuration's input limit.`,
    caption: "Selected input size",
    content: "Content",
    characters: "Characters",
    instructions: "Instructions",
    selectedMessages: "Selected messages",
    selectedReferences: "Selected documents and sources",
    draft: "Your draft",
    formatting:
      "Source formatting is included. Characters are not tokens; these numbers do not promise that the model will recall every included fact.",
    messagesLegend: "Messages included in the next request",
    noMessages: "No previous messages in this conversation.",
    you: "You",
    noAnswer: "No completed answer",
    incomplete: " · Incomplete; always excluded",
    documentsLegend: "Documents and sources included in the next request",
    noDocuments: "No documents or sources added.",
    passages: (count: number) => `${count} source passages`,
    excluded: (count: number) =>
      `${count} messages excluded. Incomplete answers are never used as conversation context.`,
  },
  de: {
    summary: (messages: number, sources: number) =>
      `Einbezogenen Kontext prüfen · ${messages} Nachrichten · ${sources} Quellenabschnitte`,
    intro:
      "Diese Auswahl steuert Ihre nächste Anfrage. Sie löscht keinen gespeicherten Verlauf und ändert nichts an früher Gesendetem. Gespeicherte Unterhaltungen werden nicht automatisch einbezogen.",
    noLimit: "Die Sendegrenze ist erst verfügbar, wenn eine Chat-Konfiguration geprüft ist.",
    over: (characters: string) =>
      `Die Sendegrenze ist um ${characters} Zeichen überschritten. Kürzen Sie Ihren Entwurf oder wählen Sie Kontext ab; nichts wird automatisch gekürzt.`,
    remain: (characters: string) =>
      `${characters} Zeichen bleiben innerhalb der Eingabegrenze dieser Konfiguration.`,
    caption: "Umfang der ausgewählten Eingabe",
    content: "Inhalt",
    characters: "Zeichen",
    instructions: "Anweisungen",
    selectedMessages: "Ausgewählte Nachrichten",
    selectedReferences: "Ausgewählte Dokumente und Quellen",
    draft: "Ihr Entwurf",
    formatting:
      "Die Formatierung der Quellen ist mitgezählt. Zeichen sind keine Tokens; diese Zahlen versprechen nicht, dass das Modell jede einbezogene Angabe berücksichtigt.",
    messagesLegend: "Nachrichten in der nächsten Anfrage",
    noMessages: "Keine früheren Nachrichten in dieser Unterhaltung.",
    you: "Sie",
    noAnswer: "Keine fertige Antwort",
    incomplete: " · Unvollständig; immer ausgeschlossen",
    documentsLegend: "Dokumente und Quellen in der nächsten Anfrage",
    noDocuments: "Keine Dokumente oder Quellen hinzugefügt.",
    passages: (count: number) => `${count} Quellenabschnitte`,
    excluded: (count: number) =>
      `${count} Nachrichten ausgeschlossen. Unvollständige Antworten werden nie als Kontext verwendet.`,
  },
});

export const branchesText = defineText({
  en: {
    summary: (count: number, label: string) => `Conversation branches · ${count} · ${label}`,
    intro:
      "Only selected context from the active branch is sent. Switching keeps each branch’s messages, references and draft; it makes no request. Save an encrypted snapshot to keep all branches after reload. Search results and source links are never saved.",
    active: "Active:",
    open: (label: string) => `Open ${label} branch`,
    messages: (count: number) => `${count} messages`,
    incomplete: " · includes an incomplete attempt",
    limit: "Up to 20 branches per conversation. No branches are silently discarded.",
  },
  de: {
    summary: (count: number, label: string) => `Zweige der Unterhaltung · ${count} · ${label}`,
    intro:
      "Gesendet wird nur ausgewählter Kontext aus dem aktiven Zweig. Ein Wechsel behält die Nachrichten, Verweise und den Entwurf jedes Zweigs und stellt keine Anfrage. Speichern Sie einen verschlüsselten Stand, um alle Zweige nach dem Neuladen zu behalten. Suchergebnisse und Quellenlinks werden nie gespeichert.",
    active: "Aktiv:",
    open: (label: string) => `Zweig ${label} öffnen`,
    messages: (count: number) => `${count} Nachrichten`,
    incomplete: " · enthält einen unvollständigen Versuch",
    limit: "Bis zu 20 Zweige pro Unterhaltung. Es werden keine Zweige stillschweigend verworfen.",
  },
});

export const libraryText = defineText({
  en: {
    label: "Saved conversation library",
    search: "Search saved conversations",
    searchNote:
      "Search titles, messages, drafts and file names, including other branches, in this unlocked browser. Nothing is sent to a server.",
    sort: "Sort conversations",
    newest: "Newest created first",
    oldest: "Oldest created first",
    title: "Title A–Z",
    count: (visible: number, total: number) => `${visible} of ${total} saved conversations`,
    clear: "Clear search",
    noMatch: "No matching conversations. Try another word or clear the search.",
    meta: (messages: number, attachments: number) =>
      `${messages} messages · ${attachments} attachments`,
    draft: " · Unsent draft",
    pinned: " · Pinned",
    archived: " · Archived",
    branches: (count: number) => ` · ${count} branches`,
    open: "Open",
    delete: "Delete",
  },
  de: {
    label: "Bibliothek gespeicherter Unterhaltungen",
    search: "Gespeicherte Unterhaltungen durchsuchen",
    searchNote:
      "Durchsucht Titel, Nachrichten, Entwürfe und Dateinamen, auch in anderen Zweigen, in diesem entsperrten Browser. Es wird nichts an einen Server gesendet.",
    sort: "Unterhaltungen sortieren",
    newest: "Neueste zuerst",
    oldest: "Älteste zuerst",
    title: "Titel A–Z",
    count: (visible: number, total: number) =>
      `${visible} von ${total} gespeicherten Unterhaltungen`,
    clear: "Suche zurücksetzen",
    noMatch:
      "Keine passenden Unterhaltungen. Versuchen Sie ein anderes Wort oder setzen Sie die Suche zurück.",
    meta: (messages: number, attachments: number) =>
      `${messages} Nachrichten · ${attachments} Anhänge`,
    draft: " · Nicht gesendeter Entwurf",
    pinned: " · Angeheftet",
    archived: " · Archiviert",
    branches: (count: number) => ` · ${count} Zweige`,
    open: "Öffnen",
    delete: "Löschen",
  },
});
