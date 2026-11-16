// Compact message actions, the streaming answer, branch names and the sidebar row menu
// (chat core fixes, 16 November). German has the same keys.
import { defineText } from "./core";

export const messageActionsText = defineText({
  en: {
    retry: "Retry",
    moreActions: "More actions",
    writing: "CometRow is writing an answer…",
    branchOriginal: "Original",
    branchRetry: (n: number) => `Retry ${n}`,
    branchEdit: (n: number) => `Edit ${n}`,
    rename: "Rename",
    chatName: (title: string) => `New name for “${title}”`,
    delete: "Delete",
    manageHistory: "Manage history",
  },
  de: {
    retry: "Erneut versuchen",
    moreActions: "Weitere Aktionen",
    writing: "CometRow schreibt eine Antwort …",
    branchOriginal: "Original",
    branchRetry: (n: number) => `Neuer Versuch ${n}`,
    branchEdit: (n: number) => `Bearbeitung ${n}`,
    rename: "Umbenennen",
    chatName: (title: string) => `Neuer Name für „${title}“`,
    delete: "Löschen",
    manageHistory: "Verlauf verwalten",
  },
});
