// Projects with instructions and files, on the device (docs/projects-20261114.md).
import { defineText } from "./core";
import type { ProjectProblem } from "../projects";

export const projectText = defineText({
  en: {
    open: "Open project",
    close: "Close project",
    dialog: (name: string) => `Project ${name}`,
    newChat: "New chat in this project",
    rename: "Rename",
    nameLabel: "Project name",
    saveName: "Save name",
    cancel: "Cancel",
    delete: "Delete project",
    deleteTitle: (name: string) => `Delete project “${name}”?`,
    deleteText:
      "The project's instructions and files are deleted from this device. This cannot be undone. Choose what happens to its chats.",
    keepChats: "Keep its chats as ordinary chats",
    deleteChats: (count: number) =>
      count === 1 ? "Delete its 1 chat too" : `Delete its ${count} chats too`,
    deleted: "Project deleted.",
    renamed: "Project renamed.",
    instructions: "Instructions",
    instructionsIntro:
      "Sent with every question in this project's chats. Email addresses, bank details and similar identifiers in them are masked first, like in any message. Not sent in incognito chats or after a chat is moved out of the project. Stored only in your encrypted vault on this device.",
    instructionsHint: "For example: Answer in German. I am preparing a tenancy dispute.",
    length: (count: number, most: number) => `${count} of ${most} characters`,
    saveInstructions: "Save instructions",
    instructionsSaved: "Instructions saved.",
    instructionsCleared: "Instructions removed.",
    chats: "Chats",
    noChats: "No saved chats in this project yet.",
    archived: "archived",
    files: "Files",
    filesIntro:
      "Text documents only. The text is read on this device and kept in your encrypted vault. For each question, the passages that match it best are sent with it, like a large document attached to a chat. Pictures cannot be project files.",
    filesLimits: (files: number, most: number, characters: string, mostCharacters: string) =>
      `${files} of ${most} files · ${characters} of ${mostCharacters} characters`,
    addFile: "Add file",
    reading: "Reading the file on this device…",
    noFiles: "No files in this project yet.",
    fileSize: (characters: string) => `${characters} characters`,
    removeFile: (name: string) => `Remove ${name}`,
    removeFileTitle: (name: string) => `Remove “${name}” from the project?`,
    removeFileText:
      "It is no longer used for questions. Answers that already used it stay as they are.",
    remove: "Remove",
    fileAdded: (name: string) => `“${name}” added to the project.`,
    fileRemoved: "File removed from the project.",
    notInBackup:
      "Project files are in the encrypted backup only when you tick Include project files. Project names and instructions are always included.",
    problem: (problem: ProjectProblem | "failed") =>
      ({
        files: "A project can have at most 20 files. Remove one first.",
        characters:
          "This file does not fit: a project can hold at most 1,500,000 characters of text.",
        vault:
          "This file does not fit: all projects together can hold at most 3,000,000 characters of text.",
        duplicate: "A file with this name is already in the project.",
        image: "Pictures cannot be project files.",
        long: "Instructions can have at most 2,000 characters. Please shorten them.",
        changed: "The project was changed in another tab. Nothing was saved. Please try again.",
        gone: "This project no longer exists.",
        failed: "The project could not be changed. Nothing was saved.",
      })[problem],
    locked: "Unlock your vault to open a project.",
    // Under an answer.
    instructionsSent: "Project instructions were sent with this question.",
    // The context review.
    contextRow: "Project instructions",
    // Added to existing texts while the switch is on.
    removeAlso: "Its instructions and files are deleted.",
    eraseAlso: "Project instructions and files are deleted too.",
    // Per storage mode (forStorage in ./mode-copy): the texts above are the device vault's.
    deleteText_secure:
      "The project's instructions and files are deleted on all your devices. This cannot be undone. Choose what happens to its chats.",
    deleteText_max:
      "The project's instructions and files are deleted on all your devices. This cannot be undone. Choose what happens to its chats.",
    instructionsIntro_secure:
      "Sent with every question in this project's chats. Email addresses, bank details and similar identifiers in them are masked first, like in any message. Not sent in incognito chats or after a chat is moved out of the project. Saved to your account, encrypted while stored.",
    instructionsIntro_max:
      "Sent with every question in this project's chats. Email addresses, bank details and similar identifiers in them are masked first, like in any message. Not sent in incognito chats or after a chat is moved out of the project. Encrypted with a key only you hold.",
    filesIntro_secure:
      "Text documents only. The text is read on this device and saved to your account, encrypted while stored. For each question, the passages that match it best are sent with it. Pictures cannot be project files.",
    filesIntro_max:
      "Text documents only. The text is read on this device and encrypted with a key only you hold. For each question, the passages that match it best are sent with it. Pictures cannot be project files.",
    // Secure has no encrypted backup file: the line is not shown.
    notInBackup_secure: "",
  },
  de: {
    open: "Projekt öffnen",
    close: "Projekt schließen",
    dialog: (name: string) => `Projekt ${name}`,
    newChat: "Neuer Chat in diesem Projekt",
    rename: "Umbenennen",
    nameLabel: "Projektname",
    saveName: "Namen speichern",
    cancel: "Abbrechen",
    delete: "Projekt löschen",
    deleteTitle: (name: string) => `Projekt „${name}“ löschen?`,
    deleteText:
      "Die Anweisungen und Dateien des Projekts werden von diesem Gerät gelöscht. Das lässt sich nicht rückgängig machen. Wählen Sie, was mit seinen Chats geschieht.",
    keepChats: "Seine Chats als normale Chats behalten",
    deleteChats: (count: number) =>
      count === 1 ? "Auch seinen 1 Chat löschen" : `Auch seine ${count} Chats löschen`,
    deleted: "Projekt gelöscht.",
    renamed: "Projekt umbenannt.",
    instructions: "Anweisungen",
    instructionsIntro:
      "Werden mit jeder Frage in den Chats dieses Projekts gesendet. E-Mail-Adressen, Bankdaten und ähnliche Kennungen darin werden vorher verborgen, wie in jeder Nachricht. Nicht in Inkognito-Chats und nicht mehr, wenn ein Chat aus dem Projekt verschoben wurde. Nur in Ihrem verschlüsselten Tresor auf diesem Gerät gespeichert.",
    instructionsHint: "Zum Beispiel: Antworte auf Deutsch. Ich bereite einen Mietstreit vor.",
    length: (count: number, most: number) => `${count} von ${most} Zeichen`,
    saveInstructions: "Anweisungen speichern",
    instructionsSaved: "Anweisungen gespeichert.",
    instructionsCleared: "Anweisungen entfernt.",
    chats: "Chats",
    noChats: "Noch keine gespeicherten Chats in diesem Projekt.",
    archived: "archiviert",
    files: "Dateien",
    filesIntro:
      "Nur Textdokumente. Der Text wird auf diesem Gerät gelesen und in Ihrem verschlüsselten Tresor aufbewahrt. Zu jeder Frage werden die passendsten Abschnitte mitgesendet, wie bei einem großen Dokument im Chat. Bilder können keine Projektdateien sein.",
    filesLimits: (files: number, most: number, characters: string, mostCharacters: string) =>
      `${files} von ${most} Dateien · ${characters} von ${mostCharacters} Zeichen`,
    addFile: "Datei hinzufügen",
    reading: "Die Datei wird auf diesem Gerät gelesen …",
    noFiles: "Noch keine Dateien in diesem Projekt.",
    fileSize: (characters: string) => `${characters} Zeichen`,
    removeFile: (name: string) => `${name} entfernen`,
    removeFileTitle: (name: string) => `„${name}“ aus dem Projekt entfernen?`,
    removeFileText:
      "Sie wird für Fragen nicht mehr verwendet. Antworten, die sie schon verwendet haben, bleiben, wie sie sind.",
    remove: "Entfernen",
    fileAdded: (name: string) => `„${name}“ wurde dem Projekt hinzugefügt.`,
    fileRemoved: "Datei aus dem Projekt entfernt.",
    notInBackup:
      "Projektdateien sind nur dann in der verschlüsselten Sicherung, wenn Sie Projektdateien einschließen ankreuzen. Projektnamen und Anweisungen sind immer enthalten.",
    problem: (problem: ProjectProblem | "failed") =>
      ({
        files: "Ein Projekt kann höchstens 20 Dateien haben. Entfernen Sie zuerst eine.",
        characters:
          "Diese Datei passt nicht: Ein Projekt kann höchstens 1.500.000 Zeichen Text aufnehmen.",
        vault:
          "Diese Datei passt nicht: Alle Projekte zusammen können höchstens 3.000.000 Zeichen Text aufnehmen.",
        duplicate: "Eine Datei mit diesem Namen ist schon im Projekt.",
        image: "Bilder können keine Projektdateien sein.",
        long: "Anweisungen können höchstens 2.000 Zeichen haben. Bitte kürzen Sie sie.",
        changed:
          "Das Projekt wurde in einem anderen Tab geändert. Nichts wurde gespeichert. Bitte versuchen Sie es erneut.",
        gone: "Dieses Projekt gibt es nicht mehr.",
        failed: "Das Projekt konnte nicht geändert werden. Nichts wurde gespeichert.",
      })[problem],
    locked: "Entsperren Sie Ihren Tresor, um ein Projekt zu öffnen.",
    instructionsSent: "Die Projektanweisungen wurden mit dieser Frage gesendet.",
    contextRow: "Projektanweisungen",
    removeAlso: "Seine Anweisungen und Dateien werden gelöscht.",
    eraseAlso: "Projektanweisungen und -dateien werden ebenfalls gelöscht.",
    deleteText_secure:
      "Die Anweisungen und Dateien des Projekts werden auf allen Ihren Geräten gelöscht. Das lässt sich nicht rückgängig machen. Wählen Sie, was mit seinen Chats geschieht.",
    deleteText_max:
      "Die Anweisungen und Dateien des Projekts werden auf allen Ihren Geräten gelöscht. Das lässt sich nicht rückgängig machen. Wählen Sie, was mit seinen Chats geschieht.",
    instructionsIntro_secure:
      "Werden mit jeder Frage in den Chats dieses Projekts gesendet. E-Mail-Adressen, Bankdaten und ähnliche Kennungen darin werden vorher verborgen, wie in jeder Nachricht. Nicht in Inkognito-Chats und nicht mehr, wenn ein Chat aus dem Projekt verschoben wurde. In Ihrem Konto gespeichert, verschlüsselt abgelegt.",
    instructionsIntro_max:
      "Werden mit jeder Frage in den Chats dieses Projekts gesendet. E-Mail-Adressen, Bankdaten und ähnliche Kennungen darin werden vorher verborgen, wie in jeder Nachricht. Nicht in Inkognito-Chats und nicht mehr, wenn ein Chat aus dem Projekt verschoben wurde. Mit einem Schlüssel verschlüsselt, den nur Sie haben.",
    filesIntro_secure:
      "Nur Textdokumente. Der Text wird auf diesem Gerät gelesen und in Ihrem Konto gespeichert, verschlüsselt abgelegt. Zu jeder Frage werden die passendsten Abschnitte mitgesendet. Bilder können keine Projektdateien sein.",
    filesIntro_max:
      "Nur Textdokumente. Der Text wird auf diesem Gerät gelesen und mit einem Schlüssel verschlüsselt, den nur Sie haben. Zu jeder Frage werden die passendsten Abschnitte mitgesendet. Bilder können keine Projektdateien sein.",
    notInBackup_secure: "",
  },
});
