# Scheduled tasks and reminders: the design that stores the least, 14 November 2026

Status: **design only. Nothing is built. No code, config or policy text was changed.** This is checklist row U11. The owner asked for the design that stores the least, and then a stop until he decides.

Facts about the code were read from the branch `codex/development-handoff` on 14 November. Facts about browsers come from public sources (list at the end) and from general knowledge. Nothing was tried on a device.

## 1. One-screen summary

| | A. On the device only | B. Content-free wake-up (push or email) | C. Server runs the task | D. Calendar file (.ics) |
| --- | --- | --- | --- | --- |
| What our server stores | Nothing new | Per device: account id, push address, next due time. Email variant: account id and next due time | The task text in readable form, the schedule, and the answer until it is fetched | Nothing new |
| New third parties | None | Push: the browser maker's push service (Google, Mozilla, Apple, Microsoft). Email: a mail processor and the user's mailbox provider | None new, but our own server becomes a reader of content | None on our side. The user's own calendar app and its sync service |
| Works with the browser closed | No. The user sees due tasks at the next open | The reminder: mostly yes. The model run: no, it still needs the user to open the app | Yes | The reminder: yes, the calendar does it. The model run: no |
| Cost risk | Low. Every run is a normal request the user starts | Low for tokens. Small running cost: a job, a table, a new secret | High. Runs happen with nobody watching | None |
| Effort | M | L (push). L plus a contract (email) | Not possible inside the promise | S |
| Privacy policy | Two new sentences | New section, new recipient, lawyer needed | Breaks the core promise | One new sentence |

**Recommendation in five lines.**

1. Phase 1: build A plus D. Tasks live only in the encrypted vault. The server stores nothing and learns nothing.
2. Nothing runs while the app is closed. The app shows what is due when it is opened and unlocked. The user taps "Run now".
3. The calendar file gives the user a real reminder with the app closed, through his own calendar, with zero storage on our side.
4. Phase 2 (B with an empty Web Push) is optional. It needs an owner decision, a lawyer and a policy change. Decide after the alpha shows that people miss tasks.
5. C is rejected. A server that runs tasks must read them. Email reminders are rejected for now: no mail sender exists.

## 2. The tension, stated plainly

A scheduled task needs something that acts while the user's browser is closed. In CometRow only the browser can talk to the model. The browser holds the checked, encrypted session. Our server relays bytes it cannot read. Saved content lives in the vault on the device, and the vault key exists only in the page's memory while the vault is unlocked.

So there are only three honest choices:

- The task waits until the user opens the app (A).
- Something tells the user to open the app, without knowing why (B and D).
- The server keeps the task text and calls the model itself (C). That ends the promise "we never can read it" for this feature.

No design can run the model for a closed browser and keep the promise. B and D only move the reminder, not the run.

## 3. What exists today (read from the code)

- **The vault.** `src/vault.ts` has two IndexedDB stores, `meta` and `conversations`, at database version 1. Projects are one encrypted record in `meta` (key `projects`, label `projects-v1`). Tasks can use the same pattern with no change to the database version.
- **Auto-lock.** The vault locks after 15 minutes without use (`src/App.tsx`, line 501). A locked app cannot read anything in the vault, so it cannot know that a task is due.
- **Switches for device-only features.** `src/device-features.ts` reads build variables (`VITE_READ_ALOUD`, `VITE_PDF_EXPORT`). A device-only task feature fits this pattern.
- **Guards on a chat request.** `server/app.ts`: stop switch, allowance (150 units per 7 days, Thinking counts 5), daily cap (`inference.allowance.dailyLimit`, built, recommended 40), spend guard, one request per account, three per server. A task run in the browser is a normal chat request, so all of these apply with no server change.
- **Search.** A web search runs only after the user approves the exact text. So a task such as "summarise this week's news on X" needs the user present in any case.
- **No service worker and no web app manifest.** A search of `src/`, `server/`, `public/`, `shared/` and `index.html` found none. The app cannot be "installed" in the Web Push sense today.
- **Email: there is no sender.** `server/deployment-config.ts` accepts only `email: "disabled"`. `server/deployment-process.ts` sets `emailEnabled: false` and a `deliverCode` that throws. `server/account-email.ts` and `server/security-notices.ts` define the shape of a sender, but no adapter for any mail service is in the repository. Sign-in is Google only (open decision R2). The server does hold each account's verified email address.
- **Background jobs.** The server already runs timers in its one process (request purge, hourly counts, expiry warnings). There is no job queue.
- **Privatemode notes.** `docs/privatemode-master-notes.md` lists 50 sections in its index, but the file body holds only sections 1 to 13. Those sections describe an inference API (SDK, proxy, proxyless API). They name no scheduled, batch or server-side confidential execution. The roadmap section is listed but not in the file.

