# Owner test list

**Date:** 14 November 2026. **For:** the owner. **Kept by:** the agent, updated as features land.

This is everything only you can test, do or decide, from the start of the project until today. Nothing here is deployed yet. Render still runs the October build with chat off.

## How to use this list

- Work from the top. Inside each group the order is: what gets the first invitee in soonest.
- Tick the box when done: change `- [ ]` to `- [x]`.
- Each item says **Do**, **Expect** and **Tell the agent**. Follow the named doc section for the exact steps.
- Refer to items by id ("T-31 failed"). Ids never change. New items get new ids.
- If you see something other than "Expect": stop, and tell the agent what you saw.
- Never paste a key, a password or real personal content. Use made-up text in tests.
- Short names: "deploy doc" = `docs/render-deploy-and-live-checks-20261113.md`. "decisions doc" = `docs/owner-decisions.md`. "checklist" = `docs/pre-alpha-checklist.md`.

## Shortest path to the first invitee

1. Paid Privatemode billing on, topped up, alpha key made: T-01 to T-03.
2. Brave key, texts approved, password rotated, Safe Browsing cleared, report signed: T-04 to T-22.
3. Deploy the new code with chat off, run the one-time database step, then switch chat on for you and the test account only: T-29 to T-31.
4. Live checks and the basic device checks pass: T-32 to T-36, T-45 to T-50.
5. Add the first two friends: T-39.

## Already decided (not open, listed so nobody asks again)

- Thinking counts 5 requests (D19, 14 November).
- The first invite waits for paid Privatemode billing. No batch on free tokens alone.
- Breach plan: owner only, no deputy. Risk noted: nobody acts while you are unreachable.
- Allowance: 150 requests per 7 days. Free, invite-only, one server. 3 chats at once.
- Search is on, with Brave. Privatemode is primary, Tinfoil is backup only.
- Large-document path stays on. It starts at 20,000 characters. The 10 MB file limit stays until the phone test (T-53).
- OCR language data is kept in the browser. German OCR data is added.
- "Germany" is added to the suggested search text for rules questions.
- German interface: built, off by default. Erase also deletes request records.

---

## 1. Can do now

No deploy needed. T-01 to T-22 block the first invitee.

- [ ] **T-01 Privatemode paid billing (VAT ID question).**
  Do: get support's answer on billing without a VAT ID, or do the business and tax registration. Then enable pay-as-you-go in the portal.
  Expect: paid billing is active.
  Tell the agent: "billing on", or paste support's answer (no account numbers).

- [ ] **T-02 Top up and set the spend budget.**
  Do: top up. Set a budget of EUR 200 per month with an alert at 90 % (decisions doc, step 3).
  Expect: the portal shows the budget and the alert.
  Tell the agent: the budget and the alert value.

- [ ] **T-03 Alpha key, separate from the development key.**
  Do: create a new key in the Privatemode portal with a rate limit, an expiry date (alpha end plus 2 weeks) and a spend limit. Keep it for Render only (T-31). The development key stays in Credential Manager.
  Expect: two keys in the portal.
  Tell the agent: the rate limit and the expiry date. Never the key.

- [ ] **T-04 Brave production key.**
  Do: get a production key in the Brave Search dashboard. Read the plan's terms on storing results (deploy doc, section 8).
  Expect: a key, kept for Render only.
  Tell the agent: "Brave key ready", the plan name, and anything in the terms that worries you.

- [ ] **T-05 Approve the privacy wording for Privatemode.**
  Do: read `docs/privacy-wording-privatemode-20261112.md`. It includes the "Always search" sentence and the search sentences. Decide on the sentence "does not use them to train any AI" (recommended: keep it). Also decide the 4 high rows in `docs/copy-audit-20261112.md`.
  Expect: you agree with every sentence, or you mark changes.
  Tell the agent: "approved", or the sentences to change.

- [ ] **T-06 Approve the privacy policy fixes and the provider section.**
  Do: read `docs/privacy-policy-corrections-draft-20261113.md` and `docs/provider-disclosure-draft-20261112.md`. Also the new sentence of 14 November: text-recognition language files are kept in the browser (decisions doc, top paragraph).
  Expect: as T-05.
  Tell the agent: "approved" or changes, per file.

