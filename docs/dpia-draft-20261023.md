# CometRow data protection impact assessment — DRAFT, 23 October 2026

Status: **DRAFT / NOT LEGALLY REVIEWED / NOT A GATE.** Prepared by the engineering agent from the system as built on branch `codex/development-handoff` (commit after `a0275ee`) for the owner's review and for a lawyer. It is structured along Article 35 GDPR (description, necessity and proportionality, risks, measures). Supplier statements are labelled **[supplier statement]**; nothing here was verified against the supplier's deployment. Placeholders for the owner are marked `[OWNER]`. The product's plain-language statements (`shared/privacy-copy.ts`, `shared/privacy-policy.ts`) are authoritative where this draft and they differ.

## 1. Why an assessment

The service lets a person send questions, documents and conversation history to a large language model for help with everyday tasks, including tax, financial, medical and personal matters. Such content can contain special categories of personal data (Article 9) and financial identifiers, and the processing uses a new technology (confidential computing with remote attestation) on a third-party supplier's infrastructure. On the EDPB criteria this is likely to be high risk, so the assessment is prepared before any user outside the owner is admitted. `[OWNER]` confirms with legal advice whether the assessment is mandatory for the first invited trial; the engineering view is to treat it as mandatory.

## 2. Description of the processing

### 2.1 Parties

- Controller: the operator named in `deployment/legal-identity.json` (today: `not yet named`, an individual in Germany).
- Processor for confidential inference: Tinfoil Inc. (router `inference.tinfoil.sh`), under its published Terms and DPA **[supplier statement: a DPA is available to an individual founder in Germany; metadata retained 90 days]**. Sub-processors of the supplier are not itemised here; the supplier's list is at its trust page.
- Processor for hosting: Render (service and PostgreSQL in Frankfurt, Germany, per the 20 October dashboard inspection).
- Processor for sign-in email (planned, not active): a transactional email provider with EU data hosting (Brevo was evaluated); nothing is active on the hosted candidate.
- Identity providers for social sign-in: Google (and Apple, prepared, inactive) as independent controllers for the sign-in event.
- Web search (optional, user-approved per query): Brave Search API (United States) as a separate processor; today treated as unresponsive and not active on the hosted candidate.

### 2.2 Data and flows, as built

| Flow | Data | Where it goes | Retention |
| --- | --- | --- | --- |
| Composing a request | The user's question, selected documents, included history | Masked on the device (IBAN, card, tax, insurance, ID numbers, emails, phones, labelled birth dates replaced by placeholders); the rest is encrypted in the browser to the attested enclave's key | Never stored by us; the enclave's short-term working memory clears on its own, with no enforceable maximum **[supplier statement]** |
| Relay | Ciphertext only; routing headers; account id; request id | Our relay forwards ciphertext to the supplier and returns ciphertext | Request record (account, time, state, token counts, model, published cost) in our database; retention period `[OWNER]`, not yet decided |
| Supplier metadata | Time, model, token counts, cost | Supplier's records | 90 days **[supplier statement]** |
| Sign-in | Email address, verification state, session times; social provider subject; passkey public keys | Our database, Frankfurt | For the life of the account; closure keeps a receipt for seven days before purge (purge not yet active) |
| Sign-in code delivery | Keyed hash of the address, time | Our database | One day |
| Security notices | Event kind, time, delivery state; the address a notice is sent to | Our database; email provider when active | With the account |
| Web search (optional) | The approved search text, masked on the device; never the conversation | Our relay to the search provider, which can read it | Provider's policy; our server keeps a one-way commitment of the approved text for five minutes and never the text; results are shown only during the conversation and never stored |
| Saved history | Conversations, documents, written answers from live searches | Encrypted vault in the user's browser, with a passphrase we never hold | Until the user deletes it; "delete everything on this device" removes the vault |
| Account export | All records above that belong to the account, without secrets | Downloaded by the user from the account page | Not retained by us |
| Billing (test mode only today) | Customer binding, operation state, price id, provider object ids | Our database; payment provider (Stripe) | `[OWNER]`; accounting law may require longer retention of invoices |

### 2.3 What we never hold

