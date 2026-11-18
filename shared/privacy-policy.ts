import type { Lang } from "../src/i18n";
import {
  PRIVACY_COPY,
  PRIVACY_COPY_DE,
  privacyCopy,
  type PrivacySection,
} from "./privacy-copy";
import { LEGAL_IDENTITY, identityDe } from "./legal-identity";
import {
  providerDisclosureSection,
  type DisclosedProvider,
} from "./provider-disclosure";
import { PRIVACY_VERSION, TERMS_VERSION } from "./legal-versions";

/**
 * The in-app privacy policy page. It is built from the privacy statement so
 * the two can never disagree, plus the deletion path and contact sections.
 * Items the owner has not yet decided are stated as not yet named rather than
 * invented. `docs/privacy-policy-20261022.md` is generated from this file.
 * 18 November 2026 (version PRIVACY_VERSION): consent now comes from one acceptance at sign-up,
 * so the facts that used to be on screens (health data, partners, where data goes) live here.
 * DRAFT for the legal read; sources per fact are listed in docs/legal-read-consent-20261118.md.
 */
export const POLICY_DATE = "18 November 2026";

/**
 * The sections added on 18 November, per provider (the AI provider's name and place differ).
 * Privatemode is the alpha's provider (owner, 12 November), so it is also the default.
 */
