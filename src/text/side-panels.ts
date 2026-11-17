// The right-hand panels' wiring in the chat (owner, 17 November): the whiteboard's entries, its chip in
// the message box and its card in the chat, the phone switch, and the "In this chat" button.
import { defineText } from "./core";

export const sidePanelsText = defineText({
  en: {
    whiteboard: "Whiteboard",
    newWhiteboard: "New chat with a whiteboard",
    chip: "Whiteboard goes with your question",
    chipRemove: "Don't send the whiteboard with this question",
    card: "Whiteboard",
    cardOpen: "Open the whiteboard",
    switchChat: "Chat",
    switchLabel: "Show the chat or the whiteboard",
    outputs: "In this chat",
    outputsOpen: "Show everything in this chat",
    boardFailed: "The whiteboard could not be turned into a picture. Remove it from the question or try again.",
  },
  de: {
    whiteboard: "Whiteboard",
    newWhiteboard: "Neuer Chat mit Whiteboard",
    chip: "Das Whiteboard geht mit Ihrer Frage mit",
    chipRemove: "Das Whiteboard nicht mit dieser Frage senden",
    card: "Whiteboard",
    cardOpen: "Whiteboard öffnen",
    switchChat: "Chat",
    switchLabel: "Chat oder Whiteboard zeigen",
    outputs: "In diesem Chat",
    outputsOpen: "Alles aus diesem Chat zeigen",
    boardFailed: "Das Whiteboard konnte nicht in ein Bild umgewandelt werden. Nehmen Sie es aus der Frage heraus oder versuchen Sie es erneut.",
  },
});
