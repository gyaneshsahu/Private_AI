import type { Lang } from "../src/i18n";

/**
 * The one plain-language statement of what CometRow does with your data.
 * The app's privacy panel renders it and the website copies it verbatim
 * (docs/privacy-copy-20261022.md); a test keeps the two identical. Every
 * sentence must be true of the shipped product on the day it is shown, so
 * change this file only together with the behaviour it describes.
 */
export interface PrivacySection {
  id: string;
  heading: string;
  text: string;
}

export const PRIVACY_COPY: readonly PrivacySection[] = [
  {
    id: "device",
    heading: "What stays on your device",
    text: "Before anything is sent, CometRow looks for ID numbers, bank account and card numbers, tax and insurance numbers, passport or ID card numbers next to their label, phone numbers, email addresses and dates of birth next to their label. It replaces each one with a stand-in like {{IBAN-1}} and keeps the real value on your device. The answer comes back with the real values put back in, and a note under the answer tells you what was kept. Names, addresses and other facts written in your own words are not recognised; treat them as part of the sealed question below. An incognito chat is never saved on this device, and disappearing messages are deleted from this device after the time you choose; neither changes what the secure server or our records hold.",
  },
  {
    id: "sealed",
    heading: "What is sealed and sent",
    text: "The rest of your question, your selected files and the earlier messages you included are locked in your browser so that only one secure server can open them. The server is a sealed computer with a protected graphics processor. Before each request your browser checks that it is talking to an approved sealed release; that check is partial today: it cannot tell whether the approval was later withdrawn or how old the evidence is, and the company has given no date for a fuller browser check. Our own systems pass the locked package along and cannot open it.",
  },
  {
    id: "ours",
    heading: "What we can see",
    text: "We can see that your account asked something, when, how many times, which model answered, and afterwards how long the question and answer were and what they cost at published rates. We never see what you asked or what was answered. There is no anonymous mode: every request comes from a signed-in account, incognito chats included, so we only ever know that your account asked, never what. We keep no copy of your conversations; saved history lives only on your device, locked with a password we do not have.",
  },
  {
    id: "provider",
    heading: "What the secure server keeps",
    text: "The company that runs the secure server states that it does not keep your question or answer after the reply is sent and does not use them to train any AI. It keeps a short-term working memory inside the sealed server that can hold parts of recent questions until it clears on its own, usually within minutes, sometimes hours; there is no button that empties it, no promised maximum time, and the company has said it does not plan to add one. It keeps records such as time, model and token counts, without content; the company states it keeps these for 90 days, longer for accounting records.",
  },
  {
    id: "limits",
    heading: "Spending and limits",
    text: "Your plan allows a set number of requests, and only one request runs at a time per account. Spending limits on the secure server are soft: a request that is already running finishes and is billed even if a limit is reached while it runs.",
  },
  {
    id: "research",
    heading: "When you search the web",
    text: "A web search only happens when you approve the exact search text shown to you, in Research or by tapping a search suggestion, or when you have switched on automatic search. Recognised identifiers are removed from that text on your device first, and you are warned if it may still contain a name or other personal detail. That text is sent from our server to the search provider, which can read it and may keep it for up to 90 days; your own address is not sent. Under the same approval, our server also opens the top result page, preferring an official site, and reads its text. That site sees our server's address, not yours. If the page address contains a recognised personal detail, the page is opened without the part that holds it, or not at all. The page text is used only for answers in that conversation and is never saved. If you switch on automatic search, a question that looks time-sensitive is searched without asking each time: recognised identifiers are removed on your device first and the exact text sent is shown to you. The setting is off until you switch it on and is kept only on this device. Search results and their links are shown only during the conversation and are never saved. The written answer built on them is kept in your saved history on this device; a reopened conversation says it came from a live search and offers to search again for current sources, which needs your approval again.",
  },
  {
    id: "notyet",
    heading: "What we cannot promise yet",
    text: "Private chat is switched on only after our checks of the secure server pass. Your browser, your device and anyone who can read your screen can see your conversations. If you lose your password, nobody can recover your saved history. There is no anonymous mode: we know which account asked, never what was asked. A broken or malicious update to this app could read content before it is sealed, which is why updates are published with their exact version.",
  },
];

export type PrivacyProvider = "tinfoil" | "privatemode";