function draftSections(provider: DisclosedProvider, lang: Lang): PrivacySection[] {
  const email = LEGAL_IDENTITY.privacyContactEmail;
  if (lang === "de") {
    const ai =
      provider === "tinfoil"
        ? { name: "Tinfoil, Inc. (USA)", where: "den USA" }
        : { name: "Privatemode (Edgeless Systems GmbH, Deutschland)", where: "der EU" };
    return [
      {
        id: "sensitive",
        heading: "Gesundheitsangaben und andere sensible Angaben in Ihren Chats",
        text: `Sie können über Ihre Gesundheit, Ihr Sexualleben, Ihre Religion, Ihre politischen Ansichten, Ihre ethnische Herkunft, eine Gewerkschaftszugehörigkeit oder andere besondere Kategorien personenbezogener Daten (Art. 9 DSGVO) schreiben, über sich selbst oder über andere Personen. CometRow behandelt diese Angaben wie den Rest Ihrer Nachricht: Sie wird auf Ihrem Gerät verschlüsselt und an den geschützten Dienst von ${ai.name} in ${ai.where} gesendet, der die Antwort schreibt. Die Maskierung auf Ihrem Gerät erfasst Kennungen wie E-Mail-Adressen, Telefonnummern, Bank- und Kartennummern und Ausweisnummern. Gesundheitsangaben, Diagnosen, Medikamente, Namen und andere Angaben in Ihren eigenen Worten werden nicht maskiert; sie erreichen den sicheren Server in der verschlüsselten Nachricht. Gespeicherte Chats mit solchen Angaben werden wie jeder andere Chat in dem von Ihnen gewählten Modus gespeichert (siehe „Secure, Secure Max und Inkognito“). Wir nutzen sie nicht für Werbung und nicht zum Training einer KI, und wir fragen nicht gesondert danach. Wenn Sie über die Gesundheit einer anderen Person schreiben, achten Sie darauf, dass Sie das dürfen. [Rechtsgrundlage: für die rechtliche Prüfung, siehe „Rechtsgrundlagen“.]`,
      },
      {
        id: "partners",
        heading: "Mit wem wir zusammenarbeiten",
        text: [
          "Diese Unternehmen verarbeiten Daten für uns, jedes nur für die genannte Funktion. [Für die rechtliche Prüfung: Ein Auftragsverarbeitungsvertrag besteht mit Privatemode; für die anderen ist er abzuschließen oder zu prüfen.]",
          `• KI-Antworten, Sprache zu Text und Fragen zu Bildern: ${ai.name}, versiegelte und geprüfte Verarbeitung in ${ai.where}.`,
          "• Websuche und Recherche: Brave Search (Brave Software), USA. [Für die rechtliche Prüfung: Grundlage der Übermittlung in die USA; Brave erklärt, dass sein Auftragsverarbeitungsvertrag Suchanfragen nicht abdeckt.]",
          "• Bilderstellung (ausgeschaltet, solange sie nicht eingeschaltet wird): Der Anbieter ist noch nicht gewählt; in Frage kommen Microsoft (Foundry, EU-Datenzone), Google (Vertex AI, EU-Region) und Black Forest Labs (Deutschland, EU-Endpunkt). [Zu bestätigen, bevor die Funktion eingeschaltet wird: Anbieter, Region, Aufbewahrung und ob er Beschreibungen zum Training nutzen darf.]",
          "• Anmeldung: Google, wenn Sie „Weiter mit Google“ wählen. [Zu bestätigen: welches Google-Unternehmen und wo.]",
          "• Hosting und Datenbank: Render, Frankfurt, Deutschland; den Netzwerkrand von Render betreibt Cloudflare. [Zu bestätigen: Übermittlungsgrundlagen und Aufbewahrung der Protokolle bei Render und Cloudflare.]",
          "• Projektdateien, wenn die Dateiablage eingeschaltet ist: Hetzner Object Storage, Deutschland. [Zu bestätigen: ob sie eingeschaltet ist; bis dahin liegen Dateien verschlüsselt in unserer Datenbank bei Render.]",
        ].join("\n"),
      },
      {
        id: "flows",
        heading: "Wohin Ihre Daten gehen, Funktion für Funktion",
        text: [
          "Für jede Funktion: was gesendet wird; an wen und wohin; wie lange es aufbewahrt wird; wer es lesen kann.",
          `• Chat (Text, als Text angehängte Dateien, in einer Frage verwendete Erinnerungen und Projektanweisungen): Ihre Nachricht nach der Maskierung, auf Ihrem Gerät verschlüsselt; an ${ai.name} in ${ai.where}; nach der Antwort nicht aufbewahrt, abgesehen vom Kurzzeitspeicher und von Aufzeichnungen ohne Inhalt (siehe „Was der sichere Server behält“); lesbar nur im versiegelten Server.`,
          "• Fragen zu einem Bild und das Whiteboard: das Bild einmal (versteckte Dateidaten wie der Ort werden auf Ihrem Gerät entfernt; das Whiteboard wird als Bild mit seinen getippten Wörtern gesendet), zusammen mit Ihrer Frage; wie beim Chat; CometRow bewahrt das gesendete Bild nicht auf; lesbar nur im versiegelten Server. Das Whiteboard selbst wird mit dem Chat gespeichert und so verschlüsselt wie der Chat.",
          `• Diktat und Sprachunterhaltung: die Aufnahme dessen, was Sie sagen, verschlüsselt, an das Sprachmodell von ${ai.name} in ${ai.where}; Zahlen und andere Angaben, die Sie laut sagen, werden nicht maskiert, weil die Maskierung nur bei Text wirkt; CometRow bewahrt keine Aufnahme auf, weder auf Ihrem Gerät noch auf unserem Server; lesbar nur im versiegelten Server.`,
          "• Vorlesen, Foto zu Text, Code ausführen, Suche in Ihren Chats: nur auf Ihrem Gerät; nichts wird gesendet.",
          "• Websuche und Recherche: nur der Suchtext, den Sie freigegeben haben, nachdem Kennungen auf Ihrem Gerät ersetzt wurden; von unserem Server an Brave Search in den USA; unser Server öffnet außerdem die oberste Ergebnisseite oder eine Seitenadresse, die Sie freigegeben haben, und diese Website sieht die Adresse unseres Servers, nicht Ihre; Brave erklärt, Suchaufzeichnungen bis zu 90 Tage aufzubewahren, der Seitentext wird nicht gespeichert; Brave kann den Suchtext lesen.",
          "• Bilderstellung (wenn eingeschaltet): nur die Beschreibung, die Sie getippt haben, mit auf Ihrem Gerät maskierten Kennungen, nie Ihre Chats oder Fotos; an den Bildanbieter [zu bestätigen: Name und Region]; CometRow bewahrt weder Beschreibung noch Bild auf seinem Server auf, das Bild wird in Ihrem Chat gespeichert; der Anbieter kann die Beschreibung lesen [zu bestätigen: seine Aufbewahrung und seine Bedingungen zum Training].",
          "• Gespeicherte Chats, Erinnerungen, Projekte, Dateien, Canvas und Whiteboard in Secure (Standard): verschlüsselt auf unseren Servern bei Render in Frankfurt, Deutschland, gespeichert, mit einem Schlüssel, den CometRow für Ihr Konto hält; bis Sie sie löschen oder Ihr Konto schließen; CometRow könnte sie mit diesem Schlüssel technisch öffnen, keine Funktion des Dienstes tut das; wir sehen Konto, Zeitpunkte sowie Anzahl und Größe der Einträge.",
          "• Gespeicherte Chats in Secure Max: auf Ihren Geräten Ende-zu-Ende-verschlüsselt; auf unseren Servern nur als Daten gespeichert, die wir nicht öffnen können; bis Sie sie löschen oder Ihr Konto schließen; den Schlüssel haben nur Ihre Geräte.",
          "• Inkognito-Chats: wie jeder Chat gesendet; nie auf Ihrem Gerät oder unserem Server gespeichert; der sichere Server und unsere Anfrageaufzeichnungen behandeln sie wie jeden Chat.",
          "• Anmeldung: Ihre E-Mail-Adresse und, wenn Sie Google nutzen, Ihre Google-Kontokennung sowie Sitzungen (ohne IP-Adresse oder Browserkennung); bei Render in Frankfurt; Sitzungen 1 Stunde nach der letzten Nutzung, das Konto bis zu seiner Schließung; Google erfährt, dass Sie sich bei CometRow angemeldet haben.",
          "• Anfrageaufzeichnungen: welches Konto gefragt hat, wann, wie oft und welches Modell, nie Inhalte; bei Render in Frankfurt; 90 Tage, dann gelöscht; lesbar für CometRow.",
          "• E-Mails an unseren Support: so lange, wie es zur Beantwortung nötig ist [zu bestätigen: E-Mail-Anbieter und Aufbewahrung].",
        ].join("\n"),
      },
      {
        id: "modes",
        heading: "Secure, Secure Max und Inkognito",
        text: "Secure ist der Standard. Ihre gespeicherten Chats, Erinnerungen, Projekte und Dateien liegen verschlüsselt auf unseren Servern, mit einem Schlüssel, den CometRow für Ihr Konto erzeugt und unter einem Hauptschlüssel verschlossen hält, der nicht in der Datenbank liegt. So können Sie Ihre Chats auf jedem Gerät ohne Passphrase nutzen. Weil CometRow den Schlüssel hält, könnten wir diese Inhalte technisch öffnen; kein Teil des Dienstes tut das, und unsere Systeme protokollieren keine Inhalte. Secure Max ist freiwillig: Inhalte werden auf Ihren Geräten mit einem Schlüssel verschlüsselt, den nur Ihre Geräte und Ihr Wiederherstellungsschlüssel haben. Wir können sie nicht öffnen. Wenn Sie Ihre Passphrase und Ihren Wiederherstellungsschlüssel verlieren, kann niemand sie wiederherstellen. Inkognito-Chats werden nirgends gespeichert. Keiner der drei Modi ändert, was für eine Antwort an den sicheren Server gesendet wird, oder die Anfrageaufzeichnungen, die wir führen. Wenn Ihr Konto gelöscht wird, werden sein Schlüssel und die verschlüsselten Kopien mit ihm gelöscht. [Zu bestätigen: ob und wie lange Sicherungskopien der Datenbank bestehen bleiben.]",
      },
      {
        id: "consent",
        heading: "Wie Sie dieser Datenschutzerklärung zustimmen",
        text: `Auf der Anmeldeseite steht: „Indem Sie fortfahren, stimmen Sie unseren Nutzungsbedingungen und unserer Datenschutzerklärung zu.“ Wenn Sie sich anmelden, speichern wir zu Ihrem Konto, welche Version der Nutzungsbedingungen und dieser Datenschutzerklärung Sie angenommen haben (diese Datenschutzerklärung: Version ${PRIVACY_VERSION}; Nutzungsbedingungen: Version ${TERMS_VERSION}), den Zeitpunkt und die Anmeldeart. Ändert sich einer der Texte wesentlich, ändert sich seine Version, und Ihre nächste Anmeldung speichert die neue Version. Die Aufzeichnung wird mit Ihrem Konto gelöscht. [Für die rechtliche Prüfung: ob die Aufzeichnung als Nachweis nach der Löschung des Kontos aufbewahrt werden muss (Art. 7(1) DSGVO), und wie lange.]`,
      },
      {
        id: "basis",
        heading: "Rechtsgrundlagen und Ihre Rechte (Entwurf)",
        text: `[Für die rechtliche Prüfung: dieser ganze Abschnitt.] Konto, Anmeldung, die Beantwortung Ihrer Fragen, das Speichern Ihrer Chats und die Funktionen, die Sie nutzen: zur Erfüllung des Vertrags, um den Dienst zu erbringen, den Sie angefordert haben (Art. 6(1)(b) DSGVO). Gesundheitsangaben und andere besondere Kategorien in Ihren Chats: [Rechtsgrundlage: für die rechtliche Prüfung, etwa eine ausdrückliche Einwilligung durch die Annahme bei der Anmeldung (Art. 9(2)(a) DSGVO) oder eine andere Grundlage.] Websuche und Bilderstellung: [für die rechtliche Prüfung: Vertrag (Art. 6(1)(b)) oder Einwilligung]. Anfrageaufzeichnungen, Grenzen und Sicherheitsprotokolle: unser berechtigtes Interesse, den Dienst sicher zu betreiben und die Kosten zu kontrollieren (Art. 6(1)(f) DSGVO). Die Aufzeichnung Ihrer Annahme: um nachzuweisen, was Sie angenommen haben (Art. 6(1)(c) und Art. 7(1) DSGVO) [für die rechtliche Prüfung]. Eine Einwilligung können Sie jederzeit mit Wirkung für die Zukunft widerrufen, indem Sie an ${email} schreiben oder Ihr Konto schließen; die Verarbeitung bis zum Widerruf bleibt davon unberührt. [Für die rechtliche Prüfung: ob der Widerruf auch in den Einstellungen möglich sein muss (Art. 7(3) DSGVO).] Ihre Rechte: Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung, Datenübertragbarkeit, Widerspruch gegen eine Verarbeitung aufgrund berechtigter Interessen und Beschwerde bei einer Aufsichtsbehörde (Art. 15 bis 21 und 77 DSGVO).`,
      },
    ];
  }
  const ai =
    provider === "tinfoil"
      ? { name: "Tinfoil, Inc. (USA)", where: "the USA" }
      : { name: "Privatemode (Edgeless Systems GmbH, Germany)", where: "the EU" };
  return [
    {
      id: "sensitive",
      heading: "Health and other sensitive details in your chats",
      text: `You may write about your health, sex life, religion, political views, ethnic origin, trade union membership or other special categories of personal data (Art. 9 GDPR), about yourself or about other people. CometRow treats these details like the rest of your message: it is encrypted on your device and sent to the protected service of ${ai.name} in ${ai.where}, which writes the answer. Masking on your device covers identifiers such as email addresses, phone numbers, bank and card numbers and ID numbers. Health details, diagnoses, medicines, names and other facts written in your own words are not masked; they reach the secure server inside the encrypted message. Saved chats that contain them are stored like any other chat, in the mode you chose (see “Secure, Secure Max and Incognito”). We do not use them for advertising or to train any AI, and we do not ask about them separately. If you write about another person's health, make sure you are allowed to. [Legal basis: for the legal read, see “Legal bases”.]`,
    },
    {
      id: "partners",
      heading: "Who we work with",
      text: [
        "These companies process data for us, each only for the feature named. [For the legal read: a data processing agreement is in place with Privatemode; for the others it is to be signed or checked.]",
        `• AI answers, voice to text and questions about pictures: ${ai.name}, sealed and checked processing in ${ai.where}.`,
        "• Web search and research: Brave Search (Brave Software), USA. [For the legal read: the basis for the transfer to the USA; Brave states that its data processing agreement does not cover search queries.]",
        "• Image creation (off unless switched on): the provider is still to be chosen; the candidates are Microsoft (Foundry, EU Data Zone), Google (Vertex AI, EU region) and Black Forest Labs (Germany, EU endpoint). [To confirm before the feature is switched on: provider, region, retention and whether it may train on descriptions.]",
        "• Sign-in: Google, when you choose “Continue with Google”. [To confirm: which Google company, and where.]",
        "• Hosting and database: Render, Frankfurt, Germany; Render's network edge is run by Cloudflare. [To confirm: Render's and Cloudflare's transfer bases and log retention.]",
        "• Project files, when file storage is switched on: Hetzner Object Storage, Germany. [To confirm: whether it is switched on; until then files are kept encrypted in our database at Render.]",
      ].join("\n"),
    },
    {
      id: "flows",
      heading: "Where your data goes, feature by feature",
      text: [
        "For each feature: what is sent; to whom and where; how long it is kept; who can read it.",
        `• Chat (text, files you attach as text, memories and project instructions used in a question): your message after masking, encrypted on your device; to ${ai.name} in ${ai.where}; not kept after the answer, apart from short-term working memory and records without content (see “What the secure server keeps”); readable only inside the sealed server.`,
        "• Questions about a picture, and the whiteboard: the picture once (hidden file data such as the location is removed on your device; the whiteboard is sent as a picture with its typed words), with your question; as for chat; CometRow does not keep the picture sent; readable only inside the sealed server. The whiteboard itself is saved with the chat and encrypted as the chat is.",
        `• Dictation and voice conversation: the recording of what you say, encrypted, to the speech model of ${ai.name} in ${ai.where}; numbers and other details you say aloud are not masked, because masking works on text only; CometRow keeps no recording, on your device or on our server; readable only inside the sealed server.`,
        "• Read aloud, photo to text, code runs, search within your chats: on your device only; nothing is sent.",
        "• Web search and research: only the search text you approved, after identifiers were replaced on your device; from our server to Brave Search in the USA; our server also opens the top result page or a page address you approved, and that website sees our server's address, not yours; Brave states it keeps search records for up to 90 days, the page text is not saved; Brave can read the search text.",
        "• Image creation (when switched on): only the description you typed, with identifiers masked on your device, never your chats or photos; to the image provider [to confirm: name and region]; CometRow keeps neither the description nor the image on its server, the image is saved in your chat; the provider can read the description [to confirm: its retention and training terms].",
        "• Saved chats, memories, projects, files, canvas and whiteboard in Secure (the default): stored encrypted on our servers at Render in Frankfurt, Germany, with a key CometRow holds for your account; until you delete them or close your account; CometRow could technically open them with that key, no feature of the service does so; we see the account, times, and the number and size of items.",
        "• Saved chats in Secure Max: encrypted end to end on your devices; stored on our servers only as data we cannot open; until you delete them or close your account; only your devices hold the key.",
        "• Incognito chats: sent like any chat; never saved on your device or on our server; the secure server and our request records treat them like any chat.",
        "• Sign-in: your email address and, if you use Google, your Google account identifier, and sessions (no IP address or browser string stored); at Render in Frankfurt; sessions 1 hour after last use, the account until it is closed; Google learns that you signed in to CometRow.",
        "• Request records: which account asked, when, how many times and which model, never content; at Render in Frankfurt; 90 days, then deleted; readable by CometRow.",
        "• Emails to our support address: as long as needed to answer [to confirm: email provider and retention].",
      ].join("\n"),
    },
    {
      id: "modes",
      heading: "Secure, Secure Max and Incognito",
      text: "Secure is the default. Your saved chats, memories, projects and files are stored encrypted on our servers, with a key CometRow creates for your account and keeps locked under a master key that is not in the database. This lets you use your chats on every device without a passphrase. Because CometRow holds the key, we could technically open this content; no part of the service does so, and our systems log no content. Secure Max is optional: content is encrypted on your devices with a key that only your devices and your recovery key hold. We cannot open it. If you lose your passphrase and your recovery key, nobody can recover it. Incognito chats are not saved anywhere. None of the three modes changes what is sent to the secure server for an answer, or the request records we keep. When your account is deleted, its key and the encrypted copies are deleted with it. [To confirm: whether, and for how long, database backups keep copies.]",
    },
    {
      id: "consent",
      heading: "How you agree to this policy",
      text: `The sign-in page says: “By continuing, you agree to our Terms and Privacy Policy.” When you sign in, we record with your account which version of the Terms and of this policy you accepted (this policy: version ${PRIVACY_VERSION}; Terms: version ${TERMS_VERSION}), the time and the sign-in method. When either text changes in substance, its version changes, and your next sign-in records the new version. The record is deleted with your account. [For the legal read: whether the record must be kept after the account is deleted, as proof (Art. 7(1) GDPR), and for how long.]`,
    },
    {
      id: "basis",
      heading: "Legal bases and your rights (draft)",
      text: `[For the legal read: this whole section.] Account, sign-in, answering your questions, saving your chats and the features you use: to perform the contract and provide the service you asked for (Art. 6(1)(b) GDPR). Health and other special categories in your chats: [Legal basis: for the legal read, for example explicit consent given by accepting at sign-up (Art. 9(2)(a) GDPR), or another basis.] Web search and image creation: [for the legal read: contract (Art. 6(1)(b)) or consent]. Request records, limits and security logs: our legitimate interest in running the service safely and controlling its cost (Art. 6(1)(f) GDPR). The record of your acceptance: to prove what you accepted (Art. 6(1)(c) and Art. 7(1) GDPR) [for the legal read]. You may withdraw a consent at any time with effect for the future, by writing to ${email} or by closing your account; processing before the withdrawal is not affected. [For the legal read: whether withdrawal must also be possible in Settings (Art. 7(3) GDPR).] Your rights: access, correction, deletion, restriction of processing, data portability, objection to processing based on legitimate interests, and a complaint to a supervisory authority (Art. 15 to 21 and 77 GDPR).`,
    },
  ];
}

