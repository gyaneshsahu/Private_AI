# Background tasks: the Auto mode of Scheduled (15 November 2026)

Status: **built and tested offline, switched off by default, nothing verified live.** Built by Agent A on the branch named in the report. The interface (the Scheduled screen, the badge, the consent step) is built by Agent M; this doc covers the server. The shared contract is `.local/scheduled-contract.md`.

## 1. The trade-off, stated plainly

The design of 14 November (`docs/scheduled-tasks-design-20261114.md`, section 6) rejected server-run tasks: to run a task while the browser is closed, our server must read it. That is still true. Nothing in this build changes it.

On 15 November the owner chose to offer it anyway, as an explicit opt-in per task:

- **Manual** (Agent M): nothing on the server. The task lives in the vault. It runs only when the user taps it.
- **Auto, shown as "Background task"**: the server stores the task and runs it on schedule. A persistent badge marks it. At the choice the user reads a plain statement that the server stores the task and can read it.

What this means for the promise:

| | Chat and Manual tasks | Background tasks |
| --- | --- | --- |
| Who can read the text | The browser and the sealed Privatemode server only | Also our server process, which holds the key |
| Stored on our server | Nothing but the content-free usage records | The task, its attached document, its search text and its undelivered results, all sealed |
| A database dump alone reveals | Nothing | Nothing (sealed with a key that is not in the database) |
| A person with access to the running server, its key file or its memory | Learns nothing | Can read the task and the results |
| A legal order to us | We have nothing to hand over | We can be ordered to hand over what is stored |

Everything below keeps that exposure as small as it can be. It does not make it zero. The product copy must never say "we cannot read it" about a background task.

## 2. Calling Privatemode from the server

**Choice: the privatemode-ai SDK in Node, inside the server process.** File: `server/background-privatemode.ts`.

| | SDK in Node (chosen) | Privatemode proxy container |
| --- | --- | --- |
| Attestation and end-to-end encryption | Yes, the same Wasm as the browser | Yes |
| Runs where | In our one Render process | A second container (Docker) next to the app; Render would need a second private service |
| Our pins (approved manifest digest, Wasm hash, OCSP policy) | Applied in our code, exactly as in the browser | The proxy has its own manifest handling; our digest pin and the fail-closed rule would need its flags and a second check, not read here |
| Shares the attestation queue | Yes, the same in-memory queue as the relay | No: a separate client with its own attest calls, invisible to our queue |
| New things to run and secure | None | A second service, its image pin, its network path, its logs (it has a `--dump-requests` flag that writes plaintext to disk) |
| Cost on Render | Memory in the existing instance (not measured, see section 12) | A second instance |

The repository already calls the SDK from Node with attestation (`scripts/privatemode-manifest.ts`, `evaluation/privatemode/voice-probe.ts`). The proxy pages of the owner's notes (sections 17 and 18) are listed in the index but not in the file; the quickstart (section 3) says the proxy needs Docker and should be pinned by digest. One instance with no Docker sidecar decides it.

**What the server client does.**

- It uses the server's own API key (the key the relay already holds). No new secret.
- Before any verification it checks: the report names Privatemode; the approved manifest file is present and its SHA-256 is in the report's `releaseDigests`.
- It gives the SDK the approved manifest bytes, the report's Wasm hash (`expectedWasmHash`), the strict NVIDIA OCSP policy (unknown statuses refused, no grace for revoked certificates) and `maxRetries: 0`.
- **Fail closed on a rotation.** When Privatemode's live manifest is not the approved one, the SDK fetches the new one from its CDN and calls `onManifestUpdate`. In the browser the content policy blocks that fetch; in Node nothing blocks it, so the callback throws, the client is closed, and after verification the bytes in use are compared with the approved digests once more. Any mismatch: the run fails with `deployment_changed`, background runs stop for one hour at a time (no attestation in that hour), and the log gets a line starting `CometRow model alert:` (the prefix the runbook greps for). Chat in the browser fails closed on the same rotation, so both stop together until the owner approves the new manifest (`docs/model-deprecation-runbook.md`, the rotation of 14 November in `docs/READINESS.md`).
- **One verified client for at most 10 minutes**, reused by every background run of every account in that time. A failed request (outage, broken stream) discards it; a refusal (4xx) keeps it, as in the browser.
- **The attestation budget.** Privatemode allows about 10 attest calls a minute per organisation, then pauses 60 s, and the relay shares that budget with every browser. The server client sends its attest call through the relay's one queue (`relayAttestQueue`, now created once in `server/app.ts` and handed to the relay routes) and only when the queue is quiet: nothing waiting, no pause, at least half the burst free. Otherwise the run waits 5 minutes and nothing is spent. Because one client serves all accounts, background tasks need at most one attest call per 10 minutes, whatever the number of tasks. Users are never made to wait for a background task.
- **Not all at the hour.** Each task starts at a fixed delay of 0 to 10 minutes after its due minute (derived from its id), runs go one after another, and a run takes one of the three chat slots only while two stay free for users, and never while the same account has a chat request running.

