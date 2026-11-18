# Legal read: one acceptance at sign-up, Terms and Privacy Policy (DRAFT, 18 November 2026)

**Not legal advice.** Written by the engineering agent for the owner and the lawyer. It lists what the code and the docs say, and the legal questions we see. Every legal point below is a question for the lawyer, not an answer.

Owner's decision, 18 November: consent for everything (sensitive and health data, web search, image partners, data flows) comes from one acceptance on the sign-up screen, "By continuing, you agree to our Terms and Privacy Policy", stored with versions and a timestamp. The only other thing users may see is the Secure Max confirmation (once). No health prompts, per-feature cards, popups or warnings.

## 1. The drafts for the lawyer

| Draft | File | Version | Shown at |
| --- | --- | --- | --- |
| Terms of use, EN and DE | `shared/terms-of-use.ts` (`termsText(lang)`) | `TERMS_VERSION` = 2026-11-18 (`shared/legal-versions.ts`) | `/terms`, `/terms?lang=de` |
| Privacy Policy, EN and DE | `shared/privacy-policy.ts` (`privacyPolicyText(provider, lang)`) | `PRIVACY_VERSION` = 2026-11-18 | `/privacy`, `/privacy?lang=de`, and the Privacy page in the app |
| Sign-up line, EN and DE | section 2 below | goes with both versions | under the sign-in buttons on `/account` |
| Both languages side by side | `docs/legal-texts-side-by-side.md` (generated) | as above | for reading only |

Every sentence that needs the lawyer or a fact still to confirm is marked in the text itself: "[For the legal read: ...]", "[To confirm: ...]", "[Legal basis: ...]" (German: "[Für die rechtliche Prüfung: ...]", "[Zu bestätigen: ...]"). **These markers are visible on the public pages** `/terms` and `/privacy` until they are removed after the legal read.

The German texts are meant to be binding once approved; they say what the English says (a test checks that both languages carry the same numbers, addresses and links, and flags any change to one language until the other is checked: `tests/legal-text-pairs.test.ts`, `tests/legal-texts-de.test.ts`). Terms section 17 ("General terms") says the Terms exist in both languages and asks the lawyer whether the German version governs if they differ.

## 2. The sign-up wording

- **EN:** "By continuing, you agree to our Terms and Privacy Policy." (with links to `/terms` and `/privacy`)
- **DE as given:** "Mit dem Fortfahren stimmen Sie unseren Nutzungsbedingungen und der Datenschutzerklärung zu."

Proposed German, more natural: **"Indem Sie fortfahren, stimmen Sie unseren Nutzungsbedingungen und unserer Datenschutzerklärung zu."** ("Mit dem Fortfahren" is understandable but stiff; "Indem Sie fortfahren" is the usual phrasing.)

A point for the lawyer that may change both languages: in Germany a privacy policy is information (GDPR Art. 13), not something the user agrees to. Asking users to "agree" to it can be read as an attempt to get consent by bundling, and it can make the policy look like contract terms. A common German pattern is:

- EN: "By continuing, you agree to our Terms and confirm that you have read our Privacy Policy."
- DE: "Indem Sie fortfahren, stimmen Sie unseren Nutzungsbedingungen zu und bestätigen, dass Sie die Datenschutzerklärung gelesen haben."

That pattern would make the policy information only, and then the health-data question in section 4.1 needs its own answer. If the wording changes, the quoted line in the Privacy Policy (section "How you agree to this policy") and in Terms section 2 must change with it, and both versions should then change.

## 3. The consent record

From `server/account-consent.ts` and `server/migrations/0026-consent-records.sql` (read, not run against a database here):

- table `consent_records`: account id, Terms version, Privacy version, `accepted_at` timestamp, sign-in method (`google`, `apple`, `email`, `passkey` or `other`); one row per account and version pair;
- written at sign-in; a new version is recorded at the next sign-in after a version change;
- deleted with the account (`ON DELETE CASCADE` on the user row; closed accounts are deleted `graceDays` after closure when the purge is on, 7 to 365 days, default 30: `docs/account-purge-20261116.md`).

**Question:** must the record be kept after the account is deleted, as proof that the user accepted (GDPR Art. 7(1) for consent; general proof for the contract)? If yes, what is the minimum (a pseudonymous id, the two versions, the time) and for how long (for example the regular limitation period of 3 years, § 195 BGB), and on which basis (Art. 17(3)(e) and Art. 6(1)(c) or (f))?