/**
 * DRAFT, NEEDS OWNER APPROVAL (D17). The sections whose provider claims differ for
 * Privatemode: D17's four sentences (cache, metadata retention, spending limits, browser
 * check) plus the fifth from the Stage 3 plan ("What we can see": token counts reach us
 * locked). Sources per claim: docs/provider-promises-20261112.md; old and new side by
 * side in docs/privacy-wording-privatemode-20261112.md. Every other section is shared,
 * except one automatic-search sentence in "When you search the web" (13 November).
 */
export const PRIVATEMODE_PRIVACY_STATUS = "draft-needs-owner-approval";
const PRIVATEMODE_SECTIONS: Readonly<Record<string, string>> = {
  sealed:
    "The rest of your question, your selected files and the earlier messages you included are locked in your browser so that only one secure server can open them. The server is a sealed computer with a protected graphics processor. When you start chatting and again at least every 10 minutes, your browser checks the sealed computer against a release we approved; that check is partial: it does not cover the graphics processor, which the company states it checks on its own side before your question can be opened, and we have not yet confirmed whether the browser check notices an approval that was later withdrawn. Our own systems pass the locked package along and cannot open it.",
  ours:
    "We can see that your account asked something, when, how many times and which model answered. We do not see how long the question and answer were or what each one cost: your browser shows you those counts, but they reach our systems locked. We never see what you asked or what was answered. There is no anonymous mode: every request comes from a signed-in account, incognito chats included, so we only ever know that your account asked, never what. We keep no copy of your conversations; saved history lives only on your device, locked with a password we do not have.",
  provider:
    "The company that runs the secure server states that it does not keep your question or answer after the reply is sent and does not use them to train any AI. It keeps a short-term working memory inside the sealed server that can hold parts of recent questions; each account's memory is kept apart with its own secret, so another account cannot reuse it or tell what it holds. There is no button that empties it and no promised maximum time. It keeps records such as time and token counts, without content; the company states it keeps these for up to 90 days, and keeps token counts per key permanently for billing. We use one key for all accounts, so those permanent counts are not linked to your account.",
  limits:
    "Your plan allows a set number of requests, and only one request runs at a time per account. We also set limits on our key at the secure server; the company states that it enforces them there, so new requests are refused once a limit is reached.",
  // 13 November: automatic search also covers German rules, fees and deadlines, and the narrower
  // "always search" setting covers only those. The approved
  // Tinfoil text is left unchanged for the owner to approve (docs/german-rules-20261113.md).
  // Brave Goggles (13 November): the ranking hint is a fixed list of sites, sent only when the
  // server flag is on, hence "may". Proposed for the owner; the Tinfoil text is unchanged.
  research: PRIVACY_COPY.find((s) => s.id === "research")!
    .text.replace(
      "a question that looks time-sensitive is searched without asking each time:",
      "a question that looks time-sensitive or is about rules, fees or deadlines is searched without asking each time; if you switch on only “Always search for rules, fees and deadlines”, just those questions are:",
    )
    .replace(
      "The setting is off until you switch it on",
      "These settings are off until you switch them on",
    )
    .replace(
      "your own address is not sent.",
      "your own address is not sent. For a question about rules, fees or deadlines, our server may also ask the search provider to rank official sites first, by sending a fixed list of those sites; nothing from you is added.",
    ),
};

/**
 * DRAFT, NEEDS OWNER APPROVAL, LEGAL READ REQUIRED (13 November 2026). The German statement,
 * binding once approved. It must say exactly what the English says, sentence for sentence;
 * tests/legal-text-pairs.test.ts flags a change to either language until the other is checked.
 * UI labels in quotes must match the German interface.
 */