## 3. What is stored, and for how long

Two tables in PostgreSQL (`server/migrations/0021-background-tasks.sql`), used by the restricted runtime role (grants in `server/account-privileges.ts`). The memory store (`MemoryBackgroundStore`) serves the development server and the offline tests, like the SQLite usage ledger.

**`background_tasks`, one row per Auto task.**

| Column | Content | Readable in a dump |
| --- | --- | --- |
| `task_id`, `account_id` | Ids; the account id references `"user"` with cascade delete | yes |
| `payload` | Sealed JSON: the task (name, instruction, schedule, answer mode, search switch and approved search text, notify flags), the attached document's text, and up to 200 short hashes of search result addresses already reported | **no** |
| `next_due_at`, `run_after`, `last_run_at`, `claimed_until` | Times (milliseconds) | yes |
| `paused`, `skips` | Paused flag; allowance skips in a row | yes |
| `consent_version`, `consent_at`, `consent_sensitive` | Which consent text, when (server clock), and whether the extra consent for documents or health-looking content was given. No content | yes |
| `created_at` | Time | yes |

The schedule is inside the sealed payload; only the next due time is plain, because the scheduler needs it.

**`background_results`, one row per run until it is delivered.**

| Column | Content | Readable in a dump |
| --- | --- | --- |
| `result_id`, `task_id`, `account_id`, `ran_at`, `expires_at` | Ids and times | yes |
| `status` | `done`, `failed` or `skipped` | yes |
| `reason` | A fixed code such as `allowance_exhausted`, `provider_unavailable`, `no_new_results`; the table refuses anything but `[a-z_]` | yes, never content |
| `text_sealed` | The answer, sealed; at most 20,000 characters | **no** |
| `prompt_tokens`, `completion_tokens` | Counts | yes |

**Retention.**

- A result is deleted **the moment the browser acknowledges it** (`POST .../results/:id/ack`, after it saved the answer in the vault).
- An undelivered result is deleted **7 days** after its run at the latest (purged every minute by the scheduler). Seven days covers a user who opens the app once a week; a weekly task's result is never older than its next run. Shorter (2 days) loses results of people who open the app on weekends only; longer keeps readable content on the server for no gain.
- At most **7 results per task** are kept; an older one is dropped when an eighth arrives.
- Failed and skipped runs store a fixed code only, no content.
- **Deleting a task** deletes its results at once (and the cascade does the same). Switching a task to Manual is a delete on the server (Agent M calls DELETE).
- **Account erase** (`scripts/account-operator.ts erase`) deletes both tables' rows, results first, before the account row; `show` counts them. Deleting a `"user"` row by any path cascades to both tables. A closing or suspended account (a row in `account_closure`) is never run.
- The usage ledger keeps its usual content-free request record for each run (90 days, as today).

## 4. Encryption at rest

File: `server/background-crypto.ts`.

- **AES-256-GCM**, a fresh random 96-bit nonce per value, the 16-byte tag checked on open.
- **Key from a deployment secret file**: `inference.backgroundTasks.keyFile`, one key per line as `<id>:<32 bytes in base64>`, at most 4 keys. The first line is the current key; the others only open older values.
- **Key id in front of every value** (`k1.<nonce>.<ciphertext>`), so a rotation knows which key opens what.
- **Bound to its place**: the additional data names the account, the row and the field (`task|<account>|<task>` or `result|<account>|<result>`). A sealed value copied into another account's row does not open.
- **Rotation**: put the new key on the first line and keep the old one below it. At start the server re-seals every stored value under the new key and logs how many. Active tasks are re-sealed on every run anyway. After one start with the log line, the old key may leave the file. A row whose key is missing cannot run: it pauses itself (`failed_unreadable` count), it is never sent anywhere.
- **What it protects against**: a database dump, a database backup, a mistaken export or a database-only breach. **What it does not protect against**: anyone who controls the running server, reads its memory, or has both the database and the key file. The server process decrypts every task when it runs it. This is the honest limit, and it is why the consent text says "the server stores it and can read it".

