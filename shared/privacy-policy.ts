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

/**
 * The in-app privacy policy page. It is built from the privacy statement so
 * the two can never disagree, plus the deletion path and contact sections.
 * Items the owner has not yet decided are stated as not yet named rather than
 * invented. `docs/privacy-policy-20261022.md` is generated from this file.
 */
export const POLICY_DATE = "22 October 2026";

export const POLICY_SECTIONS: readonly PrivacySection[] = [
  {
    id: "who",
    heading: "Who is responsible",
    text: `CometRow is run by ${LEGAL_IDENTITY.operatorName}, ${LEGAL_IDENTITY.legalForm}, ${LEGAL_IDENTITY.addressLines.join(", ")}, ${LEGAL_IDENTITY.country}. Privacy requests go to ${LEGAL_IDENTITY.privacyContactEmail}. Data protection officer: ${LEGAL_IDENTITY.dataProtectionOfficer}. The same details are in the imprint.`,
  },
  ...PRIVACY_COPY,
  {
    id: "delete",
    heading: "What you can delete, and how",
    text: "One saved conversation: open Saved and choose Delete next to it. Everything saved on this device: open Saved and use Delete everything on this device; it removes every saved conversation and project in this browser and locks the vault, and cannot be undone. Encrypted backup files you downloaded are ordinary files on your device; delete them yourself, and remember that any copy still opens with its original password. Your account: open the account page and choose Close account; this needs a fresh email code, so on a service where email delivery is switched off it is not available yet.",
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
export const POLICY_DATE_DE = "22. Oktober 2026";
const IDENTITY = identityDe();
export const POLICY_SECTIONS_DE: readonly PrivacySection[] = [
  {
    id: "who",
    heading: "Wer verantwortlich ist",
    text: `CometRow wird betrieben von ${IDENTITY.operatorName}, ${IDENTITY.legalForm}, ${IDENTITY.addressLines.join(", ")}, ${IDENTITY.country}. Datenschutzanfragen gehen an ${IDENTITY.privacyContactEmail}. Datenschutzbeauftragter: ${IDENTITY.dataProtectionOfficer}. Dieselben Angaben stehen im Impressum.`,
  },
  ...PRIVACY_COPY_DE,
  {
    id: "delete",
    heading: "Was Sie löschen können und wie",
    text: "Eine gespeicherte Unterhaltung: Öffnen Sie „Gespeichert“ und wählen Sie daneben „Löschen“. Alles, was auf diesem Gerät gespeichert ist: Öffnen Sie „Gespeichert“ und verwenden Sie „Alles auf diesem Gerät löschen“; das entfernt jede gespeicherte Unterhaltung und jedes Projekt in diesem Browser, sperrt den Tresor und kann nicht rückgängig gemacht werden. Verschlüsselte Sicherungsdateien, die Sie heruntergeladen haben, sind gewöhnliche Dateien auf Ihrem Gerät; löschen Sie sie selbst, und denken Sie daran, dass sich jede Kopie weiterhin mit ihrem ursprünglichen Passwort öffnen lässt. Ihr Konto: Öffnen Sie die Kontoseite und wählen Sie „Konto schließen“; dafür ist ein frischer E-Mail-Code nötig, daher ist das bei einem Dienst, bei dem der E-Mail-Versand ausgeschaltet ist, noch nicht verfügbar.",
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
  const statement = new Map(privacyCopy(provider, lang).map((s) => [s.id, s]));
  const own = (de ? POLICY_SECTIONS_DE : POLICY_SECTIONS).map((section) =>
    provider === "privatemode" && section.id === "cannot"
      ? { ...section, text: de ? PRIVATEMODE_CANNOT_DE : PRIVATEMODE_CANNOT }
      : (statement.get(section.id) ?? section),
  );
  const sections = provider
    ? [own[0], providerDisclosureSection(provider, lang), ...own.slice(1)]
    : own;
  return (
    (de
      ? `CometRow Datenschutzerklärung, ${POLICY_DATE_DE}\n\n`
      : `CometRow privacy policy, ${POLICY_DATE}\n\n`) +
    sections
      .map((section) => `${section.heading}\n${section.text}`)
      .join("\n\n")
  );
}
