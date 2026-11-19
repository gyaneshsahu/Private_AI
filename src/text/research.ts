// What happened to the top search result page (src/research-result.ts).
import { defineText } from "./core";

export const researchText = defineText({
  en: {
    official: "an official source",
    publicInterest: "a public-interest page (not an official source)",
    other: "a non-official page",
    topOfficial: "the top official result",
    top: "the top result",
    read: (which: string, url: string) => `Our server also opened ${which} and read its text: ${url}`,
    readWithoutQuery: (which: string, url: string) =>
      `Our server also opened ${which} without the part of its address after "?", because that part contained a personal detail: ${url}`,
    skipped: (host: string) =>
      `The top result (${host}) was not opened, because its address contained a personal detail. The answer uses the search excerpts only.`,
    failed: (host: string) =>
      `The top result (${host}) could not be opened. The answer uses the search excerpts only.`,
  },
  de: {
    official: "eine offizielle Quelle",
    publicInterest: "eine Seite von öffentlichem Interesse (keine offizielle Quelle)",
    other: "eine nicht offizielle Seite",
    topOfficial: "den obersten offiziellen Treffer",
    top: "den obersten Treffer",
    read: (which: string, url: string) =>
      `Unser Server hat außerdem ${which} geöffnet und den Text gelesen: ${url}`,
    readWithoutQuery: (which: string, url: string) =>
      `Unser Server hat außerdem ${which} ohne den Teil der Adresse nach "?" geöffnet, weil dieser Teil eine persönliche Angabe enthielt: ${url}`,
    skipped: (host: string) =>
      `Der oberste Treffer (${host}) wurde nicht geöffnet, weil seine Adresse eine persönliche Angabe enthielt. Die Antwort nutzt nur die Auszüge aus der Suche.`,
    failed: (host: string) =>
      `Der oberste Treffer (${host}) konnte nicht geöffnet werden. Die Antwort nutzt nur die Auszüge aus der Suche.`,
  },
});
