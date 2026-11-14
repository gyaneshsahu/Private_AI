# Pre-alpha checklist — 12 November 2026 (updated at night: Privatemode primary; 13 November evening: alpha = beta scope; 13 November night: feature scope and cost controls)

**Scope rule (owner, 13 November): alpha = beta, with the new feature scope.** There is no beta and nothing is "later". The column "When" says **before first invitee** or **during alpha, before launch** (real invitees use it before launch). Items for the Tinfoil backup say **only if Tinfoil is used**. An item leaves the scope only by an explicit owner decision. Handoff: `docs/handoff-20261113.md`.

**Update, 13 November, night (owner):** the scope rule stands, with one explicit owner decision on top. The owner named the features that are in this phase and a short list that is later. Both are in the next section.

## 13 November, night: feature scope and cost controls (owner update)

Recorded from the owner's project update of 13 November (night). This is a docs change. Nothing in this section was built or tested by it. "Partly exists" was checked by reading the code under `src/`, `server/` and `shared/` on `codex/development-handoff`. Nothing was run.

- There is one real invite-only test phase (alpha = beta). There is no separate beta.
- Each feature goes live for invitees behind its own switch. **No per-feature switch exists in the code yet.**
- The first batch is invited when core chat and file upload (U1) are ready. The rest is added as it lands.
- Rows U1 to U12 are in the owner's priority order.

Rules for every row (owner):
- Anything that leaves the device goes only to Privatemode's confidential models (EU).
- No browser built-in dictation.
- Browser on-device speech synthesis is allowed for text-to-speech.
- Images are never stored after the answer.
- Memory is stored on the device. The server stores no profile.

| # | Item | Why it matters | Who | When (alpha = beta) | Effort | Status |
| --- | --- | --- | --- | --- | --- | --- |
| U1 | **File upload** (PDF, doc, spreadsheet, code), own switch | Priority 1. The first batch is invited at core chat plus files | Agent | before first invitee | not estimated | **reading built, switch not built.** Exists, all on the device: text from PDFs with a text layer, up to 20 pages (`src/extraction.worker.ts`); a scanned PDF with no text layer is read by OCR, first 5 pages only, with a note that the text can contain errors; Word `.docx` (`src/docx.ts`); Excel `.xlsx` cell values, one tab-separated block per sheet (`src/xlsx.ts`, added 14 November); plain text, code, `.csv` and `.tsv` files (`src/document-formats.ts`); limits of 10 MB per file and 60,000 characters (`src/documents.ts`). A file over a limit is refused, not cut short. Old `.doc` and `.xls` files are refused with the advice to save as `.docx`, `.xlsx` or PDF. Tested by `tests/document-upload.test.ts`. Missing: no own switch; not tried on the hosted path, on phones, in Firefox or Safari, or with large real files; OCR knows English only, so German umlauts in scans come out wrong (owner decides on adding the German OCR data); spreadsheet dates show as serial numbers; scans stored as JBIG2 or JPEG 2000 are refused; a PDF that mixes text pages and scanned pages gets no OCR; no automated browser test for `.xlsx` or scanned PDFs |
| U2 | **Voice-to-text**, own switch | Priority 2 | Agent | during alpha, before launch | not estimated | **not built.** `src/App.tsx` shows a disabled "coming later" button only. Must not use the browser's built-in dictation; audio may go only to a Privatemode confidential model. Not checked: whether Privatemode offers a speech-to-text model |
| U3 | **Text-to-speech / voice replies**, own switch | Priority 3 | Agent | during alpha, before launch | not estimated | **not built.** No speech synthesis call in `src/`. Browser on-device synthesis is allowed |
| U4 | **PDF export**, own switch | Priority 3 | Agent | during alpha, before launch | not estimated | **not built.** No PDF writer in the code or in the dependencies |
| U5 | **Image upload and understanding**, own switch | Priority 4 | Agent | during alpha, before launch | not estimated | **partly exists, switch not built.** Exists, on the device: text is read from a PNG or JPEG (OCR in `src/extraction.worker.ts`, English language data only) and from a camera photo with rotate and crop (`src/photo-capture.ts`, `src/PhotoCapture.tsx`), up to 12 megapixels. Only the recognised text is used; the image does not leave the device. Missing: understanding the image itself (no image is sent to any model today); German OCR language data; the "never stored after the answer" rule for images that are sent; no own switch. Not checked: whether Privatemode offers a model that reads images |
| U6 | **Projects** (grouped chats, files, instructions), own switch | Priority 5 | Agent | during alpha, before launch | not estimated | **partly exists, switch not built.** Exists: a project is a name only (`src/projects.ts`); create, rename, remove, move a chat into a project and filter chats by project (`src/WorkspaceNavigation.tsx`), saved in the device vault (`src/vault.ts`). Missing: project files, project instructions, no own switch |
| U7 | **Canvas / artifacts** (editable side panel: documents, tables, small pages, export to PDF), own switch | Priority 5 | Agent | during alpha, before launch | not estimated | **not built.** Needs PDF export (U4) |
| U8 | **Memory across chats**, own switch | Priority 6 | Agent | during alpha, before launch | not estimated | **not built.** Must be stored on the device; no profile on the server |
| U9 | **Code execution and data analysis**, own switch | Priority 7 | Agent | during alpha, before launch | not estimated | **not built.** Only exact arithmetic on the device exists (`src/calculator.ts`, `src/arithmetic/`). That is not code execution |
| U10 | **Deep research** (premium, strict caps), own switch | Priority 8 | Agent | during alpha, before launch | not estimated | **not built.** Exists: a web search and an approved page fetch (`/api/research/*` in `server/app.ts`, `server/research.ts`, `src/assisted-research.ts`). Missing: multi-step research, its caps and its cost weight (K3), no own switch |
| U11 | **Scheduled tasks and reminders**, own switch | Priority 9 | Agent | during alpha, before launch | not estimated | **not built.** Open design question: where a task runs while the browser is closed, given that the server cannot read content |
| U12 | **Live voice conversation**, own switch | Priority 10 | Agent | during alpha, before launch | not estimated | **not built.** `src/App.tsx` shows a disabled "coming later" button only. Needs U2 and U3 |