## 4. Design A: reminders and tasks on the device only

### What the user experiences

- A new screen, "Reminders and tasks", behind its own switch.
- The user creates an entry: a title, a time, a repeat (none, daily, weekly, monthly) and one of two kinds.
  - **Reminder:** a note to himself ("File the VAT return").
  - **Question for the assistant:** a saved prompt ("Summarise what changed in my notes on X").
- When he opens CometRow and unlocks the vault, due entries are shown at the top, with a count.
- A reminder has "Done" and "Later". A question has "Run now", "Skip" and the cost in requests ("counts as 1 request", or 5 for Thinking), next to the remaining allowance.
- "Run now" opens a new chat with the saved prompt and sends it through the normal path. The answer is a normal conversation. It is saved only if the user saves it, as today.
- The screen says plainly: "CometRow reminds you when you open it. Nothing runs while it is closed."

### What is stored, where and for how long

Everything is one encrypted record in the vault (`meta`, key `tasks`), on this device, in this browser, for this account.

| Field | Content | Limit |
| --- | --- | --- |
| `id` | Random identifier made on the device | |
| `kind` | Reminder or question | |
| `title` | Short name | 80 characters |
| `text` | The note, or the prompt for the model | 2,000 characters |
| `mode` | Auto, Fast or Thinking (questions only) | |
| `firstDue` | Local date and time | |
| `repeat` | None, daily, weekly, monthly | Shortest repeat: daily |
| `nextDue` | Worked out on the device | |
| `lastRun`, `lastDone` | Timestamps | |
| `created`, `paused` | Timestamp, on or off | |

Kept until the user deletes the entry, uses "Delete everything on this device", or clears the site's data. At most 10 entries per vault (proposed).

**On the server: nothing.** No table, no field, no count per task. The hourly counts line may get one name for the feature if the owner wants it; the proposal is none, because a run already counts as a chat outcome.

### What leaves the device, and to whom

- Creating, editing, deleting and showing entries: nothing leaves the device.
- "Run now": the prompt goes to the Privatemode model through the checked, encrypted session, like any message. Masking of identifiers runs as for typed text. Our server sees what it sees for any chat request: which account, when, which mode.

### New processors or third parties

None. No DPA. No new recipient.

### Cost and abuse controls

- Every run is a normal request that the user starts with a tap. It costs 1 unit (Fast) or 5 (Thinking). The weekly allowance, the daily cap, the spend guard and the stop switch apply unchanged.
- No automatic run in phase 1 (owner decision 2). A missed weekly task shows once, not once per missed week. There are no catch-up runs.
- One request per account at a time, so there is no "Run all".
- A modified browser gains nothing: the server never trusted the task list, and each request is still charged.
- **Tokens.** `docs/owner-decisions.md` says about 500k tokens last about 200 answers, so about 2,500 tokens per answer (an estimate derived from that line, not measured). 30 invitees with 3 weekly questions each are 90 runs and about 225,000 tokens a week. 30 invitees with one daily question each are 210 runs and about 525,000 tokens a week. The free balance is about 1.2M tokens (figure given to the agent on 14 November; the owner reported 1.579M on 13 November; neither verified). Pay-as-you-go is not on. These runs are inside the 150-unit allowance, so they add no new worst case. They do make it more likely that invitees use their allowance.

### Reliability and browser support

- Works in every browser the app works in. It needs only IndexedDB, which the vault already uses.
- It is not a reminder in the usual sense: a user who does not open the app sees nothing. That is the price of storing nothing. D covers this gap.
- Tasks do not move between devices. The vault is per browser.
- Phones may clear a site's storage after long disuse (Safari removes script-written storage after about 7 days without a visit for sites not added to the Home Screen: general knowledge, not checked). This risk already exists for saved conversations.

### Optional: a local notification while the app is open

Considered, and **not recommended for phase 1**.

- The Notifications API can show a system notification without any push service. Nothing leaves the device.
- On desktop it works from an open tab. On Android Chrome a page cannot create a notification directly; it needs a service worker. On an iPhone it works only in a web app added to the Home Screen.
- Timers in a background tab are slowed, and phones stop background tabs within minutes. So this is a desktop-with-open-tab feature.
- The vault locks after 15 minutes. After that the app cannot know what is due, unless the due times (without any text) are kept outside the vault in the browser's storage. That is a small step away from "everything in the vault", and the owner should decide it (decision 3).
- Periodic Background Sync could wake a service worker without a server, but it exists only in Chromium, only for an installed app, and the browser decides whether and when it fires, based on how often the user visits. Firefox and Safari do not have it. It is not a base for reminders.
- The Notification Triggers API (a notification scheduled for a set time, on the device) finished its Chrome trial and was never released.

