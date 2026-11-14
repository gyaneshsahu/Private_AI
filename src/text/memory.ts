// Memory across chats, on the device (docs/memory-20261114.md).
import { defineText } from "./core";
import type { MemoryProblem } from "../memory";

export const memoryText = defineText({
  en: {
    title: "Memory",
    intro:
      "CometRow can remember what you ask it to remember, for all your chats. Memories are stored only on this device, inside your encrypted vault. Our server stores none of them and keeps no profile of you.",
    sentNote:
      "When a memory fits your question, it is sent to the protected model together with that question. Email addresses, phone numbers, bank details and similar identifiers in a memory are masked first, like in any message. Under each answer you can see which memories were sent. Think twice before you save health details or other very personal facts.",
    notUsed:
      "Memory is not used in incognito chats or while the vault is locked. You can also switch it off for one chat in that chat's menu.",
    locked:
      "Unlock your vault to use memory. Until then no memory is read, saved or sent. You unlock the vault under Saved.",
    addLabel: "New memory",
    addHint: "For example: I am vegetarian.",
    add: "Add memory",
    count: (count: number, most: number) => `${count} of ${most} memories`,
    length: (count: number, most: number) => `${count} of ${most} characters`,
    search: "Search memories",
    none: "No memories yet. Add one here, or write “Remember that …” in a chat.",
    noMatch: "No memory contains these words.",
    listLabel: "Your memories",
    always: "Always include",
    alwaysHint: (most: number) =>
      `A memory marked “Always include” is sent with every question in chats that use memory. You can mark up to ${most}.`,
    edit: "Edit",
    editLabel: "Edit memory",
    save: "Save",
    cancel: "Cancel",
    delete: "Delete",
    deleteTitle: "Delete this memory?",
    deleteText: "It is removed from this device. This cannot be undone.",
    forgetAll: "Forget all",
    forgetAllTitle: "Forget all memories?",
    forgetAllText: (count: number) =>
      `${count === 1 ? "Your 1 memory is" : `All ${count} memories are`} removed from this device. This cannot be undone. Saved chats stay as they are.`,
    added: "Saved to memory on this device.",
    changed: "Memory changed.",
    deleted: "Memory deleted.",
    forgotten: "All memories are deleted from this device.",
    pinned: "This memory is now sent with every question.",
    unpinned: "This memory is now sent only when it fits the question.",
    problem: (problem: MemoryProblem | "failed") =>
      ({
        empty: "Write something to remember first.",
        long: "A memory can have at most 300 characters. Please shorten it.",
        duplicate: "This memory is already saved.",
        full: "The memory is full (200 memories). Delete one first.",
        pins: "At most 3 memories can be marked “Always include”. Unmark one first.",
        gone: "This memory no longer exists.",
        changed: "The memories were changed in another tab. Please try again.",
        failed: "The memory could not be changed. Nothing was saved.",
      })[problem],
    rememberTitle: "Save as a memory?",
    rememberText:
      "It is stored on this device, in your encrypted vault. It is sent to the protected model with questions it fits. You can change the words first.",
    rememberLocked:
      "Memory needs your unlocked vault, so nothing can be saved now. Unlock the vault under Saved and try again.",
    rememberLabel: "Memory",
    rememberSave: "Save memory",
    rememberSend: "Send as a message instead",
    rememberThis: "Remember this",
    used: (count: number) =>
      count === 1
        ? "1 memory was sent with this question"
        : `${count} memories were sent with this question`,
    usedNow: "The memories are shown as they are now. They were chosen on this device.",
    usedGone: "Not available: deleted, or the vault is locked.",
    chatSwitch: "Use memory in this chat",
    contextRow: "Memory notes",
    // Added to the existing backup and "delete everything" texts while memory is switched on.
    backupAlso: "Your memories are included.",
    eraseAlso: "Your memories are deleted too.",
  },
  de: {
    title: "Gedächtnis",
    intro:
      "CometRow kann sich für alle Ihre Chats merken, was Sie ihm zum Merken geben. Erinnerungen werden nur auf diesem Gerät gespeichert, in Ihrem verschlüsselten Tresor. Unser Server speichert keine davon und führt kein Profil über Sie.",
    sentNote:
      "Passt eine Erinnerung zu Ihrer Frage, wird sie zusammen mit dieser Frage an das geschützte Modell gesendet. E-Mail-Adressen, Telefonnummern, Bankdaten und ähnliche Kennungen in einer Erinnerung werden vorher verborgen, wie in jeder Nachricht. Unter jeder Antwort sehen Sie, welche Erinnerungen gesendet wurden. Überlegen Sie gut, bevor Sie Gesundheitsdaten oder andere sehr persönliche Angaben speichern.",
    notUsed:
      "Das Gedächtnis wird in Inkognito-Chats und bei gesperrtem Tresor nicht verwendet. Sie können es auch für einen einzelnen Chat im Menü dieses Chats ausschalten.",
    locked:
      "Entsperren Sie Ihren Tresor, um das Gedächtnis zu nutzen. Bis dahin wird keine Erinnerung gelesen, gespeichert oder gesendet. Den Tresor entsperren Sie unter „Gespeichert“.",
    addLabel: "Neue Erinnerung",
    addHint: "Zum Beispiel: Ich esse vegetarisch.",
    add: "Erinnerung hinzufügen",
    count: (count: number, most: number) => `${count} von ${most} Erinnerungen`,
    length: (count: number, most: number) => `${count} von ${most} Zeichen`,
    search: "Erinnerungen durchsuchen",
    none: "Noch keine Erinnerungen. Fügen Sie hier eine hinzu oder schreiben Sie in einem Chat „Merk dir, dass …“.",
    noMatch: "Keine Erinnerung enthält diese Wörter.",
    listLabel: "Ihre Erinnerungen",
    always: "Immer mitsenden",
    alwaysHint: (most: number) =>
      `Eine Erinnerung mit „Immer mitsenden“ wird mit jeder Frage gesendet, in allen Chats, die das Gedächtnis nutzen. Sie können bis zu ${most} so markieren.`,
    edit: "Bearbeiten",
    editLabel: "Erinnerung bearbeiten",
    save: "Speichern",
    cancel: "Abbrechen",
    delete: "Löschen",
    deleteTitle: "Diese Erinnerung löschen?",
    deleteText: "Sie wird von diesem Gerät entfernt. Das lässt sich nicht rückgängig machen.",
    forgetAll: "Alles vergessen",
    forgetAllTitle: "Alle Erinnerungen vergessen?",
    forgetAllText: (count: number) =>
      `${count === 1 ? "Ihre 1 Erinnerung wird" : `Alle ${count} Erinnerungen werden`} von diesem Gerät entfernt. Das lässt sich nicht rückgängig machen. Gespeicherte Chats bleiben, wie sie sind.`,
    added: "Auf diesem Gerät im Gedächtnis gespeichert.",
    changed: "Erinnerung geändert.",
    deleted: "Erinnerung gelöscht.",
    forgotten: "Alle Erinnerungen sind von diesem Gerät gelöscht.",
    pinned: "Diese Erinnerung wird jetzt mit jeder Frage gesendet.",
    unpinned: "Diese Erinnerung wird jetzt nur gesendet, wenn sie zur Frage passt.",
    problem: (problem: MemoryProblem | "failed") =>
      ({
        empty: "Schreiben Sie zuerst etwas, das gemerkt werden soll.",
        long: "Eine Erinnerung darf höchstens 300 Zeichen haben. Bitte kürzen Sie sie.",
        duplicate: "Diese Erinnerung ist schon gespeichert.",
        full: "Das Gedächtnis ist voll (200 Erinnerungen). Löschen Sie zuerst eine.",
        pins: "Höchstens 3 Erinnerungen können „Immer mitsenden“ haben. Entfernen Sie zuerst eine Markierung.",
        gone: "Diese Erinnerung gibt es nicht mehr.",
        changed: "Die Erinnerungen wurden in einem anderen Tab geändert. Bitte versuchen Sie es noch einmal.",
        failed: "Die Erinnerung konnte nicht geändert werden. Es wurde nichts gespeichert.",
      })[problem],
    rememberTitle: "Als Erinnerung speichern?",
    rememberText:
      "Sie wird auf diesem Gerät gespeichert, in Ihrem verschlüsselten Tresor. Sie wird mit Fragen, zu denen sie passt, an das geschützte Modell gesendet. Sie können den Wortlaut vorher ändern.",
    rememberLocked:
      "Das Gedächtnis braucht Ihren entsperrten Tresor. Deshalb kann jetzt nichts gespeichert werden. Entsperren Sie den Tresor unter „Gespeichert“ und versuchen Sie es noch einmal.",
    rememberLabel: "Erinnerung",
    rememberSave: "Erinnerung speichern",
    rememberSend: "Stattdessen als Nachricht senden",
    rememberThis: "Merken",
    used: (count: number) =>
      count === 1
        ? "1 Erinnerung wurde mit dieser Frage gesendet"
        : `${count} Erinnerungen wurden mit dieser Frage gesendet`,
    usedNow: "Die Erinnerungen werden im heutigen Wortlaut gezeigt. Sie wurden auf diesem Gerät ausgewählt.",
    usedGone: "Nicht verfügbar: gelöscht, oder der Tresor ist gesperrt.",
    chatSwitch: "Gedächtnis in diesem Chat nutzen",
    contextRow: "Erinnerungen",
    backupAlso: "Ihre Erinnerungen sind enthalten.",
    eraseAlso: "Ihre Erinnerungen werden ebenfalls gelöscht.",
  },
});