/**
 * Sentences of the shared statement (shared/privacy-copy.ts, pinned by its own tests) that are no
 * longer true of the policy since Secure mode and the no-warnings decision; replaced on the
 * policy page only. Each must find its text, so an edit to the statement cannot drop one silently.
 */
const STATEMENT_FIXES: Record<Lang, Record<string, readonly [string, string][]>> = {
  en: {
    ours: [
      ["We never see what you asked or what was answered.", "We never see what you asked or what was answered on its way to and from the secure server."],
      ["so we only ever know that your account asked, never what.", "so we know which account asked; the request itself reaches us locked."],
      ["We keep no copy of your conversations; saved history lives only on your device, locked with a password we do not have.", "What we keep of saved chats depends on the mode; see “Secure, Secure Max and Incognito” above."],
    ],
    notyet: [
      ["If you lose your password, nobody can recover your saved history.", "In Secure Max, if you lose your passphrase and your recovery key, nobody can recover your saved history."],
      ["There is no anonymous mode: we know which account asked, never what was asked.", "There is no anonymous mode: we know which account asked."],
    ],
    research: [
      ["first, and you are warned if it may still contain a name or other personal detail.", "first; names and other details written in your own words are not removed."],
    ],
  },
  de: {
    ours: [
      ["Wir sehen nie, was Sie gefragt haben oder was geantwortet wurde.", "Wir sehen nie, was Sie gefragt haben oder was geantwortet wurde, auf dem Weg zum sicheren Server und zurück."],
      ["daher wissen wir immer nur, dass Ihr Konto gefragt hat, nie was.", "daher wissen wir, welches Konto gefragt hat; die Anfrage selbst erreicht uns verschlossen."],
      ["Wir behalten keine Kopie Ihrer Unterhaltungen; der gespeicherte Verlauf liegt nur auf Ihrem Gerät, verschlossen mit einem Passwort, das wir nicht haben.", "Was wir von gespeicherten Chats aufbewahren, hängt vom Modus ab; siehe „Secure, Secure Max und Inkognito“ oben."],
    ],
    notyet: [
      ["Wenn Sie Ihr Passwort verlieren, kann niemand Ihren gespeicherten Verlauf wiederherstellen.", "Wenn Sie in Secure Max Ihre Passphrase und Ihren Wiederherstellungsschlüssel verlieren, kann niemand Ihren gespeicherten Verlauf wiederherstellen."],
      ["Es gibt keinen anonymen Modus: Wir wissen, welches Konto gefragt hat, nie was gefragt wurde.", "Es gibt keinen anonymen Modus: Wir wissen, welches Konto gefragt hat."],
    ],
    research: [
      ["zuerst auf Ihrem Gerät aus diesem Text entfernt, und Sie werden gewarnt, wenn er noch einen Namen oder eine andere persönliche Angabe enthalten könnte.", "zuerst auf Ihrem Gerät aus diesem Text entfernt; Namen und andere Angaben in Ihren eigenen Worten werden nicht entfernt."],
    ],
  },
};