## 4. What the law may need beyond one acceptance at sign-up

For each point: the risk, and a way to meet it without a popup, if there is one.

### 4.1 Health and other special-category data (GDPR Art. 9)

- **Facts:** users may write about health in any chat. Masking on the device covers identifiers (emails, phone numbers, IBAN and card numbers, ID numbers next to their label); it does not cover health details, names or facts in the user's own words (`shared/privacy-copy.ts`, section "What stays on your device"). Spoken numbers are not masked (`docs/voice-to-text-20261114.md`). Content is sent encrypted to Privatemode's sealed processing in the EU (`shared/provider-disclosure.ts`). In Secure mode (the default) saved chats are stored encrypted with a key CometRow holds and could technically open (`docs/secure-store-20261116.md` section 5).
- **Risk:** CometRow processes health data, and the CJEU reads "health data" broadly, including data that reveals health only indirectly (CJEU C-184/20, OT, 1 August 2022; lawyer to confirm the current case law). Art. 9(1) forbids this unless an Art. 9(2) exception applies. The earlier plan was explicit consent, Art. 9(2)(a), with its own consent step (`docs/health-consent-draft-20261112.md`); the owner removed that step.
- **Can a bundled "by continuing you agree" be valid explicit consent?** Our reading of the rules, for the lawyer to check:
  - Art. 4(11): consent must be a specific, informed and unambiguous indication of wishes by a statement or a clear affirmative action.
  - Art. 7(2): a consent request inside a declaration that also covers other matters must be "clearly distinguishable from the other matters". One line covering the Terms, the whole Privacy Policy and health data is hard to call clearly distinguishable.
  - Art. 7(4): consent is not freely given if the contract is made conditional on consent to processing that is not necessary for the contract. Here, signing in at all requires the acceptance.
  - Art. 9(2)(a) requires "explicit" consent. EDPB Guidelines 05/2020 on consent (sections on "freely given", conditionality, granularity and explicit consent) describe explicit consent as an express statement about the specific processing, for example a separate tick box or a signed statement, and say consent should not be bundled with acceptance of terms.
  - So a bundled acceptance is likely **not** valid explicit consent for health data. This is the biggest risk in the new model.
- **Ways without a popup the lawyer may consider:**
  1. A separate, unticked check box on the sign-up page itself, next to the sign-in buttons (not a popup), with one sentence: for example "I agree that CometRow processes health and other sensitive details I write in my chats, to answer me." Problem with Art. 7(4): if signing in needs it, it is conditional; if it is optional, what happens for users who leave it unticked (we cannot technically stop them writing health details)?
  2. Rely on a different basis or exception, if one fits (the lawyer would know whether any Art. 9(2) exception or a national rule under § 22 BDSG fits a general AI assistant; we do not see an obvious one).
  3. Narrow the risk by design: for example a Settings entry to record or withdraw the health-data consent, used by the app instead of a prompt.
- **Third parties:** users also write about other people's health (a parent, a patient, an employee). The household exemption covers the user, not CometRow. The other person never consents. The Terms ask users to make sure they may share it (acceptable use point 8; policy section "Health and other sensitive details"). Question: is that enough?

### 4.2 The legal basis for chats in general (Art. 6)

- **Draft position:** account, answering, saving and features under Art. 6(1)(b) (contract); request records, limits and security logs under Art. 6(1)(f) (legitimate interest); the acceptance record under Art. 6(1)(c)/7(1) (policy section "Legal bases and your rights (draft)").
- **Risk:** low for ordinary chats if (b) holds. Mixing consent and contract for the same processing is a known problem: if consent is the basis, withdrawal must stop the processing.
- **Web search** was recorded as Art. 6(1)(a), consent per search (`docs/art30-record-draft-20261112.md` row 7). The user still approves the exact search text each time (or switches on automatic search, off by default), so either (a) or (b) may work. Lawyer to choose.

### 4.3 Information at the time of collection (Art. 13)

- **Facts:** the sign-up line links to the Privacy Policy before any data is collected; the policy is also reachable before sign-in at `/privacy` and in the app.
- **Risk:** low, if the policy is complete. Check that it has everything Art. 13 lists: controller, purposes and bases, legitimate interests, recipients, transfers and their safeguards, retention, rights, right to withdraw, right to complain, whether data is required, and automated decisions (none). Gaps we see: the transfer safeguards for Brave, Google and Cloudflare are marked "[To confirm]"; the image provider is not chosen.
- **No popup needed.**