Make a key: `node -p "'k1:'+require('crypto').randomBytes(32).toString('base64')"`, saved as a Render secret file like the other secrets. Never in the repository.

## 5. The attached document (the CV case)

- A background task may carry **one** attached document's extracted text, at most **30,000 characters**. This is an addition to the contract's POST body: `attachment: { text }` (section 7).
- The browser extracts the text and masks identifiers on the device, as for any message. **The server never receives the unmasked identifiers**: placeholders such as `{{EMAIL-1}}` stay placeholders on the server and in the model request. As a second line, the server runs the same detector (`findIdentifiers`) over the name, the instruction, the search text and the attachment, and refuses to store a task in which it still finds one.
- **What the masking covers** (`src/identifier-masking.ts`): bank accounts (IBAN), card numbers, German tax numbers (tax ID, Steuernummer, VAT ID), German pension and health insurance numbers, passport and ID card numbers next to a label or in a machine-readable zone, phone numbers, email addresses, and dates of birth next to a label.
- **What it does not cover**: names, street addresses, employers, schools, places, dates without a label, photos, and anything written in plain words (health, religion, union membership, nationality, criminal records). A CV is full of these. The consent text says so in plain words.
- The attachment is stored sealed inside the task payload and sent with every run, because the model must read it each time. A requirement that it be sent once and kept by the model is not possible: the model keeps nothing.
- The answer the model writes may repeat placeholders. The browser puts the real values back when it saves the result into the vault, as for chat, from the masking map it keeps per task in the vault (built 15 November; the map never reaches the server).

## 6. Runs

Files: `server/background-tasks.ts` (pipeline and scheduler), started by `server/app.ts` when the switch is on.

**The scheduler.** A timer in the server process, once a minute, no new dependency. Each pass purges expired results, then claims due tasks one at a time, at most 5 per pass, and never two passes at once. The claim is one SQL statement (`UPDATE ... WHERE task_id = (SELECT ... FOR UPDATE SKIP LOCKED)`) that sets a 15-minute lease, so a second instance would never run the same task, and a run lost to a crash is picked up after the lease. With the optional `runHourUtcWindow`, runs start only inside those UTC hours.

**One run, in order.** Every step that refuses stores one result with a fixed code and moves the task to its next due time (no catch-up runs: after downtime, a task runs once and then goes to its next future time).

