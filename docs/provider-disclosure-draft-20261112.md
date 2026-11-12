# Privacy policy: provider section — DRAFT, needs owner approval (12 November 2026)

**Status: draft, needs owner approval.** Adds a "Who processes your messages" section to the privacy policy after "Who is responsible". Shown only when the server sets the `providerDisclosureDraft` flag to a provider (local review: `PRIVATEAI_PROVIDER_DISCLOSURE_DRAFT=tinfoil` or `privatemode`); the production composition never sets it, and without it the policy text is unchanged. Source of truth: `shared/provider-disclosure.ts` (a test keeps this file equal to it).

Why: the current policy describes the AI provider without naming it or saying where processing happens, and states no transfer outside the EU. Each entry below uses only facts from documents read directly. Open owner decisions: D8 and D9 in `docs/owner-decisions.md`.

## Tinfoil

Your messages are answered by our AI provider Tinfoil, Inc., San Francisco, USA, on its secure servers. Tinfoil processes them in the United States. This is a transfer outside the EU, covered by the EU Standard Contractual Clauses in Tinfoil's data processing agreement with us. Tinfoil states that it keeps records such as time, model and token counts, without the content of your messages, for 90 days, and longer for accounting records.

Sources:
- Tinfoil data processing addendum of 12 October 2026, section 10 (processing outside the EU, including in the US; Standard Contractual Clauses)
- Tinfoil email reply of 22 October 2026 (metadata kept 90 days, longer for accounting records)

## Privatemode

Your messages are answered by our AI provider Edgeless Systems GmbH, Bochum, Germany (Privatemode), on secure servers in the EU run by Scaleway (France) and Lyceum (Germany). Your messages are processed only in the EU and the European Economic Area. Edgeless states that it keeps records such as time and token counts, without the content of your messages, for up to 90 days, and token counts per account permanently for billing.

Sources:
- Privatemode data processing agreement of 24 July 2026, sections 9 and 10 (sub-processors Scaleway and Lyceum; processing exclusively in the EU or EEA)
- Privatemode FAQ, read 11 November 2026 (metadata up to 90 days; token usage per API key stored permanently for billing)