### Failure modes

- The user does not open the app: nothing happens. Stated in the interface.
- The device clock or time zone changes: due times follow the device's local time. Daylight saving changes need a test.
- "Monthly on the 31st" in a short month: use the last day of the month.
- The vault passphrase is forgotten: tasks are lost with everything else. Already disclosed.
- Allowance or daily cap reached, chat stopped, provider down: "Run now" shows the normal refusal and the task stays due.
- Two tabs edit the list: the same version check the project list uses must apply.

### Effort

M. A new screen, the due logic with tests, an encrypted record, and changes to the vault's passphrase change, "Delete everything", lock and account switch, and (if decided) the backup file. English and German texts.

### Privacy policy

Two additions: tasks are saved only in the vault, and "Delete everything on this device" also removes them. Drafts are in section 10.

## 5. Design B: a content-free wake-up

The task still lives in the vault and still runs only in the browser. The server's only job is to say "open CometRow" at the right time, without knowing why.

### B1. Empty Web Push

**What the user experiences.** He turns on "Notify me on this device" in the tasks screen. The app explains what is stored. The browser asks for notification permission. At the due time a system notification says only: "A task is due in CometRow." He taps it, the app opens, he unlocks the vault and sees the due list as in A.

**What a push subscription is.** The browser asks its maker's push service for an address. The result is a long URL at that service, unique to this browser and this site, plus two keys that are only needed to encrypt a message body.

| Browser | Push service that learns of each message |
| --- | --- |
| Chrome, and most Chromium browsers | Google (FCM) |
| Edge | Microsoft (WNS) |
| Firefox | Mozilla |
| Safari on Mac, Home Screen web apps on iPhone and iPad | Apple (APNs) |

To send, our server makes one HTTPS POST to that URL, signed with our VAPID key. VAPID is one key pair for the whole site. The public half goes to the browser when it subscribes. The private half signs a short token for each push. The token also carries a contact address for the push service: use a role address, never the owner's personal one. The private key is a new secret on Render.

**We send no body.** Then the push service sees an empty message, and we do not need to store the two encryption keys at all. The notification text is fixed and comes from our own service worker on the device.

**What "stores the least" means here.** One row per device that has notifications on:

| Field | Why | Kept until |
| --- | --- | --- |
| Account id | To delete the row at sign-out and at erasure | The row is deleted |
| Push address (the URL) | Needed to send | Notifications are turned off on that device, sign-out, erasure, the push service answers "gone" (404 or 410), or 60 days without a new due time |
| Next due time, rounded to 15 minutes | Needed to know when to send | Cleared the moment the push is sent |

Not stored: any task id, title, text, repeat rule, count of tasks, the two encryption keys, the browser name, the IP address, or a history of past pushes. The task brief suggested an opaque task id. It is not needed: when the app opens, the vault already knows which tasks are due. One time per device is enough. After each open the browser sends the next earliest due time, or clears it.

**What leaves the device, and to whom.**

- To our server: the push address and one time. Over weeks our server can see a pattern ("this account has something due on Mondays at 8"), even though it stores only the next time. Rounding blurs it a little. This is new metadata, and the policy must say so.
- To the push service: that this browser gets a message from our site at that moment, with no content. Google, Mozilla, Apple or Microsoft can see the pattern too. They do not learn the account.

**New third parties.** The browser maker's push service becomes a recipient of metadata. It is the service of the browser the user chose, and there is normally no contract between a site and that service for standard Web Push. Whether it counts as a processor, and what the policy must say, is a lawyer question (section 11). A policy change is needed in any case.

**Cost and abuse controls.**

- Sending a push costs nothing. The token cost is the same as A, because the run is still a tap by the user.
- A push with no body needs no encryption code. A signed token and one HTTPS POST are enough, so no new library is required.
- The server must accept a push address only if its host is one of the known push services. Otherwise a modified browser could make our server call any URL.
- Limits: at most 3 devices per account, at most 1 push per device per hour, routes behind the same session and CSRF checks as every `/api` path.
- A timer in the server process checks once a minute for due rows. Rows live in Postgres, so a restart loses nothing. One new table, one migration, and new rights for the `cometrow_runtime` role. Account erasure and the account export must cover the table.

**Reliability and browser support.**

