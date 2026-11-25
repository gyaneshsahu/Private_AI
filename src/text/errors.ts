// Error states (docs/error-states-20261126.md): one short line where the answer or image would be.
import { defineText } from "./core";

export const errorText = defineText({
  en: {
    generic: "Something went wrong. Your message is safe.",
    timeout: "This took too long. Your message is safe.",
    busy: "CometRow is busy right now. Your message is safe.",
    offline: "You're offline. Your message is safe.",
    stopped: "Stopped by you.",
    partKept: "The part that arrived is kept above. The rest was lost.",
    nothingArrived: "No part of the answer arrived.",
    image: "The image could not be made. Your description is kept.",
    imageOffline: "You're offline. Your description is kept.",
    retry: "Retry",
    whenOnline: "Retry works once you are back online.",
  },
  de: {
    generic: "Etwas ist schiefgegangen. Ihre Nachricht ist sicher.",
    timeout: "Das hat zu lange gedauert. Ihre Nachricht ist sicher.",
    busy: "CometRow ist gerade ausgelastet. Ihre Nachricht ist sicher.",
    offline: "Sie sind offline. Ihre Nachricht ist sicher.",
    stopped: "Von Ihnen gestoppt.",
    partKept: "Der angekommene Teil steht oben. Der Rest ist verloren.",
    nothingArrived: "Von der Antwort ist nichts angekommen.",
    image: "Das Bild konnte nicht erstellt werden. Ihre Beschreibung bleibt erhalten.",
    imageOffline: "Sie sind offline. Ihre Beschreibung bleibt erhalten.",
    retry: "Erneut versuchen",
    whenOnline: "Erneut versuchen geht, sobald Sie wieder online sind.",
  },
});
