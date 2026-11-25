// Memory per project (docs/project-memory-20261126.md): the section on the project page.
import { defineText } from "./core";

export const projectMemoryText = defineText({
  en: {
    title: "Project memory",
    intro: "Things CometRow should remember in this project. They are used only in this project's chats and never outside it.",
    addLabel: "New project memory",
    addHint: "For example: the report is for the board, keep it formal",
    add: "Add",
    added: "Added to this project's memory.",
    none: "Nothing yet. Add one here, or write “Remember that …” in one of this project's chats.",
    listLabel: "Memories of this project",
    delete: "Delete",
    deleteLabel: (text: string) => `Delete the memory: ${text}`,
    deleted: "Deleted.",
    locked: "Project memory is available once your saved chats are open.",
    savedHere: (project: string) => `Saved in the project “${project}”. It is used only there.`,
    inSettings: "Memories that belong to a project are on that project's page, not in this list.",
  },
  de: {
    title: "Projekt-Erinnerungen",
    intro: "Was sich CometRow in diesem Projekt merken soll. Es wird nur in den Chats dieses Projekts verwendet und nie außerhalb.",
    addLabel: "Neue Projekt-Erinnerung",
    addHint: "Zum Beispiel: Der Bericht ist für den Vorstand, bitte förmlich",
    add: "Hinzufügen",
    added: "Zu den Erinnerungen dieses Projekts hinzugefügt.",
    none: "Noch nichts. Fügen Sie hier etwas hinzu oder schreiben Sie in einem Chat dieses Projekts „Merke dir, dass …“.",
    listLabel: "Erinnerungen dieses Projekts",
    delete: "Löschen",
    deleteLabel: (text: string) => `Erinnerung löschen: ${text}`,
    deleted: "Gelöscht.",
    locked: "Projekt-Erinnerungen sind verfügbar, sobald Ihre gespeicherten Chats geöffnet sind.",
    savedHere: (project: string) => `Im Projekt „${project}“ gespeichert. Es wird nur dort verwendet.`,
    inSettings: "Erinnerungen, die zu einem Projekt gehören, stehen auf der Seite des Projekts, nicht in dieser Liste.",
  },
});