| Platform | Web Push | Notes |
| --- | --- | --- |
| Chrome, Edge, Firefox on Windows and Linux | Yes | Delivered only while the browser is running. A fully closed browser gets it at the next start |
| Chrome, Edge, Firefox on Mac | Yes | The browser usually keeps running after its windows are closed |
| Safari on Mac (16 and later) | Yes | Believed to deliver with Safari closed. Not checked |
| Chrome and Firefox on Android | Yes | Works with the browser closed. Battery savers can delay it |
| iPhone and iPad (16.4 and later) | Only for a web app added to the Home Screen | Not for a site open in a Safari tab. CometRow has no manifest today, and each user must add it by hand. Apple kept Home Screen web apps in the EU (announced 1 March 2024) |

- Browsers do not allow silent pushes. Every push must show a notification. Chrome shows its own "site updated in the background" text if we do not. Safari removes the subscription after three pushes without a notification. So the service worker must always show the fixed text.
- A push is not a guarantee. Push services drop or delay messages, and subscriptions expire without notice.

**Failure modes.** The subscription expired and nobody noticed: no reminder, and the user finds out at the next open. The server was down at the due minute: send late, up to a set limit (proposed 12 hours), then drop. The user turned notifications off in the system settings: we cannot see that. The notification shows on a locked phone screen: it says only that something is due, which still tells an onlooker that the person uses CometRow.

**The service worker and the promise.** A service worker is code that stays in the browser between visits. It must stay very small: handle the push, show the fixed text, open the app on tap. No fetch handler and no caching, so that it never sits between the user and the app's files. It cannot read the vault: the key is only in the page's memory.

**Effort.** L. Service worker, manifest and icons, the Home Screen instruction for iPhone, a table and migration, the timer, the VAPID secret, the host check, account export and erasure, the policy section, and device tests on five browsers and two phones.

**Privacy policy.** A new part: what the server stores per device, that the browser maker's push service learns the time of each message and nothing else, how to turn it off, and that the row is deleted at sign-out and erasure. The sentence "Our server does not know that a task exists" from phase 1 would have to change to "does not know what it is".

### B2. Email saying only "A task is due in CometRow"

- **What it needs that does not exist:** a mail processor with a DPA and an EU location, a sending domain with SPF, DKIM and DMARC, a sender adapter in the code, a change to the deployment config (it accepts only `email: "disabled"` today), and the open decision R2.
- **What is stored:** account id and next due time. The email address is already held.
- **Who learns what:** the mail processor learns the address, the time and the fixed text. So does the user's mailbox provider, which for Google sign-in accounts is Google. The message sits in the mailbox until the user deletes it.
- **Law:** it must be a service message the user switched on, with no advertising in it, and with a simple way to switch it off.
- **Judgement:** more parties see more than with an empty push, and it needs a new contract. It works on every device, which push does not. If email is ever added for sign-in and account closure (R2), this variant becomes cheap. Not before.

## 6. Design C: the server runs the task

**What it would be.** The server keeps the prompt and the schedule, calls the model at the due time, and keeps the answer until the user fetches it, or mails it.

**Why it breaks the promise.** To call the model, something must hold the prompt in readable form at the due time. In CometRow that something is the browser, after it has checked the provider. If our server does it, our server reads the prompt and the answer. The policy says the server holds no conversation content and cannot read requests. For this feature that would be false. It would also create a store of readable user text on our server, which a breach or a legal order could reach. The answer would need to be stored too.

**The only way round** would be to encrypt the prompt to something that only a checked enclave can open, and to have that enclave do the scheduling and keep the answer encrypted for the user. Two ways to get that:

- **The provider offers it.** In the part of the owner's notes that exists (sections 1 to 13: introduction, quickstarts, models, pricing, FAQ, rate limits, SDK), Privatemode is an inference API only. The SDK encrypts within a live session that starts with a check of the enclave. Nothing describes a stored, encrypted job that runs later. The roadmap section is named in the index but is not in the file, so their plans are unknown here. One question to support would settle it.
- **We build our own confidential scheduler** in a confidential virtual machine, with its own attestation that the browser checks, and its own key handling. That is a second trusted system with new claims to verify and to explain. Effort far above L.

**Conclusion.** C is rejected for this phase. It is the only design that truly runs with the browser closed, and it is the only one that cannot be done inside the promise with what exists today.

## 7. Design D: other ideas

### D1. Calendar file export (.ics). Recommended, with A

**What the user experiences.** Each task has "Add to calendar". The app builds a small calendar file on the device and the browser saves or opens it. The user adds it to his own calendar. The calendar reminds him at the right time, with the app closed, on every device his calendar reaches. The entry holds a link to CometRow.

**What the file holds.**