function fixStatement(section: PrivacySection, lang: Lang): PrivacySection {
  let text = section.text;
  for (const [from, to] of STATEMENT_FIXES[lang][section.id] ?? []) {
    if (!text.includes(from)) throw Error(`privacy-policy: statement section "${section.id}" lost "${from}"`);
    text = text.replace(from, to);
  }
  return text === section.text ? section : { ...section, text };
}

export const POLICY_SECTIONS: readonly PrivacySection[] = [
  {
    id: "who",
    heading: "Who is responsible",
    text: `CometRow is run by ${LEGAL_IDENTITY.operatorName}, ${LEGAL_IDENTITY.legalForm}, ${LEGAL_IDENTITY.addressLines.join(", ")}, ${LEGAL_IDENTITY.country}. Privacy requests go to ${LEGAL_IDENTITY.privacyContactEmail}. Data protection officer: ${LEGAL_IDENTITY.dataProtectionOfficer}. The same details are in the imprint.`,
  },
  ...draftSections("privatemode", "en"),
  ...PRIVACY_COPY,
  {
    id: "delete",
    heading: "What you can delete, and how",
    text: "One saved conversation: open Saved and choose Delete next to it. Everything saved on this device: open Saved and use Delete everything on this device; it removes every saved conversation and project in this browser and locks the vault, and cannot be undone. Encrypted backup files you downloaded are ordinary files on your device; delete them yourself, and remember that any copy still opens with its original password. Your account: open the account page and choose Close account; this needs a fresh email code, so on a service where email delivery is switched off it is not available yet. The language files for reading text from photos and scans (public data, none of your content) are kept in this browser's storage after the first use so they need not be downloaded again; to remove them, clear this site's data in your browser settings, which also removes everything else saved on this device.",
  },
  {
    id: "cannot",
    heading: "What we cannot delete for you",
    text: "The secure server's short-term working memory, which clears on its own within minutes to a few hours and has no delete button. The provider's records of time, model and token counts, which the provider states it keeps for 90 days. Our own request records: which account asked, when, how many times, which model, and the published cost; we keep them for 90 days and then delete them. Search-provider records of search text you approved, kept under that provider's policy.",
  },
  {
    id: "contact",
    heading: "Questions, requests and incidents",
    text: `Privacy requests: ${LEGAL_IDENTITY.privacyContactEmail}. Security incidents: ${LEGAL_IDENTITY.incidentContactEmail}. Support: ${LEGAL_IDENTITY.supportContactEmail}. You can download the records we hold about your account from the account page at any time, and close the account there. ${LEGAL_IDENTITY.supervisoryAuthorityNote} If you ever find a security problem, do not test it against other people's accounts.`,
  },
  {
    id: "changes",
    heading: "Changes to this policy",
    text: "This policy describes the app exactly as built on the date above. When the app changes in a way that affects what happens to your data, this page changes with it in the same release, and the date is updated.",
  },
];