**Cost controls the owner wants before anyone is invited (13 November, night):**

| # | Item | Why it matters | Who | When (alpha = beta) | Effort | Status |
| --- | --- | --- | --- | --- | --- | --- |
| K1 | Maximum input size and maximum output tokens confirmed | Bounds the cost of one request | Agent (Owner confirms the numbers) | before first invitee | not estimated | **not built** as confirmed values. **Built 13 November night:** the relay refuses an encrypted chat body larger than 8 bytes per allowed character (256 KB at 32,000 characters; before: 1 MB), so a modified browser cannot send many times the allowed input on one allowance unit. Output tokens cannot be bounded by the server (the body is encrypted); the Privatemode key limit is the backstop. The report fields exist (`maxInputCharacters`, at most 100,000; `maxOutputTokens`, at most 16,384, per mode; `shared/contracts.ts`). The numbers are not confirmed (owner list step 8 recommends 32,000 input characters), and no limits are set for files, images or voice |
| K2 | A daily request cap beside the weekly one | One heavy day cannot use the whole week | Agent | before first invitee | not estimated | **built 13 November night, not deployed.** `inference.allowance.dailyLimit` (optional): most allowance units in any rolling 24 hours; Thinking counts its cost; the refusal says the daily limit is reached and nothing is forwarded; hourly count name `refused_daily`. Test in `tests/privatemode-relay.test.ts`. Not run against PostgreSQL yet (one `SELECT COUNT`, durable suite not run tonight). Recommended value: 40 with 150 per 7 days |
| K3 | A cost weight or a cap per feature | Deep research, files, images and voice cost more than a short chat | Agent | before first invitee | not estimated | **not built, comes with each feature.** Plan: each feature declares its cost the way a mode does today, so no new mechanism is needed (proposed weights: file or image question 2, voice minute 1, deep research 15 with its own daily cap of 3). Only the per-mode weight exists (`allowanceCost`, 1 to 10, `shared/contracts.ts`) |
| K4 | Retries not counted twice where avoidable | Fairness and correct counts | Agent | before first invitee | not estimated | **built 14 November, not deployed.** After the provider refuses a message before any reply, the same account's next request in the same mode within one minute runs on that reservation (the automatic backup retry, or sending again). One credit per refusal; kept in the server's memory, so a restart in that minute counts twice. Time-outs still count twice, because the model may already have used tokens. Count name `retry_not_counted`. Test in `tests/privatemode-relay.test.ts` |
| K5 | Weekly reconciliation against the Privatemode portal | The server cannot count Privatemode tokens, so the portal is the only exact figure | Agent writes the procedure, Owner reads the portal | before first invitee | not estimated | **procedure written 14 November** (`docs/week-one-monitoring.md`, "Weekly reconciliation with the portal": six steps and a weekly table; no code, the portal has no interface the server can read). Before: The weekly review in `docs/alpha-plan-20261113.md` section 6 reads the portal, but no written step compares it with the ledger |
| K6 | Tell the owner when the free-token balance drops below 0.5M | Pay-as-you-go cannot be switched on yet (P12) | Agent, from the owner's portal readings | before first invitee | not estimated | **not built.** The server cannot read the balance. Owner-reported 13 November: 1.579M of 5M left |

**Decided 14 November: Thinking counts 5** (owner confirmed after the update of 13 November night had said 3).