| Field | Content |
| --- | --- |
| Start time and repeat rule | Local time, same repeat as the task |
| Alarm | At the start time |
| Title | "CometRow: a task is due" by default. The user's own title only if he ticks a box |
| Link | The plain address of the app. No task id, nothing personal |
| Not in the file | The task text, the account, any identifier of ours |

**What is stored on our side.** Nothing. The file is made in the browser and never sent to us.

**Who else sees it.** Whoever runs the user's calendar: the calendar app, and Google, Apple or Microsoft if it syncs. That is the user's own choice and his own account. The default title tells them only that he uses CometRow at that time. The policy should say this in one sentence.

**Limits.**

- The calendar entry is a copy. Changing or deleting the task in CometRow does not change the calendar. The interface must say so.
- How a phone treats a downloaded `.ics` file differs. iPhone Safari offers to add it to Calendar. On Android it depends on the calendar app. This needs a device test.
- The link opens the app, not the task. The due list is the first thing shown after unlock, so that is enough. The app has no deep links today, and none are needed.

**Effort.** S. One small function that writes text, one button, tests.

### D2. An installed web app whose service worker shows the reminder by itself

No server, no push service. Rejected: a service worker cannot wake itself at a set time. The only two ways (Periodic Background Sync, Notification Triggers) are Chromium-only and unreliable, or never released. See section 4.

### D3. Hand the reminder to the phone's own reminder app

The `.ics` file already does this on phones where the calendar takes it. A share-sheet variant (Web Share with a file) could be added later if the device test shows the download is awkward. Not designed further.

## 8. Recommendation and staged plan

**Default for the test phase: A plus D1.** It is the only path where the server stores nothing and no new party appears. It tests the real question first: do invitees want saved, repeatable prompts and reminders in this app at all?

| Stage | What | Needs |
| --- | --- | --- |
| 0 | Owner decides (section 9). Nothing is built before that | Owner |
| 1a | Tasks in the vault, the due list after unlock, "Run now", "Done", "Later", limits, both languages. Switch `VITE_SCHEDULED_TASKS=1`, off by default | Decisions 1, 2, 4, 6, 7 |
| 1b | "Add to calendar" (.ics) | Decision 5 |
| 1c | Policy sentences approved in both languages, then the switch goes on for invitees | Decision 8, legal read |
| Review | After two alpha weeks: do people create tasks, and do they miss them? Asked in the survey, because the server cannot count tasks | Owner |
| 2 (optional) | Empty Web Push (B1): service worker, manifest, table, timer, VAPID key | Decision 9, lawyer, policy change |
| Not planned | Email reminders (B2), server-run tasks (C), self-waking service worker (D2) | |

**Naming.** Call the feature "Reminders and tasks", not "Scheduled tasks", in the interface. "Scheduled" suggests that something runs by itself. `docs/copy-audit-20261112.md` exists to stop that kind of overclaim.

## 9. Owner decisions needed (each with a recommended default)

| # | Decision | Recommended default |
| --- | --- | --- |
| 1 | The path for the test phase | A plus the calendar file. No server storage, no new party |
| 2 | May a due question run by itself when the app is opened? | No. The user taps "Run now" and sees the cost first |
| 3 | A system notification while the app is open on a desktop, with due times (no text) kept outside the vault on the device | Not in phase 1. Revisit after feedback |
| 4 | Limits on the device | 10 entries per vault, shortest repeat daily, 80 characters title, 2,000 characters text, no catch-up runs |
| 5 | Calendar file | Yes. Neutral title by default; the user's own title only if he ticks a box; link to the app's plain address |
| 6 | Are tasks part of the encrypted backup file? | Yes, like projects. Old backups must still open |
| 7 | The switch and when it goes on | Build variable `VITE_SCHEDULED_TASKS=1`, off by default. On only after paid billing works and decision 8 is done |
| 8 | The privacy sentences in section 10, German first | Approve after the same legal read as the rest of the policy |
| 9 | Phase 2: empty Web Push | Not now. Decide after the alpha review. If yes: push only, no body, one row per device as in section 5 |
| 10 | Email reminders | No. Revisit only if email is added for sign-in (R2) |
| 11 | Server-run tasks | Rejected. Optional: add one question to the next mail to Privatemode ("Do you offer or plan confidential scheduled execution?"). No work on our side |
| 12 | The name in the interface | "Reminders and tasks" / "Erinnerungen und Aufgaben", with the line "CometRow reminds you when you open it" |

## 10. Privacy policy sentences for the recommended path (drafts only)

Drafts by the agent. Nobody has approved them. German is the binding text and needs the legal read. The words must be matched to `shared/privacy-copy.ts` and `docs/i18n-glossary-20261113.md` before use. A change to one language without the other fails the pair test (`shared/legal-text-pairs.json`).