1. Stop file (`inferenceStopped`) present: skipped, `service_paused`. The config flag `enabled: false` removes the whole feature (no routes, no timer).
2. No valid report: skipped, `service_unavailable`.
3. Allowance through the existing usage ledger for the task's account, with the same weights: Fast 1, Thinking 5, plus 1 for a search, plus 2 for an attached document (section 8 explains the 2; owner decision). "Auto" answer mode runs as Fast. Not enough allowance: skipped, `allowance_exhausted`; after **3** such skips in a row the task **pauses itself** and the result says `paused_allowance`. The user resumes it (PATCH `paused: false`), which resets the count.
4. The daily cap (`inference.allowance.dailyLimit`), counted the same way as chat: skipped, `daily_limit`.
5. The spend guard for the run's output cap: skipped, `service_limit`.
6. At most **3 background runs per account in any 24 hours**: skipped, `daily_runs`.
7. A free slot (two of three free for users, the account's own chat not running), else wait 5 minutes.
8. The verified client (section 2): attestation not free, wait 5 minutes, nothing spent; a changed deployment fails closed (`deployment_changed`).
9. **Optional search**, with exactly the approved masked search text, through the existing search provider and its per-account daily search count (when deep research's count is configured; otherwise no count, as for chat today). Results already reported in earlier runs are dropped by their hashed address. **Nothing new: the run ends as done with `no_new_results`, no model request and no allowance used.** A failed search: `search_failed`, nothing spent.
10. **Reserve and dispatch** the allowance (one request record, weighted).
11. **One model request**, no code tool, no images: a short system message (background policy plus the masking instruction), then one user message with the task's instruction, the attached document and the new search results, both marked as untrusted data. Output capped at the tier's limit or 4,000 tokens, whichever is lower. Time limit: the mode's limit (Fast 90 s, Thinking 300 s).
12. **Retry rules.** One retry on an outage (on the tier's backup model when it has one). None on a refusal (`provider_refused`), none on a missing model (`model_not_found`, with the existing model alert), none on a changed deployment. A failed run keeps its reserved units, like a failed chat message.
13. The result is sealed and stored; the request is settled in the ledger with the provider's token counts (the server client decrypts the usage, unlike the relay) and the cost at the report's published price, so the spend guard counts real cost instead of the worst case.

**Counts** (content-free, in the hourly counts line): `background.created`, `background.completed`, `background.no_new_results`, `background.delivered`, `background.retried`, `background.paused_allowance`, `background.skipped_<code>`, `background.failed_<code>`, `background.deferred_busy`, `background.deferred_attestation`, `background.results_expired`, `background.scheduler_failed`.

## 7. Limits, switch and API

| Limit | Value | Where |
| --- | --- | --- |
| Auto tasks per account | config `maxAutoTasks`, 1 to 3 | `inference.backgroundTasks` |
| Shortest interval | one day (24 hours nominal; a day with a clock change is 23 or 25 hours) | `shared/scheduled-tasks.ts` |
| Instruction | 2,000 characters; name 80; search text 2 to 400 | contract schema |
| Attachment | one document, 30,000 characters | `BACKGROUND_LIMITS` |
| Results kept per task | 7 | `BACKGROUND_LIMITS` |
| Undelivered result | 7 days | `BACKGROUND_LIMITS` |
| Output per run | 4,000 tokens or the tier's limit | `BACKGROUND_LIMITS` |
| Runs per account per day | 3 | `BACKGROUND_LIMITS` |
| Pause after | 3 skips in a row for want of allowance | `BACKGROUND_LIMITS` |
| Global kill switch | `enabled: false` in the config, or the existing stop file | config, stop file |

**The switch.** Deployment config, strict schema, default absent (off):

```json
"inference": {
  "backgroundTasks": { "enabled": true, "maxAutoTasks": 3, "keyFile": "/etc/secrets/background-tasks-keys", "runHourUtcWindow": { "from": 5, "to": 21 } }
}
```

It needs a Privatemode report (the server client is Privatemode only). Development server: `PRIVATEAI_BACKGROUND_TASKS=1` (memory store, a random key per process, one stand-in local account; everything is gone at restart). Config test: `tests/deployment-inference-config.test.ts`.

**The API** follows the contract exactly. Every route needs a signed-in account, the session cookie and the CSRF header for writes, and passes the app's origin checks; all exist only while the switch is on. Refusals are English sentences with German entries in `src/server-messages.ts`.

- `GET /api/background-tasks` gives `{ tasks, limits: { maxAutoTasks, minIntervalHours } }`.
- `POST /api/background-tasks` with `{ task, consent, attachment? }` gives `{ task }`. The server sets `nextDueAt`. 409 when the account is full or the id exists; 400 without consent, with an old consent version, with an attachment but `sensitive: false`, with an unmasked identifier, with `mode: "manual"`, or with an invalid task.
- `PATCH /api/background-tasks/:id` with any of `name, instruction, trigger, paused, answerMode, useSearch, searchText, notify` gives `{ task }`; a new trigger or a resume sets a new `nextDueAt`. A `consent` without an attachment is recorded too (the extra consent asked on an edit).
- `DELETE /api/background-tasks/:id` gives 204 and deletes every stored result of it.
- `GET /api/background-tasks/results` gives `{ results: [{ id, taskId, ranAt, status, text?, reason?, usage? }] }`, oldest first.
- `POST /api/background-tasks/results/:id/ack` gives 204 and deletes the result at once.
- `/api/status` gains `backgroundTasks: { maxAutoTasks, minIntervalHours, consentVersion }` only when the switch is on.

**Contract additions (for the lead to reconcile with Agent M):**

1. POST body: optional `attachment: { text }` (the one document, masked on the device).
2. PATCH body: optional `attachment: { text } | null` (replace or remove), optional `consent` (required with a new attachment) and, since 15 November, optional `notify`.
3. `result.reason` values are fixed snake-case codes (listed in section 6) that the interface translates; skipped and failed results never carry text.
4. The deployment config has two fields beyond the contract: `keyFile` (required) and the shape of `runHourUtcWindow` (`{ from, to }`, UTC hours, may wrap midnight).
5. The consent version the server accepts today is `2026-11-15-draft`; it changes with every change of the consent text, and a task sent with another version is refused.

## 8. Cost per run

Prices: `glm-5.3-flash` EUR 0.20 / 0.65 per million input / output tokens, `glm-5.3` EUR 1.55 / 5.74 (owner's notes, before VAT). Brave USD 5 per 1,000 searches, about EUR 0.0046 each. Token sizes are estimates from the measured chat figures (`docs/cost-weights-20261114.md`), not measured for background runs: system message about 250 tokens, a short instruction about 50, Brave web results about 1,500, a typical CV of 8,000 to 10,000 characters about 2,500, the 30,000-character maximum about 8,000.

| Run | Input tokens | Output tokens | Tokens total | EUR (model) | EUR with search fee | Allowance units |
| --- | --- | --- | --- | --- | --- | --- |
| Fast, no search | 300 | 500 | 800 | 0.0004 | 0.0004 | 1 |
| Fast, search | 1,800 | 600 | 2,400 | 0.0008 | 0.0054 | 2 |
| Fast, CV and search (typical) | 4,300 | 700 | 5,000 | 0.0013 | 0.0059 | 4 |
| Fast, CV at the maximum and search | 9,800 | 800 | 10,600 | 0.0025 | 0.0071 | 4 |
| Thinking, no search | 300 | 2,000 | 2,300 | 0.0120 | 0.0120 | 5 |
| Thinking, search | 1,800 | 2,000 | 3,800 | 0.0143 | 0.0189 | 6 |
| Thinking, CV and search (typical) | 4,300 | 2,500 | 6,800 | 0.0210 | 0.0256 | 8 |
| Thinking, CV at the maximum and search | 9,800 | 4,000 | 13,800 | 0.0382 | 0.0428 | 8 |
| Any run with no new results | 0 | 0 | 0 | 0 | 0.0046 | 0 |

**30 invitees with 3 tasks a day each** (90 runs a day, about 2,700 a month):

| Mix | Tokens a day | Tokens a month | EUR a month |
| --- | --- | --- | --- |
| All Fast, no search | 72,000 | 2.2M | about 1 |
| All Fast, CV and search | 450,000 | 13.5M | about 16 (12 of it Brave) |
| All Thinking, CV and search | 612,000 | 18.4M | about 69 |

What this means:

- **The free token quota.** About 0.77M tokens were left by the agent's count at the end of 14 November (owner-reported 1.2M to 1.6M earlier, none verified). A full fleet of CV job searches would use it up in **under two days**. Background tasks should go on for invitees only after pay-as-you-go works, like the first invite (owner decision of 14 November).
- **The search fee dominates Fast runs.** Brave costs more than the model for a Fast run. "No new results" saves the model request but not the search.
- **The allowance.** A Fast CV search costs 4 units; three a day for a week is 84 of the 150-unit week. A Thinking CV search costs 8; three a day for a week is 168, more than the week, so such a task skips and then pauses itself after three skips. The daily cap of 40 leaves room.
- **Why 2 units for a document**: a typical CV adds about 2,500 tokens to every run, about two and a half Fast messages; the maximum adds about 8,000. 2 is the round number in between (owner decision 7).

## 9. Worked example: the job search from a CV (the owner's test case)

1. The user uploads a CV in the Scheduled screen (Agent M). The browser extracts the text and masks it: the email and phone become `{{EMAIL-1}}` and `{{PHONE-1}}`; the name, address, employers and dates stay as written.
2. The user writes the instruction: "Find job offers that match the attached CV. List each new offer in one line: title, employer, place, link. Say plainly if none fits." Schedule: daily at 08:00, Europe/Berlin. Mode: Fast. Search: on; the screen shows the masked search text, "Data Analyst Jobs Leipzig", and the user approves it.
3. The user picks **Background task**, reads the statement that the server stores and can read the task, and the extra text for documents (the CV holds personal details the masking does not cover), and confirms both.
4. **Stored on the server**: one sealed payload (name, instruction, schedule, search text, the masked CV text), the next due time (tomorrow 07:00 UTC), the consent version and time with `sensitive: true`. Nothing readable but times and flags.
5. **Each morning between 08:00 and 08:10** the server: checks the stop file and the report, reserves 4 units (Fast 1, search 1, document 2) only after it knows the run is possible, sends exactly "Data Analyst Jobs Leipzig" to Brave from the server (Brave sees our server's address, not the user's), drops results it reported before, and sends one end-to-end encrypted request to Privatemode with: the background policy, the instruction, the masked CV text and the new results. Privatemode returns about 500 to 700 tokens of answer.
6. **Stored until delivery**: the sealed answer, its token counts, the run time. When the user opens CometRow, the browser fetches it, puts back `{{EMAIL-1}}` if the model repeated it, saves the answer into the vault and acknowledges it; the server deletes it at once. Unopened, it is deleted after 7 days.
7. **Cost**: about 5,000 tokens a run, about EUR 0.006 with the search fee; with no new offers, EUR 0.0046 (the search only) and no allowance.

## 10. Consent

- Every task is stored with the consent version, the server's time and the sensitive flag. Without consent, or with an old version, the server refuses to store it. A task with an attachment needs `sensitive: true`. The browser decides "health-looking" (Agent M); the server cannot judge it without reading for it, and does not try.
- The consent texts are drafts for the owner's legal read: `docs/background-tasks-consent-draft-20261115.md` (English and German, including the extra text for CVs, files and health-looking content). Agent M shows them in the interface; the final strings belong in `src/text/scheduled.ts` (Agent M's file).

## 11. Privacy and legal

All proposed wording is in `docs/background-tasks-privacy-wording-draft-20261115.md` (English and German): every sentence of the privacy statement, the policy, the provider disclosure, the threat model and the record of processing that changes, a DPIA note (special-category data in CVs and health content), retention, the legal basis (consent, Art. 6(1)(a) and Art. 9(2)(a) GDPR), and the owner decisions. No binding text was edited.

## 12. Not verified

- **Nothing ran live.** No Privatemode call, no Brave call, no attestation from the server. The probe in section 13 does that.
- That the SDK's Wasm runs inside the production server process (memory on the Render instance; the probe prints the process memory), and that its network calls work there: the SDK uses Node's global `fetch`, which does not use our `serviceDispatcher`; if the production host sets `HTTPS_PROXY`, the SDK's calls bypass it.
- That `onManifestUpdate` fires in Node on a real rotation as it does in the SDK source, and that verifying the same client again after a 429 works (both read from the SDK code and tested with a fake).
- That the SDK's own up to three attest attempts per verification count as one queue slot: they do not; the queue sees one call. With one verification per 10 minutes this is small, but it is not exact.
- The SQL: migration 0021, the grants, the claim statement and the PostgreSQL store are written in the durable-test style (`tests/background-tasks-postgres.test.ts`) and **not run** (rule 4). The lead runs them.
- Token sizes and costs in section 8 are estimates. The CV run is not measured.
- The 1-day minimum on a daylight-saving day is 23 or 25 hours, not 24.
- No interface was built here; the badge, the consent step, the results inbox and the reinsertion of placeholders are Agent M's.
- The daily run count and the 5-minute waits are in process memory: a restart forgets them (the ledger's allowance and daily cap do not).

## 13. What the lead must run

1. **The durable tests**, against the synthetic database: `PRIVATEAI_SYNTHETIC_PG=... npx vitest run tests/background-tasks-postgres.test.ts tests/account-privileges.test.ts tests/account-operator-postgres.test.ts`.
2. **The live probe**, with the development key and a synthetic CV (made up in the script):
   `Invoke-WithPrivateAiSecret -Name PRIVATEMODE_API_KEY -Action { Invoke-WithPrivateAiSecret -Name BRAVE_SEARCH_API_KEY -Action { npx tsx evaluation/privatemode/background-probe.ts } }`, then with `--thinking`. Expect: run 1 `done` with a short list and token counts; run 2 either `no_new_results` or only new offers; `attestCallsSoFar` stays 1 across both runs; the process memory figure. About 10,000 to 25,000 tokens and two Brave queries.
3. **A deployment rehearsal**: a key file as a Render secret, the config block above with `enabled: true`, migration 0021 applied (`apply-pending` now reports three pending migrations on a database that has 0020 but not 0021; the runbook text "pending: 2" is out of date for this branch), the runtime grants re-run, one task created through the interface, the stop file tried.

## 14. Owner decisions (recommended defaults)

| # | Decision | Recommended default |
| --- | --- | --- |
| 1 | Server client: SDK in Node or the proxy container | SDK in Node (section 2) |
| 2 | Retention of an undelivered result | 7 days, deleted at once on delivery |
| 3 | Encryption key | A new Render secret file, rotated yearly or after any suspected exposure |
| 4 | Auto tasks per account | 3 |
| 5 | Shortest interval | Daily |
| 6 | Pause after | 3 allowance skips in a row |
| 7 | Allowance weight for an attached document | 2 units (0 keeps the owner's "same weights" literally; then a CV run costs 2 units for about 5,000 tokens) |
| 8 | Runs per account per day | 3 |
| 9 | Run hours | No window for the alpha; set one (for example 05 to 21 UTC) if runs disturb daytime chat |
| 10 | When it goes on for invitees | After pay-as-you-go works, the consent and privacy texts pass the legal read, and the durable tests and the live probe pass |
| 11 | Health-looking content | Allowed with the extra consent, as for a CV; no server-side check |
| 12 | Search fee | Accept it; revisit if Brave costs more than EUR 20 a month |

## Checked by the lead, 15 November 2026

- **Durable tests:** the whole durable suite passed, 138 of 138, on a fresh synthetic database (container `privateai-durable-20261115`, port 55439, the documented synthetic credentials; stopped after the run). The migration tests had pinned the old migration count (14); they now count 0021.
- **Live probe** (development key, synthetic CV, Fast, with search): run 1 `done` in 4.8 s, 982 prompt and 301 completion tokens, 4 allowance units, 2 Brave searches over both runs; run 2 `no_new_results` in 0.9 s with no model request. Process memory 218 MB.
- **What the answer showed:** Brave returns job-board overview pages ("796 Data Analyst jobs in Leipzig" on LinkedIn, StepStone, Indeed, Bundesagentur), not individual postings, and the model said so honestly instead of inventing offers. **For a useful job search the run must read the result pages** (the existing approved page fetch) or use a job board's own search; that is a product decision before the CV template is offered.
- **Attestation:** the probe counted 2 attest calls for two runs, not 1 as expected; the second run verified again. Harmless at this scale; to check before many tasks run.
- Not checked: Thinking, a real rotation, Render memory, many accounts.

## Wired end to end, 15 November

The interface (`docs/scheduled-20261115.md`) had only been tested against a fake of these routes, and these routes only with direct calls. `tests/scheduled-wiring-browser.test.ts` now runs the real app in Chromium against the real routes (`createApp` with the switch on, the memory store, a key file in a temporary folder, the development account `local-development`); only the run's Privatemode client and the search are faked. It creates the CV task through the form, edits, pauses and resumes it, runs it with the scheduler's `tick` a day later, lets the app's five-minute poll save and acknowledge the result, and deletes the task; the store holds no task and no result afterwards, and no request failed. What was found and fixed on this side:

- **Citations the saved result cannot show.** The background policy told the model to cite `[source-id]`, as chat does; a saved result keeps no web results (as for a saved search), so every result showed "Original sources unavailable". The policy now asks for each web result as a Markdown link with its title and address; the interface shows model links as "title (address)", never clickable. The lead's live probe should confirm a real answer does this.
- **`notify` in PATCH.** The interface keeps the task the server returns, and PATCH had no `notify`, so a changed notification choice was lost on every edit. `notify` is now accepted (strict schema; it is stored sealed with the task as before).
- **The extra consent on an edit** is now sent by the interface and recorded here (`consent` without an attachment was already accepted).
- Everything else matched: all six routes, the status codes, refusal texts and their German entries, the consent version, `attachment: { text }`, the status field, the CSRF header and session cookie. The interface's test fake now uses this file's `REFUSALS` and answers 204 for DELETE and ack of something already gone, as this server does.