export const PRIVACY_COPY_DE_STATUS = "draft-needs-owner-approval; legal read required";
export const PRIVACY_COPY_DE: readonly PrivacySection[] = [
  {
    id: "device",
    heading: "Was auf Ihrem Gerät bleibt",
    text: "Bevor etwas gesendet wird, sucht CometRow nach Identifikationsnummern, Bankkonto- und Kartennummern, Steuer- und Versicherungsnummern, Pass- oder Personalausweisnummern neben ihrer Bezeichnung, Telefonnummern, E-Mail-Adressen und Geburtsdaten neben ihrer Bezeichnung. Es ersetzt jede davon durch einen Platzhalter wie {{IBAN-1}} und behält den echten Wert auf Ihrem Gerät. Die Antwort kommt mit den wieder eingesetzten echten Werten zurück, und ein Hinweis unter der Antwort sagt Ihnen, was behalten wurde. Namen, Adressen und andere Angaben in Ihren eigenen Worten werden nicht erkannt; betrachten Sie sie als Teil der unten beschriebenen versiegelten Frage. Ein Inkognito-Chat wird nie auf diesem Gerät gespeichert, und selbstlöschende Nachrichten werden nach der von Ihnen gewählten Zeit von diesem Gerät gelöscht; beides ändert nichts daran, was der sichere Server oder unsere Aufzeichnungen enthalten.",
  },
  {
    id: "sealed",
    heading: "Was versiegelt und gesendet wird",
    text: "Der Rest Ihrer Frage, Ihre ausgewählten Dateien und die früheren Nachrichten, die Sie einbezogen haben, werden in Ihrem Browser so verschlossen, dass nur ein einziger sicherer Server sie öffnen kann. Der Server ist ein versiegelter Computer mit einem geschützten Grafikprozessor. Vor jeder Anfrage prüft Ihr Browser, dass er mit einer freigegebenen versiegelten Version spricht; diese Prüfung ist heute unvollständig: Sie kann nicht erkennen, ob die Freigabe später zurückgezogen wurde oder wie alt die Nachweise sind, und das Unternehmen hat kein Datum für eine umfassendere Prüfung im Browser genannt. Unsere eigenen Systeme reichen das verschlossene Paket weiter und können es nicht öffnen.",
  },
  {
    id: "ours",
    heading: "Was wir sehen können",
    text: "Wir können sehen, dass Ihr Konto etwas gefragt hat, wann, wie oft, welches Modell geantwortet hat und danach, wie lang Frage und Antwort waren und was sie zu veröffentlichten Preisen gekostet haben. Wir sehen nie, was Sie gefragt haben oder was geantwortet wurde. Es gibt keinen anonymen Modus: Jede Anfrage kommt von einem angemeldeten Konto, auch bei Inkognito-Chats, daher wissen wir immer nur, dass Ihr Konto gefragt hat, nie was. Wir behalten keine Kopie Ihrer Unterhaltungen; der gespeicherte Verlauf liegt nur auf Ihrem Gerät, verschlossen mit einem Passwort, das wir nicht haben.",
  },
  {
    id: "provider",
    heading: "Was der sichere Server behält",
    text: "Das Unternehmen, das den sicheren Server betreibt, erklärt, dass es Ihre Frage oder Antwort nicht behält, nachdem die Antwort gesendet wurde, und sie nicht zum Training einer KI verwendet. Es hält im versiegelten Server einen Kurzzeitspeicher, der Teile kürzlich gestellter Fragen enthalten kann, bis er sich von selbst leert, meist innerhalb von Minuten, manchmal Stunden; es gibt keine Schaltfläche, die ihn leert, keine zugesagte Höchstdauer, und das Unternehmen hat erklärt, dass es nicht plant, so etwas einzuführen. Es führt Aufzeichnungen wie Zeitpunkt, Modell und Tokenzahlen, ohne Inhalt; nach Angaben des Unternehmens bewahrt es diese 90 Tage auf, Buchhaltungsunterlagen länger.",
  },
  {
    id: "limits",
    heading: "Ausgaben und Grenzen",
    text: "Ihr Tarif erlaubt eine festgelegte Zahl von Anfragen, und pro Konto läuft immer nur eine Anfrage gleichzeitig. Ausgabengrenzen am sicheren Server sind weich: Eine Anfrage, die bereits läuft, wird zu Ende geführt und abgerechnet, auch wenn während ihrer Laufzeit eine Grenze erreicht wird.",
  },
  {
    id: "research",
    heading: "Wenn Sie im Web suchen",
    text: "Eine Websuche findet nur statt, wenn Sie den genauen Suchtext freigeben, der Ihnen angezeigt wird, in der Recherche oder durch Tippen auf einen Suchvorschlag, oder wenn Sie die automatische Suche eingeschaltet haben. Erkannte Kennungen werden zuerst auf Ihrem Gerät aus diesem Text entfernt, und Sie werden gewarnt, wenn er noch einen Namen oder eine andere persönliche Angabe enthalten könnte. Dieser Text wird von unserem Server an den Suchanbieter gesendet, der ihn lesen kann und bis zu 90 Tage aufbewahren kann; Ihre eigene Adresse wird nicht gesendet. Mit derselben Freigabe öffnet unser Server außerdem die oberste Ergebnisseite, bevorzugt eine offizielle Website, und liest ihren Text. Diese Website sieht die Adresse unseres Servers, nicht Ihre. Enthält die Adresse der Seite eine erkannte persönliche Angabe, wird die Seite ohne den Teil geöffnet, der sie enthält, oder gar nicht. Der Seitentext wird nur für Antworten in dieser Unterhaltung verwendet und nie gespeichert. Wenn Sie die automatische Suche einschalten, wird für eine Frage, die zeitabhängig wirkt, gesucht, ohne jedes Mal nachzufragen: Erkannte Kennungen werden zuerst auf Ihrem Gerät entfernt, und der genaue gesendete Text wird Ihnen angezeigt. Die Einstellung ist ausgeschaltet, bis Sie sie einschalten, und wird nur auf diesem Gerät gespeichert. Suchergebnisse und ihre Links werden nur während der Unterhaltung angezeigt und nie gespeichert. Die geschriebene Antwort, die darauf beruht, wird in Ihrem gespeicherten Verlauf auf diesem Gerät behalten; eine wieder geöffnete Unterhaltung sagt, dass sie aus einer Live-Suche stammt, und bietet an, erneut nach aktuellen Quellen zu suchen, wofür wieder Ihre Freigabe nötig ist.",
  },
  {
    id: "notyet",
    heading: "Was wir noch nicht versprechen können",
    text: "Der private Chat wird erst eingeschaltet, nachdem unsere Prüfungen des sicheren Servers bestanden sind. Ihr Browser, Ihr Gerät und alle, die Ihren Bildschirm lesen können, können Ihre Unterhaltungen sehen. Wenn Sie Ihr Passwort verlieren, kann niemand Ihren gespeicherten Verlauf wiederherstellen. Es gibt keinen anonymen Modus: Wir wissen, welches Konto gefragt hat, nie was gefragt wurde. Ein fehlerhaftes oder bösartiges Update dieser App könnte Inhalte lesen, bevor sie versiegelt werden; deshalb werden Updates mit ihrer genauen Version veröffentlicht.",
  },
];

