/**
 * DRAFT, NEEDS OWNER APPROVAL. Consent for health and other special-category details
 * (GDPR Art. 9(2)(a)), written 12 November 2026 for a general-purpose assistant.
 * Shown only when the server enables the `healthConsentDraft` flag (off in production).
 * The same text is in docs/health-consent-draft-20261112.md; a test keeps them equal.
 * Provider-neutral on purpose: it names no provider and no processing country.
 */
export const HEALTH_CONSENT = {
  version: "draft-2026-11-12",
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

export function healthConsentText() {
  return [HEALTH_CONSENT.title, ...HEALTH_CONSENT.paragraphs].join("\n\n");
}