**English, new text for the part that describes what is saved on the device:**

> Reminders and tasks: an entry you create (its title, its text and its times) is saved only in the encrypted vault on this device, like a saved conversation. Our server does not receive or store it, and does not know that it exists. Nothing runs while CometRow is closed. When you open CometRow and unlock the vault, it shows you what is due. An entry that asks the assistant a question is sent only when you choose Run now, in the same sealed way as any other message, and it counts against your request allowance. Entries are not copied to your other devices.

> Calendar file: if you choose Add to calendar, CometRow creates a calendar file on this device and your browser saves it. The file holds the times, a link to CometRow, and your title only if you choose to include it. We do not receive this file. Once you add it to a calendar, it is kept by that calendar app and by any service the app syncs with, under their rules. Changing or deleting the entry in CometRow does not change the calendar entry.

**English, change in "What you can delete, and how":** after "it removes every saved conversation and project in this browser" add "and every reminder and task". Add: "One reminder or task: open Reminders and tasks and choose Delete next to it."

**German (binding once approved):**

> Erinnerungen und Aufgaben: Ein Eintrag, den Sie anlegen (Titel, Text und Zeiten), wird nur im verschlüsselten Tresor auf diesem Gerät gespeichert, wie eine gespeicherte Unterhaltung. Unser Server erhält und speichert ihn nicht und weiß nicht, dass es ihn gibt. Solange CometRow geschlossen ist, läuft nichts. Wenn Sie CometRow öffnen und den Tresor entsperren, sehen Sie, was fällig ist. Ein Eintrag, der dem Assistenten eine Frage stellt, wird erst gesendet, wenn Sie „Jetzt ausführen“ wählen, auf demselben versiegelten Weg wie jede andere Nachricht, und er zählt für Ihr Anfragen-Kontingent. Einträge werden nicht auf Ihre anderen Geräte übertragen.

> Kalenderdatei: Wenn Sie „Zum Kalender hinzufügen“ wählen, erstellt CometRow auf diesem Gerät eine Kalenderdatei, und Ihr Browser speichert sie. Die Datei enthält die Zeiten, einen Link zu CometRow und Ihren Titel nur, wenn Sie ihn aufnehmen möchten. Wir erhalten diese Datei nicht. Sobald Sie sie einem Kalender hinzufügen, wird sie von dieser Kalender-App und von jedem Dienst gespeichert, mit dem die App synchronisiert, nach deren Regeln. Wenn Sie den Eintrag in CometRow ändern oder löschen, ändert das den Kalendereintrag nicht.

**German, change in "Was Sie löschen können und wie":** after "jede gespeicherte Unterhaltung und jedes Projekt in diesem Browser" add "sowie jede Erinnerung und Aufgabe". Add: "Eine einzelne Erinnerung oder Aufgabe: Öffnen Sie „Erinnerungen und Aufgaben“ und wählen Sie daneben „Löschen“."

If phase 2 is ever approved, the sentence "does not know that it exists" must change, and a new part must name: the push address and the next due time per device, the browser maker's push service as a recipient of the time of each message, the fixed text, and how to switch it off.

## 11. Data-protection points to check with a lawyer

**For phase 1 (A plus the calendar file):**

1. **Storage on the device (§ 25 TDDDG, formerly TTDSG).** Tasks are written to the browser's storage at the user's request, for a function he asked for. Confirm that this is "strictly necessary" and needs no consent banner, as for the vault itself.
2. **Is there any processing by us at all?** The task text never reaches us. Confirm that the record of processing (`docs/art30-record-draft-20261112.md`) needs no new entry beyond the existing chat entry, which covers "Run now".
3. **The calendar file.** Confirm that we are not responsible for what the user's calendar service does with a file he made and imported himself, and that the one policy sentence is enough.
4. **Health and other special data in a prompt.** A saved prompt can contain health data. It stays in the vault and travels the same path as a typed message. Confirm that the health consent wording (D2 to D4) covers a saved prompt that is sent later.

**Only if phase 2 (push) or email is approved:**