- [ ] **T-07 Approve the health consent.**
  Do: read `docs/health-consent-draft-20261112.md`. Confirm that "Not now" still allows chat (D4).
  Expect: as T-05.
  Tell the agent: "approved" or changes.

- [ ] **T-08 Approve acceptable use, the 18+ rule, terms and the DPIA.**
  Do: read `docs/acceptable-use-draft-20261112.md` and `docs/age-rule-draft-20261112.md`. The acceptable-use draft still names Tinfoil: ask the agent to rewrite that paragraph first. Review the terms and DPIA drafts (checklist L10).
  Expect: as T-05.
  Tell the agent: "approved" or changes, per file.

- [ ] **T-09 Approve the record of processing and the breach plan.**
  Do: read `docs/art30-record-draft-20261112.md` and `docs/breach-plan-onepage-20261112.md`. In the breach plan, fill the "no deputy" line: within how many hours you are reachable. Sign and date.
  Expect: both approved.
  Tell the agent: "approved", and the hours.

- [ ] **T-10 German texts: review with a native speaker or a lawyer.**
  Do: give them `docs/legal-texts-side-by-side.md` and the 11 open questions in `docs/legal-texts-de-20261113.md` ("Open legal questions"). German is the binding text. Optional: a native reader skims the interface.
  Expect: an answer to each question, and a yes or changes per text.
  Tell the agent: the answers, by question number. This blocks German (T-43), not the English start.

- [ ] **T-11 Accept the four open report checks in writing.**
  Do: decisions doc, step 5. The four: graphics processor checked only on Privatemode's side; AMD and Intel revocation unknown; no per-request metering; the secure-server check can be up to 10 minutes old. Confirm the repository name `edgelesssys/privatemode-public`.
  Expect: one written sentence per check.
  Tell the agent: paste the four sentences and "name confirmed".

- [ ] **T-12 Grade safety case 07.**
  Do: read the two reply files in `.local/privatemode-fast-tier-20261112/`: `privatemode-glmflash-low-safety.md` (Fast) and `privatemode-glm-high-safety.md` (Thinking). Grade each.
  Expect: a grade for both models.
  Tell the agent: the two grades and any reply you found unsafe.

- [ ] **T-13 Confirm the size numbers.**
  Do: confirm input size 32,000 characters (decisions doc, step 8) and the output limits (checklist K1).
  Expect: your yes.
  Tell the agent: "32,000 confirmed", or other numbers.

- [ ] **T-14 Rotate the exposed database password.**
  Do: decisions doc, step 9. Deploy doc, section 3.3, says which file holds the new address.
  Expect: the old password no longer works.
  Tell the agent: "rotated", and which role (owner or runtime).

- [ ] **T-15 Safe Browsing warning.**
  Do: `docs/safe-browsing-20261112.md`, steps 1 to 7. This includes putting the website live at `cometrow.com` and setting the Google sign-in branding to "CometRow".
  Expect: Search Console shows no security issue after Google's review.
  Tell the agent: the sample addresses Google named, and the review result.

- [ ] **T-16 Google sign-in status and a test account.**
  Do: deploy doc, section 8, row "Google OAuth publishing status". Create a second Google account for tests only.
  Expect: you know if it says "Testing" or "In production".
  Tell the agent: the status, and "test account ready".

- [ ] **T-17 Support mailbox, invitee list, pause rule.**
  Do: send a test mail to support@cometrow.com and security@cometrow.com. Choose the first 2 friends (later up to 8: you and the test account use 2 of 10 places). Decide when you pause or remove an invitee.
  Expect: both mails arrive.
  Tell the agent: "mailboxes work", the number of invitees, the pause rule. No names needed.

- [ ] **T-18 File the DPA.**
  Do: file the Edgeless agreement of 24 July 2026 and the 12 November email. Review `docs/dpa-record-privatemode-20261112.md`.
  Expect: both filed where you keep contracts.
  Tell the agent: "filed".

- [ ] **T-19 Backup destination.**
  Do: read `docs/offhost-backup-proposal-20261023.md`. Check the restore window on the Render database page. Decide the off-site backup.
  Expect: a decision and a known restore window.
  Tell the agent: the window in days and your choice.