Questions, answers, documents, extracted text, vault passphrases, search results, opened pages, analytics identifiers, advertising identifiers, IP addresses with sessions (connection identifiers are used only to limit sign-in attempts and are not stored with sessions).

## 3. Necessity and proportionality

- Purpose limitation: inference needs the content; metering needs counts, not content; sign-in needs an address and session state. Each flow carries only that.
- Minimisation: device-side masking before encryption; a fresh cache secret per request; no logging of request content anywhere in our code (a repository test keeps console output out of request paths); no request logger dependency.
- Lawful basis: performance of the contract with the user for the service itself (Article 6(1)(b)); legitimate interest for security records and abuse limits (Article 6(1)(f)); explicit consent per query for web search, given by approving the exact text (Article 6(1)(a)). For special categories the user discloses themselves (Article 9(2)(a)), the policy must say so plainly; `[OWNER]` to confirm wording with legal advice.
- Transparency: the in-app privacy statement and policy describe every flow in plain words and are regenerated with the code; the imprint names the operator once filled in.
- Rights: access and portability by the account export; erasure by account closure and device deletion; objection and restriction by closing the account; the policy states what cannot be deleted (supplier working memory, supplier metadata, our request records) and why.
- Retention: our request-record retention is **not yet decided** (`[OWNER]`); the retention activation proposal of 22 October describes the mechanism.

## 4. Risks to the rights and freedoms of users

| Risk | Likelihood | Severity | Notes |
| --- | --- | --- | --- |
| The supplier, or someone controlling its infrastructure, reads request content | Low if attestation holds; unknown otherwise | High | Browser verification today checks the release and key binding but not freshness or revocation **[supplier statement: no date for a fuller browser verifier]**; the relay-side audit is built but switched off until the pinning policy is decided. This is the reason private chat is gated. |
| Enclave working memory keeps parts of recent questions | Certain for minutes, possibly hours | Medium | No purge control exists or is planned **[supplier statement]**; stated to users. |
| Identifier masking misses a value | Measured: about 2 % on synthetic held-out text, 10 % on an independent hand-written set, far more on damaged scans | Medium | Wording stays "assisted redaction with review"; names and addresses are not covered at all and users are told. |
| A wrong number in a tax or financial answer | Measured: 9 to 18 silent wrong conversations per 120 on the frozen gate | High for the affected user | Post-check warning on completed replies; the gate result blocks any default model today; this is an open design question, not a privacy control. |
| Account takeover | Low | Medium | Maintained authentication library, passkeys, rate limits, per-recipient code cap; history is not exposed by takeover because the vault passphrase is separate. |
| Our database is breached | Low | Medium | It holds identities, session state, counts and billing ids, never content; restricted database roles for the runtime; TLS with a reviewed CA bundle. |
| Transfer outside the EU | Certain for inference (supplier infrastructure location `[OWNER to confirm with supplier]`) and for web search (US) | Medium | Content is encrypted to the enclave; transfer tool `[OWNER]`: the supplier's DPA and standard contractual clauses are to be reviewed; the search path sends approved text in clear and must be covered separately or stay off. |
| Children's data | Low | High | Adults-only trial stated in the product; no age verification exists. |

## 5. Measures

Built and tested: device-side masking; browser verification against a pinned release before every request; encrypted transport to the enclave; relay that forwards ciphertext only and never logs content; one request in flight per account; soft spending caps stated as soft; sign-in rate limits and the per-recipient code cap; security notices; account closure with a seven-day receipt; delete-everything on the device; account export; the post-check warning; imprint and policy generated from one identity file; a build gate that refuses a production candidate while any placeholder remains.

Not yet built or decided (owner decisions): request-record retention period; relay-side attestation audit activation and pinning policy; off-host encrypted backups with a separately held key; independent liveness alerts; a real-document masking check; the supplier DPA signature and transfer assessment; a decision on web search provider; a decision on the default model and the arithmetic path; email provider activation and its retention settings.

## 6. Conclusion for the owner

Private chat with real personal data should not be opened until: the supplier DPA is signed and the transfer assessment done; the relay-side attestation audit is enabled under a decided pinning policy; retention is decided and written into the policy; the identity file is filled; and a lawyer has reviewed this assessment and the policy. The invited trial with synthetic content only does not need these to proceed.