### 4.4 Storage on the device (§ 25 TDDDG)

- **Facts (from code and docs):** the session cookie; the local vaults in the browser (IndexedDB) for Secure and Secure Max; settings such as language and automatic search; "seen" flags for a few notes; the OCR language files cached after first use. The first-start notice flag listed in `docs/notices-inventory-20261117.md` is no longer in `src` (the notice was removed). No analytics, no advertising, no tracking found. The full list is now in the policy section "Cookies and storage on your device" (section 6 below).
- **Risk:** low. § 25(2) Nr. 2 TDDDG allows storage that is strictly necessary for a service the user explicitly asked for, without consent. Lawyer to confirm each item is strictly necessary (the OCR cache and the "seen" flags are the least obvious).
- **No banner needed** while nothing non-essential is stored.

### 4.5 AI disclosure (EU AI Act Art. 50(1))

- **Facts:** the line under the message box, "Answers come from an AI, not a person. Check important answers." (`docs/notices-inventory-20261117.md`, kept list). Terms section 7 says the same.
- **Risk:** Art. 50(1) requires providers of AI systems that interact directly with people to make sure people are informed they are dealing with an AI, unless that is obvious to a reasonably well-informed person. Art. 50 applies from 2 August 2026 (Art. 113); lawyer to confirm the dates, given the EU's 2025 "digital omnibus" proposals.
- **Question:** may the line stay? It is a disclosure, not a warning, and it is not a popup. The owner said "no warnings anywhere"; our recommendation is to keep it until the lawyer says it is not needed, because CometRow is clearly an AI product only once the user knows it.

### 4.6 Labelling of created images (AI Act Art. 50(2) and (4))