/** The German counterparts of PRIVATEMODE_SECTIONS (draft, legal read required, like both). */
const PRIVATEMODE_SECTIONS_DE: Readonly<Record<string, string>> = {
  sealed:
    "Der Rest Ihrer Frage, Ihre ausgewählten Dateien und die früheren Nachrichten, die Sie einbezogen haben, werden in Ihrem Browser so verschlossen, dass nur ein einziger sicherer Server sie öffnen kann. Der Server ist ein versiegelter Computer mit einem geschützten Grafikprozessor. Wenn Sie zu chatten beginnen und danach mindestens alle 10 Minuten erneut, prüft Ihr Browser den versiegelten Computer anhand einer Version, die wir freigegeben haben; diese Prüfung ist unvollständig: Sie umfasst nicht den Grafikprozessor, den das Unternehmen nach eigenen Angaben auf seiner Seite prüft, bevor Ihre Frage geöffnet werden kann, und wir haben noch nicht bestätigt, ob die Prüfung im Browser eine später zurückgezogene Freigabe bemerkt. Unsere eigenen Systeme reichen das verschlossene Paket weiter und können es nicht öffnen.",
  ours:
    "Wir können sehen, dass Ihr Konto etwas gefragt hat, wann, wie oft und welches Modell geantwortet hat. Wir sehen nicht, wie lang Frage und Antwort waren oder was sie jeweils gekostet haben: Ihr Browser zeigt Ihnen diese Zahlen, aber sie erreichen unsere Systeme verschlossen. Wir sehen nie, was Sie gefragt haben oder was geantwortet wurde. Es gibt keinen anonymen Modus: Jede Anfrage kommt von einem angemeldeten Konto, auch bei Inkognito-Chats, daher wissen wir immer nur, dass Ihr Konto gefragt hat, nie was. Wir behalten keine Kopie Ihrer Unterhaltungen; der gespeicherte Verlauf liegt nur auf Ihrem Gerät, verschlossen mit einem Passwort, das wir nicht haben.",
  provider:
    "Das Unternehmen, das den sicheren Server betreibt, erklärt, dass es Ihre Frage oder Antwort nicht behält, nachdem die Antwort gesendet wurde, und sie nicht zum Training einer KI verwendet. Es hält im versiegelten Server einen Kurzzeitspeicher, der Teile kürzlich gestellter Fragen enthalten kann; der Speicher jedes Kontos wird mit einem eigenen Geheimnis getrennt gehalten, sodass ein anderes Konto ihn nicht wiederverwenden und nicht erkennen kann, was er enthält. Es gibt keine Schaltfläche, die ihn leert, und keine zugesagte Höchstdauer. Es führt Aufzeichnungen wie Zeitpunkt und Tokenzahlen, ohne Inhalt; nach Angaben des Unternehmens bewahrt es diese bis zu 90 Tage auf und bewahrt Tokenzahlen pro Schlüssel dauerhaft für die Abrechnung auf. Wir verwenden einen Schlüssel für alle Konten, daher sind diese dauerhaften Zahlen nicht mit Ihrem Konto verknüpft.",
  limits:
    "Ihr Tarif erlaubt eine festgelegte Zahl von Anfragen, und pro Konto läuft immer nur eine Anfrage gleichzeitig. Wir setzen außerdem Grenzen für unseren Schlüssel am sicheren Server; nach Angaben des Unternehmens setzt es diese dort durch, sodass neue Anfragen abgelehnt werden, sobald eine Grenze erreicht ist.",
  research: replaceEach(PRIVACY_COPY_DE.find((s) => s.id === "research")!.text, [
    [
      "wird für eine Frage, die zeitabhängig wirkt, gesucht, ohne jedes Mal nachzufragen:",
      "wird für eine Frage, die zeitabhängig wirkt oder Regeln, Gebühren oder Fristen betrifft, gesucht, ohne jedes Mal nachzufragen; wenn Sie nur „Bei Regeln, Gebühren und Fristen immer suchen“ einschalten, gilt das nur für diese Fragen:",
    ],
    [
      "Die Einstellung ist ausgeschaltet, bis Sie sie einschalten, und wird nur",
      "Diese Einstellungen sind ausgeschaltet, bis Sie sie einschalten, und werden nur",
    ],
    [
      "Ihre eigene Adresse wird nicht gesendet.",
      "Ihre eigene Adresse wird nicht gesendet. Bei einer Frage zu Regeln, Gebühren oder Fristen kann unser Server den Suchanbieter außerdem bitten, offizielle Websites zuerst einzuordnen, indem er eine feste Liste dieser Websites sendet; nichts von Ihnen wird hinzugefügt.",
    ],
  ]),
};

