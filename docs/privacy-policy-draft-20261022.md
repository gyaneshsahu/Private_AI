# CometRow privacy policy — draft text, 22 October 2026

Status: **DRAFT / NOT PUBLISHED / NOT LEGALLY REVIEWED.** Agent-prepared on 22 October 2026 against branch commit `7ce181a`. It describes the product as implemented on that branch, not the hosted candidate at app.cometrow.com, where private chat, email delivery and search are disabled. The one authoritative plain-language statement is `shared/privacy-copy.ts` (rendered in the app, copied to `docs/privacy-copy-20261022.md`); where this draft and that statement differ, the statement is right and this draft must be corrected. Every supplier claim below is labelled **[supplier statement]** and has not been verified against the deployment serving our account. Nothing in this draft passes a gate, names a legal entity, a data protection officer or a certification. Owner and legal review are required before any sentence is published.

Register: text in the numbered sections is the proposed policy wording for ordinary readers. "Annotations for the owner" at the end are ledger notes, not policy text.

## 1. Who we are

CometRow is operated by an individual founder in Germany, not by a company.

- Legal identity: `LEGAL_IDENTITY_TO_BE_NAMED_BY_OWNER` (natural person, name as it appears in the Impressum)
- Postal address: `POSTAL_ADDRESS_TO_BE_NAMED_BY_OWNER`
- Contact for privacy questions: `PRIVACY_CONTACT_TO_BE_NAMED_BY_OWNER`
- Data protection officer: none appointed. Whether one is required is an open legal question for the owner; do not state "not required" until reviewed.

The product was developed under the working name PrivateAI; CometRow is the name you see. Both names refer to the same service.

## 2. What we collect

We collect only what is needed to let you sign in, count your requests and bill them. We never collect what you ask or what is answered.

**Account identity.**

- A stable account identifier and your verified contact email address, with the time it was verified and the time the account was created.
- If you sign in with Google or Apple: the sign-in provider's identifier for you (issuer and subject). We do not keep their access or refresh tokens, your name or your photo. The provider learns that you signed in to CometRow and nothing about your conversations.
- If you add a passkey: its public key and credential identifier, never a private key or biometric data.
- Active sign-in sessions: when they started and when they expire. IP address and browser identification are not stored with sessions. Connection identifiers may be used briefly to limit sign-in attempts.
- If you ask for a security notice or a credential change: a copy of the email address the notice is sent to, kept with that notice.

**Request metadata, never content.** For each request your account sends to the sealed server we record: a request identifier we generate, your account identifier, the time, and whether the request was reserved, sent, completed or ended uncertainly. For requests that complete normally we also record how many tokens the question and the answer were, which model answered, the cost at the supplier's published rates and, if a web search ran inside the sealed server, how many search calls were made. The sealed server reports these figures after the reply; it never reports the text.

**Web search approvals.** When you approve a web search we store a random grant identifier, which sign-in session it belongs to, a one-way commitment to the approved text and an expiry of five minutes. The approved search text itself is not stored.

**Account closure.** When you close your account we keep a receipt with your account identifier and the times of the request and the planned purge, with no email address and no content.

**What we do not collect.** Your questions, answers, attached documents, extracted text, saved history, vault passphrase, search results or the pages you opened. No analytics pixels, no advertising identifiers, no telemetry of what you type.

## 3. What stays on your device

The following is the product's own statement, reproduced exactly:

> Before anything is sent, CometRow looks for ID numbers, bank account and card numbers, tax and insurance numbers, passport or ID card numbers next to their label, phone numbers, email addresses and dates of birth next to their label. It replaces each one with a stand-in like {{IBAN-1}} and keeps the real value on your device. The answer comes back with the real values put back in, and a note under the answer tells you what was kept. Names, addresses and other facts written in your own words are not recognised; treat them as part of the sealed question below.

Saved history, projects and encrypted backups also stay on your device, locked with a passphrase we do not have. We keep no copy of your conversations.

## 4. The sealed inference server (Tinfoil)

