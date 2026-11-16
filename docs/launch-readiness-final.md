# Launch readiness, final run (16 November 2026)

The one list of what the launch-readiness run found, built and left open. Goal set by the owner: the platform fully development-ready, so that only manual work is left (real devices, hosted checks, legal, billing). Nothing was deployed. All switches keep their defaults (section 5).

Method: ChatGPT is the reference (`.local/chatgpt-reference.md`, logged-out look plus recall). A local audit harness (`evaluation/audit-harness.ts`) toured every screen with every switch on and with every switch off, in English and German, at 375, 768 and 1280 px, with faked AI answers and no request beyond localhost (954 screenshots). Three read-only audits followed: chat core (CC), features (FE), settings, shell, accessibility and performance (SS). Duplicates are merged below under one ID. Then nine build rounds, each tested at three widths in both languages, merged one at a time.

Status words: **done** = built and tested in this run; **later** = not now, with the reason; **skip** = not built, with the reason; **owner** = needs an owner decision first (see `docs/owner-decisions.md`, block "Launch-readiness run, 16 November 2026").

## 1. Two groups that matter for the launch decision

**A. Production today (all switches off).** Fixed: math fonts blocked by the CSP; offline first send blanked the app; a failed answer stylesheet stopped every later send; dead "Coming later" controls; a token and dollar line under every chat; technical error texts; bare 404 and "Invalid request" for server failures; layouts too wide on phone and tablet; chats sorted by creation date; outdated "evaluation" and "provider qualification" texts; Settings in one long page with no security section.

**B. Switching Secure on (`inference.secureStore`).** Fixed: web search results thrown away by autosave (FE-01); first Secure Max use without sync and recovery key (FE-02); a file attached but not sent stored as a chat (FE-12); texts false in Secure ("we never can", "only on this device"; SS-01, SS-02, FE-04); no export and no delete-all for Secure content (SS-03); account deletion silent about server content (SS-04). Still needed before Secure goes on: the master key, the database steps, the legal read of the new texts and the device checks (section 6).

## 2. Gap list