- [ ] **T-20 Downtime alert.**
  Do: read `docs/liveness-alerts-proposal-20261023.md`. Set an outside check on `https://app.cometrow.com/readyz` that alerts your phone.
  Expect: a test alert reaches your phone.
  Tell the agent: the tool name and "alert works".

- [ ] **T-21 Calendar reminders.**
  Do: add three: weekly report renewal (2 days before it ends), key expiry (14 days before), internal certificates (early January; they expire 18 January 2027).
  Expect: three entries.
  Tell the agent: "reminders set".

- [ ] **T-22 Sign the qualification report.**
  Do: after T-03, T-11, T-12, T-13 and T-60, ask the agent for the final report. Check: Thinking counts 5, input 32,000, key limit and expiry, spend ceiling. If voice is on, it also has a `speech` field. Sign it. It is valid 7 days, so do this just before T-31.
  Expect: a signed report file.
  Tell the agent: "signed", and the valid-until date.

- [ ] **T-23 Attestation-limit answer.**
  Do: the question was sent (your report of 13 November). When support answers, read it.
  Expect: a number per organisation, key or IP, and whether it can be raised.
  Tell the agent: paste the answer.

- [ ] **T-24 Free token balance.**
  Do: read the free balance in the Privatemode portal today.
  Expect: a number (last reading: 1.579M of 5M).
  Tell the agent: the number. Say so at once when it is below 0.5M.

- [ ] **T-25 Score the 30-answer owner sample.**
  Do: follow the top of `evaluation/benchmark-fresh-20261112/owner-sample.md`. Score each answer 1 to 5 in `owner-sample.csv`. Do not look up which label is which.
  Expect: 30 rows filled.
  Tell the agent: "owner sample done". The agent runs the comparison.

- [ ] **T-26 Arithmetic batches for ChatGPT and Claude.**
  Do: follow `evaluation/arithmetic-gate/paste-batches-v3-unseen/README.md`. 6 batches, a new chat for each, in both tools. Save the replies as the README says.
  Expect: 12 saved files.
  Tell the agent: "batches saved".

- [ ] **T-27 Ask Privatemode about audio (only if voice goes on).**
  Do: ask in writing: is audio or its text stored, for how long are records kept, do the speech models run only in the EU, does the agreement cover them (`docs/voice-privacy-wording-draft-20261114.md`, part 3).
  Expect: a written answer.
  Tell the agent: paste the answer.

- [ ] **T-28 Website and imprint leftovers.**
  Do: check the website for promises that are not true today (checklist A3, C2). Add a second fast contact to the imprint (L11).
  Expect: website text matches the app.
  Tell the agent: what you changed.

---

## 2. After deploy

Do these in order. Use the deploy doc.

**Important (fix of 14 November):** before commit `7fc9635` the Render bridge did not pass the Privatemode request headers. Any older commit fails every chat on the hosted site. Deploy `08b7bf1e5efe4bb3e045cb3544d05b1b188d5849` or newer. **Ask the agent for the newest green commit.**

- [ ] **T-29 Deploy part A: new code, chat off.**
  Do: deploy doc, section 4.1 (settings) and 4.2 (10 steps). Use "Deploy a specific commit". Never "Deploy latest commit".
  Expect: log line "listening; email and inference disabled." `/readyz` gives 200. Header check says `HEADER CHECK PASSED`. Sign-in works.
  Tell the agent: the old and new commit id, the time, and the three results.

- [ ] **T-30 One-time database step.**
  Do: deploy doc, section 3.2, 3.3 and 3.5 (three SQL statements for the allowance function).
  Expect: `pending` is 0. Role is `cometrow_runtime`, restricted. The three statements run without error.
  Tell the agent: paste the two check outputs (they hold no secrets).

- [ ] **T-31 Deploy part B: chat on, for you and the test account only.**
  Do: deploy doc, section 2.2 (upload the four secret files), then section 5, steps 1 to 10.
  Expect: account page shows "150 requests remaining". After one Fast message: 149.
  Tell the agent: "chat on", the time, and what the account page shows.

- [ ] **T-32 Live checks: chat, search, files (rows 1 to 15, and 14a).**
  Do: deploy doc, section 6.1. Covers Fast, Thinking, Auto, search, German rules, attachments, photo to text, vault, backup, allowance used up, policy page. Row 14a in section 1 is the daily cap.
  Expect: as each row says.
  Tell the agent: row numbers that failed, and what you saw.

