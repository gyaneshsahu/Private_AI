// Photo-to-text refusals from src/photo-capture.ts.
import { defineText } from "./core";

export const photoText = defineText({
  en: {
    decode: "This image could not be decoded. Choose a PNG or JPEG photo of printed text.",
    encode: "The photo could not be encoded. Try again or choose another photo.",
    canvas: "Canvas drawing is unavailable in this browser, so photos cannot be prepared.",
    empty: "The chosen file is empty.",
    tooLarge: "Choose a photo of at most 10 MB.",
    format: "Choose a PNG or JPEG photo. Other image formats are not supported.",
    typeMismatch: "This file's contents do not match its PNG or JPEG type.",
    sourceTooLarge:
      "Photo exceeds 60 megapixels or 12,000 pixels per side. Resize it before importing.",
  },
  de: {
    decode:
      "Dieses Bild konnte nicht gelesen werden. Wählen Sie ein PNG- oder JPEG-Foto von gedrucktem Text.",
    encode:
      "Das Foto konnte nicht umgewandelt werden. Versuchen Sie es erneut oder wählen Sie ein anderes Foto.",
    canvas:
      "Zeichnen ist in diesem Browser nicht verfügbar, daher können keine Fotos vorbereitet werden.",
    empty: "Die gewählte Datei ist leer.",
    tooLarge: "Wählen Sie ein Foto mit höchstens 10 MB.",
    format: "Wählen Sie ein PNG- oder JPEG-Foto. Andere Bildformate werden nicht unterstützt.",
    typeMismatch: "Der Inhalt dieser Datei passt nicht zu ihrem Typ PNG oder JPEG.",
    sourceTooLarge:
      "Das Foto ist größer als 60 Megapixel oder 12.000 Pixel pro Seite. Verkleinern Sie es vor dem Import.",
  },
});