/** DRAFT, NEEDS OWNER APPROVAL (D17): "What we cannot delete for you" when Privatemode is in use. */
export const PRIVATEMODE_CANNOT =
  "The secure server's short-term working memory, which is kept apart for each account and has no delete button. The provider's records of time and token counts, which the provider states it keeps for up to 90 days, and its token counts per key, which it keeps permanently for billing; we use one key for all accounts. Our own request records: which account asked, when, how many times and which model; we keep them for 90 days and then delete them. Search-provider records of search text you approved, kept under that provider's policy.";

/**
 * Phrases that mark an owner decision still missing from the policy. The
 * production candidate build refuses to proceed while any is present
 * (scripts/policy-placeholders.ts); remove the phrase only together with the
 * decision it stands for.
 */
export const POLICY_PLACEHOLDERS = ["not yet named", "not yet made"] as const;

/** Every section still carrying a placeholder phrase, with the phrase. */
export function policyPlaceholders(): { id: string; phrase: string }[] {
  const found: { id: string; phrase: string }[] = [];
  for (const section of POLICY_SECTIONS)
    for (const phrase of POLICY_PLACEHOLDERS)
      if (section.text.toLowerCase().includes(phrase))
        found.push({ id: section.id, phrase });
  return found;
}

/**
 * DRAFT, NEEDS OWNER APPROVAL, LEGAL READ REQUIRED (13 November 2026). The German policy,
 * binding once approved: the same sections in the same order, each saying exactly what the
 * English says. Built from the German statement, as the English is built from the English one.
 */
