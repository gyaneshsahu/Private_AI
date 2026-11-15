// Project files synced as encrypted blobs (docs/vault-sync-20261115.md, "Stage 3: project files").
// Shown in the project screen only while file sync is on for this device.
import { defineText } from "./core";

type Reason = "offline" | "gone" | "damaged" | "server" | "full";

export const syncFilesText = defineText({
  en: {
    intro:
      "Files are encrypted on this device and synced to your other devices. Another device downloads a file when it is opened or used in a chat.",
    quota: (used: string, limit: string, left: string) => `Synced files: ${used} of ${limit} used, ${left} left`,
    notDownloaded: "Not downloaded yet",
    download: "Download",
    downloadFile: (name: string) => `Download ${name}`,
    retryFile: (name: string) => `Try downloading ${name} again`,
    retry: "Try again",
    downloading: (percent: number) => `Downloading… ${percent} %`,
    progressLabel: (name: string) => `Download of ${name}`,
    downloaded: (name: string) => `“${name}” downloaded.`,
    waiting: "Waiting to sync",
    uploading: "Uploading…",
    tooLarge: (limit: string) => `Too large to sync (limit ${limit}). It stays on this device.`,
    full: "Not synced: your file storage is full. Remove files to make room.",
    error: (reason: Reason) =>
      ({
        offline: "Download failed: no connection. Try again when you are online.",
        gone: "This file is no longer available. It was probably removed on another device.",
        damaged: "The download did not match the file and was discarded. Try again.",
        server: "Download failed. Try again later.",
        full: "This project already has as many files as it can hold on this device.",
      })[reason],
    removeText: "It is removed from all your devices. Answers that already used it stay as they are.",
  },
  de: {
    intro:
      "Dateien werden auf diesem Gerät verschlüsselt und mit Ihren anderen Geräten synchronisiert. Ein anderes Gerät lädt eine Datei herunter, wenn sie geöffnet oder in einem Chat verwendet wird.",
    quota: (used: string, limit: string, left: string) => `Synchronisierte Dateien: ${used} von ${limit} belegt, ${left} frei`,
    notDownloaded: "Noch nicht heruntergeladen",
    download: "Herunterladen",
    downloadFile: (name: string) => `${name} herunterladen`,
    retryFile: (name: string) => `${name} erneut herunterladen`,
    retry: "Erneut versuchen",
    downloading: (percent: number) => `Wird heruntergeladen … ${percent} %`,
    progressLabel: (name: string) => `Download von ${name}`,
    downloaded: (name: string) => `„${name}“ wurde heruntergeladen.`,
    waiting: "Wartet auf Synchronisierung",
    uploading: "Wird hochgeladen …",
    tooLarge: (limit: string) => `Zu groß zum Synchronisieren (Grenze ${limit}). Sie bleibt auf diesem Gerät.`,
    full: "Nicht synchronisiert: Ihr Dateispeicher ist voll. Entfernen Sie Dateien, um Platz zu schaffen.",
    error: (reason: Reason) =>
      ({
        offline: "Download fehlgeschlagen: keine Verbindung. Versuchen Sie es erneut, wenn Sie online sind.",
        gone: "Diese Datei ist nicht mehr verfügbar. Sie wurde wahrscheinlich auf einem anderen Gerät entfernt.",
        damaged: "Der Download passte nicht zur Datei und wurde verworfen. Versuchen Sie es erneut.",
        server: "Download fehlgeschlagen. Versuchen Sie es später erneut.",
        full: "Dieses Projekt hat auf diesem Gerät schon so viele Dateien, wie es aufnehmen kann.",
      })[reason],
    removeText: "Sie wird von all Ihren Geräten entfernt. Antworten, die sie schon verwendet haben, bleiben, wie sie sind.",
  },
});
