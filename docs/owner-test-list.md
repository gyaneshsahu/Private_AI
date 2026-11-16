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
  Answer received 16 November (owner-reported, Privatemode support): until CometRow is registered, choose "An individual (private use)"; pay-as-you-go works without a VAT ID; German VAT applies either way, so the price is the same. After registration, switch to "A business or organization" and add the VAT ID under billing information; later invoices carry the business details.
  Do: in the portal choose "An individual (private use)" and enable pay-as-you-go. After the business registration, switch to "A business or organization" and add the VAT ID.
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
  Expect: a number (last portal reading: 1.579M of 5M on 13 November; the agent's own counts give about 0.77M on 14 November).
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

**Important (fix of 14 November):** before commit `7fc9635` the Render bridge did not pass the Privatemode request headers. Any older commit fails every chat on the hosted site. Deploy `683e045` (CI green, newest code commit on 14 November) or newer. **Ask the agent for the newest green commit.** Privatemode rotated its manifest on 14 November: the deploy also needs the new manifest file and the signed report that approves its digest (deploy doc, section 2.5).

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

- [ ] **T-82 Enter and Shift+Enter on a real phone keyboard and a hardware keyboard.**
  Do: on a phone, type two lines with the on-screen Enter key, then tap Send. On a computer, press Shift+Enter, then Enter. Also with a Bluetooth keyboard on a tablet, and with a Japanese or Chinese input method if you have one.
  Expect: phone: Enter makes a line, only the button sends. Computer: Enter sends once, Shift+Enter makes a line. Choosing a word in the input method does not send.
  Tell the agent: device, keyboard, and any message that was sent without you wanting it. Not verified on any real device.

- [ ] **T-83 Drag and drop on a computer.**
  Do: drag a text file and a PDF from the desktop onto the chat. Drag one onto Settings. Paste a screenshot into the message box. Try Chrome, Firefox and Safari.
  Expect: a frame "Drop files here" while dragging. The file appears under "File import results". The browser never opens the file or leaves the app. On Settings nothing happens.
  Tell the agent: per browser: worked or not, and whether the frame stayed on screen after you dragged away. Not verified with a real drag.

- [ ] **T-84 Jump to latest with the phone keyboard open.**
  Do: on a phone, ask a Thinking question with a long answer. Scroll up while it streams. Tap into the message box so the keyboard opens. Tap the round arrow button.
  Expect: the view stays where you scrolled. The arrow button sits above the message box, not under the keyboard. Tapping it goes to the newest text and follows again.
  Tell the agent: phone, browser, and a screenshot if the button is hidden or covers text.

- [ ] **T-85 Offline banner in flight mode.**
  Do: type a draft. Switch on flight mode. Wait a few seconds. Switch it off.
  Expect: a banner says the device has no connection and nothing can be sent. The draft stays. The banner goes away when the connection is back. It never says the server is down.
  Tell the agent: device, browser, and how long the banner took to appear and to go.

- [ ] **T-86 Long own message: "Show more" on a phone.**
  Do: paste a long text (a page or more) as your message and send it. Tap "Show more", then "Show less". Turn the phone sideways and back. Try it once while an answer is still streaming.
  Expect: the message is cut after about 12 lines with a soft fade. The button opens and closes it. The page does not jump away from the message, and nothing can be scrolled sideways. Headings, stars and numbers in your text look exactly as you typed them.
  Tell the agent: phone, browser, and a screenshot if the fade looks wrong or the view jumps. Safari and Firefox were not checked.

- [ ] **T-87 Edit a message and send it.**
  Do: tap "Edit" on an earlier message, change the text, read the cost on the Send button, send. Then open "Conversation branches" and switch back to the old version. Also open "Edit" and press Cancel.
  Expect: the box opens at the message. Send shows "uses 1 request" for Fast and "uses 5 requests" for Thinking. One answer arrives. The old version and its answer are still there as a branch. Cancel changes nothing and sends nothing. The request count in the sidebar goes down by the number on the button.
  Tell the agent: whether the number on the button matched what the sidebar counted.

- [ ] **T-88 Retry with the cost in the label, and "Report a problem".**
  Do: after a Fast answer, read the buttons under it. Press "Retry last response", then "Answer again with Thinking". Then press "Report a problem".
  Expect: both retry buttons show their cost in the label, also on a phone (no hover needed). Each press makes one new answer. "Report a problem" opens Help with "An answer was incorrect or misleading" already chosen. The note holds no text from your chat.
  Tell the agent: any label that is cut off or wraps badly on your phone, in German and English.
- [ ] **T-89 Memory: save and use (needs a build with `VITE_MEMORY=1`).**
  Do: unlock the vault. Type "Remember that I am vegetarian" and send. Choose Save memory. In a new chat ask "Suggest a vegetarian dinner". Open the line under the answer.
  Expect: the first message is not sent and costs no allowance. A question "Save as a memory?" shows your words. The answer fits a vegetarian without saying "you told me". The line says 1 memory was sent and shows it.
  Tell the agent: the answer text, whether it mentioned the memory by itself, and its language. Not verified with a real model.

- [ ] **T-90 Memory: German and English mixed.**
  Do: save one memory in English. Ask a fitting question in German. Then the other way round.
  Expect: each answer is in the language of the question, not of the memory.
  Tell the agent: any answer in the wrong language, with the question and the memory.

- [ ] **T-91 Memory screen on a phone.**
  Do: Settings, Memory. Add, edit, mark "Always include", delete one, then Forget all. Lock the vault and open the screen again.
  Expect: every button is easy to hit. Delete and Forget all ask first. After Forget all the list is empty. With the vault locked the screen says to unlock it and shows no memories.
  Tell the agent: phone, browser, and a screenshot of anything cut off or hard to tap. Not verified on any real device.

- [ ] **T-92 Memory stays out where it should.**
  Do: pin a memory ("Always include"). Ask a question in an incognito chat. In a normal chat, untick "Use memory in this chat" in the chat menu and ask again.
  Expect: no line about memories under either answer, and neither answer uses the memory.
  Tell the agent: any answer that used the memory.

- [ ] **T-93 Decide: memory on for the alpha, and its privacy wording.**
  Do: read `docs/memory-privacy-wording-draft-20261114.md` (part 1 for the claim, part 2 for the policy sentences, part 3 for the texts in the app).
  Expect: you can say yes or no to switching it on, to the limits (200 memories, 8 per question, 3 pinned), and to each proposed sentence.
  Tell the agent: your decision and any sentence to change. Recommended: on after T-89 and T-90 pass.
- [ ] **T-94 Deep research: one whole run (only after the lead switched it on and ran the live checks).**
  Do: open Research. Under "Deep research" type a question that needs several sources, for example about a notice period and where the law says so. Tap "Plan the research". Read the proposed search texts. Change one, remove one. Tap "Search for these texts". Watch the steps. At the end tap "Show the answer".
  Expect: nothing is searched before you approve. The steps show Planning, Searching, Reading pages, Writing the answer, each with its outcome. The answer has source links, and a line above it says how many searches and pages were used. The panel says "Requests counted for this run: 15 of 15".
  Tell the agent: the question, the proposed texts, how long it took, and whether the answer was worth 15 requests.

- [ ] **T-95 Deep research: a personal detail never reaches a search text.**
  Do: ask a research question that contains an email address or a phone number. Look at the proposed texts. Then type the address into one of the texts yourself.
  Expect: no proposed text contains the detail. After you type it in, the line "This text will be sent" shows the text without it.
  Tell the agent: any text that showed the detail as it would be sent.

- [ ] **T-96 Deep research: stop.**
  Do: start a run and tap "Stop the research" while it says "Searching". Start another and stop it while the answer is being written.
  Expect: it stops at once. The panel says it was stopped and how many requests were counted (5 of 15 after the plan; "at most 15" when stopped during the answer). Sources found so far are added to the conversation.
  Tell the agent: anything that kept running after Stop, and whether the counted number matches your usage page.

- [ ] **T-97 Deep research: export.**
  Do: after a finished run, export the conversation as PDF and use "Copy conversation as text".
  Expect: both show the answer, the line about searches and pages, and the numbered sources with their addresses.
  Tell the agent: anything missing in either.

- [ ] **T-98 Canvas: open, edit, ask for changes (needs a build with `VITE_CANVAS=1`).**
  Do: ask for a short plan, press "Open in canvas", change a line, then "Ask for changes" with "make it shorter". Apply, then "Undo last change".
  Expect: the button shows the cost before sending; the canvas changes only on Apply; Undo brings your edited version back; the reply has no introduction.
  Tell the agent: any extra text from the model in the proposal, or a cost that differs from the button.

- [ ] **T-99 Canvas: a table on a phone.**
  Do: ask for a small table, open it in the canvas on your phone, use the Table view, paste two rows from a spreadsheet app, add a row, download the .csv and open it.
  Expect: the sheet covers the chat with "Back to chat"; nothing scrolls sideways except the table itself; umlauts are right in the CSV.
  Tell the agent: anything hard to tap, or a paste that lands wrong.

- [ ] **T-100 Canvas: export and keep.**
  Do: export the canvas as PDF, copy it as Markdown, save the conversation, reload, unlock and open the canvas again.
  Expect: the PDF shows only the canvas; the canvas is still there after reload (undo history is not).
  Tell the agent: anything missing.

- [ ] **T-101 Decide: canvas on for the alpha, and HTML mini pages.**
  Do: read `docs/canvas-20261114.md`, section "HTML mini pages: left out".
  Expect: a yes or no for switching canvas on in the alpha build, and whether mini pages are worth a separate origin later.
  Tell the agent: your decision.

- [ ] **T-102 Live voice: a whole conversation (needs a build with `VITE_LIVE_VOICE=1` and `VITE_READ_ALOUD=1`, voice input on).**
  Do: on a computer with Chrome or Edge, tap the live voice button next to the microphone, read the panel, tap "Start talking". Ask a short question, then stay quiet. Do three turns, one in German.
  Expect: the recording ends by itself about 1.5 seconds after you stop. "Sending in 3" shows what was heard. The answer is read aloud, then it listens again. The panel shows the questions sent and the units used.
  Tell the agent: the device and browser, how long each step felt, any word heard wrongly, and whether it ended too early or too late.

- [ ] **T-103 Live voice: End and Pause.**
  Do: press End while it listens, while it is answering, and while it reads aloud. Then start again and press Pause, then Resume.
  Expect: End stops everything at once: no sound, the browser's microphone sign goes off, no further request on the usage page. Resume listens again.
  Tell the agent: anything that kept running after End.

- [ ] **T-104 Live voice: interruptions.**
  Do: ask "Wie hoch ist der Rundfunkbeitrag?" by voice. Then start again and switch to another tab while it listens. Then start again and say nothing for 10 seconds.
  Expect: the rules question ends the session and waits in the message box with the search choice. The other tab pauses it with the microphone off. Silence pauses it with "No speech was heard".
  Tell the agent: any case that sent something you did not expect.

- [ ] **T-105 Live voice: phone and screen reader.**
  Do: open the app on an Android phone and on an iPhone. On the computer, try the panel with a screen reader (NVDA or VoiceOver) and the keyboard only.
  Expect: on Android there is no live voice button (dictation still works). On the iPhone it works or says why not. The screen reader announces each new state once; Tab reaches every button; Escape closes the panel.
  Tell the agent: per device what happened.

- [ ] **T-106 Decide: live voice on for the alpha, and the recordings per day.**
  Do: read "Open decisions" in `docs/live-voice-20261114.md`.
  Expect: you can decide the switch and the voice input limits. With today's limits a user gets 5 live turns a day.
  Tell the agent: your decision. Recommended: on after T-102 and T-103 pass, with recordings of at most 30 seconds (20 a day).
---
- [ ] **T-107 Projects: instructions and a file in a project chat (only after the lead built with VITE_PROJECTS=1).**
  Do: create a project. Open it from its menu in the sidebar ("Open project"). Write instructions, for example "Answer in German and name the clause." Add a PDF or Word file (a made-up contract is fine). Tap "New chat in this project" and ask about one clause, in English.
  Expect: under the answer: "Project instructions were sent with this question" and a line naming the file and its pages. The answer follows the instructions.
  Tell the agent: the question, whether the right pages were named, and whether the instructions were followed.

- [ ] **T-108 Projects: nothing goes where it should not.**
  Do: move that chat out of the project (chat menu in the sidebar, "Move to project", "No project") and ask again. Then ask the same in an incognito chat.
  Expect: no line about project instructions under either answer, and neither answer uses the file.
  Tell the agent: any answer that used the instructions or the file.

- [ ] **T-109 Projects: the project screen on a phone.**
  Do: open a project on your phone. Edit the instructions, add and remove a file, rename the project, then delete it and keep its chats.
  Expect: every button is easy to hit, nothing is cut off, removing and deleting ask first. After deleting, the chats are still in Recent.
  Tell the agent: phone, browser, and a screenshot of anything cut off or hard to tap.

- [ ] **T-110 Decide: projects on for the alpha, and their privacy wording.**
  Do: read `docs/projects-privacy-wording-draft-20261114.md` and the open decisions at the end of `docs/projects-20261114.md` (project files are not in the backup file).
  Expect: you can say yes or no to switching it on, to the limits, and to each proposed sentence.
  Tell the agent: your decision. Recommended: on after T-107 and T-108 pass.

- [ ] **T-111 Decide: background tasks (Auto mode) and their texts.**
  Do: read sections 1, 8 and 14 of `docs/background-tasks-20261115.md`, then `docs/background-tasks-consent-draft-20261115.md` and `docs/background-tasks-privacy-wording-draft-20261115.md` with the same reader as the rest of the policy, German first.
  Expect: you can answer the 12 decisions and the 6 legal questions in one line each, or say "all defaults".
  Tell the agent: your answers. Recommended: on for invitees only after pay-as-you-go works and the legal read is done.

- [ ] **T-112 Background tasks: the job search from a made-up CV (after the lead switched it on).**
  Do: write a short made-up CV (no real person). In Scheduled, create a daily task at a time 10 minutes ahead with the CV attached, search on, mode Fast, and choose Background task. Close CometRow. Open it 20 minutes later.
  Expect: the badge "Background task" on the task; both consent boxes before saving; the answer appears after opening and is saved in the vault; the allowance fell by 4; the next day either new offers or "no new results".
  Tell the agent: the time it appeared, the allowance before and after, and a screenshot of the badge and the consent step.

- [ ] **T-113 Background tasks: delete really deletes.**
  Do: delete the task from T-112, or switch it to Manual. Then ask the lead to run `scripts/account-operator.ts show` for your test account.
  Expect: `background_tasks` and `background_results` both show 0 rows for the account.
  Tell the agent: the two counts.

- [ ] **T-114 Background tasks: the stop file stops them.**
  Do: with a task due in 10 minutes, create the stop file on the server (as for chat), wait past the due time, then remove it.
  Expect: no answer, a skipped result with the reason "service paused", and the task runs again at its next time after the file is gone.
  Tell the agent: what the Scheduled screen showed.
- [ ] **T-115 Scheduled: a Manual task from a template, due and run (only after the lead built with VITE_SCHEDULED=1).**
  Do: unlock your saved conversations. Open "Scheduled" in the left menu, then "Templates", "A new German word every day". Set the time to two minutes from now and tap Create. Wait with the app open.
  Expect: a notice "Scheduled task due" and a "Due now" strip above the chat. "Run now" opens a new chat with the instruction and one answer. The strip goes away and the task shows tomorrow as next.
  Tell the agent: whether the notice came on time, and the answer.

- [ ] **T-116 Scheduled: the chat card.**
  Do: in a normal chat write "can you give me a new German word to learn every 2 days because I am learning German?" and send. Then write "Erinnere mich jeden Tag um 10 Uhr daran, Wasser zu trinken" and send. Then ask "what is a weekly schedule?".
  Expect: the first two show a card above the composer instead of an answer; the first asks "When do you want it?". Create adds the task and sends nothing. The third is answered normally, without a card.
  Tell the agent: every message that showed a card when it should not, or no card when it should.

- [ ] **T-117 Scheduled: the calendar file and the screen on a phone.**
  Do: on your phone, open Scheduled, export one task to the calendar and open the file in your calendar app. Edit, pause and delete a task.
  Expect: the calendar entry is called "CometRow task", repeats as set, and holds no instruction text. Every button is easy to hit; delete asks first.
  Tell the agent: phone, calendar app, and a screenshot of anything wrong.

- [ ] **T-118 Scheduled: a background task with your CV (only after the lead switched on background tasks on the development server).**
  Do: Scheduled, "Templates", "Job search from my CV". Attach a made-up CV (a text file with a fake email address). Read the texts, tick the boxes, Create. Wait for the next run, or ask the lead to run it.
  Expect: the "Background task" badge on the task and on the menu entry. The answer arrives as a new saved conversation. The fake email address never appears in what the server stored (the lead can check).
  Tell the agent: whether the texts were clear, and the answer.

- [ ] **T-119 Decide: Scheduled on for the alpha, and background tasks on or off.**
  Do: read the owner decisions in `docs/scheduled-20261115.md` and `docs/background-tasks-20261115.md`, and the consent drafts in `docs/background-tasks-consent-draft-20261115.md`.
  Expect: you can decide each switch and the consent wording.
  Tell the agent: your decision. Recommended: Manual on after T-111 to T-113 pass; background tasks only after pay-as-you-go works and the consent text passes the legal read.

---
- [ ] **T-120 Approve Privatemode's new deployment manifest (owner rule: only after checking).**
  Do: read `docs/manifest-rotation-20261114.md`; open docs.privatemode.ai/changelog and find v1.64.0; email Edgeless: did v1.64.0 go live on 14 November 2026, and is the new seed-share owner key (starting `3082020a02820201009eb7f0`) yours? Then sign the report with the new digest `d63eb5cf91cb3079fe25a848573a4d0e9d869f462dab4f71fd02bdb372f8e833` and upload the new manifest file with it.
  Expect: after the deploy, chat works on the hosted site; `/api/status` says ready.
  Report back: "manifest approved" and the date, or what Edgeless answered.

- [ ] **T-121 Voice: long dictation across chunk boundaries.**
  Do: in Chrome, Android Chrome and iPhone Safari, dictate slowly counting from one to sixty (about 70 s).
  Expect: every number is in the text, including around 30 and 60 seconds; the warning shows at 2:40 if you keep going, the stop at 3:00.
  Report back: which numbers were missing, per browser.
- [ ] **T-122 Voice: used and left.**
  Do: dictate a few times, then compare "Voice today" with the seconds you actually spoke.
  Expect: the used time matches your speaking time within a few seconds per recording.
  Report back: both numbers.
- [ ] **T-123 Voice: iPhone chunk size.**
  Do: on iPhone Safari, dictate 30 seconds once and note the upload size in the network panel (or ask the agent to read the log).
  Expect: the upload is accepted.
  Report back: the request size.
- [ ] **T-124 Second device today.**
  Do: on your phone, sign in with the same Google account; open Saved and type your usual passphrase.
  Expect: the allowance matches the laptop; the vault is empty (data lives on the first device only).
  Report back: whether that surprised you, and how it felt.
- [ ] **T-125 Backup between devices.**
  Do: on the laptop download an encrypted backup, move it to the phone, restore it with the passphrase.
  Expect: chats, memory, projects and tasks arrive; project files do not; on iPhone, note where the file lands and whether the picker finds it.
  Report back: what arrived and any trouble finding the file.
- [ ] **T-126 Passkey support on your devices.**
  Do: on iPhone, Android and the Windows laptop, open a public WebAuthn PRF test page with your passkey manager.
  Expect: each says whether PRF works.
  Report back: the result per device.
- [ ] **T-127 Scheduled: Manual task and calendar (build with VITE_SCHEDULED=1).**
  Do: create "A new German word every day" at a time a few minutes ahead; wait; tap Run now; export the calendar file and import it into your phone calendar.
  Expect: the due strip appears; Run now starts a new chat; the calendar shows a neutral reminder at that time.
  Report back: screenshots of the strip and the calendar entry.
- [ ] **T-128 Scheduled: chat detection.**
  Do: type "can you give me a new German word every 2 days?" in a normal chat.
  Expect: a card offers to create the task and asks for a time; Create sends nothing.
  Report back: whether the card appeared and felt right.
- [ ] **T-129 New device notice.**
  Do: on a phone or browser that has never used CometRow, open Saved.
  Expect: it says plainly that chats from your other devices are not here and how to bring them.
  Report back: whether it was clear.
- [ ] **T-130 Remember this device (no sync).**
  Do: create a vault with "Remember this device" ticked, close and reopen the browser; then untick it and reopen again.
  Expect: the first time Saved opens without the passphrase; the second time it asks for it.
  Report back: both results, per browser.
- [ ] **T-131 Forgotten passphrase, cancel.**
  Do: lock Saved, press "Forgot your passphrase?", go as far as typing the confirmation word, then Cancel.
  Expect: nothing is deleted; your passphrase still opens it.
  Report back: whether anything changed.
- [ ] **T-132 Restore the same backup twice.**
  Do: with one memory and one chat saved, download a backup and restore it twice on another browser.
  Expect: one chat and one memory, not two.
  Report back: the counts.
- [ ] **T-133 Sync: turn on and print the recovery key (deployment with inference.vaultSync on).**
  Do: on the laptop, Settings, Devices and sync, turn on; print or download the recovery key; type its last group.
  Expect: the key is shown once in 7 groups of 4; sync shows Synced.
  Report back: how long it took and anything unclear.
- [ ] **T-134 Sync: approve your phone.**
  Do: sign in on the phone; choose "Approve from another device"; on the laptop enter the code that appears on the phone.
  Expect: the laptop's prompt appears by itself; the phone then shows your chats, memory and projects.
  Report back: the time from sign-in to seeing your chats.
- [ ] **T-135 Sync: edit on both.**
  Do: change a chat on the phone and a different one on the laptop; wait a minute.
  Expect: both changes appear on both devices.
  Report back: anything missing or doubled.
- [ ] **T-136 Sync: recovery key on a third browser.**
  Do: in another browser, choose "Use your recovery key"; type it with one wrong character first, then correctly.
  Expect: a hint appears for the typo; the correct key opens everything.
  Report back: the hint text and the result.
- [ ] **T-137 Sync: forgotten passphrase on the laptop.**
  Do: lock the laptop, press "Forgot your passphrase?", use the recovery key, set a new passphrase, lock again and open with the new one.
  Expect: all data is there; the new passphrase works.
  Report back: the result.
- [ ] **T-138 Sync: remove the phone.**
  Do: on the laptop, Devices, remove the phone.
  Expect: the phone stops syncing and says so in plain words; it still shows what it had.
  Report back: the phone's message.
- [ ] **T-139 Sync: project files.**
  Do: add a file to a project on the laptop; open the project on the phone; open the file.
  Expect: the phone lists the file as not downloaded, downloads it when opened, and the content is the same.
  Report back: the time to open and any error.
- [ ] **T-140 Synced project files: the decisions (vault sync Stage 3).**
  Do: read `docs/vault-sync-20261115.md` section 14 and the files part of `docs/vault-sync-privacy-wording-draft-20261115.md` (section 7).
  Expect: you agree with a separate file quota of 1 GB, 10 MB per file, and `store: "postgres"` until Hetzner is set up.
  Tell the agent: "approved" or changes (VS-6 to VS-9).
- [ ] **T-141 Hetzner Object Storage for synced files (only when you want files in the bucket).**
  Do: create a private bucket in Falkenstein or Nuremberg; sign the AVV in the Hetzner account; create an access key; set `PRIVATEAI_BLOB_S3_ACCESS_KEY_ID` and `PRIVATEAI_BLOB_S3_SECRET_ACCESS_KEY` in Render yourself.
  Expect: nothing changes until the config says `"store": "s3"`.
  Tell the agent: "bucket ready" with the bucket name and location (never the keys).

## 5. Launch-readiness run (16 November 2026)

What the 16 November run built or changed and only you can check. Everything was tested offline in Chromium at phone, tablet and desktop widths in English and German; nothing here was checked on a real phone, in Safari or Firefox on a device, or on the hosted server. Full list: `docs/launch-readiness-final.md`. Items already in this list are not repeated: paid billing and tax (T-01), Safe Browsing (T-15), support mailbox and invitee list (T-17), manifest approval (T-120), Hetzner (T-141).

- [ ] **T-142 Secure mode master key (before Secure is switched on anywhere).**
  Do: read `docs/secure-store-20261116.md`; generate the master key as it says and set `PRIVATEAI_CUSTODY_KEY` in Render yourself; keep one copy offline.
  Expect: nothing changes until `inference.secureStore` is on.
  Tell the agent: "master key set" (never the key).
- [ ] **T-143 Database steps before the next deploy.**
  Do: apply migrations 0023 to 0025 and re-run the account privilege SQL (`accountPrivilegePlan`; it also installs the closed-account purge function) on the production database.
  Expect: the deploy starts without migration or permission errors.
  Tell the agent: "migrations done" and the deploy log line, or the error.
- [ ] **T-144 Secure on two devices (test deploy, Secure switched on).**
  Do: sign in on a laptop and a phone; chat on one; ask a question that needs web search, approve it, wait for the answer with sources.
  Expect: the chat appears on the other device after sign-in; the answer keeps its sources and shows no raw ids such as `[synthetic-0002]`; Settings never says "we never can" read it.
  Tell the agent: what you saw, with a screenshot of any wrong text.
- [ ] **T-145 Secure Max first use on a phone.**
  Do: open Secure Max for the first time with sync on.
  Expect: it sets up sync with a device name and a recovery key (you type its last group back), then opens the section; Lock now and the 15-minute lock work; a second device unlocks only by approval or the recovery key.
  Tell the agent: the result and anything confusing.
- [ ] **T-146 Reset Secure Max and Open in Secure Max.**
  Do: in Settings > Secure Max try "Open CometRow in Secure Max" and "Reset Secure Max" (test data only).
  Expect: both ask first and do what they say.
  Tell the agent: the result.
- [ ] **T-147 Keyboard shortcuts in real browsers.**
  Do: in Chrome, Edge, Firefox and Safari press Ctrl (Cmd on a Mac) + Shift + O, Ctrl + K, Ctrl + Shift + S, Shift + Esc, Ctrl + Shift + C, Ctrl + Shift + ; and Ctrl + /.
  Expect: each does its CometRow action, or nothing if the browser keeps the key for itself.
  Tell the agent: which keys a browser takes.
- [ ] **T-148 Phone pass (iPhone Safari and an Android phone).**
  Do: new chat, send, stop, retry, edit, copy; the answer's icon row and its Retry and More menus; paste a screenshot (with pictures on); the sidebar drawer, rename and delete a chat; turn the phone sideways.
  Expect: nothing is cut off or too small to tap; notices show above the message box; the drawer scrolls on a short screen.
  Tell the agent: screenshots of anything that looks wrong.
- [ ] **T-149 Tablet portrait (768 px wide) in German.**
  Do: open the app on a tablet held upright, in German.
  Expect: the composer fits on one screen width and Senden is fully visible.
  Tell the agent: a screenshot.
- [ ] **T-150 Offline.**
  Do: open the app online, answer one question, switch to flight mode, type a message.
  Expect: Send is off with the reason shown, the draft stays, old answers still show; back online, Send works again.
  Tell the agent: the result.
- [ ] **T-151 Hosted error pages.**
  Do: open `/no-such-page` on the hosted app, in English and German browsers.
  Expect: a CometRow page with a link back, not "Cannot GET"; the tab shows the CometRow icon.
  Tell the agent: a screenshot.
- [ ] **T-152 Export and delete all chats (Secure on).**
  Do: Settings > Data controls: export my chats as Markdown and JSON; then delete all chats on a test account with two devices.
  Expect: the files open and hold your test chats only; after deleting, both devices show no chats.
  Tell the agent: the result.
- [ ] **T-153 Closing an account in production.**
  Do: decide how a Google-only user closes the account: today closure needs an e-mail code and e-mail sending is off, so nobody can close an account in production.
  Tell the agent: your choice (for example: turn on e-mail codes for closure only, or support closes on request).
- [ ] **T-154 Automatic deletion of closed accounts.**
  Do: decide the grace period (agent default 30 days, allowed 7 to 365) and when to switch `inference.accountPurge` on (after T-143).
  Tell the agent: "purge on, N days" or "not yet".
- [ ] **T-155 Legal read of the new texts.**
  Do: read `docs/secure-copy-draft-20261116.md` (Secure and Secure Max texts, the new Privacy & data sentence), the account deletion texts in `src/text/account.ts`, the footer "No advertising. No training on your data." and the Help contact line.
  Tell the agent: "approved" or changes.
- [ ] **T-156 Passkey sign-in.**
  Do: decide whether production keeps sign-in by Google and e-mail only (your 20 October decision; "Add passkey" is now hidden in production) or also allows passkeys.
  Tell the agent: "keep" or "allow passkeys".
- [ ] **T-157 Terms page.**
  Do: decide whether a Terms of use page is needed before launch (none exists; Help links Privacy policy and Imprint only).
  Tell the agent: the decision; the agent adds the link when the page exists.

## Changes

- 14 November 2026: first version. 81 items. Sources: handoff, decisions doc, checklist, deploy doc, alpha plan, week-one monitoring, and the feature docs of 13 and 14 November. Where docs disagreed, the newest was used (decisions doc and `docs/READINESS.md` of 14 November).
- 14 November 2026: added T-82 to T-85 (Enter key, drag and drop, jump to latest, offline banner) under "Needs a real device" for chat packages A, B and F.
- 14 November 2026: added T-86 to T-88 (long own message, edit and send, retry cost and report a problem) for chat packages C and D.
- 14 November 2026: added T-86 to T-90 (memory across chats: save and use, mixed languages, the Memory screen on a phone, incognito and per-chat off, the decision and privacy wording).
- 14 November 2026: added T-86 to T-89 (deep research: a whole run, masking of search texts, stop, export). Only after the lead switched the feature on.
- 14 November 2026: items from T-86 on renumbered in file order after three features were merged with the same numbers (now T-86 to T-97: long own message, edit and send, retry cost, memory, deep research). Older Changes lines above still name the numbers each agent first used.
- 14 November 2026: added T-91 to T-94 (canvas: open, edit and ask for changes, a table on a phone, export and keep, the decision). Numbers continue after the highest one in this branch; the lead may renumber on merge.
- 14 November 2026: canvas items added; all items renumbered in file order (now T-1 to T-101 with no gaps or repeats). Older Changes lines name the numbers first used.
- 14 November 2026: added T-91 to T-95 (live voice: a whole conversation, End and Pause, interruptions, phone and screen reader, the decision and the recordings per day).
- 14 November 2026: live voice items added; all items renumbered again in file order (T-01 to T-106).
- 14 November 2026: added T-91 to T-94 (projects with instructions and files: a project chat, nothing sent where it should not be, the project screen on a phone, the decision). Only after the lead built with the switch on.
- 14 November 2026: Projects items added; all items renumbered in file order (T-01 to T-110).
- 14 November 2026: three cross-references fixed after the renumbering (T-93 now points to T-89 and T-90, T-106 to T-102 and T-103, T-110 to T-107 and T-108); T-24 shows the agent's balance estimate.
- 15 November 2026: added T-111 (approve the new Privatemode manifest after checks).
- 15 November 2026: added T-111 to T-114 (background tasks: the decision and texts, a job search from a made-up CV, delete really deletes, the stop file). Numbers continue after T-110; the lead may renumber on merge.
- 15 November 2026: background task (Auto) items added; all items renumbered in file order (T-01 to T-115).
- 15 November 2026: added T-111 to T-115 (Scheduled: a Manual task due and run, the chat card, the calendar file on a phone, a background task with a CV, the decision).
- 15 November 2026: Scheduled (Manual) items added; all items renumbered in file order (T-01 to T-120).
- 15 November 2026: added T-121 to T-128 (voice chunks, second device and backup, passkey support, Scheduled Manual and chat detection).
- 15 November 2026: added T-129 to T-139 (vault Stage 0 fixes, encrypted sync on two and three devices, recovery key, forgotten passphrase, removing a device, project files).
- 15 November 2026: added T-140 and T-141 (synced project files: the decisions VS-6 to VS-9, the Hetzner bucket). A file on two devices is T-139.
- 16 November 2026: added T-142 to T-157 (launch-readiness run: master key, database steps, Secure on two devices, Secure Max first use, shortcuts, phone and tablet passes, offline, error pages, export and delete all, account closure and purge, legal read, passkeys, Terms).