- [ ] **T-33 Live checks: second Google account (rows 16 to 21).**
  Do: deploy doc, section 6.2. Your account in one browser, the test account in another.
  Expect: neither sees anything of the other. A Google account not on the list is refused.
  Tell the agent: pass or fail per row.

- [ ] **T-34 Live checks: your controls (rows 22 to 25a, 27, 28).**
  Do: deploy doc, section 6.3. Stop switch on and off, notice file, the model-check log line, spend cap (optional), erase the test account.
  Expect: as each row says. Row 25a: one line `CometRow model check: ... listed and unchanged`.
  Tell the agent: pass or fail per row. Paste the model-check line.

- [ ] **T-35 Rollback and roll forward (row 26).**
  Do: deploy doc, section 6.5, steps 1 to 8. Remove the whole `inference` key before going back to the old release.
  Expect: old release runs with chat off. New release runs with chat on and the same counts.
  Tell the agent: the times of each step.

- [ ] **T-36 Download, headers, logs, German off (rows 37, 39, 43).**
  Do: deploy doc, section 6.4. Row 37 on a computer: the big Privatemode file is about 5 MB on the wire. Row 39: a German browser still shows English, no DE/EN switch. Row 43: search the logs for your made-up word. Run the header check again.
  Expect: as each row says. No hits in the logs.
  Tell the agent: the transferred size, pass or fail per row.

- [ ] **T-37 Verification limit countdown.**
  Do: reload the app and send a message, more than 10 times in 10 minutes.
  Expect: a clear message with a countdown like "You can send again in 8:53". Not "Protected response unavailable". (Source: commit `06959f0`. No doc section exists.)
  Tell the agent: the exact message you saw.

- [ ] **T-38 Stop and long-reply checks on the live site (checklist T6, owner part).**
  Do: ask the agent for the steps. The docs name this check but give no steps for you.
  Expect: the agent tells you.
  Tell the agent: "ready for T6".

- [ ] **T-39 Two days alone, then the first two friends.**
  Do: `docs/alpha-plan-20261113.md`, section 2, phase 0: at least 20 messages in each mode. Then deploy doc, section 5, step 12: add two addresses and deploy the same commit.
  Expect: no error you cannot explain. Both friends can sign in.
  Tell the agent: message counts, any error, and "two invitees added".

- [ ] **T-40 Daily routine, first 7 days (morning and evening).**
  Do: `docs/week-one-monitoring.md`, table "Daily routine". About 10 minutes.
  Expect: the "Normal" column.
  Tell the agent: anything in the "Act when" column.

- [ ] **T-41 Every week.**
  Do: (a) `docs/week-one-monitoring.md`, "Weekly reconciliation with the portal", 6 steps. (b) `docs/alpha-plan-20261113.md`, section 6. (c) Renew the report: `docs/week-one-monitoring.md`, "Weekly report renewal". (d) Terms check: `docs/invited-trial-runbook.md`, "Provider terms: weekly check". (e) Read the Privatemode changelog.
  Expect: one filled row per week in each table.
  Tell the agent: portal tokens for the week and the free balance.

- [ ] **T-42 Restore the database once on the hosted service.**
  Do: `docs/recovery-rehearsal-20261024.md` (corrected 12 November). The agent guides you.
  Expect: a restored copy opens, old sessions are ended.
  Tell the agent: the times and any step that failed.

- [ ] **T-43 Build switches on Render.**
  Do: add a Render environment variable with value `1` and deploy. One at a time: `VITE_READ_ALOUD`, `VITE_PDF_EXPORT`. Later, only after T-10: `VITE_GERMAN_UI` (deploy doc, row 39a).
  Expect: the button, or German with the DE/EN switch, appears. Not verified: that Render passes these variables into the build.
  Tell the agent: per variable, "appears" or "does not appear".

- [ ] **T-44 During the alpha.**
  Do: the survey and interviews in `docs/alpha-plan-20261113.md`, sections 4 and 5. Swap the key once (decisions doc, "Key swap").
  Expect: answers as categories only, no message text.
  Tell the agent: counts per category.

---

## 3. Needs a real device

Most need the live site (after T-31). Use made-up content. For each: say the device, the browser, pass or fail, and what you saw.