The rest of your question, your selected files and the earlier messages you included are locked in your browser so that only one secure server can open them. That server is operated by Tinfoil (Tinfoil Inc.; see https://tinfoil.sh/privacy and https://tinfoil.sh/terms/dpa). Our own systems pass the locked package along and cannot open it. Your browser checks the server's identity before each request and refuses to send if the check fails.

What Tinfoil states about its handling, each a **[supplier statement]** from its published documentation and from its written replies to us, not something we have verified:

- It does not keep your question or answer after the reply is sent and does not use them to train any AI.
- It keeps a short-term working memory inside the sealed server that can hold parts of recent questions for minutes, at most a few hours, and clears on its own; there is no button that empties it immediately. It states this memory is never written to disk, exported or shared between servers.
- Its router keeps billing metadata (time, model, token counts), not content.
- It does not run a moderation service on your request text.
- It keeps billing-related metadata for about 90 days (see section 6 for the detail).

What this means for you: while the sealed server is computing your answer, the text is readable inside that protected hardware. Our promise rests on the supplier's hardware, firmware and published code, which our browser checks, and on the supplier keeping to its statements. Our own checks of that server have not passed yet; until they do, private chat is switched off (section 9).

## 5. When you search the web

A web search only happens when you approve the exact search text shown to you. That text is sent from our server to the search provider, Brave (Brave Search API; see https://api-dashboard.search.brave.com/documentation/resources/privacy-notice), which can read it. Brave states **[supplier statement]** that it may keep query records for up to 90 days and that query data is excluded from its data processing agreement. Your own network address is not sent; Brave sees our server's address. Your attachments, your other messages and your account identity are not sent with the search.

Search results are shown during the conversation and are not saved. The written answer is saved with your history like any other answer, and you can run the search again later for current sources. If you choose to open a source page through the app, our server fetches that page and the page's operator sees our server's request.

The search text itself can reveal something about you even though we add nothing to it. Approve only what you are willing to send.

## 6. How long we keep things

**At the sealed server (Tinfoil).** Tinfoil told us in writing **[supplier statement, reply received 15 October 2026]** that most billing-related metadata is retained for about 90 days. Its published privacy policy (effective 12 October 2026) **[supplier statement]** lists different periods by category: security and operational logs up to 90 days, API usage metrics while the account is active before aggregation or anonymisation, and billing records for as long as accounting rules require, which may be years. We have asked Tinfoil which of our per-request fields falls into which category and are waiting for the answer. Until then we state the 90-day figure as the supplier's statement and the category periods as its policy, and we do not promise either.

**At the search provider (Brave).** Up to 90 days for query records **[supplier statement]**.

**In our own ledger.** We keep the request metadata listed in section 2: for each request its identifier, your account identifier, the allowance period, its state and two timestamps; for completed requests its prompt and completion token counts, model, published cost, web-search call count and the time recorded. How long we keep these rows is an **owner decision that is still pending**. Until that decision is made and recorded, the honest statement is: the rows are kept, no deletion schedule is active, and no period may be advertised.

**Account identity.** Kept while your account is open. After closure, credentials and contact data become eligible for deletion after seven days unless an incident hold applies; the deletion job is not active yet (see `docs/deletion-path-20261022.md`). The closure receipt and the request ledger rows are kept after closure; they contain no email address and no content.

**Backups of our database.** Encrypted copies with a proposed seven-day expiry. Deleting a record can therefore take up to fourteen days across backups once the schedule is active; it is not active today.

**Hosting and network logs.** Our hosting provider's edge and access logs have fields and retention we have not yet established; we will not claim a period until we have.

**On your device.** Saved history and backups stay until you delete them; see section 7.

## 7. Your rights

If you are in the European Union, the General Data Protection Regulation (GDPR) gives you the right to ask for access to the personal data we hold about you, to have it corrected, to have it deleted, to restrict or object to its processing, to receive it in a portable form, and to complain to a data protection supervisory authority. The competent authority is the one for the owner's place of establishment in Germany: `SUPERVISORY_AUTHORITY_TO_BE_NAMED_BY_OWNER`.

The legal basis for processing account and request metadata is proposed as performance of the service you asked for (Article 6(1)(b) GDPR), with sign-in abuse limits and security notices under our legitimate interest in keeping accounts secure (Article 6(1)(f)). This basis is a draft for legal review and may change.

**How to exercise these rights.** Write to `PRIVACY_CONTACT_TO_BE_NAMED_BY_OWNER` from the email address on your account. We answer within one month as the GDPR requires. Because we never hold your conversations, an access request returns only the account and request metadata of section 2.

**Deleting your data yourself.** Most of your data is on your device and only you can delete it. The exact steps, what each one removes and what it leaves behind are recorded in `docs/deletion-path-20261022.md`. In short:

- Delete a saved conversation in Saved: removes its encrypted record and key from this browser; a marker stays so an old tab cannot bring it back; downloaded backups are untouched.
- Delete an encrypted backup file: you do that on your device; we cannot reach it.
- Close your account: ends every sign-in session at once; credentials and contact data are scheduled for deletion after seven days (job not yet active); request metadata and the closure receipt are kept. Account closure requires working email delivery and is not available on the hosted service today.

**What we cannot delete for you.** The sealed server's short-term working memory, which clears on its own; the sealed server's billing metadata; the search provider's query records; and our own request ledger rows, which are kept for billing reconciliation. These contain no content.

## 8. Incident contact

If you believe your data has been exposed or the service has behaved in a way this policy does not describe, contact `INCIDENT_CONTACT_TO_BE_NAMED_BY_OWNER`. We will pause the affected capability while we investigate and tell affected users what we know. We do not have a staffed support desk or a response-time commitment yet; do not rely on an immediate answer.

## 9. What this policy does not promise

- **Private chat is not switched on.** It is enabled only after our checks of the sealed server pass. Until then the hosted service has no inference at all.
- **No anonymity.** We know which account asked and when, never what. The sealed server and the network between you and it see connection and timing metadata.
- **Your device is not covered.** Your browser, your device, browser extensions and anyone who can read your screen can see your conversations before they are sealed and after they are answered.
- **A broken or malicious update could read content before it is sealed.** Updates are published with their exact version so this can be checked; it cannot be ruled out.
- **Names and addresses are not kept back on the device.** Only the identifier kinds listed in section 3 are; everything else you write goes to the sealed server.
- **Lost passphrases are lost.** Nobody can recover your saved history without it, including us.
- **No immediate erasure at the supplier.** The sealed server's working memory clears on its own; we have no button to empty it.
- **Spending limits at the supplier are soft.** A request already running finishes and is billed even if a limit is reached while it runs.
- **Deletion is logical, not forensic.** Deleting a record removes it from our live database on the schedule above; we do not promise erasure from storage media, write-ahead logs or expired backups beyond the stated expiry.
- **Retention periods above are the supplier's statements or our proposals**, not audited facts. Where a period is marked as an owner decision pending, no period applies yet.

## 10. Changes

This text will change when the product changes. Each published version carries its date; the in-app statement always describes the version you are running.

---

## Annotations for the owner (ledger notes, not policy text)

- **Source of truth.** Sections 3, 4 (bullets), 5 and 9 restate `shared/privacy-copy.ts` at `7ce181a`; a test there forbids absolute wording and keeps the app and website copies identical. If `privacy-copy.ts` changes, regenerate this draft.
- **Verified on this branch [V]:** sessions store no IP or user agent (`server/account-auth.ts` null-s `ipAddress`/`userAgent`; ARCHITECTURE "Identity data and schema lifecycle"); the ledger fields of section 6 are the columns of `server/migrations/0004-usage-ledger.sql` and `0013-usage-metrics.sql`; consent grants store only ID, session, commitment and expiry (ARCHITECTURE "Consumer session and research consent"); closure receipt fields per `server/account-closure.ts`; the relay sets `X-Tinfoil-Model` and reads the usage trailer only for completed requests (READINESS "Relay guards", 22 October).
- **Owner-reported, not verified:** Tinfoil's 15 October written reply ("most billing-related metadata is retained for 90 days") and the sent emails recorded in `docs/provider-outreach-20261020.md`.
- **Supplier statements cited:** https://tinfoil.sh/privacy, https://tinfoil.sh/terms/dpa, https://docs.tinfoil.sh/sdk/prompt-caching.md, https://tinfoil.sh/pricing, https://api-dashboard.search.brave.com/documentation/resources/privacy-notice. All already cited in `docs/provider-qualification.md`, `docs/relay-mitigation-assessment-20261021.md` or `docs/search-provider-comparison.md`; none re-fetched for this draft.
- **Tension to resolve before publishing:** `privacy-copy.ts` says the supplier keeps billing records "for about 90 days"; the supplier's published policy (checked 15 October, `docs/provider-qualification.md`) gives per-category periods including billing records kept for accounting periods. Section 6 states both and attributes both; the owner should decide whether the in-app sentence needs the same qualification.
- **Tension to resolve before publishing:** section 5 and `privacy-copy.ts` describe search answers as saved with history. That is the owner decision of 22 October (`docs/search-provider-comparison.md`, launch plan 4.1), recorded as "not implemented yet". The hosted candidate refuses a search key, so no search runs there today. The policy must not go live before 4.1 is implemented or the sentence is reworded.
- **Section 7 legal basis and supervisory authority** are placeholders for legal review; the agent has not given legal advice. Article 27/28 contracts (DPA with Tinfoil, Brave) are unsigned as far as the ledger records; question 4 to Tinfoil is unanswered.
- **No gate passes** by this draft. Provider qualification remains NOT_PASSED (`docs/provider-qualification.md`); launch plan Phase 8 remains BLOCKED.
