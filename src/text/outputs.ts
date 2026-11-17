// Outputs panel (src/OutputsPanel.tsx): what a chat has produced or holds, in one list.
import { defineText } from "./core";

export const outputsText = defineText({
  en: {
    title: "In this chat",
    close: "Close",
    board: "Whiteboard",
    boardDetail: (items: number, when: string) => `${items === 1 ? "1 item" : `${items.toLocaleString("en")} items`} · last changed ${when}`,
    canvas: "Canvas",
    canvasDetail: (characters: number) => `Canvas document · ${characters.toLocaleString("en")} characters`,
    imageDetail: (when: string) => (when ? `Created image · ${when}` : "Created image"),
    document: "Document, text only",
    largeDocument: "Large document, text only",
    screenshot: "Screenshot, text only",
    open: "Open",
    download: "Download",
    showInChat: "Show in chat",
    note: "Files keep only their text, and photos you asked about are not kept, so neither can be downloaded again.",
    empty: "Nothing here yet. Whiteboards, canvas documents, created images and files you add appear here.",
  },
  de: {
    title: "In diesem Chat",
    close: "Schließen",
    board: "Whiteboard",
    boardDetail: (items: number, when: string) => `${items === 1 ? "1 Element" : `${items.toLocaleString("de")} Elemente`} · zuletzt geändert ${when}`,
    canvas: "Canvas",
    canvasDetail: (characters: number) => `Canvas-Dokument · ${characters.toLocaleString("de")} Zeichen`,
    imageDetail: (when: string) => (when ? `Erstelltes Bild · ${when}` : "Erstelltes Bild"),
    document: "Dokument, nur Text",
    largeDocument: "Großes Dokument, nur Text",
    screenshot: "Screenshot, nur Text",
    open: "Öffnen",
    download: "Herunterladen",
    showInChat: "Im Chat zeigen",
    note: "Von Dateien bleibt nur der Text, und Fotos, nach denen Sie gefragt haben, werden nicht behalten. Beides lässt sich deshalb nicht erneut herunterladen.",
    empty: "Noch nichts hier. Whiteboards, Canvas-Dokumente, erstellte Bilder und Dateien, die Sie hinzufügen, erscheinen hier.",
  },
});