**Later, not in this phase (owner, 13 November, night):**
- connectors (Gmail, Drive, Calendar)
- browsing and click agents
- custom assistants
- image generation
- video
- podcast-style audio
- Word, Excel and PowerPoint creation
- daily brief
- live camera and screen sharing

## Night of 13 November: the alpha is the only test before launch (no beta)

The owner decided on 13 November that the invite-only alpha is the last test before public launch. So everything launch needs must be built and used by real invitees during the alpha. A launch-gap audit (24 gaps) and an independent code review were run that night. Built and committed on `codex/development-handoff` the same night (not deployed):

| # | Item | Status |
| --- | --- | --- |
| N1 | **Chat allowance for invitees** (audit G1: production had no way to give one, so no invitee could chat) | built: `inference.allowance` in the deployment config, renewed per period; **owner sets the size** |
| N2 | **Web search in production** (audit G3: production refused a search key) | built: `inference.searchKeyFile`, absent means off; Goggles never in production; **owner decides on or off (R5)** |
| N3 | **Operator notice to all users** (audit G10: no way to announce a provider switch or outage) | built: `inference.noticeFile` |
| N4 | **Warning before the weekly report or the key expires** (audit G9) | built: hourly log line, 48 h before the report ends, 14 days before the key expires; needs the alert (O2) to reach you |
| N5 | **Wasm download**: the bridge sent no-store on everything, so the 29 MB Wasm downloaded on every visit (audit G11 plus own finding) | built: cached a year under its hash name and sent Brotli-compressed (about 5 MB) |
| N6 | **Account suspend and erase procedure** (audit G6: Google-only users cannot close their account) | built: `scripts/account-operator.ts` prints one SQL transaction (show, suspend, unsuspend, erase) for you to review and run as the schema owner; ran against Postgres in the durable suite; runbook section with an 8-step erasure procedure in `docs/invited-trial-runbook.md` |
| N7 | **One user could fill the shared attestation queue** (review A) | fixed: at most 2 at once and 10 per 10 minutes per account |
| N8 | **Retry after a time-out refused by our own relay** (review D) | fixed |
| N9 | **"Answer again with Thinking" lost its mode behind the health-consent prompt** (review E) | fixed |
| N10 | **A retried message is charged twice** (review C) and **the client can claim Fast while asking for Thinking-level effort** (review B: the encrypted body cannot be checked) | known, not changed: the portal spend limit is the backstop; recorded in owner decisions |
| N11 | Masking "1 date of birth" on rules text (side finding of the 40-question test) | fixed (`14ef2dd`); dev and independent masking sets unchanged |
| N13 | Content-free counts for the alpha (audit G4, part) | built: hourly `CometRow counts` log line (outcomes per mode, refusals by class, attestation busy, searches); no account or text |
| N12 | Alpha plan with metrics, survey and stop rules (audit G15) | written: `docs/alpha-plan-20261113.md`; monitoring updated for Privatemode: `docs/week-one-monitoring.md` |
| N15 | **German interface flag, default off** (owner decision, 13 November evening) | **Built 13 November, night:** a build setting, `VITE_GERMAN_UI=1`. Without it the app is English everywhere (browser language, a saved pick and the model's fallback language are ignored) and has no DE/EN switch. Default off in both Dockerfiles; test `tests/german-off.test.ts`. A build setting and not `/api/status`, because the sign-in page shows legal text before any status can be read. To switch on after the legal read: add the Render environment variable `VITE_GERMAN_UI` = `1` and redeploy |
| N14 | **German legal texts, binding once approved** (audit G8, owner decision DE/EN) | drafted on `claude/i18n-legal`: German policy, statement, health consent, provider disclosure and imprint in code, acceptable use and 18+ rule as docs (`docs/legal-texts-de-20261113.md`). Change-pair check: `tests/legal-text-pairs.test.ts` fails when the English or German text changes, naming which; check the other language, then re-record with `node --import tsx scripts/record-legal-pairs.ts`. **Owner approves, lawyer reads the German** |

**German and English interface (owner requirement, 13 November):** built, merged, CI green, not deployed (`docs/i18n-20261113.md`). German sweep 54/54 in Chromium, Firefox and WebKit; English sweep 54/54. Open: owner approves the German legal texts with a legal read **before the German interface goes live** (German is binding); a native reader skims the interface; real iPhone Safari and Android in the device check (T2).

**Status corrections from the audit:**
- **P6:** Thinking runs at high since 13 November, not max (corrected in the row).
- **L8:** Privatemode's resale clause was confirmed in writing on 12 November (corrected in the row).
- **C2, C3:** "deletion path done" covers the in-app "delete everything" only. Account closure needs email, which is off, so a Google-only user cannot close the account (N6).
- **O5:** the monitoring list was written for Tinfoil; replaced by the Privatemode version on 13 November.
- **B17:** the limits hold only while one server instance runs (they live in memory).
- **During the alpha, before launch (alpha = beta):** R5 (search, decided on), O1 to O3 (backups, alert, hosted restore), T7 (screen reader on a phone), and launch answers for D12 (inactive accounts), D15 (breach deputy) and L2 (consent record).

**Open owner decisions that must be settled and tried during the alpha (`docs/owner-decisions.md`):** free or paid at launch (G2); public sign-up and capacity beyond one instance (G5; the alpha is decided: invite-only, one server, 3 chats at once); privacy policy fixes (G7: the contact section says an account can be closed, the deletion section says it cannot; no legal basis per purpose, no rights section; corrections drafted). German UI (G8) is built; its flag (default off) is N15.

Everything left before the first invited friend uses CometRow chat. Sources: the repository, `docs/owner-decisions.md` (branch `alpha-provider-neutral`), `docs/provider-qualification-20261026.md`, `docs/provider-model-decision-20261026.md`, `docs/READINESS.md`. The "concerns doc" the owner named does not exist in the repository or `docs/private/`, so nothing was taken from it.

Who: **Owner** (Gyanesh), **Agent** (Claude), **Waiting on a reply** (a supplier). Items with IDs such as A15 or B17 come from the owner's concerns log; that log is not in the repository, so their descriptions come from the owner's message of 12 November. Status: done, open, unknown (cannot be verified from here; never counted as done). Effort is working time, not waiting time.

## Provider

| # | Item | Why it matters | Who | When (alpha = beta) | Effort | Status |
| --- | --- | --- | --- | --- | --- | --- |
| P1 | Edgeless reply: P4 (an app may serve its own users with our key held server-side) | Knockout: a "no" ends Privatemode | Waiting on a reply | before first invitee | 0 | done 12 Nov: Privatemode confirmed in writing that our key on our server may serve CometRow users (§2.4), see `docs/supplier-privatemode-20261112.md` |
| P2 | Edgeless reply: P8 (deprecation notice, exact-version pinning) | Tie-break between providers | Waiting on a reply | during alpha, before launch | 0 | done 12 Nov: exact IDs pin a version; a deprecated ID may route to its successor during the window; a removed ID fails with "model not found". Exact IDs are enforced in the report |
| P3 | GPU attestation scope (former P3) | Trust row of the scorecard | Agent | during alpha, before launch | 0 | done (answered by Privatemode docs) |
| P4 | Tinfoil replies: T1 (EU option), T4 (written agreement for health) | Legal fit; health is in scope | Waiting on a reply | only if Tinfoil is used (T4) | 0 | Tinfoil is now the backup only (owner, 12 Nov); not blocking. Replies still welcome for continuity |
| P5 | Safety grades for case 07, five arms | No model may go live with an ungraded safety case | Owner | before first invitee | 30 min | open: grade safety case 07 for Fast glm-5.3-flash low and Thinking glm-5.3 high (Thinking moved from max to high on 13 Nov); both reply files ready in `.local/privatemode-fast-tier-20261112/` (Thinking-high added 13 Nov, 4,489 tokens) |
| P6 | Default and fallback model pick | The report names one model | Owner (Agent prepares) | before first invitee | 30 min | done 12 Nov for Privatemode: Fast glm-5.3-flash low (backup glm-5.3), Thinking glm-5.3 max (backup glm-5.3-flash), from `docs/privatemode-fast-tier-20261112.md`; Thinking moved to **high** on 13 Nov; safety grade P5 open |
| P7 | Provider decision (scorecard final) | Everything downstream depends on it | Owner | before first invitee | 1 h | done 12 Nov: Privatemode primary, Tinfoil backup (manual, announced switching) |
| P8 | Stage 3: full Privatemode integration, if Privatemode wins | Spike code is on an unpushed branch, not in the app | Agent | before first invitee | 1.5–2 weeks | done 13 Nov: Stage 3 and session verification merged into `codex/development-handoff` (`3172d25`, then `0eecec7`), CI green; Tinfoil stays a tested backup |
| P9 | Qualification report for the chosen provider and model, with owner-accepted checks (D1) | Chat cannot switch on without a valid report | Agent drafts, Owner signs | before first invitee | 2 h | Privatemode draft written 12 Nov (`docs/qualification-report-draft-privatemode-20261112.md` on `privatemode-stage3`); four checks need owner acceptance; context size 32,000 recommended |
| A2 | (concerns log) Tinfoil-specific item | Applies only if Tinfoil is chosen | Agent | only if Tinfoil is used | unknown | unknown (description not in the repository) |
| A16 | (concerns log) Tinfoil-specific item | Applies only if Tinfoil is chosen | Agent | only if Tinfoil is used | unknown | unknown (description not in the repository) |
| A17 | (concerns log) Tinfoil-specific item | Applies only if Tinfoil is chosen | Agent | only if Tinfoil is used | unknown | unknown (description not in the repository) |
| B19, B20 | No promise beyond the provider's terms; weekly check of the provider's terms | A changed provider term can make our copy untrue | Agent drafts the check, Owner runs it weekly | before first invitee | 2 h | done 12 November: claims mapped to sources (accurate for Tinfoil; D17 for Privatemode), weekly check script with baseline, runbook step |
| P10 | Dedicated Privatemode alpha key with rate limit, expiry and spend limit | Separates the alpha from testing; caps damage | Owner | before first invitee | 20 min | open: create in the portal; store only on Render (`inference.apiKeyFile`), keep the free development key local; key swap is the secret plus the report's `portalKeyLimit` and a restart |
| P11 | Privatemode attestation limit: verification per browser session (built), and ask support about the limit | Without it the whole alpha could send only 10-15 messages a minute | Agent built; Owner sends the question | before first invitee (built); the support answer during the alpha | 5 min | session verification live-tested 13 Nov: a single session is fine (20 messages, 0 errors); 3 sessions starting at once got 22 HTTP 429. Adaptive server-side attestation queue and no retry on 429 being built (`attest-queue`); support question still to send. **Owner-reported 13 Nov night, not verified:** the question was asked in the same email as the billing question; no answer yet |
| P12 | Privatemode spend budget and app spend ceiling (D5) | The free 5M tokens are nearly spent by testing; the app books unmetered requests at worst case | Owner | before first invitee | 10 min | **Owner decision 14 November: the first invite waits until paid billing is enabled and topped up; no free-quota-only batch.** open: recommended (corrected 13 Nov) EUR 200 per month at Privatemode with a 90 % alert, and about USD 250 per 7-day window in the report for 10 invitees, because every request is booked at Thinking's worst case (`docs/owner-decisions.md` step 3). **Owner-reported 13 Nov night, not verified:** 1.579M of 5M free tokens left; pay-as-you-go cannot be enabled yet because the billing form needs a VAT ID and there is no registered company; support was asked, no answer yet |
| P13 | CI green on the development line before any merge or deploy | A red line hides real faults | Agent | before first invitee | - | done 12 Nov: `06e1dca` green (container smoke fixed: the runtime image lacked `src/identifier-masking.ts`) |
| P14 | Thinking time-outs on long answers | Answers never arrived (90 s limit, a doomed retry) | Agent | before first invitee | - | done 13 Nov: Thinking at high effort (16/16 complete vs 14/16 at max, median first word 4 s), per-mode limits (Fast 30 s / 90 s, Thinking 120 s / 300 s), no doomed retry, "Still thinking" status (`docs/thinking-timeouts-20261113.md`) |
| P15 | Masking false positive ("1 phone number" with no number) | A wrong privacy notice erodes trust | Agent | during alpha, before launch | - | done 13 Nov: our own helpline numbers were masked once a reply repeated them; allowlist for our public helplines on every turn; dotted date-times and slash chains no longer taken as numbers (`44ec682`) |
| P16 | German rules, fees and deadlines: confident wrong answers | The biggest trust risk found in testing | Agent | before first invitee | - | built 13 Nov: detector, search-first choice, scoped and sourced-only prompt rules, unchecked-figures warning, official-source preference, answer-side check, "always search" setting (off by default). On 40 fresh questions: unwarned confident errors 8 -> 1 with the answer-side check; always-search 15 -> 8; Goggles worse (0 -> 4 on searched questions), left off. Detector recall 20/40. Open: owner approves the Privatemode privacy sentence for the setting (owner list step 4); masking "date of birth" false positive |

## Privacy and legal

| # | Item | Why it matters | Who | When (alpha = beta) | Effort | Status |
| --- | --- | --- | --- | --- | --- | --- |
| L1 | Approve the health-consent text (D2) | Art. 9 consent must be shown in words you stand behind | Owner | before first invitee | 30 min | open (draft behind a flag) |
| L2 | Consent record: device only or server proof (D3) | GDPR Art. 7(1): you must be able to show consent | Owner | before first invitee | 15 min decide; 1–2 days if server | open (default: device only) |
| L3 | Approve the provider privacy text (D8) | Users must know who processes messages and where | Owner | before first invitee | 30 min | open (draft behind a flag) |
| L4 | D10: the live policy names no provider and no transfer | The policy is untrue the moment chat sends a message | Agent, then Owner | before first invitee | 2 h | done in the app (policy names the report's provider whenever chat is ready, branch); published policy file and website still to regenerate at switch-on (O4); texts await D8 |
| L5 | Accept the chosen provider's DPA as a business customer; note the transfer assessment in the DPIA | Processor contract (Art. 28) | Owner | before first invitee | 1 h | open |
| L6 | Health legal basis (Art. 9(2)(a) explicit consent) settled with the provider's terms | Both providers put the basis on us; Tinfoil limits health to incidental without a written agreement | Owner | before first invitee | depends on T4 | open |
| L7 | Retention rule: 90-day request purge | The policy promises it | Agent | before first invitee | 0 | done (live on Render, function installed 25 Oct) |
| L8 | Resale / end-user clause: Tinfoil §10, Privatemode §2.4 | Using the API for our users must be allowed | Waiting on a reply | before first invitee | 0 | Tinfoil: answered by its docs; Privatemode: done 12 Nov, confirmed in writing (§2.4, see P1) |
| L9 | Router release pinning policy (A14) for the block-only attestation audit | Without it the audit stays off; the DPIA draft wanted it on | Owner | during alpha, before launch (owner acceptance covers the first invitees) | 1 h decide | open |
| L10 | Review the DPIA and terms drafts | Required documents for a real user | Owner | before first invitee | half a day | open |
| L11 | Imprint: second fast contact channel (phone or form) | German imprint rules are often read as needing it | Owner | during alpha, before launch | 30 min | open |
| L12 | Google sign-in screen shows "CometRow" (Google console, Branding) | Users see the app name when signing in | Owner | during alpha, before launch | 15 min | unknown |
| A3, A7, C1 | No overclaiming in the app copy and on the website | Promises must match what is built | Agent (app), Owner (website) | before first invitee | 2 h | app: 12 Nov copy audit (`docs/copy-audit-20261112.md`) found 33 overclaims; 9 non-owner ones fixed with a guard test; **open, needs the owner:** 4 high rows in the approved privacy statement ("we never see", "we never can", "checks pass", protected graphics processor) and 2 in the live policy (cache "few hours", 90 days); website: unknown (separate repository `PrivateAI-website`) |
| B15, C6 | Own acceptable-use terms and the 18+ age rule | Users need the rules they agree to | Owner | before first invitee | 1 h | drafts written 12 Nov (`docs/acceptable-use-draft-20261112.md`, `docs/age-rule-draft-20261112.md`), need approval and legal review; not publishable until the support mailbox (R6) exists |
| D12 | Inactivity retention rule | Data of inactive accounts is kept without a rule | Owner decides, Agent wires | during alpha, before launch (the policy promises no inactivity deletion) | 1 day if wired | proposal written 12 Nov (`docs/inactivity-retention-proposal-20261112.md`): wiring the existing file would delete nothing on the hosted service; recommended for the alpha: option A, no code, delete accounts a set time after the alpha ends (owner decision) |
| F1 | Imprint, controller identity, Art. 30 record of processing, breach plan with a named contact, AI-transparency note | Legal duties of a controller; users must know they talk to an AI | Agent drafts, Owner approves | before first invitee | 1 day | imprint, identity and AI note in the app: done; Art. 30 record and breach plan drafted 12 November, need approval (D14 to D16) |
| C2, C3 | Website fixes, privacy policy page, deletion path | The public site and the promised deletion must work | Owner (website), Agent (app) | before first invitee | 1 day | in-app policy page and "delete everything": done; account closure needs email (R2); website: unknown |
| B13 | (concerns log) | Was marked "public launch only"; with alpha = beta it is in scope | Owner | during alpha, before launch (was "public launch only") | — | open: owner describes the item (the concerns log is not in the repository) or drops it |
| F2 | (concerns log) | Was marked "not for the alpha"; with alpha = beta it is in scope | Owner | during alpha, before launch (was "not for the alpha") | — | open: owner describes the item (the concerns log is not in the repository) or drops it |

## Security

| # | Item | Why it matters | Who | When (alpha = beta) | Effort | Status |
| --- | --- | --- | --- | --- | --- | --- |
| S1 | Expired sessions rejected server-side | A copied old cookie must not work | Agent | before first invitee | 2 h (test, fix if needed) | done (test on branch `alpha-provider-neutral`: expired session refused with the old cookie; cookie cache off) |
| S2 | Rotate the exposed database password | You named it exposed; I have no record of where | Owner | before first invitee | 1 h | unknown |
| S3 | Rotate the Privatemode key | You asked for it; the key was never printed in this work | Owner | during alpha, before launch (the alpha runs on its own new key, P10) | 15 min | unknown |
| S4 | Restricted database roles in use | Limits damage if the service is breached | Agent | before first invitee | 0 | done (owner-reported 25 Oct: `cometrow_runtime`, restricted, pending 0) |
| S5 | Stop switch tested on Render | Must work under pressure, not only in tests | Owner (Agent guides) | before first invitee | 30 min | open (unit-tested on the branch) |
| S6 | Spend cap value (`approvedSpendUSD`, D5) | The ceiling is only as good as its number | Owner | before first invitee | 15 min | open |
| S7 | Live header check after the next deploy | Security headers on every response | Agent | during alpha, before launch | 10 min | done for `ae439fa`; redo per deploy |
| S8 | Render bridge forwards the CSRF and chat headers | Without it every chat request through app.cometrow.com fails with 403 | Agent (fix), Owner (deploy) | before first invitee | 10 min | fixed 12 Nov in `09dcf74` with a header test; **needs deploy** and a browser check on the live site |
| A15 | No automatic loading of remote images, links or embeds from model output; strict CSP; canary test | A model answer must not make the browser contact a third party | Agent | before first invitee | 2 h | mostly done: images become "[Image omitted]", links are shown as text, CSP `img-src 'self' blob: data:`; canary test added 12 November (`tests/remote-content-canary-ui.test.ts`): done |
| A1 | The browser stays the authority; a tampered relay or fingerprint is rejected | The relay must not be able to swap the destination | Agent | before first invitee | 0 | done for the Tinfoil path (browser transport test: tampered, wrong host, wrong release); the Privatemode path exists only in the spike (Stage 3) |
| A9 | Threat-model table | Shows what is defended and what is not | Agent | during alpha, before launch | 2 h | done 12 November: 12-row update in `docs/threat-model-20261022.md` (22 October table already covered 13 threats); secret scan added to CI the same day; open: breach deputy (D15) |
| A18 | Lockfile, exact versions, provenance and dependency review in CI | Supply-chain attacks through dependencies | Agent | before first invitee | half a day | done 12 November: 3 high production vulnerabilities fixed (undici, zod, body-parser), signatures and audit checked in CI, pin test |
| A14 | Router release pinning (same as L9) | Applies to the Tinfoil audit only | Owner | only if Tinfoil is used | 1 h | open |
| B17 | Rate limits and cohort size | Bounds abuse and cost | Owner sets the cohort; limits verified by Agent | before first invitee | 15 min | limits: done (60/min per path, 1 request per account, 3 per instance); cohort: decided 13 Nov: invite-only, one server, 3 chats at once; allowlist up to 10, starting with 2 friends (owner sets the list, R3) |
| D14 | Hashed sign-in identifiers; client address derived behind Render; cap-exhaustion attack | Private sign-in logs; correct rate limits; no lock-out of a victim | Agent | during alpha, before launch (needed only if email sign-in is added) | 0 | hashed identifiers and edge client address: done; cap exhaustion matters only with email sign-in (open if R2 adds email) |
| D16 | Metrics read scoped to the account; uniform answer on cancel | One account cannot read another's usage; cancel leaks nothing | Agent | before first invitee | 0 | done (22 October tests) |

## Product

| # | Item | Why it matters | Who | When (alpha = beta) | Effort | Status |
| --- | --- | --- | --- | --- | --- | --- |
| R1 | /account loading fix checked on a real device | First screen a friend sees | Owner | during alpha, before launch | 10 min | unknown (deployed in `ae439fa`, not looked at) |
| R2 | Email delivery, or Google-only for the alpha | Without email: no recovery, no self-service closure | Owner | before first invitee (decision) | 15 min decide; 1–2 days if email | open |
| R3 | Invitee list (at most 10 allowlisted emails) | Who gets in | Owner | before first invitee | 15 min | open |
| R4 | Safe Browsing "Dangerous site" warning explained (Search Console) | Could scare a friend away at sign-in | Owner | before first invitee | 30 min plus Google's wait | cause narrowed 12 Nov (`docs/safe-browsing-20261112.md`): `cometrow.com` flagged for deceptive pages; nothing is live at the root domain (404) while `app.` asks for Google sign-in; Search Console steps written; owner: verify the domain, read the sample URLs, put the website live, request review |
| R5 | Web search on or off for the alpha | Brave unresponsive; no search key in production | Owner | before first invitee (decided: on) | 15 min | decided 13 Nov: **on** for the alpha, Brave (`inference.searchKeyFile`); needs a Brave production key and the search sentences in the privacy wording. 12 Nov comparison (`docs/search-comparison-20261112.md`): Brave stays default; Tinfoil enclave search about 10x the price |
| R6 | Support contact and pause or revoke rule (plan 8.4) | Friends need someone to write to | Owner | before first invitee | 30 min | open |

## Testing

| # | Item | Why it matters | Who | When (alpha = beta) | Effort | Status |
| --- | --- | --- | --- | --- | --- | --- |
| T1 | Isolation test with a second Google account on the live site | One user must never see another's data | Owner + Agent | before first invitee | 1 h | open |
| T2 | Safari, Firefox and phone checks of a real chat | Friends use different browsers | Owner | before first invitee | 2 h | open |
| T3 | Masking gaps known and stated: scans 87.3 %, ID numbers 94.1 %, page-fetch URLs unchecked (D11, D12) | Copy must not promise more than the detector does | Agent | during alpha, before launch (stated as known limits) | 1 h | done in the app (note under answers, page-fetch approval, branch); privacy-statement sentence is owner decision D13 |
| T4 | Rollback test with chat on | Rollback was drilled without chat | Owner (Agent guides) | before first invitee | 1 h | local rehearsal done 12 Nov (`docs/rehearsals-t4-o3-20261112.md`): rollback, roll-forward, stop switch and spend cap pass on one database; found the bridge header blocker (fixed, S8); hosted run open; rolling back past `8a26a30` needs the `inference` key removed from the config first |
| T5 | Full suites green on the merged branch, CI green | Deploy only tested code | Agent | before first invitee | 1 h | done 12 Nov: `alpha-provider-neutral` merged (`8a26a30`), Validate green on the merged line and on later pushes; UI sweep 54/54 clean in Chromium, Firefox and WebKit |
| T6 | Cancelled request, truncated reply and attestation failure on the live provider | Cost and error behaviour with real money | Agent + Owner | before first invitee | 2 h | agent part done 12 November: 6 of 6 pass live (stop before send, stop mid-stream, long reply, output limit, wrong digest); found and fixed report settings being dropped; owner part on Render after chat is on |
| T7 | TalkBack / phone accessibility session (plan 6.1) | Screen-reader users | Owner | during alpha, before launch | 1 h | open |

## Ops

| # | Item | Why it matters | Who | When (alpha = beta) | Effort | Status |
| --- | --- | --- | --- | --- | --- | --- |
| O1 | Backup destination (7.2) | A lost database means lost accounts | Owner | before first invitee | 1 h | open |
| O2 | Alert provider for downtime (7.3) | You need to know when the service is down | Owner | before first invitee | 1 h | open |
| O3 | Recovery rehearsal (7.1) | A backup is only real once restored | Owner + Agent | during alpha, before launch | 2 h | local rehearsal passed 12 Nov (restore 0.5 s); run sheet corrected 12 Nov (CASCADE, new step 5a ends sessions on the restore, service switched only after reopening, reconciliation and roles); hosted run open |
| O4 | Add the provider key and report on Render; switch chat on (runbook step) | The switch is dormant until then | Owner (Agent guides) | before first invitee | 30 min | open (runbook section on the branch) |
| O5 | Week-one monitoring list: readyz, spend vs cap, purge log line, refused requests, error rate | Spot problems before friends do | Agent writes, Owner watches | during alpha, before launch | 1 h | done (`docs/week-one-monitoring.md` on the branch) |
| O6 | Branch merge plan: merge `alpha-provider-neutral` into `codex/development-handoff`, CI, deploy; bring `main` (391 commits behind, last 4 Oct) up to date | Release one tested line, not three | Agent | before first invitee | 2 h | steps 1 and 2 done: merged in `8a26a30`, pushed, Validate green; open: deploy (owner), `main` fast-forward and branch policy (owner, rank 15) |
| O7 | `privatemode-eval` stays unmerged unless Privatemode wins; then it feeds Stage 3 | Keeps the spike out of production | Agent | during alpha, before launch | 0 | open |

## Fastest order to alpha (recomputed 12 November, after the overnight run)

> **Superseded on 13 November:** the current order is in `docs/owner-decisions.md` ("Your steps in order") and `docs/handoff-20261113.md`. This section is kept for the record and still describes the Tinfoil path.

**The agent's pre-decision list is done** (S1, O6, T3, O5, L4, A15, A18, F1, B19/B20, A9, T5, T6 agent part, P9 draft, parity, UI sweep, copy audit, drafts, rehearsals, Stage 3 plan, search comparison). The critical path is now the owner's decisions and the supplier replies, in the order of `docs/owner-decisions.md`.

**Next, owner (any order, all in parallel):** deploy the bridge fix (S8); P5 safety grades; one text review (copy audit high rows, D8/D10/D14, health consent D2–D4); L5, L6, L10, B15/C6; D15/D16; S2; cohort R2, R3, R6, B17; O1, O2.

**When the provider is chosen (P7 with P6):** Tinfoil: the agent finalises the report on the day (digest, dates), you sign the four acceptances and set D5, then O4 chat on for you only, the hosted checks (browser chat through Render, T6, S5, T4), T1, T2, then the first friend. Privatemode: Stage 3 first (6–9 days, `docs/privatemode-stage3-plan-20261112.md`), and D17 plus the fifth sentence in the privacy text.

**Critical path.** Tinfoil: about 3 to 4 working days after your decisions and text approvals (deploy, report, DPA, switch-on, hosted checks). Privatemode: about 2 to 3 weeks after P7 (Edgeless replies plus Stage 3). Earliest alpha: about 1 week from the day the owner items in ranks 1 to 9 are done, with Tinfoil.