/** Each replacement must find its text, so an edit to the base text cannot silently drop one. */
function replaceEach(text: string, pairs: readonly [string, string][]): string {
  for (const [from, to] of pairs) {
    if (!text.includes(from)) throw Error(`privacy-copy: German Privatemode text lost "${from}"`);
    text = text.replace(from, to);
  }
  return text;
}

/**
 * The statement for the provider in use; Tinfoil's English is the approved text, unchanged.
 * German (`lang` "de") is a draft for the owner and a legal read (PRIVACY_COPY_DE_STATUS).
 */
export function privacyCopy(
  provider: PrivacyProvider = "tinfoil",
  lang: Lang = "en",
): readonly PrivacySection[] {
  const base = lang === "de" ? PRIVACY_COPY_DE : PRIVACY_COPY;
  if (provider === "tinfoil") return base;
  const replaced = lang === "de" ? PRIVATEMODE_SECTIONS_DE : PRIVATEMODE_SECTIONS;
  return base.map((section) =>
    replaced[section.id] ? { ...section, text: replaced[section.id] } : section,
  );
}

/** Full statement as plain text, headings included, for in-app display and export. */
export function privacyText(provider: PrivacyProvider = "tinfoil", lang: Lang = "en"): string {
  return privacyCopy(provider, lang)
    .map((section) => `${section.heading}\n${section.text}`)
    .join("\n\n");
}

/** One sentence for the settings panel. */
export const PRIVACY_SUMMARY =
  "ID, bank and contact details stay on your device; everything else is sealed so only one checked secure server can read it, and we never can.";
/** DRAFT, NEEDS OWNER APPROVAL, LEGAL READ REQUIRED: the German summary. */
export const PRIVACY_SUMMARY_DE =
  "Identifikations-, Bank- und Kontaktangaben bleiben auf Ihrem Gerät; alles andere wird versiegelt, sodass nur ein einziger geprüfter sicherer Server es lesen kann und wir nie.";
export function privacySummary(lang: Lang = "en"): string {
  return lang === "de" ? PRIVACY_SUMMARY_DE : PRIVACY_SUMMARY;
}