- [ ] **T-45 Windows: Chrome, Brave, Firefox, Edge (rows 29, 30, 31, 35).**
  Do: deploy doc, section 6.4. In each: sign in, Fast and Thinking message, search, photo to text, reload. Brave with Shields default, then aggressive.
  Expect: all work.
  Tell the agent: pass or fail per browser.

- [ ] **T-46 Safari on macOS (row 32).**
  Do: same steps. Close Safari and reopen.
  Expect: all work. Saved conversations are still there.
  Tell the agent: pass or fail.

- [ ] **T-47 Real iPhone, Safari (row 33).**
  Do: same steps, plus the camera for photo to text.
  Expect: all work. No reload or crash while the big file loads. Never tested before.
  Tell the agent: pass or fail, and the iPhone model.

- [ ] **T-48 Real Android phone, Chrome (row 34).**
  Do: same steps.
  Expect: all work.
  Tell the agent: pass or fail, and the phone model.

- [ ] **T-49 First download on mobile data, timed (rows 37, 38).**
  Do: phone on mobile data, empty cache. Time from opening the app to "ready to send". Then a second visit.
  Expect: first visit at most 30 s. Second visit at most 5 s.
  Tell the agent: both times in seconds, and the network (4G or 5G).

- [ ] **T-50 Phone widths and the account page (row 36, checklist R1).**
  Do: on a phone: message box, mode picker, account page, settings.
  Expect: no text cut off, no sideways scrolling, buttons easy to tap.
  Tell the agent: a screenshot of anything broken (no chat content).

- [ ] **T-51 Keyboard only, and 200 % zoom (rows 40, 42).**
  Do: use only Tab, Shift+Tab, Enter, Esc. Then set browser zoom to 200 %.
  Expect: every control reachable, focus always visible, nothing overlaps.
  Tell the agent: the control you could not reach, if any.

- [ ] **T-52 Screen reader on a phone (row 41, checklist T7).**
  Do: `docs/galaxy-a52-talkback-checks.md` on Android. VoiceOver on iPhone.
  Expect: buttons have names. Answers are read out.
  Tell the agent: buttons without a name.

- [ ] **T-53 A real 100-page PDF on a phone.**
  Do: attach a real long PDF (under 10 MB, nothing private) and ask about one fact on a late page. Background: `docs/large-documents-20261114.md`.
  Expect: it reads within 90 s. A note says "N of M passages ... are sent". The answer has the fact and its page.
  Tell the agent: file size, pages, reading time, the note text, right or wrong answer. Not verified on any phone.

- [ ] **T-54 A real Excel file and a real Word file.**
  Do: attach an `.xlsx` and a `.docx` made in real Office. Ask about a value.
  Expect: the value is found. Known limit: dates in spreadsheets show as numbers.
  Tell the agent: what was right and what was wrong.

- [ ] **T-55 A real scanned German document, and a mixed PDF.**
  Do: attach a scan or phone photo of printed German text. Then a PDF with text pages and scanned pages.
  Expect: umlauts, ß and € are right. Only the first 5 scanned pages are read. Known limit: the mixed PDF gets no text recognition on its scanned pages.
  Tell the agent: wrong characters, the time it took, and what the app said for the mixed PDF.

- [ ] **T-56 Text-recognition data: first scan and second scan.**
  Do: on a computer, DevTools, Network. Scan once, then again. Repeat in a private window, and on a phone. Background: `docs/third-party-ocr-data-20261114.md`, "How it is loaded".
  Expect: first scan about 21 MB. Second scan about 4 MB. In a private window it may download again but must still work.
  Tell the agent: the two sizes per browser. Not verified in any real browser.

- [ ] **T-57 Voice input (only when switched on, T-68).**
  Do: `docs/voice-to-text-20261114.md`, "What the lead must check live", points 4, 5 and 9. Microphone permission. A made-up German and English recording in Chrome, Firefox and Safari. One full 2-minute recording. A phone.
  Expect: the browser asks for the microphone only after the tap. Countdown stops at 2:00. Text lands in the message box, nothing is sent. Upload stays under 1,025,536 bytes.
  Tell the agent: per browser: worked or not, wrong words, upload size. Not verified: Safari's format.