5. **Consent or contract for notifications.** The user switches notifications on himself. Is the basis the contract (Art. 6(1)(b) GDPR) or consent (Art. 6(1)(a))? Consent must be as easy to withdraw as to give.
6. **The push subscription on the device (§ 25 TDDDG).** Creating a subscription stores information in the browser and reads it back. Is the browser's permission prompt plus our own explanation enough as consent, or is it "strictly necessary" for a function the user asked for?
7. **The push service as a recipient.** Google, Mozilla, Apple or Microsoft receive an empty message for a browser at a time. Are they processors (there is normally no DPA for standard Web Push), separate controllers, or part of the user's own equipment? What must the policy name? Is there a transfer to the United States, and on what basis?
8. **The push address as personal data.** It is a device identifier linked to an account. It must be in the record of processing, the account export and the erasure procedure.
9. **Timing as metadata.** The server would learn when each account has something due. Must the DPIA (L10) be updated?
10. **Email variant.** A new processor with a DPA under Art. 28. Is a reminder mail the user asked for a service message outside § 7 UWG, as long as it contains no advertising?

## 12. Acceptance tests for phase 1

Offline tests first, then the owner's device checks. Use made-up text only.

**Storage and privacy**

1. With the switch off there is no menu entry, no screen and no `tasks` record.
2. Creating, editing, pausing and deleting an entry makes no network request (checked in a real browser with the network recorded).
3. The server has no new table, column, route or log line. A search of the request log for the test title finds nothing.
4. The `tasks` record in IndexedDB is ciphertext. The test title does not appear in any browser storage in readable form.
5. With the vault locked, no title, time or count is shown anywhere.
6. Lock, sign-out and account switch clear tasks from memory. A second account on the same browser sees none of the first account's entries.
7. Passphrase change: all entries are still there and readable afterwards. A failed change leaves them as they were.
8. "Delete everything on this device" removes all entries.
9. Backup and restore (if decision 6 is yes): entries come back. A backup made before this feature still restores.
10. Two tabs: an edit in one tab is not silently overwritten by the other.

**Due logic**

11. Daily, weekly and monthly entries become due at the right local time.
12. Daylight saving: a daily 08:00 entry is due at 08:00 local time on the days after the change in March and in October.
13. Monthly on the 31st is due on the last day of a shorter month.
14. A weekly entry missed three times shows once, not three times.
15. "Later" moves a reminder. "Done" on a repeating entry sets the next date. "Skip" does the same for a question.
16. Limits: the 11th entry is refused with a plain message. A text over 2,000 characters is refused, not cut.

**Running a question**

17. "Run now" shows the cost before sending. Nothing is sent before the tap.
18. The request is a normal chat request: the allowance falls by 1 (Fast) or 5 (Thinking), and masking of identifiers applies to the saved prompt.
19. With the allowance used up, the daily cap reached, the stop switch on or the spend limit reached, "Run now" shows the normal refusal and the entry stays due.
20. No entry ever runs without a tap (decision 2). Opening the app with five due questions sends nothing.
21. A question that suggests a web search shows the normal search approval. No search runs by itself.

**Calendar file**

22. The file holds the times, the repeat rule, an alarm, the neutral title and the app's plain address. It does not hold the task text, the account or any identifier.
23. With the box ticked, the user's title is in the file, and nothing else changes.
24. No network request is made when the file is created.
25. Owner, on devices: the file imports with the right time and repeat in Apple Calendar (iPhone and Mac), Google Calendar (Android and web) and Outlook. The alarm fires. The link opens CometRow.

**Interface**

26. Every text exists in English and German. With `VITE_GERMAN_UI` off, only English shows.
27. Keyboard and screen reader: the due list is announced once, every control has a name, and focus moves into the new chat after "Run now".
28. The line "CometRow reminds you when you open it. Nothing runs while it is closed." is visible on the screen where entries are created.

## 13. What in the existing code or docs affects phase 1

Nothing blocks phase 1 outright. These points must be handled:

1. **Auto-lock.** The vault locks after 15 minutes. The due list can only appear after unlock. This is accepted in the design, and it is the reason local notifications are left out.
2. **Vault code paths that list their contents by hand.** `Vault.changePassphrase`, "Delete everything", lock, account switch and the backup file each name conversations and projects. Each must learn about tasks. Missing one would lose tasks or leave them under an old key. Tests 6 to 9 cover this.
3. **Approved policy text.** The policy says the app is described "exactly as built" and lists what "Delete everything" removes. The feature cannot go on for invitees before the new sentences are approved in both languages.
4. **Build-time switch.** A `VITE_` switch means a Render variable and a redeploy to turn it on, like read aloud.
5. **No way to measure use.** The server cannot count tasks, by design. Use is learned from the alpha survey only.
6. **Token balance.** Pay-as-you-go is not on (K6). The feature adds no new worst case, but it should go on only after paid billing works, like the first invite.
7. **Not needed for phase 1, missing for phase 2:** a service worker, a web app manifest, any mail sender, and a table for push addresses.

## 14. Blocks for the lead to copy

**For `docs/owner-decisions.md` (not edited by this task):**

