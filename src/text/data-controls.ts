// Data controls (docs/data-controls-20261116.md): export the saved chats as a file made in the
// browser, and delete all chats. German has the same keys.
import { defineText } from "./core";

export const dataControlsText = defineText({
  en: {
    heading: "Your chats",
    exportHeading: "Export my chats",
    exportBody: "One file with your saved chats, made in this browser. Nothing is sent anywhere.",
    exportMarkdown: "Download as Markdown",
    exportJson: "Download as JSON",
    exported: (n: number) => (n === 1 ? "1 chat exported." : `${n} chats exported.`),
    nothingToExport: "There are no saved chats to export.",
    nothingToDelete: "There are no saved chats to delete.",
    deleteHeading: "Delete all chats",
    deleteBody: "Deletes every saved chat in your account. This cannot be undone.",
    deleteButton: "Delete all chats",
    confirmTitle: "Delete all chats?",
    confirmChats:
      "Every saved chat in your account is deleted, on all your devices. This cannot be undone. Export your chats first if you want a copy.",
    confirmEverything:
      "Everything saved with your account is deleted: chats, memories, projects, files and tasks. This cannot be undone. Another device that is still signed in keeps its copy until it signs out. Export your chats first if you want a copy.",
    confirm: "Delete all",
    cancel: "Cancel",
    deleting: "Deleting…",
    deleted: "All chats were deleted.",
    failed: "Deleting did not finish. Check your chat list and try again.",
    you: "You",
    untitled: "Untitled chat",
  },
  de: {
    heading: "Ihre Chats",
    exportHeading: "Meine Chats exportieren",
    exportBody: "Eine Datei mit Ihren gespeicherten Chats, erstellt in diesem Browser. Es wird nichts gesendet.",
    exportMarkdown: "Als Markdown herunterladen",
    exportJson: "Als JSON herunterladen",
    exported: (n: number) => (n === 1 ? "1 Chat exportiert." : `${n} Chats exportiert.`),
    nothingToExport: "Es gibt keine gespeicherten Chats zum Exportieren.",
    nothingToDelete: "Es gibt keine gespeicherten Chats zum Löschen.",
    deleteHeading: "Alle Chats löschen",
    deleteBody: "Löscht jeden gespeicherten Chat in Ihrem Konto. Das lässt sich nicht rückgängig machen.",
    deleteButton: "Alle Chats löschen",
    confirmTitle: "Alle Chats löschen?",
    confirmChats:
      "Jeder gespeicherte Chat in Ihrem Konto wird gelöscht, auf allen Ihren Geräten. Das lässt sich nicht rückgängig machen. Exportieren Sie Ihre Chats vorher, wenn Sie eine Kopie behalten möchten.",
    confirmEverything:
      "Alles, was mit Ihrem Konto gespeichert ist, wird gelöscht: Chats, Erinnerungen, Projekte, Dateien und Aufgaben. Das lässt sich nicht rückgängig machen. Ein anderes Gerät, das noch angemeldet ist, behält seine Kopie, bis es sich abmeldet. Exportieren Sie Ihre Chats vorher, wenn Sie eine Kopie behalten möchten.",
    confirm: "Alle löschen",
    cancel: "Abbrechen",
    deleting: "Wird gelöscht…",
    deleted: "Alle Chats wurden gelöscht.",
    failed: "Das Löschen wurde nicht abgeschlossen. Prüfen Sie Ihre Chatliste und versuchen Sie es erneut.",
    you: "Sie",
    untitled: "Chat ohne Titel",
  },
});
