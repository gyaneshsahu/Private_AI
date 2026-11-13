# German legal texts: note for the owner (13 November 2026)

**Status: every German text is a DRAFT. It needs your approval and a legal read. Once approved, the German text is binding.** The English texts are unchanged, word for word, and so are their approvals. The corrections in `docs/privacy-policy-corrections-draft-20261113.md` are not applied, in either language, because you have not approved them.

## What was translated

| Text | Where the German lives | English status |
| --- | --- | --- |
| Privacy policy, with Tinfoil, with Privatemode, and without a provider (including the Privatemode "What we cannot delete") | `shared/privacy-policy.ts` (`POLICY_SECTIONS_DE`, `PRIVATEMODE_CANNOT_DE`) | Tinfoil approved; Privatemode draft |
| Privacy statement, both providers, and the one-line summary | `shared/privacy-copy.ts` (`PRIVACY_COPY_DE`, German Privatemode sections, `PRIVACY_SUMMARY_DE`) | Tinfoil approved; Privatemode draft |
| Health consent and the settings lines | `shared/health-consent.ts` (`HEALTH_CONSENT_DE`), `src/HealthConsent.tsx` | draft |
| Who processes your messages (provider disclosure) | `shared/provider-disclosure.ts` (`PROVIDER_DISCLOSURE_DE`) | draft |
| Imprint, and the identity fields in the policy | `shared/legal-identity.ts` (German imprint, `identityDe`) | in use |
| Acceptable use | `docs/acceptable-use-de-draft-20261113.md` | draft |
| 18+ rule (rule and wording) | `docs/age-rule-de-draft-20261113.md` | draft |
| Policy corrections (proposals, new sections, open questions) | `docs/privacy-policy-corrections-de-draft-20261113.md` | draft, not approved |

Read all in-app texts, English and German one after the other, in `docs/legal-texts-side-by-side.md` (generated from the code).

Each German text says exactly what the English says, no more and no less, including the weaknesses of the English (see the questions below). The German uses "Sie" and the glossary terms (`docs/i18n-glossary-20261113.md`). A test checks that both languages state the same numbers, email addresses and links.

**Before the app shows German.** The app agent connects these texts to the DE/EN switch. From then on, a German browser sees these drafts. Do not deploy that wiring until you have approved the German texts, or until you decide that drafts may be shown in the alpha.

## How a change in one language is caught

`shared/legal-text-pairs.json` holds a SHA-256 of each English and German text. `tests/legal-text-pairs.test.ts` fails when a text changes and names the language that changed. Then check the other language, change it to match, and re-record with `node --import tsx scripts/record-legal-pairs.ts`.

The health consent has one version for both languages (`draft-2026-11-13`). A consent given in German counts for English and the other way round. When either text changes, the version must change, so everyone is asked again. The record script refuses to record a changed consent text under the old version. The version moved from `draft-2026-11-12` because the German text was added; the consent step is off in production, so no real user is asked again.

## Open legal questions

1. **Which language prevails.** Neither text says that the German is binding. Should the policy and the terms say so ("Die deutsche Fassung ist maßgeblich.")? That line would be new text in both languages.
2. **Health consent wording.** The English says "clear permission", so the German says "eindeutige Erlaubnis". Art. 9(2)(a) GDPR speaks of "ausdrückliche Einwilligung" (explicit consent). Should both texts use the legal term? That changes the consent version.
3. **Imprint.** Neither language has a heading such as "Angaben gemäß § 5 DDG". "Verantwortlich für den Inhalt" is a term from § 18(2) MStV, needed only for journalistic and editorial content. The lawyer decides whether to add, keep or drop each.
4. **Privatemode token counts.** The provider disclosure says "per account" ("pro Konto"); the statement and the policy say "per key" ("pro Schlüssel"). The English texts disagree, and the German copies that. Fix both languages together.
5. **"Your own address".** In the search section this means the IP address. In German, "Adresse" also reads as a postal address. Say "IP address" in both languages?
6. **"Password" for saved history.** The approved statement says "password", where the app uses a vault passphrase (correction row 4). The German follows the English until the correction is approved.
7. **Acceptable use names Tinfoil** as the supplier, while Privatemode has been primary since 12 November. Rewrite that paragraph in both languages before use.
8. **Gender-neutral wording.** The German uses short masculine forms in a few places (acceptable use point 8: "Mieter, Arbeitnehmer, Patienten"; "Datenschutzbeauftragter"). Keep them, or use neutral forms?
9. **Supervisory authority.** The German reads "die Landesbeauftragte für Datenschutz und Informationsfreiheit Nordrhein-Westfalen (LDI NRW)". Confirm the form of the name.
10. **"Tarif" (plan)** appears in both languages, although the alpha is free. Wording of the limits section during a free alpha?
11. **The ten open questions** of the corrections draft are still open. They are now in German as well.

## What the lawyer must check

- That each German text says the same as its English text, in `docs/legal-texts-side-by-side.md` and the three German draft documents.
- The legal terms: Auftragsverarbeitungsvertrag, EU-Standardvertragsklauseln, Übermittlung außerhalb der EU, Einwilligung, Rechtsgrundlage.
- The questions above, and the completeness of the policy under Art. 13 GDPR (corrections draft, question 10).
- UI names quoted in the texts ("Gespeichert", "Alles auf diesem Gerät löschen", "Konto schließen", "Einstellungen, Datenschutz & Daten", "Recherche", "Weiter mit Google") must match the German interface once it is built.