> **Added 14 November 2026: scheduled tasks and reminders (U11). Design only, nothing built: `docs/scheduled-tasks-design-20261114.md`.** A task that runs while the browser is closed would need our server to read the prompt, so it is not offered. Proposed: entries live only in the encrypted vault; the app shows what is due when it is opened; the user taps "Run now"; a calendar file gives a real reminder through the user's own calendar. The server stores nothing.
>
> | Decision | My recommendation |
> | --- | --- |
> | Path for the test phase | On the device only, plus the calendar file |
> | Run a due question by itself when the app opens | No. A tap, with the cost shown |
> | System notification while the app is open (due times kept outside the vault, on the device) | Not in phase 1 |
> | Limits | 10 entries, shortest repeat daily, 2,000 characters, no catch-up runs |
> | Calendar file | Yes, neutral title by default |
> | Tasks in the encrypted backup | Yes |
> | Switch | `VITE_SCHEDULED_TASKS=1`, off by default; on after paid billing and the policy sentences |
> | Privacy sentences, English and German (section 10 of the design) | Approve after the legal read, German first |
> | Phase 2: empty Web Push through the browser maker's push service (server stores account id, push address and next due time per device) | Not now. Decide after two alpha weeks. Needs a lawyer and a policy change |
> | Email reminders | No. No mail sender exists; revisit with R2 |
> | Server-run tasks | Rejected. Optional question to Privatemode about confidential scheduled execution |
> | Name in the interface | "Reminders and tasks", not "Scheduled tasks" |

**For `docs/owner-test-list.md` (not edited by this task; the last id in the file today is T-85, so these would be T-86 to T-89):**

> - [ ] **T-86 Scheduled tasks: decide the path.**
>   Do: read section 1 and section 9 of `docs/scheduled-tasks-design-20261114.md`. Answer the 12 decisions, or say "all defaults".
>   Expect: you can answer each in one line.
>   Tell the agent: the answers. Nothing is built before this.
> - [ ] **T-87 Scheduled tasks: privacy sentences.**
>   Do: read the English and German drafts in section 10 with the same reader as the rest of the policy. German first.
>   Expect: both say the same thing, and both are true for the app as built.
>   Tell the agent: approved, or the changes.
> - [ ] **T-88 Reminders and tasks on your devices (after the build).**
>   Do: create one reminder and one weekly question with made-up text. Close the app. Open it after the due time and unlock.
>   Expect: both are shown as due. Nothing was sent before you tapped "Run now". The allowance fell by 1 or 5 after the run.
>   Tell the agent: what you saw on the phone and on the desktop.
> - [ ] **T-89 Calendar file on your devices (after the build).**
>   Do: use "Add to calendar" on an iPhone, an Android phone and a desktop. Open the file in the calendar you use.
>   Expect: the right time and repeat, an alarm, the neutral title, a link that opens CometRow. No task text in the entry.
>   Tell the agent: which calendars took the file, and which did not.

## 15. Not verified, and sources

Not verified by anyone: every browser fact on a real device; how each calendar app imports the file; whether Safari on Mac delivers a push while closed; whether the Render instance runs without sleeping (it matters only for phase 2); the token estimate per run; what Privatemode plans (the roadmap section is missing from the owner's notes).

Public sources used on 14 November 2026 (generic searches only; no project information was sent):

- WebKit, "Meet Declarative Web Push": https://webkit.org/?p=16535
- Apple developer video on Web Push for Home Screen web apps: https://developer.apple.com/videos/play/wwdc2025/235
- TechCrunch, 1 March 2024, Apple keeps Home Screen web apps in the EU: https://techcrunch.com/2024/03/01/apple-reverses-decision-about-blocking-web-apps-on-iphones-in-the-eu/
- web.dev, Periodic Background Sync (Chrome and Edge only, installed app, engagement rules): https://web.dev/articles/web-apps/periodic-background-sync
- MDN, PeriodicSyncManager: https://developer.mozilla.org/docs/Web/API/PeriodicSyncManager
- Chrome for Developers, Notification Triggers (trial complete, not launched): https://developer.chrome.com/docs/web-platform/notification-triggers
- web.dev, subscribing a user to push (`userVisibleOnly`): https://web.dev/articles/push-notifications-subscribing-a-user
- WebKit source change "Enforce silent push quota" (three silent pushes, then the subscription is removed): https://webkit.googlesource.com/WebKit/+/108ccb442e40e9705d212e74c1f213e3b5a0ea05

Some secondary pages claimed that Web Push or Home Screen web apps are not available on iPhones in the EU. That reflects the plan Apple withdrew on 1 March 2024. Check on a real iPhone in Germany before relying on phase 2.