// The photo-to-text dialog (src/PhotoCapture.tsx).
export const photoUiText = defineText({
  en: {
    camDenied:
      "Camera access was not granted or is blocked by this site's policy. Choose a photo instead.",
    camUnsupported:
      "Camera capture is not supported in this browser or is blocked by this site's policy. Choose a photo instead.",
    camNotFound: "No camera was found on this device. Choose a photo instead.",
    camInUse: "The camera is in use by another app. Close it and try again, or choose a photo.",
    camFailed: "The camera could not be started. Choose a photo instead.",
    camUnavailable: "Camera access is not available in this browser. Choose a photo instead.",
    notReady: "The camera preview is not ready yet.",
    prepareFailed: "The photo could not be prepared.",
    title: "Photo to text",
    close: "Close photo to text",
    intro:
      "Reads printed text from a photo on this device, exactly like an attached PNG screenshot. Handwriting, objects and scenes are not understood. Nothing is uploaded.",
    starting: "Starting camera…",
    useCamera: "Use camera",
    cameraHint: "Asks for camera permission only now. Rear camera preferred on phones.",
    choose: "Choose photo",
    chooseHint: "PNG or JPEG from this device, up to 10 MB.",
    chooseLabel: "Choose a PNG or JPEG photo",
    preview: "Camera preview",
    cameraNote:
      "The camera stays on only while this preview is open. Nothing is kept until you press Take photo.",
    take: "Take photo",
    cancelCamera: "Cancel camera",
    previewLabel: (width: number, height: number, rotation: number) =>
      `Photo preview, ${width} by ${height} pixels, rotated ${rotation} degrees`,
    rotateLeft: "Rotate left",
    rotateRight: "Rotate right",
    cropLegend: "Crop: percent removed from each edge",
    cropFrom: (edge: "left" | "top" | "right" | "bottom") => `Crop from ${edge} (%)`,
    keeps: (cw: number, ch: number, rw: number, rh: number, ow: number, oh: number) =>
      `Keeps ${cw} × ${ch} of ${rw} × ${rh} pixels; saved as a ${ow} × ${oh} PNG.`,
    extraction:
      "Only this cropped, re-encoded PNG is used for local text extraction. Camera metadata such as location, device and time is not kept. The photo itself stays on this device; text read from it is sent with your question only if you include it.",
    preparing: "Preparing photo…",
    use: "Use this photo",
    discard: "Discard",
  },
  de: {
    camDenied:
      "Der Kamerazugriff wurde nicht erlaubt oder ist durch die Richtlinie dieser Website gesperrt. Wählen Sie stattdessen ein Foto.",
    camUnsupported:
      "Kameraaufnahmen werden in diesem Browser nicht unterstützt oder sind durch die Richtlinie dieser Website gesperrt. Wählen Sie stattdessen ein Foto.",
    camNotFound: "Auf diesem Gerät wurde keine Kamera gefunden. Wählen Sie stattdessen ein Foto.",
    camInUse:
      "Die Kamera wird von einer anderen App verwendet. Schließen Sie diese und versuchen Sie es erneut, oder wählen Sie ein Foto.",
    camFailed: "Die Kamera konnte nicht gestartet werden. Wählen Sie stattdessen ein Foto.",
    camUnavailable: "Kamerazugriff ist in diesem Browser nicht verfügbar. Wählen Sie stattdessen ein Foto.",
    notReady: "Die Kameravorschau ist noch nicht bereit.",
    prepareFailed: "Das Foto konnte nicht vorbereitet werden.",
    title: "Foto zu Text",
    close: "Foto zu Text schließen",
    intro:
      "Liest gedruckten Text aus einem Foto auf diesem Gerät, genau wie bei einem angehängten PNG-Screenshot. Handschrift, Gegenstände und Szenen werden nicht erkannt. Es wird nichts hochgeladen.",
    starting: "Kamera wird gestartet…",
    useCamera: "Kamera verwenden",
    cameraHint:
      "Fragt erst jetzt nach der Kameraberechtigung. Auf Smartphones wird die Rückkamera bevorzugt.",
    choose: "Foto auswählen",
    chooseHint: "PNG oder JPEG von diesem Gerät, bis 10 MB.",
    chooseLabel: "PNG- oder JPEG-Foto auswählen",
    preview: "Kameravorschau",
    cameraNote:
      "Die Kamera bleibt nur an, solange diese Vorschau geöffnet ist. Es wird nichts behalten, bis Sie auf „Foto aufnehmen“ drücken.",
    take: "Foto aufnehmen",
    cancelCamera: "Kamera abbrechen",
    previewLabel: (width: number, height: number, rotation: number) =>
      `Fotovorschau, ${width} × ${height} Pixel, um ${rotation} Grad gedreht`,
    rotateLeft: "Nach links drehen",
    rotateRight: "Nach rechts drehen",
    cropLegend: "Zuschneiden: an jedem Rand entfernter Anteil in Prozent",
    cropFrom: (edge: "left" | "top" | "right" | "bottom") =>
      `Von ${{ left: "links", top: "oben", right: "rechts", bottom: "unten" }[edge]} zuschneiden (%)`,
    keeps: (cw: number, ch: number, rw: number, rh: number, ow: number, oh: number) =>
      `Behält ${cw} × ${ch} von ${rw} × ${rh} Pixeln; wird als PNG mit ${ow} × ${oh} Pixeln gespeichert.`,
    extraction:
      "Nur dieses zugeschnittene, neu gespeicherte PNG wird für die lokale Texterkennung verwendet. Kamera-Metadaten wie Standort, Gerät und Zeit werden nicht behalten. Das Foto selbst bleibt auf diesem Gerät; daraus gelesener Text wird nur mit Ihrer Frage gesendet, wenn Sie ihn einbeziehen.",
    preparing: "Foto wird vorbereitet…",
    use: "Dieses Foto verwenden",
    discard: "Verwerfen",
  },
});