- [ ] **T-58 Read aloud on each device (only with the switch on, T-43).**
  Do: press "Read aloud" on a German and an English answer on each device.
  Expect: computers, iPhone and iPad speak with a voice installed on the device. **Android stays silent on purpose** and says why. No voice for the language: no speech, and a message.
  Tell the agent: per device: spoke or not, the voice name, pause and resume worked or not.

- [ ] **T-59 PDF export through the print dialog (only with the switch on, T-43).**
  Do: "Export as PDF" on one answer and on a conversation. Computer and phone. Save as PDF.
  Expect: clean pages, black on white, no buttons, tables and formulas correct.
  Tell the agent: per device: saved or not, and what looked wrong.

---

## 4. Needs a decision

Say "T-xx: yes" to take the agent's default, or give your own value.

- [ ] **T-60 App spend ceiling (`approvedSpendUSD`).** Default: about USD 100 per 7 days for the first 2 to 4 accounts, about USD 250 for 10. Too low stops chat for everyone. Needed for T-22.
- [ ] **T-61 Daily cap beside the weekly one.** Default: 40 per 24 hours (checklist K2).
- [ ] **T-62 Google-only sign-in for the alpha.** Default: yes. No email means no self-service account closing.
- [ ] **T-63 Consent record: on the device or also on the server.** Default: device only.
- [ ] **T-64 When German goes on.** Default: after the legal read (T-10).
- [ ] **T-65 "Sie" or "du".** Default: keep "Sie" (as built).
- [ ] **T-66 New policy date.** The policy still says 22 October 2026. Default: set the new date on the day you approve the whole policy (T-06).
- [ ] **T-67 Inactivity rule.** Default: option A in `docs/inactivity-retention-proposal-20261112.md`: no code, delete accounts a set time after the alpha ends. You set the end date.
- [ ] **T-68 Voice input.** Defaults: switch on after paid billing works. Longest recording 120 seconds. 10 minutes per day (4 while tokens are short). Each recording costs 2 allowance units. Model Whisper, until real speech is compared (T-57). Also: approve the wording draft `docs/voice-privacy-wording-draft-20261114.md`, and keep or remove "in the EU" in the in-app note until T-27 is answered.
- [ ] **T-69 Microphone permission header.** Today the next deploy allows the microphone for our own site for everyone. The other choice: only while voice is on (small code change). The docs give no recommendation. The browser still asks the user each time.
- [ ] **T-70 Read aloud on Android.** Default: keep it silent.
- [ ] **T-71 Print dialog accepted as "PDF export".** Default: yes. A one-tap download needs a new library and gives a worse document.
- [ ] **T-72 Switches for read aloud and PDF export: build or server.** Today: build switches (a change needs a deploy). A server switch is about ten lines. Default: keep build switches. Also approve the two privacy sentences in `docs/read-aloud-and-pdf-export-20261114.md`, section 4.
- [ ] **T-73 "Summarise the whole document" button.** Default: not now. Build it if invitees ask. Cost: about 18 requests for one long document.
- [ ] **T-74 Cost of a file question.** Proposed 2 units (checklist K3). 1 is also defensible for large documents. You set it.
- [ ] **T-75 The 10 MB file limit.** Default: decide after T-53.
- [ ] **T-76 Free or paid at launch.** Default: decide in the first alpha week. If paid, live payments must run with invitees first.
- [ ] **T-77 Launch capacity.** Waitlist or open sign-up, and the Privatemode plan. Default: decide after T-23.
- [ ] **T-78 Masking limits sentence in the privacy statement (D13).** Proposed sentence is in the decisions doc, row D13. Default today: statement unchanged.
- [ ] **T-79 Brave gets 10 results on rules searches.** Decide if the privacy text should say so (`docs/handoff-20261113.md`, open decision 7).
- [ ] **T-80 Two items from your concerns log (B13, F2).** The log is not in the repository. Describe them or drop them.
- [ ] **T-81 Optional add-ons.** Remove the old Render disk, a second Privatemode organisation for tests, a status page (deploy doc, section 8). Default: not before the first invitee.

---

## Changes

- 14 November 2026: first version. 81 items. Sources: handoff, decisions doc, checklist, deploy doc, alpha plan, week-one monitoring, and the feature docs of 13 and 14 November. Where docs disagreed, the newest was used (decisions doc and `docs/READINESS.md` of 14 November).