| ID | Finding | Status | Note |
|---|---|---|---|
| H-1 | KaTeX fonts blocked by the CSP on every answer | done | Fonts kept as files; CSP stays strict. |
| H-2 | Offline first send blanks the whole app | done | Retry line instead of a blank page; idle prefetch of the answer and send code. |
| H-3 | E-mail links showed "(mailto:…)" | done | |
| H-4 | A failed answer stylesheet made every later send fail | done | Found while fixing CI. |
| H-5 | Dialogs loaded on demand lost the focus return | done | Found by the end-to-end suite after the lazy loading. |
| CC-01 | Streaming answer labelled "Incomplete", no sign of work | done | Typing dots, no label or actions while streaming. |
| CC-02 = FE-09 | Pasted or dropped picture went to the text reader and failed | done | Opens Ask about a picture with the same consent; no second send path. |
| CC-03 = FE-15 | Dead "Coming later" controls in production | done | |
| CC-04 | Token and dollar line shown to users | done | Development builds only. |
| CC-05 | Seven text buttons under each answer | done | Icon row, Retry menu with cost text, More menu. |
| CC-06 | Technical error text in the chat | done | One plain sentence per failure kind, Retry beside it, details folded. |
| CC-07 | No in-place Rename or Delete in the sidebar | done | Share link: skip. |
| CC-08 | Chats sorted by creation date | done | Last activity. |
| CC-09 | No "< 2/2 >" switcher per message | later | Branches are per conversation; data-model change. |
| CC-10 | Branch labels English in German | done | |
| CC-11 | 20-branch limit, no branch delete | later | Rare. |
| CC-12 = FE-11 | "1 messages · 1 files", label wrapping | done | Hidden on an empty chat. |
| CC-13 | Two Stop buttons | done | |
| CC-14 | Partial answer could not be copied | done | |
| CC-15 | Help said there is no automatic retry | done | |
| CC-16 | Titles cut mid-word | done | AI titles: skip (second paid request). |
| CC-17 | Mode picker without descriptions | later | |
| CC-18, CC-19, SS-19 | Phone header and touch targets | done | |
| CC-20, CC-21 | "+" and header menus: keyboard, styles, pointless item | done | |
| CC-22 | Report a problem leaves the chat | later | |
| CC-23 | Copy code feedback; syntax colours | done / later | Colours later (bundle size). |
| CC-24 | New chat during an answer stopped it silently | done | Asks first. |
| CC-25 | Edit box did not grow | done | |
| CC-26 = SS-12 = FE-05 | Notices off screen on phones | done | Shown above the message box. |
| CC-27 | Chat search titles only, no dialog | later | Stays on the device. |
| CC-28..30 | Send name, starter-card arrows, logo "P" | done | |
| CC-31 | Coarse date groups | later | |
| SS-01 | "…and we never can" while Secure is on | done / owner | New sentence; legal read. |
| SS-02 = FE-04 | About 25 texts false in Secure | done / owner | Per-mode texts; draft `docs/secure-copy-draft-20261116.md`. |
| SS-03 = FE-03 | No export or delete-all for Secure content | done | Export built in the browser. |
| SS-04 | Account deletion and closed accounts | done / owner | German phrase, honest text, purge switch off; closure path and retention are the owner's. |
| SS-05, SS-15 | Settings structure | done | Six tabs (section 3). |
| SS-06 | Passkey sign-in lab-only | owner | "Add passkey" hidden in production per the 20 October decision. |
| SS-07, SS-09 | "Chat not available", "provider qualification", developer text | done | |
| SS-08 | Help: no contact, test-phase wording | done / owner | Contact shown from the legal identity file; is the mailbox watched? |
| SS-10 | Production 404 and 500, favicon | done | |
| SS-11 | Every server error answered as 400 | done | 400/413 for bad requests, 503 otherwise. |
| SS-13 | First-load JS | done | 1,266 to 1,124 kB raw, 403 to 364 kB gzip; entry chunk 869 kB / 274 kB gzip. Texts of both languages (267 kB) and react-dom stay in the entry. |
| SS-14 | Session expiry was silent | done | Reason shown at sign-in; draft kept for the tab. |
| SS-16, FE-14 | Native confirm boxes | done | All replaced by the app's dialog. |
| SS-17 | Tablet portrait overflow | done | |
| SS-18, FE-13 | Account-wide custom instructions; global memory switch | later | |
| SS-20..23 | Account headings, favicon, `?developmentTools`, skip link | done | The on-device calculator stays behind `?developmentTools`; figures only in development builds. |
| FE-06 | Every search counted toward the 5-file cap | done | 5 searches per chat, oldest replaced. |
| FE-07 | Search and deep research left the chat | done | "+" > Search the web uses the in-chat approval card; Research page kept. |
| FE-08 | Projects hidden behind "···" | done | Row opens the project screen. |
| FE-10 | Drops on the files page swallowed | done | |
| FE-12 | A file attached but not sent was stored | done | |
| FE-17 | No alert when a scheduled task is due | later | Owner: Web Push later, no e-mail. |
| FE-18..20 | Incognito names, footer, menu polish | done | Footer: "No advertising. No training on your data." |
| K-1 | Keyboard shortcuts and their help | done | ChatGPT's keys. |
| S-1 | "/" command menu | skip | ChatGPT has none for normal users; "+" covers it. |
| S-2 | Shared links, server-stored thumbs, automatic memory, AI titles, training toggle, server search over chats | skip | Privacy and cost rules. |

## 3. Settings

A dialog with tabs on the left, full screen on phones, opened from the account menu only:
- **General / Allgemein:** theme, language (the header switch is gone inside the app).
- **Personalization / Personalisierung:** memory (when memory is on).
- **Data controls / Datenverwaltung:** where your chats are saved, the privacy summary for the mode, archived chats, export and delete all (Secure), history and data controls, download account data, health and sensitive details, "No advertising. No training on your data."
- **Security / Sicherheit:** sign-in methods and active sessions (account page), sign out.
- **Secure Max** (when offered): Open in Secure Max, devices and sync, reset.
- **Account / Konto:** e-mail, plan and usage, delete account (account page).
- Help (account menu) holds Getting started, Trial scope, Your privacy boundaries, Privacy policy, Imprint, Keyboard shortcuts, the contact line and Report a problem.
Design: `docs/settings-structure-20261116.md`.

## 4. Built and working, partly built, missing

