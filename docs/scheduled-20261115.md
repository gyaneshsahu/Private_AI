# Scheduled: Manual tasks and the whole interface, 15 November 2026

Status: **built and tested offline, switched off by default (`VITE_SCHEDULED=1`), nothing verified live.** Built by Agent M. This is checklist row U11. It follows the owner's decision of 15 November (a "Scheduled" panel like Claude's) and the shared contract `.local/scheduled-contract.md` with the lead's update of the same day. The server side of Auto mode ("Background task") is Agent A's: `docs/background-tasks-20261115.md`. This doc covers Manual mode and every screen, including the Auto screens.

## 1. What the user sees

- **Left menu:** a "Scheduled" / "Geplant" entry with a clock icon, under New chat. While any background task exists it carries a "Background task" badge.
- **The Scheduled screen** (a dialog, like the project screen): tabs "Yours" and "Templates", a "New task" button, the empty state "No scheduled tasks yet" with "Set up manually". Each task shows its name, the trigger in words ("Every 2 days at 10:00", "Jeden Montag um 08:30"), a "Manual" chip or the "Background task" badge with the line "Stored on our server and readable by it", the next due time, the last run, "Paused" and "Due now". Actions: Run now (Manual only, with its cost), Edit, Pause or Resume, Export to calendar, Delete (asks first). At the foot: "Export all Manual tasks to calendar", the tick "Include task names in the calendar file" and the counts (20 Manual, 3 background).
- **The New scheduled task form:** name, a large instruction field, answer mode (Auto, Fast, Thinking), the schedule (Repeat: Hourly shown but disabled with "not in the test phase", Daily, Weekly, Monthly; Every 1 to 31; weekday or day of the month; time), "How it runs" (Manual or Auto), Advanced settings (notifications: in the app, calendar file; email and push shown as "later"; web search with the exact masked search text) and the cost per run. Validation names each problem under its field and moves focus to the first one.
- **Templates:** "A new German word every day", "Weekly meal ideas", "Monthly money check", and "Job search from my CV" (the owner's test case). The last opens the form with Auto chosen when the server offers it, the search on when the service has it, and the document button. "Weekly summary of my saved notes" was left out: a run is a new chat and cannot read saved notes without new data paths.
- **Due now:** on app open and on unlock, Manual tasks whose time has passed show in a strip at the top of the chat area (and as "Due now" on the screen), with Run now and "Skip this time". When a task becomes due while the app is open, the app's one notice says so (no browser notifications in this pass).
- **Chat detection:** a message such as "can you give me a new German word to learn every 2 days" or "Erinnere mich jeden Tag um 10 Uhr daran, Wasser zu trinken" shows a card above the composer instead of being sent: "Create a scheduled task? A new German word to learn · Every 2 days at 09:00 · Manual", with Create, Edit (the form, prefilled) and Just send. Without a time it asks "When do you want it?" with a time field. Create stores a Manual task and sends nothing. Escape or the close button leaves the text in the composer.

## 2. Manual mode

- **Storage:** one encrypted record in the vault's `meta` store (`scheduled-tasks`, label `scheduled-tasks-v1`), like memories and projects. Manual and Auto copies are in it; the server never sees Manual tasks. Read only with an unlocked vault; locked, the screen says so.
- **Vault rules followed:** passphrase change re-seals it, the encrypted backup carries it (restored tasks come back as Manual tasks with new identities, so a backup never creates a server copy), "Delete everything on this device" removes it (and first deletes the server copies of background tasks), locking drops the held list, and a change in one tab locks the other tabs, as memory does.
- **Run now** starts a new conversation with the instruction as the first message through the existing `send()` path: masking, allowance, the mode (Auto is decided on the device as for a message), the health consent and the stop switch all apply. A task with an approved search text first shows "This task searches the web first" with the exact text and "Search, then answer" or "Answer without searching", the same tap that approves a search suggestion. Only an answered run moves the task on; a refusal (allowance, stop switch, provider) leaves it due.
- **Missed runs are not caught up:** after a run the next due time keeps the schedule's rhythm and skips every missed slot (`advanceAfterRun`).
- **`nextDue`** (`shared/scheduled-tasks.ts`) is pure and DST-safe: dates are counted as calendar days in the task's IANA zone, then turned into an instant. A time skipped by the spring change moves forward by the gap (02:30 becomes 03:30); a time that exists twice in autumn is the later one. Monthly days are 1 to 28, so month ends and leap years never shift a task. "Every 2 days" counts from the previous due time; at creation the first run is today if the time is still ahead, else one interval later.

## 3. Calendar file

`src/scheduled-ics.ts`, RFC 5545: CRLF line ends, lines folded at 75 octets without splitting a character, text escaping, a VTIMEZONE built from the browser's own zone data (yearly rules for zones with clock changes, one fixed offset otherwise; UTC tasks get a UTC time), one VEVENT per task with `RRULE` (DAILY, WEEKLY with BYDAY, MONTHLY with BYMONTHDAY), a 15-minute duration, an alarm at the start time, and `URL` set to the app's plain address. The title is "CometRow task" unless the user ticks "Include task names". **The instruction is never in the file.** Downloaded through a Blob; nothing is sent.

## 4. Auto screens (wired to the server through `src/background-tasks-client.ts`)

- With `status.backgroundTasks` absent, the Auto choice is shown disabled with "Not available yet" and nothing calls the server.
- At the choice: the "Background task" badge, the consent text from Agent A's draft (`docs/background-tasks-consent-draft-20261115.md`, English and German, word for word) and its checkbox. "Auto" runs as Fast on the server, and the form says so.
- **One document** (the CV case): a "Attach a document" button reads a text document on the device, masks identifiers with the same masking session as chat (email, phone, bank, card, tax, insurance and ID numbers become stand-ins such as `{{EMAIL-1}}`), keeps at most 30,000 characters and sends it once with the task (`attachment: { text }`). The document is not kept in the vault; its masking map (each stand-in and its original value) is, inside the encrypted tasks record, and never sent. Editing a background task can send a new document (with the consent again; it continues the same map, so stand-ins in earlier results keep their values) or remove the stored one.
- **Extra consents**, each a separate unticked box: the document text when a document is attached; a short CV notice when the instruction itself looks like a CV (English and German keywords, on the device); the health text when the name, instruction or document looks like health content (keywords, on the device; there was no health detector before). `consent.sensitive` is true when any extra consent was given.
- Identifiers in the name, instruction or search text of a background task are refused on the device with a plain sentence, because the server refuses them too.
- The cost line for a background task uses Agent A's weights: Fast 1 (Auto counts as Fast) or Thinking 5, plus 1 for a search and 2 for a document.
- **Results** (`src/background-results.ts`): fetched on unlock and every five minutes while the app is open. A finished run is saved into the vault as a new conversation ("Job search from my CV (background task)"), with the document's original values put back by the same `restore` chat uses for its own answers, and only then acknowledged, so the server deletes it. One tab at a time does this (Web Lock `cometrow-background-results`); the conversation takes the result's id, so the vault itself refuses a second save of the same result (browsers without Web Locks, or an acknowledgement that was lost). "Nothing new" runs and skipped or failed runs are acknowledged and listed in plain words in the strip ("was skipped: your request allowance was used up"); every reason code of Agent A's section 6 has an English and a German sentence. When the server paused a task itself (three allowance skips, or an unreadable record), the vault copy is marked paused too.
- Deleting a background task, or switching it to Manual, deletes the server copy first (DELETE, 204 also when it is already gone) and its masking map with the vault copy.

## 4a. Wired end to end, 15 November

`tests/scheduled-wiring-browser.test.ts` runs the real app (Vite, `VITE_SCHEDULED=1`) against the real server routes (`createApp` with background tasks on, the memory store, a key file in a temporary folder, the development server's `local-development` account); only the runner's Privatemode client and the search are faked, and the runner is a second service over the same store and keys whose clock the test moves. Flow: open Scheduled, "Job search from my CV" with a synthetic CV and both consents, listed with the badge, edit (name, notifications, CV consent), pause and resume, a run on the server a day later, the five-minute poll saves the result as a conversation with the email restored, the server holds no result after the acknowledgement, delete removes the server copy. No request failed. Found and fixed:

| # | Mismatch | Fix |
| --- | --- | --- |
| 1 | Stand-ins such as `{{EMAIL-1}}` stayed in saved results | Masking map per task in the vault; restored on save (above) |
| 2 | Two tabs could save one result twice | Web Lock plus the result id as conversation id |
| 3 | Every saved result showed "Original sources unavailable": the client saved the answer without `sourceSnapshot`, and the server told the model to cite `[source-id]`, which a saved result cannot resolve (web results are not kept) | Client saves `sourceSnapshot: []`; the server asks for each web result as a Markdown link with its address, shown as "title (address)" |
| 4 | Editing a background task lost a changed notification choice: PATCH had no `notify`, and the client keeps the task the server returns | `notify` added to the PATCH body on both sides |
| 5 | Editing a task whose name or instruction reads as a CV or health text asked for the extra consent but never sent it | The consent goes with the PATCH; the server records it |
| 6 | The client allowed 3 background tasks even when the deployment allows fewer (`status.backgroundTasks.maxAutoTasks`) | The form and counts use the deployment's number |
| 7 | The contract fake answered DELETE and ack of a missing item with 404 and used its own refusal texts; the server answers 204 and its texts have German entries | Fake aligned with the server (codes, `REFUSALS` texts, CSRF text, consent version) |

Checked and found matching: request and response shapes of all six routes, status 200/204/400/401/403/404/409, the consent version from `/api/status`, the `attachment: { text }` field, the status field `backgroundTasks`, the CSRF header `X-PrivateAI-CSRF` and the session cookie, the German translations of every refusal. Result ids are now required to be UUIDs on the client (the server makes them so).

## 5. Chat detection: precision and recall

`src/schedule-detection.ts`, simple rules on the device, no model. A message must contain a request ("remind me", "give me", "schick mir", "kannst du mir"...) and a frequency ("every 2 days", "weekly", "every Monday", "jeden Tag", "alle 2 Tage", "montags", "monatlich"...). Questions about schedules ("what is a weekly schedule?", "Wie oft sollte man Pflanzen gießen?"), other tasks ("Translate 'every Monday'", "Write an email about our weekly meeting"), adjectives ("a weekly meal plan", "eine tägliche Routine") and one-off reminders ("remind me tomorrow") do not trigger. "Remind me to ..." without a frequency becomes a daily reminder the user confirms. Times: "at 10", "10:30", "7am", "at noon", "um 10 Uhr", "um 9" with "evening/abends" as 21:00; "morning/morgens" alone asks, suggesting 08:00.

| Set | Cases | Precision | Recall |
| --- | --- | --- | --- |
| Fixture, English (written before tuning) | 32 positive, 32 negative | 1.00 | 1.00 |
| Fixture, German (written before tuning) | 32 positive, 32 negative | 1.00 | 1.00 |
| Held-out 1, both languages (written after the first tuning) | 14 positive, 14 negative | 0.86, now 1.00 | 0.86, now 1.00 |
| Held-out 2, English (written and committed before the change of 15 November, never tuned on) | 20 positive, 20 negative | 0.71, now 0.77 | 0.75, now 0.85 |
| Held-out 2, German (same) | 20 positive, 20 negative | 0.68, now 0.77 | 0.75, now 0.85 |

The fixture was tuned on, so its perfect score says little. Held-out 1 found two kinds of failure: an adjective before the reminder ("I'd like a weekly reminder to call grandma" and its German twin) and a frequency that describes the content of a one-off list ("Give me a list of things to do every day in Berlin" and its German twin). The change of 15 November fixes both kinds in general rules, not with these sentences: a frequency adjective counts after any request with an article ("I'd like a", "I need a", "set up a", German "tägliche/wöchentliche/monatliche" after "gib mir eine", "ich hätte gern eine", "ich brauche eine"...), unless a plan or schedule noun follows; and a frequency does not count when a collection noun (list, ideas, tips, things, places; Liste, Ideen, Tipps, Dinge, Orte...) and a clause (to + verb, that, which, I can; German ", die/was/wie/wo/um") stand between the request and the frequency. Held-out 1 guided the change, so held-out 2 is now the honest figure. Its remaining misses: "every weekday", "every single day", "twice a week" (not understood) and their German twins. Its remaining false triggers: questions dressed as requests ("I'd like to know why...", "Erzähl mir von Menschen, die jeden Tag..."), one-off lookups ("Send me the train times for every Monday in December"), one-off advice ("five tips for staying motivated every day", "a podcast I can listen to every morning", "a schedule for studying every evening") and their German twins. A wrong card costs one tap on "Just send".

## 6. Switch, cost, limits

- **Switch:** `VITE_SCHEDULED=1` in `src/device-features.ts`, default off. Off: no menu entry, no strip, no card, no request to the background routes. Auto additionally needs the server's `inference.backgroundTasks` (Agent A).
- **Cost:** a Manual run is one ordinary message (Fast 1, Thinking 5; plus the search if chosen). Creating, editing, the card's Create and the calendar file cost nothing.
- **Limits:** 20 Manual and 3 background tasks; name 80, instruction 2,000, search text 2 to 400 characters; shortest interval one day (Hourly shown, disabled).

## 7. Not built, and not verified

- Masking maps are not in the encrypted backup file: a restored background task becomes a Manual task, which has no document.
- One trigger per task (the screenshot's "+" for more triggers is not built: the contract has one trigger).
- No browser or push notifications, no email; the in-app notice only while the app is open.
- The wiring test runs one browser at 1280 px in English with a faked model and search. The lead should still run one task through the development server with `PRIVATEAI_BACKGROUND_TASKS=1` and `VITE_SCHEDULED=1` and a real model answer, and check that a real answer gives the offers as "title (address)".
- An open tab whose session ran out (one hour) fetches results again only after its status refresh gives it a new session (every 30 seconds while visible); results wait on the server for up to 7 days.
- No live model call. Run now uses the existing send path, which is checked elsewhere.
- Not tried on a real phone or with a screen reader.
- Calendar files were checked for structure in tests, not imported into Google, Apple or Outlook calendars.

## 8. Tests

- `tests/scheduled-tasks.test.ts`: nextDue (daily, every 2 days, weekly, every 2 weeks, monthly day 1 and 28, Europe/Berlin across both changes, the skipped and the doubled hour, New York, Tokyo, UTC, Kolkata, month ends, leap years, local date) and the schema.
- `tests/scheduled-vault.test.ts`: encrypted record, locked refusal, other tabs, passphrase change, backup and restore, Delete everything, limits, due logic, edits.
- `tests/scheduled-ics.test.ts`: CRLF, folding, escaping, VTIMEZONE for Berlin, New York and Tokyo, UTC, RRULE for each unit, no instruction.
- `tests/schedule-detection.test.ts`: the precision and recall table, both held-out sets with floors at the measured values, every positive case's fields.
- `tests/scheduled-wiring-browser.test.ts`: the end-to-end wiring test (section 4a).
- `tests/background-results.test.ts`: placeholders restored from the vault's map (never sent), the map continued on a new document and deleted with the task or on a switch to Manual, kept through a passphrase change; two tabs saving one result once, with and without Web Locks; a result saved before whose acknowledgement was lost.
- `tests/background-tasks-client.test.ts`: every route, CSRF header, refusals, document, results and acknowledgement, replies of the wrong shape.
- `tests/scheduled-ui.test.ts`: at 375, 768 and 1280 px in English and German: locked screen, template, validation and focus, calendar download, the strip and Run now (exactly one request), the card's Create (no request) and Just send (one request), delete, the Auto flow with a CV (consents required, the masked document, badge, results saved and acknowledged, reason shown, delete on the server); plus the switch off.

## 9. Owner decisions (recommended defaults)

| # | Decision | Recommended |
| --- | --- | --- |
| 1 | Switch Manual on for the alpha | Yes, after T-111 to T-113 pass. It stores nothing on the server. |
| 2 | Chat detection on with it | Yes; it never sends without a tap and costs nothing. |
| 3 | Put placeholders back in background answers | Done on 15 November (section 4a). |
| 4 | Calendar file title | Neutral by default, as built. |