export const POLICY_DE_STATUS = "draft-needs-owner-approval; legal read required";
export const POLICY_DATE_DE = "18. November 2026";
const IDENTITY = identityDe();
export const POLICY_SECTIONS_DE: readonly PrivacySection[] = [
  {
    id: "who",
    heading: "Wer verantwortlich ist",
    text: `CometRow wird betrieben von ${IDENTITY.operatorName}, ${IDENTITY.legalForm}, ${IDENTITY.addressLines.join(", ")}, ${IDENTITY.country}. Datenschutzanfragen gehen an ${IDENTITY.privacyContactEmail}. Datenschutzbeauftragter: ${IDENTITY.dataProtectionOfficer}. Dieselben Angaben stehen im Impressum.`,
  },
  ...draftSections("privatemode", "de"),
  ...PRIVACY_COPY_DE,
  {
    id: "delete",
    heading: "Was Sie löschen können und wie",
    text: "Eine gespeicherte Unterhaltung: Öffnen Sie „Gespeichert“ und wählen Sie daneben „Löschen“. Alles, was auf diesem Gerät gespeichert ist: Öffnen Sie „Gespeichert“ und verwenden Sie „Alles auf diesem Gerät löschen“; das entfernt jede gespeicherte Unterhaltung und jedes Projekt in diesem Browser, sperrt den Tresor und kann nicht rückgängig gemacht werden. Verschlüsselte Sicherungsdateien, die Sie heruntergeladen haben, sind gewöhnliche Dateien auf Ihrem Gerät; löschen Sie sie selbst, und denken Sie daran, dass sich jede Kopie weiterhin mit ihrem ursprünglichen Passwort öffnen lässt. Ihr Konto: Öffnen Sie die Kontoseite und wählen Sie „Konto schließen“; dafür ist ein frischer E-Mail-Code nötig, daher ist das bei einem Dienst, bei dem der E-Mail-Versand ausgeschaltet ist, noch nicht verfügbar. Die Sprachdateien für die Texterkennung in Fotos und Scans (öffentliche Daten, keine Ihrer Inhalte) bleiben nach der ersten Nutzung im Speicher dieses Browsers, damit sie nicht erneut heruntergeladen werden müssen; um sie zu entfernen, löschen Sie in den Browsereinstellungen die Daten dieser Website, was auch alles andere entfernt, was auf diesem Gerät gespeichert ist.",
  },
  {
    id: "cannot",
    heading: "Was wir nicht für Sie löschen können",
    text: "Den Kurzzeitspeicher des sicheren Servers, der sich innerhalb von Minuten bis zu einigen Stunden von selbst leert und keine Schaltfläche zum Löschen hat. Die Aufzeichnungen des Anbieters über Zeitpunkt, Modell und Tokenzahlen, die der Anbieter nach eigenen Angaben 90 Tage aufbewahrt. Unsere eigenen Anfrageaufzeichnungen: welches Konto gefragt hat, wann, wie oft, welches Modell und die veröffentlichten Kosten; wir bewahren sie 90 Tage auf und löschen sie dann. Aufzeichnungen des Suchanbieters über Suchtexte, die Sie freigegeben haben, aufbewahrt nach den Richtlinien dieses Anbieters.",
  },
  {
    id: "contact",
    heading: "Fragen, Anfragen und Vorfälle",
    text: `Datenschutzanfragen: ${IDENTITY.privacyContactEmail}. Sicherheitsvorfälle: ${IDENTITY.incidentContactEmail}. Support: ${IDENTITY.supportContactEmail}. Sie können die Aufzeichnungen, die wir zu Ihrem Konto führen, jederzeit auf der Kontoseite herunterladen und das Konto dort schließen. ${IDENTITY.supervisoryAuthorityNote} Wenn Sie einmal ein Sicherheitsproblem finden, testen Sie es nicht an den Konten anderer Personen.`,
  },
  {
    id: "changes",
    heading: "Änderungen dieser Datenschutzerklärung",
    text: "Diese Datenschutzerklärung beschreibt die App genau so, wie sie zum oben genannten Datum gebaut ist. Wenn sich die App so ändert, dass es sich darauf auswirkt, was mit Ihren Daten geschieht, ändert sich diese Seite in derselben Veröffentlichung mit, und das Datum wird aktualisiert.",
  },
];

