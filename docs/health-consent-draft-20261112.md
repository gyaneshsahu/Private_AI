# Health consent text — DRAFT, needs owner approval (12 November 2026)

**Status: draft, needs owner approval.** Shown in the app only when the server enables the `healthConsentDraft` flag; the production composition never sets it. Source of truth: `shared/health-consent.ts` (a test keeps this file equal to it).

Why: CometRow is a general-purpose assistant, so users may share health details. Under GDPR Art. 9(2)(a) we need explicit consent for that, whichever AI provider is used (Tinfoil allows only incidental health data without a written agreement; Privatemode puts the legal basis on us).

How it works (draft): before the first message the app shows this text with two buttons. The message waits until a choice is made. "Not now" still allows chatting and shows a reminder to leave sensitive details out. The choice is stored on the device with the text version; a new text version asks again. Settings, Privacy & data shows the choice and can withdraw or give it. Open owner decisions: D2 and D3 in `docs/owner-decisions.md`.

## Text shown to the user

### Health and other sensitive details

You can ask CometRow about anything, including your health. If you write about health or other sensitive matters, such as religion, sexual life or ethnic origin, those details are part of your message.

Your message is sent, locked, to the secure server of our AI provider, which works out the answer and sends it back. Some identifiers, like account numbers, are replaced on your device before sending; health details are not.

We may only process these details with your clear permission. You can say no and still use CometRow; in that case please leave health and other sensitive details out of your messages. You can change your choice at any time in Settings, Privacy & data.

Buttons: "I agree" and "Not now".

Reminder after "Not now": You chose not to allow health or other sensitive details. Please leave them out of your messages, or change your choice in Settings, Privacy & data.
