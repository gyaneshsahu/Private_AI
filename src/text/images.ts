// Image questions: the first-upload notice, the cover-up tool, the health question, the composer
// note and failure messages. German has the same keys. The notice must never claim that
// everything personal is masked: suggestions can miss things (docs/images-20261114.md).
import { defineText } from "./core";

export const imageText = defineText({
  en: {
    menu: "Ask about a picture",
    title: "Ask about a picture",
    close: "Close",
    // First upload.
    noteTitle: "Before you send a picture",
    note1:
      "Your picture goes encrypted to the protected Fast model in the EU, over the same checked connection as chat. It is sent once, together with your question.",
    note2:
      "On this device, CometRow first removes the hidden data in the file, such as the place and time a photo was taken, and makes the picture smaller.",
    note3:
      "You can cover parts of the picture with black boxes before you send it. CometRow can suggest boxes for printed details such as email addresses, phone numbers and bank numbers. These suggestions can miss things. Faces, handwriting and anything else the picture shows are not covered unless you cover them yourself.",
    note4:
      "CometRow does not store the picture: not on this device, not in saved chats and not on our server. After the answer it is gone. Later messages in the chat do not include it.",
    noteContinue: "Choose a picture",
    noteLater: "Not now",
    // The existing photo dialog, with image wording.
    pickTitle: "Choose a picture",
    pickClose: "Close without a picture",
    pickIntro:
      "Take a photo or choose a picture from this device. You can turn and crop it here. In the next step you can cover parts of it before anything is sent.",
    pickExtraction:
      "Only this cropped picture is used. Hidden data in the file, such as location, device and time, is not kept. Nothing has been sent yet.",
    pickUse: "Next: cover private parts",
    // Health and other sensitive details.
    healthTitle: "Does this picture show health or other sensitive details?",
    healthText:
      "For example a medical letter, a prescription, a lab result, a skin or body photo, or something about religion, sexual life or ethnic origin. CometRow cannot tell what a picture shows, so it asks you.",
    healthYes: "Yes, it does",
    healthNo: "No, it does not",
    healthDeclined:
      "The picture was not attached, because you did not allow health or other sensitive details. Nothing was sent. You can change your choice in Settings, Privacy & data.",
    // The cover-up tool.
    redactIntro:
      "Drag on the picture to draw a black box over anything private. The boxes become part of the picture: what is under them is not sent.",
    canvasLabel: (width: number, height: number, boxes: number) =>
      `Picture to send, ${width} by ${height} pixels, ${boxes} black ${boxes === 1 ? "box" : "boxes"}`,
    keyboardHelp:
      "Keyboard: press Add a box, then move the chosen box with the arrow keys. Hold Shift and press the arrow keys to change its size. Delete removes it.",
    addBox: "Add a box",
    undo: "Undo",
    clear: "Remove all boxes",
    boxList: "Black boxes",
    box: (number: number, kind?: string) => `Box ${number}${kind ? `, suggested: ${kind}` : ""}`,
    removeBox: (number: number) => `Remove box ${number}`,
    face: "face",
    boxAdded: (count: number) => `Box added. ${count} in all.`,
    boxRemoved: (count: number) => `Box removed. ${count} left.`,
    boxMoved: (left: number, top: number, width: number, height: number) =>
      `Box at ${left}% from the left and ${top}% from the top, ${width}% wide and ${height}% high.`,
    suggest: "Suggest boxes",
    suggestHint:
      "Reads the printed text on this device and proposes boxes for email addresses, phone numbers, bank and ID numbers. The first time, this downloads about 21 MB of reading data from CometRow. The picture is not sent for this.",
    suggesting: "Reading the text on this device…",
    suggested: (count: number) =>
      `${count} ${count === 1 ? "box" : "boxes"} suggested and added. Check the picture: remove boxes you do not want, and add boxes for anything that was missed. Suggestions can miss things.`,
    suggestedNone:
      "No box was suggested. That does not mean the picture is free of private details: the reading can miss things. Look at the picture yourself.",
    suggestFailed: "The text could not be read on this device. Draw the boxes yourself.",
    faces: "Cover faces",
    facesHint: "This browser can find faces on the device. Each face found gets a black box. It can miss faces.",
    facesNone: "No face was found. Look at the picture yourself and draw a box over each face.",
    facesFound: (count: number) => `${count} ${count === 1 ? "face" : "faces"} covered. Check the picture: faces can be missed.`,
    facesUnsupported:
      "This browser cannot find faces on the device. To hide a face, draw a box over it.",
    preview: "Next: check the picture",
    preparing: "Preparing the picture…",
    // The exact picture.
    checkTitle: "This is exactly what will be sent",
    checkLabel: "The picture exactly as it will be sent",
    checkFacts: (width: number, height: number, kilobytes: number) =>
      `${width} by ${height} pixels, ${kilobytes} KB. Hidden file data is removed. Black boxes are part of the picture.`,
    thinkingNote:
      "You chose Thinking. Pictures are read by the Fast model, so this answer comes from Fast.",
    attach: "Attach to my message",
    back: "Back to covering",
    discard: "Discard the picture",
    // The composer.
    attachedLabel: "Picture attached to your next message",
    attachedNote:
      "Sent once with your next message and read by the Fast model. It is not kept. Later messages do not include it.",
    remove: "Remove the picture",
    needQuestion: "Type your question about the picture, then press Send.",
    attachedNotice: "Picture attached. Type your question and press Send.",
    removedNotice: "Picture removed. Nothing was sent.",
    // In the chat.
    notKept: "[Picture: not kept]",
    readByFast: "pictures are read by the Fast model",
    // Failures.
    prepareFailed: "The picture could not be prepared. Nothing was sent.",
    tooLarge: "This picture is too detailed to send even after it was made smaller. Crop it to the part you are asking about. Nothing was sent.",
  },
  de: {
    menu: "Frage zu einem Bild stellen",
    title: "Frage zu einem Bild stellen",
    close: "Schließen",
    noteTitle: "Bevor Sie ein Bild senden",
    note1:
      "Ihr Bild geht verschlüsselt an das geschützte Modell „Schnell“ in der EU, über dieselbe geprüfte Verbindung wie der Chat. Es wird einmal gesendet, zusammen mit Ihrer Frage.",
    note2:
      "Auf diesem Gerät entfernt CometRow zuerst die verborgenen Daten in der Datei, etwa Ort und Zeit der Aufnahme, und verkleinert das Bild.",
    note3:
      "Sie können Teile des Bildes vor dem Senden mit schwarzen Kästen abdecken. CometRow kann Kästen für gedruckte Angaben vorschlagen, etwa E-Mail-Adressen, Telefonnummern und Kontonummern. Diese Vorschläge können etwas übersehen. Gesichter, Handschrift und alles andere im Bild werden nicht abgedeckt, wenn Sie es nicht selbst abdecken.",
    note4:
      "CometRow speichert das Bild nicht: nicht auf diesem Gerät, nicht in gespeicherten Chats und nicht auf unserem Server. Nach der Antwort ist es weg. Spätere Nachrichten im Chat enthalten es nicht.",
    noteContinue: "Bild auswählen",
    noteLater: "Jetzt nicht",
    pickTitle: "Bild auswählen",
    pickClose: "Ohne Bild schließen",
    pickIntro:
      "Nehmen Sie ein Foto auf oder wählen Sie ein Bild von diesem Gerät. Sie können es hier drehen und zuschneiden. Im nächsten Schritt können Sie Teile abdecken, bevor etwas gesendet wird.",
    pickExtraction:
      "Nur dieses zugeschnittene Bild wird verwendet. Verborgene Daten in der Datei, etwa Ort, Gerät und Zeit, werden nicht behalten. Es wurde noch nichts gesendet.",
    pickUse: "Weiter: Privates abdecken",
    healthTitle: "Zeigt dieses Bild Gesundheitsangaben oder andere sensible Angaben?",
    healthText:
      "Zum Beispiel einen Arztbrief, ein Rezept, einen Laborbefund, ein Foto von Haut oder Körper oder etwas zu Religion, Sexualleben oder ethnischer Herkunft. CometRow kann den Inhalt eines Bildes nicht erkennen und fragt deshalb Sie.",
    healthYes: "Ja",
    healthNo: "Nein",
    healthDeclined:
      "Das Bild wurde nicht angehängt, weil Sie Gesundheitsangaben oder andere sensible Angaben nicht erlaubt haben. Es wurde nichts gesendet. Sie können Ihre Wahl unter Einstellungen, Datenschutz & Daten ändern.",
    redactIntro:
      "Ziehen Sie auf dem Bild, um einen schwarzen Kasten über Privates zu legen. Die Kästen werden Teil des Bildes: Der Bereich darunter wird nicht gesendet.",
    canvasLabel: (width: number, height: number, boxes: number) =>
      `Bild zum Senden, ${width} mal ${height} Pixel, ${boxes} ${boxes === 1 ? "schwarzer Kasten" : "schwarze Kästen"}`,
    keyboardHelp:
      "Tastatur: Drücken Sie „Kasten hinzufügen“ und bewegen Sie den gewählten Kasten mit den Pfeiltasten. Mit Umschalt und den Pfeiltasten ändern Sie die Größe. Entf entfernt ihn.",
    addBox: "Kasten hinzufügen",
    undo: "Rückgängig",
    clear: "Alle Kästen entfernen",
    boxList: "Schwarze Kästen",
    box: (number: number, kind?: string) => `Kasten ${number}${kind ? `, Vorschlag: ${kind}` : ""}`,
    removeBox: (number: number) => `Kasten ${number} entfernen`,
    face: "Gesicht",
    boxAdded: (count: number) => `Kasten hinzugefügt. Insgesamt ${count}.`,
    boxRemoved: (count: number) => `Kasten entfernt. Noch ${count}.`,
    boxMoved: (left: number, top: number, width: number, height: number) =>
      `Kasten ${left} % von links und ${top} % von oben, ${width} % breit und ${height} % hoch.`,
    suggest: "Kästen vorschlagen",
    suggestHint:
      "Liest den gedruckten Text auf diesem Gerät und schlägt Kästen für E-Mail-Adressen, Telefonnummern, Konto- und Ausweisnummern vor. Beim ersten Mal werden dafür etwa 21 MB Lesedaten von CometRow geladen. Das Bild wird dafür nicht gesendet.",
    suggesting: "Der Text wird auf diesem Gerät gelesen …",
    suggested: (count: number) =>
      `${count} ${count === 1 ? "Kasten" : "Kästen"} vorgeschlagen und hinzugefügt. Prüfen Sie das Bild: Entfernen Sie Kästen, die Sie nicht möchten, und fügen Sie Kästen für Übersehenes hinzu. Vorschläge können etwas übersehen.`,
    suggestedNone:
      "Es wurde kein Kasten vorgeschlagen. Das heißt nicht, dass das Bild frei von privaten Angaben ist: Beim Lesen kann etwas übersehen werden. Sehen Sie sich das Bild selbst an.",
    suggestFailed: "Der Text konnte auf diesem Gerät nicht gelesen werden. Zeichnen Sie die Kästen selbst.",
    faces: "Gesichter abdecken",
    facesHint:
      "Dieser Browser kann Gesichter auf dem Gerät finden. Jedes gefundene Gesicht bekommt einen schwarzen Kasten. Gesichter können übersehen werden.",
    facesNone: "Es wurde kein Gesicht gefunden. Sehen Sie sich das Bild selbst an und legen Sie einen Kasten über jedes Gesicht.",
    facesFound: (count: number) =>
      `${count} ${count === 1 ? "Gesicht" : "Gesichter"} abgedeckt. Prüfen Sie das Bild: Gesichter können übersehen werden.`,
    facesUnsupported:
      "Dieser Browser kann Gesichter nicht auf dem Gerät finden. Um ein Gesicht zu verbergen, legen Sie einen Kasten darüber.",
    preview: "Weiter: Bild prüfen",
    preparing: "Das Bild wird vorbereitet …",
    checkTitle: "Genau das wird gesendet",
    checkLabel: "Das Bild genau so, wie es gesendet wird",
    checkFacts: (width: number, height: number, kilobytes: number) =>
      `${width} mal ${height} Pixel, ${kilobytes} KB. Verborgene Dateidaten sind entfernt. Schwarze Kästen sind Teil des Bildes.`,
    thinkingNote:
      "Sie haben „Gründlich“ gewählt. Bilder liest das Modell „Schnell“, deshalb kommt diese Antwort von „Schnell“.",
    attach: "An meine Nachricht anhängen",
    back: "Zurück zum Abdecken",
    discard: "Bild verwerfen",
    attachedLabel: "Bild an Ihrer nächsten Nachricht",
    attachedNote:
      "Wird einmal mit Ihrer nächsten Nachricht gesendet und vom Modell „Schnell“ gelesen. Es wird nicht behalten. Spätere Nachrichten enthalten es nicht.",
    remove: "Bild entfernen",
    needQuestion: "Tippen Sie Ihre Frage zum Bild und drücken Sie dann auf Senden.",
    attachedNotice: "Bild angehängt. Tippen Sie Ihre Frage und drücken Sie auf Senden.",
    removedNotice: "Bild entfernt. Es wurde nichts gesendet.",
    notKept: "[Bild: nicht behalten]",
    readByFast: "Bilder liest das Modell „Schnell“",
    prepareFailed: "Das Bild konnte nicht vorbereitet werden. Es wurde nichts gesendet.",
    tooLarge:
      "Dieses Bild ist auch verkleinert zu detailreich zum Senden. Schneiden Sie es auf den Teil zu, um den es Ihnen geht. Es wurde nichts gesendet.",
  },
});