/** DRAFT, NEEDS OWNER APPROVAL, LEGAL READ REQUIRED: the German PRIVATEMODE_CANNOT. */
export const PRIVATEMODE_CANNOT_DE =
  "Den Kurzzeitspeicher des sicheren Servers, der für jedes Konto getrennt gehalten wird und keine Schaltfläche zum Löschen hat. Die Aufzeichnungen des Anbieters über Zeitpunkt und Tokenzahlen, die der Anbieter nach eigenen Angaben bis zu 90 Tage aufbewahrt, und seine Tokenzahlen pro Schlüssel, die er dauerhaft für die Abrechnung aufbewahrt; wir verwenden einen Schlüssel für alle Konten. Unsere eigenen Anfrageaufzeichnungen: welches Konto gefragt hat, wann, wie oft und welches Modell; wir bewahren sie 90 Tage auf und löschen sie dann. Aufzeichnungen des Suchanbieters über Suchtexte, die Sie freigegeben haben, aufbewahrt nach den Richtlinien dieses Anbieters.";

/**
 * The policy as shown in the app. `provider` adds the draft "Who processes your
 * messages" section after the first section (shared/provider-disclosure.ts); without
 * it the text is the approved policy, unchanged. `lang` "de" gives the German draft.
 */
export function privacyPolicyText(provider?: DisclosedProvider, lang: Lang = "en"): string {
  const de = lang === "de";
  // For Privatemode, its draft statement sections (D17) and deletion wording replace Tinfoil's.
  const statement = new Map(privacyCopy(provider, lang).map((s) => [s.id, fixStatement(s, lang)]));
  const draft = new Map(draftSections(provider ?? "privatemode", lang).map((s) => [s.id, s]));
  const own = (de ? POLICY_SECTIONS_DE : POLICY_SECTIONS).map((section) =>
    provider === "privatemode" && section.id === "cannot"
      ? { ...section, text: de ? PRIVATEMODE_CANNOT_DE : PRIVATEMODE_CANNOT }
      : (draft.get(section.id) ?? statement.get(section.id) ?? section),
  );
  const sections = provider
    ? [own[0], providerDisclosureSection(provider, lang), ...own.slice(1)]
    : own;
  return (
    (de
      ? `CometRow Datenschutzerklärung, ${POLICY_DATE_DE}, Version ${PRIVACY_VERSION} (Entwurf für die rechtliche Prüfung)\n\n`
      : `CometRow privacy policy, ${POLICY_DATE}, version ${PRIVACY_VERSION} (draft for the legal read)\n\n`) +
    sections
      .map((section) => `${section.heading}\n${section.text}`)
      .join("\n\n")
  );
}
