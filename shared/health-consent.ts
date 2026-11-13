import type { Lang } from "../src/i18n";

/**
 * DRAFT, NEEDS OWNER APPROVAL. Consent for health and other special-category details
 * (GDPR Art. 9(2)(a)), written 12 November 2026 for a general-purpose assistant.
 * Shown only when the server enables the `healthConsentDraft` flag (off in production).
 * The same text is in docs/health-consent-draft-20261112.md; a test keeps them equal.
 * Provider-neutral on purpose: it names no provider and no processing country.
 *
 * `version` names the English and German texts together: change it whenever either text
 * changes, so consent is asked again. A consent given in one language counts for both while
 * the version is current. scripts/record-legal-pairs.ts refuses to record a changed consent
 * text under an unchanged version.
 */
export const HEALTH_CONSENT = {
  version: "draft-2026-11-13",
  status: "draft-needs-owner-approval",
  title: "Health and other sensitive details",
  paragraphs: [
    "You can ask CometRow about anything, including your health. If you write about health or other sensitive matters, such as religion, sexual life or ethnic origin, those details are part of your message.",
    "Your message is sent, locked, to the secure server of our AI provider, which works out the answer and sends it back. Some identifiers, like account numbers, are replaced on your device before sending; health details are not.",
    "We may only process these details with your clear permission. You can say no and still use CometRow; in that case please leave health and other sensitive details out of your messages. You can change your choice at any time in Settings, Privacy & data.",
  ],
  accept: "I agree",
  decline: "Not now",
  declinedNote:
    "You chose not to allow health or other sensitive details. Please leave them out of your messages, or change your choice in Settings, Privacy & data.",
} as const;

/**
 * DRAFT, NEEDS OWNER APPROVAL, LEGAL READ REQUIRED (13 November 2026). The German consent,
 * binding once approved; it says exactly what the English says. Same version as the English.
 */
export const HEALTH_CONSENT_DE = {
  version: HEALTH_CONSENT.version,
  status: "draft-needs-owner-approval; legal read required",
  title: "Gesundheit und andere sensible Angaben",
  paragraphs: [
    "Sie können CometRow alles fragen, auch zu Ihrer Gesundheit. Wenn Sie über Gesundheit oder andere sensible Themen schreiben, etwa Religion, Sexualleben oder ethnische Herkunft, sind diese Angaben Teil Ihrer Nachricht.",
    "Ihre Nachricht wird verschlossen an den sicheren Server unseres KI-Anbieters gesendet, der die Antwort erstellt und zurücksendet. Einige Kennungen, etwa Kontonummern, werden vor dem Senden auf Ihrem Gerät ersetzt; Gesundheitsangaben nicht.",
    "Wir dürfen diese Angaben nur mit Ihrer eindeutigen Erlaubnis verarbeiten. Sie können Nein sagen und CometRow trotzdem nutzen; lassen Sie in diesem Fall bitte Gesundheitsangaben und andere sensible Angaben aus Ihren Nachrichten weg. Sie können Ihre Wahl jederzeit unter Einstellungen, Datenschutz & Daten ändern.",
  ],
  accept: "Ich stimme zu",
  decline: "Jetzt nicht",
  declinedNote:
    "Sie haben sich entschieden, Gesundheitsangaben oder andere sensible Angaben nicht zu erlauben. Bitte lassen Sie sie aus Ihren Nachrichten weg, oder ändern Sie Ihre Wahl unter Einstellungen, Datenschutz & Daten.",
} as const;

export interface HealthConsentCopy {
  version: string;
  status: string;
  title: string;
  paragraphs: readonly string[];
  accept: string;
  decline: string;
  declinedNote: string;
}

/** The consent wording for the interface language. */
export function healthConsentCopy(lang: Lang = "en"): HealthConsentCopy {
  return lang === "de" ? HEALTH_CONSENT_DE : HEALTH_CONSENT;
}

export function healthConsentText(lang: Lang = "en") {
  const copy = healthConsentCopy(lang);
  return [copy.title, ...copy.paragraphs].join("\n\n");
}