- **Facts:** image creation is off by default and has no provider yet; the image keeps any provenance data the provider adds (bytes are not re-encoded); no visible label (`docs/image-creation-20261117.md`).
- **Risk:** Art. 50(2) requires providers of systems that generate synthetic images to mark outputs in a machine-readable, detectable way. Is CometRow the "provider" of that system (it builds the feature on someone else's model) or does the model provider's C2PA or watermark meet the duty? Art. 50(4) (deepfake disclosure) falls on "deployers"; Art. 3(4) excludes personal, non-professional use, so it may fall mostly on professional users. Terms acceptable-use point 10 forbids passing off a created image as a real photo.
- **Without a popup:** keep provider marks; optionally add a small visible "AI-generated" label on the image card and in downloads; decide before the feature is switched on.

### 4.7 Minors and age (GDPR Art. 8)

- **Facts:** the alpha is 18+ (Terms section 4, from `docs/age-rule-draft-20261112.md`). The earlier plan had a tick box "I am 18 or older" on the sign-in screen; under the owner's new decision there is no extra prompt, so the age confirmation is the acceptance of the Terms plus the invitee's reply to the personal invitation.
- **Risk:** low for a personal, invite-only alpha. Art. 8 matters only where consent is the basis and the service is offered to children; with 18+ and consent possibly the basis for health data, the lawyer should say whether accepting the Terms is a sufficient age confirmation.

### 4.8 Withdrawal of consent (Art. 7(3))

- **Rule:** withdrawing must be as easy as giving consent, and users must be told about it before they consent.
- **Draft:** the policy says consent can be withdrawn by writing to the privacy address or by closing the account.
- **Risk:** consent was given with one click at sign-in; an email may not count as "as easy". Closing the account works but ends the whole contract.
- **Without a popup:** a "Privacy & data" entry in Settings, for example "Withdraw consent to sensitive data" or "Withdraw and close account", with a short explanation of the effect. Settings is the place the owner allows for details.

### 4.9 Transfers outside the EU (Chapter V, Art. 44 ff.)

- **Brave Search:** US (`docs/eu-hosting-20261023.md`, `docs/art30-record-draft-20261112.md` row 7). Brave's API privacy notice: query records kept up to 90 days; query data is excluded from its DPA (`docs/search-provider-comparison.md`). Brave never answered our questions on retention and rights (same file). **To check:** Brave's transfer basis (EU-US Data Privacy Framework certification or Standard Contractual Clauses) and whether a processor relationship exists at all for queries. Only the approved search text is sent, after identifiers are replaced on the device; our server sends it, so Brave sees our server's address, not the user's.
- **Google sign-in:** the art. 30 draft lists Google's transfer basis as unknown. To check which Google company is the counterpart and the basis.
- **Render and Cloudflare:** Render's service and database are in Frankfurt (`docs/eu-hosting-20261023.md`); responses carry `Server: cloudflare`, so Cloudflare acts for Render at the edge (`docs/art30-record-draft-20261112.md` row 5). To check: Render's sub-processors and transfer basis, log retention.
- **Privatemode:** processing only in the EU/EEA (DPA of 24 July 2026, sections 9 and 10, per `shared/provider-disclosure.ts`). No transfer.
- **Image creation:** candidates are Microsoft Foundry (EU Data Zone), Google Vertex AI (EU region), Black Forest Labs (Germany, EU endpoint). BFL's standard EU API terms allow training on inputs and outputs (`docs/image-creation-20261117.md`); the policy therefore does not claim "no training". Choose before switching on.

### 4.10 Terms under German consumer law (§§ 305 ff. BGB and others)

- **Incorporation (§ 305(2) BGB):** an express reference before the contract and a reasonable chance to read the terms. The line plus a link next to the sign-in buttons is the usual way; the link must work before sign-in (it does: `/terms`, tested).
- **Storable form (§ 312i(1) Nr. 4 BGB):** the user must be able to retrieve and save the terms when the contract is made. `/terms` is a plain page that can be printed or saved.
- **Transparency (§ 307(1) sentence 2 BGB):** plain language helps; the bracketed markers must go before publication.
- **Changes to accepted terms (§ 308 Nr. 5 BGB):** silence as acceptance is risky (BGH, 27 April 2021, XI ZR 26/20, on bank terms; lawyer to confirm its reach). The draft instead asks for acceptance of the new version at the next sign-in.
- **Digital products (§§ 327 ff. BGB):** may apply even to a free service where the user provides personal data (§ 327(3) BGB), with rules on updates, defects and changes. Lawyer to check for the free alpha.
- **Liability:** the draft keeps the earlier clause (unlimited for intent, gross negligence, life, body, health, product liability; limited for slight negligence). For a free service the statutory standard may already be lower; lawyer to adjust.
- **Later, for paid plans:** the cancellation button (§ 312k BGB) and the right of withdrawal for digital services.

### 4.11 Other points we found

- **Records and assessments are out of date:** the Art. 30 record (`docs/art30-record-draft-20261112.md`) and the DPIA draft (`docs/dpia-draft-20261023.md`) still cite the removed health consent step, the Tinfoil provider and the old storage model (history only on the device). They need updating to Privatemode, Secure and Secure Max, Brave and the image partner. A DPIA (Art. 35) is likely needed or advisable given sensitive data and new technology.
- **Processor agreements (Art. 28):** in place with Privatemode; to sign or check with Render, Brave (queries excluded, see 4.9), the image provider, Hetzner (if file storage is switched on), and the email provider once email codes are switched on.
- **Statement sentences replaced on the policy page:** the shared privacy statement (`shared/privacy-copy.ts`, also shown in the app's privacy panel) still says "We keep no copy of your conversations; saved history lives only on your device" and "you are warned if it may still contain a name". The policy page replaces these sentences (`STATEMENT_FIXES` in `shared/privacy-policy.ts`) because they are not true in Secure mode or under the no-warnings decision. The in-app privacy panel (`privacyText`) still shows the old sentences: the owner should change `shared/privacy-copy.ts` too.
- **Account closure:** closing on the account page needs an email code, and email is off in production (`docs/production-sign-in-options-20261118.md`). Users can then only close by writing to support. The Terms and the policy say so.
- **Support mailbox:** the art. 30 draft lists the support mailbox as not set up (row 8). The Terms and policy name `support@cometrow.com`.

### 4.12 Top 5 risks, in order

1. Health and special-category data without valid explicit consent (4.1).
2. "Agree to our Privacy Policy" as a bundled consent, especially in German law (2, 4.1, 4.2).
3. Withdrawal of consent not as easy as giving it (4.8).
4. US transfers for Brave, Google and the Render edge without a recorded basis (4.9).
5. AI disclosure and image labelling under AI Act Art. 50 if the line under the message box is removed or image creation goes live without marks (4.5, 4.6).

## 5. Sources for the facts in the drafts

- Data flows and partners: `docs/privacy-partners-draft-20261117.md`, `docs/notices-inventory-20261117.md`, `docs/art30-record-draft-20261112.md`, `docs/eu-hosting-20261023.md`.
- AI provider: `shared/provider-disclosure.ts` (Privatemode DPA of 24 July 2026; Privatemode FAQ read 11 November 2026); `shared/privacy-copy.ts` (Privatemode sections).
- Secure and Secure Max: `docs/secure-store-20261116.md`, `docs/product-modes-20261116.md`; whiteboard: `docs/whiteboard-20261117.md`; voice: `docs/voice-to-text-20261114.md`; image creation: `docs/image-creation-20261117.md`.
- Web search: `shared/privacy-copy.ts` (section "When you search the web"), `docs/search-provider-comparison.md`; the server calls `api.search.brave.com` (`server/providers/search.ts`) and opens result pages (`server/research.ts`).
- Sign-in and sessions: `docs/production-sign-in-options-20261118.md` (Google only in production; sessions 1 hour after last use; scopes `openid` and `email`).
- Outbound calls found in the server code: Privatemode (`api.privatemode.ai`), Brave Search, Google and Apple sign-in endpoints (Apple not enabled in production per the sign-in doc), Black Forest Labs (`api.eu.bfl.ai`, image adapter, off), Hetzner Object Storage (`fsn1.your-objectstorage.com`, only when configured), and Tinfoil hosts (backup provider only). The browser contacts no provider host directly for Privatemode (`verificationHosts()` returns none in `server/providers/privatemode-relay.ts`): everything goes through our server. Payments: only a test-mode billing rehearsal exists, mounted only in the synthetic test composition (`server/consumer-workspace.ts`), not in production; no payment data is processed today.
- Terms: `docs/terms-draft-20261023.md`, `docs/acceptable-use-draft-20261112.md` and `docs/acceptable-use-de-draft-20261113.md`, `docs/age-rule-draft-20261112.md` and `docs/age-rule-de-draft-20261113.md`, `docs/owner-decisions.md` (free, invite-only alpha; Privatemode primary), `shared/legal-identity.ts`.

## 6. Compared with a large provider's structure (owner's reference, 18 November)

The owner compared our drafts with the section structure of a large AI provider's EU Terms and Privacy Policy (structure only; no wording was taken). Added the same day, in both languages, with the same "[For the legal read: ...]" and "[To confirm: ...]" markers. `TERMS_VERSION` and `PRIVACY_VERSION` stay 2026-11-18 (same day).

**Privacy Policy** (`shared/privacy-policy.ts`, `draftSections`), placed after "Where your data goes, feature by feature" and after "Secure, Secure Max and Incognito":

| Section (EN / DE) | Facts and where they come from |
| --- | --- |
| Transfers outside the EU / Übermittlungen außerhalb der EU | Render Frankfurt (`docs/eu-hosting-20261023.md`); AI provider follows the provider in use: Privatemode EU/EEA only, Tinfoil USA under the SCCs of its DPA (`shared/provider-disclosure.ts`, `docs/art30-record-draft-20261112.md` row 2); Brave USA, up to 90 days, queries outside its DPA (`docs/search-provider-comparison.md`); Google sign-in and Cloudflare edge (art. 30 rows 1 and 5); image candidates' EU regions (`docs/image-creation-20261117.md`); Hetzner Germany. Brave's, Google's, Render's, Cloudflare's and the support mailbox's transfer bases are "[To confirm]"; no DPF certification is claimed for anyone. |
| How long we keep data / Wie lange wir Daten aufbewahren | Account until closure, then deletion after a grace period, purge built but off, 30 days proposed, closure receipt kept (`docs/account-purge-20261116.md`); sessions 1 hour (`server/account-auth.ts` `expiresIn: 3600`); request records 90 days, held while their allowance period is open (`server/request-retention.ts`); encrypted sync tombstones at least 90 days, purged at the account's next write (`server/vault-sync.ts` `tombstoneMs`, `putItem`); consent record deleted with the account (section 3 above). Backups "[To confirm]": `docs/age-rule-draft-20261112.md` step 5 notes a 3-day Render window, the art. 30 draft says "not set up". |
| How we protect your data / Wie wir Ihre Daten schützen | TLS; browser-side encryption to the attested sealed server, relayed by our servers unread (`shared/privacy-copy.ts`); Secure master key outside the database and Secure Max device keys (`docs/secure-store-20261116.md`); on-device masking of identifiers in text only (`docs/voice-to-text-20261114.md`); restricted database roles, content-free logs, request limits, allowlisted sign-in (art. 30 TOMs). No absolute promise; breach notification per Art. 33/34 marked for the legal read. HSTS is not claimed (not found in `server/app.ts`). |
| Cookies and storage on your device / Cookies und Speicher auf Ihrem Gerät | Session cookie `privateai-account.session_token` (`__Secure-` on HTTPS, HttpOnly, SameSite Lax: `server/account-auth.ts` `cookiePrefix`, `useSecureCookies`); the older `privateai-session` cookie (`server/app.ts`) is only set in compositions without account sign-in, so it is not named on the page; exact live cookie list "[To confirm]" (the sign-in library may set a short-lived state cookie). localStorage keys by purpose (`src/i18n.tsx`, `src/appearance.ts`, `src/answer-modes.ts`, `src/when-to-search.ts`, `src/LiveVoice.tsx`, `src/SecureMaxDialog.tsx`, `src/VoiceInput.tsx`, `src/image-upload.ts`, `src/App.tsx` `cometrow.openInSecureMax` with the account id, `src/SyncScreens.tsx` device ids); IndexedDB vault and sync store (`src/vault.ts`, `src/sync/engine.ts`); OCR language files (`src/extraction.worker.ts`); an unencrypted sessionStorage draft after session expiry (`src/App.tsx`). No service worker (none registered in `src`, no PWA plugin in `package.json`). No analytics or tracking found in `src`, `server`, `shared`; CSP `script-src 'self'` (`server/app.ts`). No banner under § 25 (2) Nr. 2 TDDDG, marked for the legal read. Removal: sign-out deletes the local Secure databases (`src/stores.ts` `closeSecure`), "Delete everything on this device", Data controls "Delete all chats" (`src/DataControls.tsx`), clearing site data. |
| Children / Kinder | 18+, invite-only (Terms section 4, `docs/age-rule-draft-20261112.md`); minor found: close and delete; "[To confirm]" that deletion is manual with no tested procedure (age rule step 4). |

**Terms** (`shared/terms-of-use.ts`), renumbered: new 9 and 10 after "Your content stays yours"; old 9 to 14 are now 11 to 16; new 17; Contact is 18. Sections 1 to 8 keep their numbers, so the references in this document still hold.

| Section (EN / DE) | Content |
| --- | --- |
| 9. Our rights in CometRow / 9. Unsere Rechte an CometRow | Software, design, name and logo belong to the operator or its licensors; personal, non-transferable, non-exclusive, revocable right of use during the alpha; open-source parts under their own licences. Legal read: scope, §§ 69d, 69e UrhG. |
| 10. Complaints about content / 10. Beschwerden über Inhalte | Report to the support address with what, where, why and how to reach you; handling and reply time "[To confirm]"; no public area and no sharing feature (none found in `src` or `server`); Secure Max content cannot be checked by us. Legal read: whether DSA Art. 16/17 notice-and-action and Art. 11/12 points of contact apply to a small invite-only service. |
| 17. General terms / 17. Allgemeines | Severability (§ 306 BGB); changes get a new version and date and are accepted by continuing at the next sign-in, recorded as in Terms section 2 (consistent with the consent record and Terms section 13); until then the accepted version applies. Legal read: whether the German version governs. |

**What a lawyer may still expect and the drafts do not have yet:**

- Privacy: an explicit statement that there is no automated decision-making or profiling (Art. 13(2)(f)); whether providing data is required and what happens if not (Art. 13(2)(e)); the right to object shown separately and prominently (Art. 21(4)); what happens to data if the service is sold or ended; a statement that no marketing emails are sent.
- Terms: the e-commerce information on contract conclusion (Art. 246c EGBGB: technical steps, whether the contract text is stored and retrievable, correcting input errors, available languages); rules for defects and updates of digital products (§§ 327 ff. BGB, already flagged in Terms section 3 and in 4.10 above); whether the operator may transfer the contract (§ 309 Nr. 10 BGB); feedback from alpha testers; links to third-party websites opened by research; for paid plans later, prices, payment, the right of withdrawal and the cancellation button.
- Both: the processor list with each partner's DPA status and transfer tool (art. 30 record update, section 4.11); the email provider for the support mailbox.
