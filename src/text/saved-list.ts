// Saved list and copy (docs/chat-feature-gaps-20261114.md, package E): delete confirmation,
// copy as text, date groups in the sidebar, time and copy on the user's own messages.
import { defineText } from "./core";

export const savedListText = defineText({
  en: {
    deleteTitle: "Delete this conversation?",
    deleteText: (title: string) =>
      `“${title}” will be deleted from this device, with all its branches. This cannot be undone.`,
    deleteConfirm: "Delete conversation",
    cancel: "Cancel",
    copyConversation: "Copy conversation as text",
    copyMessage: "Copy",
    copyMessageLabel: "Copy your message",
    copied: "Copied to the clipboard.",
    copyFailed:
      "Copying is not possible here. The browser did not allow access to the clipboard.",
    sentAt: (time: string) => `Sent ${time}`,
    pinned: "Pinned",
    today: "Today",
    yesterday: "Yesterday",
    week: "Earlier this week",
    older: "Older",
    // Per storage mode (forStorage in ./mode-copy): `deleteText` above is the device vault's.
    deleteText_secure: (title: string) =>
      `“${title}” will be deleted with all its branches, on all your devices. This cannot be undone.`,
    deleteText_max: (title: string) =>
      `“${title}” will be deleted with all its branches, on all your devices. This cannot be undone.`,
  },
  de: {
    deleteTitle: "Diese Unterhaltung löschen?",
    deleteText: (title: string) =>
      `„${title}“ wird mit allen Zweigen von diesem Gerät gelöscht. Das lässt sich nicht rückgängig machen.`,
    deleteConfirm: "Unterhaltung löschen",
    cancel: "Abbrechen",
    copyConversation: "Unterhaltung als Text kopieren",
    copyMessage: "Kopieren",
    copyMessageLabel: "Ihre Nachricht kopieren",
    copied: "In die Zwischenablage kopiert.",
    copyFailed:
      "Kopieren ist hier nicht möglich. Der Browser hat den Zugriff auf die Zwischenablage nicht erlaubt.",
    sentAt: (time: string) => `Gesendet ${time}`,
    pinned: "Angeheftet",
    today: "Heute",
    yesterday: "Gestern",
    week: "Früher in dieser Woche",
    older: "Älter",
    deleteText_secure: (title: string) =>
      `„${title}“ wird mit allen Zweigen auf allen Ihren Geräten gelöscht. Das lässt sich nicht rückgängig machen.`,
    deleteText_max: (title: string) =>
      `„${title}“ wird mit allen Zweigen auf allen Ihren Geräten gelöscht. Das lässt sich nicht rückgängig machen.`,
  },
});
