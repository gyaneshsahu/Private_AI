// Code execution on this device (docs/code-execution-20261114.md): the status line while code
// runs, the mark on the answer and the notes when the code could not run. German has the same keys.
import { defineText } from "./core";

export const codeText = defineText({
  en: {
    calculating: "Calculating on your device…",
    used: "Calculated with code on this device",
    show: "Show the code and its output",
    code: "Python code",
    output: "Output",
    codeError: "This code ended with an error:",
    failed:
      "Code was tried on this device but ended with an error. The figures in this answer were not calculated with code. Please check them.",
    notRun:
      "The calculation was not run on this device: the calculator could not start in this browser. The figures in this answer were not calculated with code. Please check them.",
    tooLarge: "Selected context including the code tool is too large. Nothing was sent.",
    tooLargeFollowUp: "The code and its output made the context too large to continue. No final answer was received.",
    tooManyRounds: "The calculation needed more steps than allowed and gave no final answer.",
  },
  de: {
    calculating: "Wird auf Ihrem Gerät berechnet…",
    used: "Mit Code auf diesem Gerät berechnet",
    show: "Code und Ausgabe anzeigen",
    code: "Python-Code",
    output: "Ausgabe",
    codeError: "Dieser Code endete mit einem Fehler:",
    failed:
      "Auf diesem Gerät wurde Code versucht, er endete aber mit einem Fehler. Die Zahlen in dieser Antwort wurden nicht mit Code berechnet. Bitte prüfen Sie sie.",
    notRun:
      "Die Berechnung lief nicht auf diesem Gerät: Der Rechner konnte in diesem Browser nicht starten. Die Zahlen in dieser Antwort wurden nicht mit Code berechnet. Bitte prüfen Sie sie.",
    tooLarge: "Der ausgewählte Kontext ist mit dem Code-Werkzeug zu groß. Es wurde nichts gesendet.",
    tooLargeFollowUp: "Code und Ausgabe machten den Kontext zu groß, um fortzufahren. Es kam keine endgültige Antwort.",
    tooManyRounds: "Die Berechnung brauchte mehr Schritte als erlaubt und ergab keine Antwort.",
  },
});