**Built and working (tested offline in Chromium at 375, 768 and 1280 px, English and German):** everything marked done above. Design notes per round: `docs/chat-core-fixes-20261116.md`, `docs/chat-core-components-20261116.md`, `docs/error-pages-20261116.md`, `docs/data-controls-20261116.md`, `docs/account-purge-20261116.md`, `docs/secure-fixes-round2-20261116.md`, `docs/keyboard-shortcuts-20261116.md`, `docs/round3-wiring-20261116.md`, `docs/settings-structure-20261116.md`, `docs/secure-copy-draft-20261116.md`.

**Partly built:**
- Closed-account purge: built behind `inference.accountPurge`, off; nobody can close an account in production yet (closure needs an e-mail code, e-mail is off).
- Secure and Secure Max: built behind `inference.secureStore` and `inference.vaultSync`, off; tested with two browser contexts, never on real devices or the hosted server.
- Passkeys: can be listed and removed; adding and signing in are off in production by the owner's decision.

**Missing, and why:** the items marked later (after launch, none blocks the alpha) and skip (privacy or cost rules). A Terms of use page does not exist (owner decision).

## 5. Checks run at the end of the run

- Switch defaults compared with the start (95be153): unchanged, apart from the new `inference.accountPurge` (off unless enabled) and its development switch `PRIVATEAI_ACCOUNT_PURGE`. Build flags unchanged; `vite.config.ts` only keeps fonts as files.
- End-to-end (tests/browser, production build): 61 of 61.
- Durable (PostgreSQL, synthetic): 144 of 144.
- `npm run eval:check`: fixtures unchanged, no model requests.
- Full unit suite: in CI on every push (sharded).
- Layout sweep (`evaluation/ui-sweep.ts`, Chromium, Firefox and WebKit, phone, tablet and desktop): English 54 of 54 views clean; German (a build with `VITE_GERMAN_UI`) 54 of 54 clean, no English words left, no overflow.
- Audit harness, final run: every switch on 558 screenshots, every switch off 366, no request beyond localhost, no page overflow inside the app, no untranslated labels. The three tour steps that still expected the old behaviour (send while offline, Secure Max first use) were updated and pass; the harness build now keeps fonts as files like the real build.
- Provider spend this run: Privatemode 0, Tinfoil 0, Brave 0. No live calls were made.

## 6. Known risks

- Nothing was checked on a real phone, in Safari or Firefox on a device, with a screen reader, or on the hosted server.
- Several browser tests time out under heavy load on this machine and pass when rerun alone; CI has not shown them failing twice in a row.
- Lazy loading: the sync indicator, gate and pairing prompt load on demand although they show on the first screen when sync is on; offline before they were ever fetched, each shows a retry line.
- Keyboard shortcuts may collide with a browser's own keys (T-147).
- `shared/health-consent.ts` (a versioned draft) still points to "Settings, Privacy & data"; it should say "Settings, Data controls" with a version bump.
- The external cryptography review of sync is still open (earlier decision D1).

## 7. What only the owner can do

- **Manual and device tests:** T-142 to T-157 in `docs/owner-test-list.md` (phone, tablet, offline, shortcuts, Secure on two devices, Secure Max first use, hosted error pages, export and delete all), plus the earlier device items.
- **Legal reads:** `docs/secure-copy-draft-20261116.md` (Secure and Secure Max texts, the Privacy & data sentence), the deletion texts, the footer, the Help contact line, the background-task consent sentence for Secure (T-155).
- **Billing and tax:** paid Privatemode billing and the VAT question (T-01).
- **Master key:** `PRIVATEAI_CUSTODY_KEY` before Secure goes on (T-142).
- **Database steps:** migrations 0023 to 0025 and the privilege SQL before the next deploy (T-143).
- **Manifest approval:** Privatemode's new deployment manifest (T-120).
- **Hetzner:** only when synced files should go to object storage (T-141).
- **Safe Browsing:** the warning (T-15).
- **Invitee list:** with the support mailbox and the pause rule (T-17).
- **Decisions:** account closure in production (T-153), purge grace days (T-154), passkeys (T-156), Terms page (T-157), the 7-day Secure Max reset, and the other items in `docs/owner-decisions.md`.

## Run log

- 16 November: harness, three audits, nine build rounds, three test-fix rounds; about 100 commits on `codex/development-handoff`, all pushed. Test fixes at the end: test servers warm every component and use a fixed dependency list where a part loads on demand, so a first use no longer reloads the page mid-test.
