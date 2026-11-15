# Usage metering (15 November 2026)

The owner asked for a lasting usage-metering system instead of tuning one number: a ledger of feature and measured cost per request, feature weights as versioned configuration set from measured data, quotas per plan, a usage meter for the user, and a weekly reconciliation against Privatemode. This note explains what was built, the choices, the limits, and what the owner and the lead must still do.

Status: **built and tested offline, switched off by default, nothing verified live.**

## The switch

- Deployment config: `inference.metering: { "enabled": true, "plan": "alpha" }` (`plan` is optional, default `alpha`). Absent or `"enabled": false`: nothing changes, the report's allowance costs apply as before, no records, no meter, no request id header, no `/api/usage/*` routes.
- Development server: `PRIVATEAI_METERING=1` (records in memory, gone at restart).
- `/api/status` carries `metering: { plan, weightsVersion }` only for a signed-in account while the switch is on. The browser shows the meter only then.
- Needs migration 0022 on the hosted database, and the operator SQL (`accountPrivilegePlan`, which also re-creates the purge function) run again (see `docs/development-deployment.md`).

## What the relay can see, and what only the browser can see

Research in the code and the owner's Privatemode notes (`docs/privatemode-master-notes.md`):

- **The relay sees:** the encrypted request body and its size, the encrypted reply stream and its size, the time from forwarding to the end of the reply, the model it admitted (the `privatemode-target-model` header it pins), the declared mode and kind headers, and Privatemode's `x-request-id`. Measured by the lead on 15 November: the encryption adds about 0.15 % to a body (518,714 bytes became 519,512), so the encrypted size is almost exactly the plain size.
- **The relay cannot see tokens.** Privatemode sends no usage header or trailer (the Privatemode adapter's `usage()` returns nothing; only the old Tinfoil adapter had a usage trailer). The `usage` object of an OpenAI-style stream (`stream_options.include_usage`) is inside the encrypted reply.
- **The browser sees** the decrypted `usage` of every reply: `prompt_tokens`, `completion_tokens`, and when Privatemode sends them `prompt_tokens_details.cached_tokens` and `completion_tokens_details.reasoning_tokens`. The app already read these for the per-conversation token line.
- **Privatemode's portal** shows totals per key. The notes describe no usage API or export, so the weekly reconciliation stays a reading the owner types in, with a script that prints the app's side.

## Design

### 1. A usage record per request

Table `usage_records` (migration `0022-usage-records.sql`; SQLite twin in `server/usage-records.ts`, PostgreSQL in `server/usage-records-postgres.ts`). One row for **every request the relay forwarded to Privatemode**, paid or free, because Privatemode bills free follow-ups and retries too:

| Column | What |
| --- | --- |
| `request_id`, `account_id`, `created_at` | The id the relay already issues per request, the account, the database time |
| `feature` | `chat-fast`, `chat-thinking`, `code-followup`, `retry`, `image`, `voice`, `research-plan`, `research-answer`, `background-run`, `search`, `page-fetch` |
| `units`, `weight_version` | Allowance units charged (0 for a free follow-up or retry) and the weights version they were charged under |
| `outcome` | `complete`, `interrupted` or `refused` (Privatemode refused before any reply) |
| `model`, `request_bytes`, `response_bytes`, `duration_ms` | Measured by the relay itself |
| `prompt_tokens`, `completion_tokens`, `cached_tokens`, `reasoning_tokens`, `audio_seconds` | Reported by the browser after decryption |
| `report`, `report_note`, `reported_at` | `none`, `accepted` or `flagged`, with a fixed code why it was flagged |

Numbers only: never content, never a title, never a prompt. The allowance itself stays in the existing ledger (`usage_requests`); the records explain it per feature and do not change how allowance is reserved.

Flow:

1. The relay reserves the units as before, forwards the request, and when Privatemode accepts it sets the response header `x-privateai-request: <request id>`.
2. When the reply ends (or fails), the relay writes the record (fire and forget, never delays the reply; a failure is counted as `metering.record_failed`).
3. The browser reads the decrypted `usage` of that reply (`src/verified-chat.ts`, one hook in `observedEvents`, which every reply path uses) and posts `{ requestId, promptTokens, completionTokens, cachedTokens?, reasoningTokens? }` to `POST /api/usage/report` (`src/usage-report.ts`). Same session and CSRF as chat. It never blocks the answer and never retries. Without the header (switch off) it does nothing.
4. The server accepts a report only for the account's own record, once, within 15 minutes, with whole numbers and no other field. It checks the numbers against what it measured and stores them as `accepted` or `flagged`.
5. Searches and page reads get a record too (0 units, no tokens), so the Brave bill can be checked the same way.

### 2. The server's cross-check (`implausible` in `server/usage-records.ts`)

| Code | Rule |
| --- | --- |
| `not_complete` | The relay did not see the reply end |
| `cached_above_prompt`, `reasoning_above_completion` | Parts larger than the whole |
| `prompt_above_bytes` | More prompt tokens than bytes in the encrypted body (a token is at least one byte; the encryption adds about 0.15 %) |
| `prompt_below_bytes` | Fewer than one token per 32 bytes plus 4 KB (JSON-escaped German or other non-Latin text is the worst real case). Not for pictures (many bytes, few tokens) |
| `completion_above_limit` | More output tokens than the mode's output limit |
| `completion_below_bytes` | Fewer than one output token per 2,048 bytes of encrypted stream plus 8 KB (each streamed event is encrypted on its own) |
| `too_fast` | More than 2,000 output tokens per second |

A flagged report is kept (evidence of a modified browser or of a wrong bound) but is left out of the weight suggestion and counted as unreported in the reconciliation. **Reports never change what was charged:** the units are fixed by the relay from the weights before the request goes out. A lying browser can only spoil the measurement, and the reconciliation against the portal shows that. The bounds are first estimates, not calibrated; `scripts/usage-metering.ts suggest` shows the measured tokens per feature, so they can be tightened after the first week.

### 3. Is this "readable by CometRow"? (the red line)

Plainly: **yes, these numbers are readable by CometRow and linked to the account for 90 days.** They are usage metadata, not content: how many tokens a request and its answer had, how large the encrypted message was, how long it took, which feature. Privatemode already keeps token counts per key permanently for billing. Our existing request records already hold which account asked, when, how often and which model; the relay could always see the encrypted sizes and times.

What is new: per-request token counts and sizes give a rough idea of how long a message and an answer were. They say nothing about what was asked. Options:

- **A (recommended):** keep per-request records for 90 days, as the existing request records. Needed for the "last requests" list, for weights from real data, and for finding abuse. Change the privacy policy sentence (draft in `docs/usage-metering-privacy-wording-draft-20261115.md`).
- B: keep per-request records for 7 days only (enough for the weekly reconciliation and the meter), then only weekly totals per feature without the account. Less useful for weights and abuse; more code.
- C: no token reports at all, units only. Then weights cannot come from data and the reconciliation cannot find a gap per feature.

The privacy wording must change before the switch is turned on in production (owner decision).

### 4. Feature weights as versioned configuration

`shared/usage-weights.json`, parsed strictly by `shared/usage-config.ts` when the server starts (a broken file stops the server). Each version has a number, an effective date, who approved it, the units per feature, the free code follow-ups per paid message, and the measured basis per feature. The relay charges the newest version whose date has passed; every record keeps its version. With metering on, the weights replace the report's `allowanceCost` values (modes, `vision`, `speech`) in what the relay charges and what the browser shows (`withWeights` in `server/usage-metering.ts`; if the weights would make the report invalid, chat is refused). The deep-research cost and the free follow-ups are read from the weights at start. The report keeps its `allowanceCost` fields because its schema requires them; with metering on they are not used.

Version 1 (values unchanged from today):

| Feature | Units | Source of today's value |
| --- | --- | --- |
| Fast message | 1 | report draft |
| Thinking message | 5 | owner decision 13 November, report draft |
| Picture question | 2 | report proposal (`vision.allowanceCost`) |
| Voice recording | 2 | report proposal (`speech.allowanceCost`); the voice agent may change the unit |
| Deep research run | 15 (plan 5 + answer 10) | `inference.research.cost` proposal |
| Code follow-up | 0, two per paid message (`freeCodeFollowUps: 2`) | owner decision 14 November, `server/continuation-credit.ts` |
| Retry after a refusal | 0 | K4 |
| Background task extras | search 1, attachment 2 (on top of the mode) | `server/background-tasks.ts` |
| Search, page read | 0 | counted only |

`tests/usage-metering.test.ts` proves version 1 equals the report draft, the continuation credit, the background extras and the research split. No mismatch was found, so no value changed.

**Changing a weight:** run `node --import tsx scripts/usage-metering.ts suggest --from <date> --to <date> --database-url-file <file>`. It prints per feature the uses, the median quota tokens and euros per use, the ratio to a Fast message, the current and the suggested units (by euros by default, `--basis tokens` for the free-quota view; per-request weights capped at 1 to 10, a research run at 2 to 20; fewer than 20 uses suggests nothing), plus the "calculation turn" (a paid message and its free follow-ups) for review, and a JSON proposal for the next version. The owner approves; the agent appends the version with the date and the approver and deploys. Never edit an existing version.

### 5. Plans and quotas

`shared/usage-plans.json`: plans with units per period, days, a daily limit, and caps per feature (pictures per day, voice minutes per day, research runs per day, searches per day, background tasks). A cap of 0 switches the feature off for the plan. Plan ids follow the billing plan id rule (`shared/billing.ts`) so a paid plan can be linked to its billing plan later; entitlement (`server/billing-entitlement.ts`) is not wired to plans yet.

| Plan | Units | Pictures/day | Voice min/day | Research/day | Searches/day | Background | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| alpha | 150 per 7 days, 40 per day | 10 | 10 | 3 | 24 | 3 | today's alpha values |
| free | 60 per 7 days, 20 per day | 3 | 5 | 0 | 10 | 0 | proposal |
| premium | 600 per 7 days, 150 per day | 30 | 30 | 5 | 60 | 3 | proposal |

With metering on, the named plan's numbers **replace** `inference.allowance` and the daily limits of `images`, `voice`, `research` and `backgroundTasks` in the deployment config (`withPlan` in `server/deployment-config.ts`). The feature switches and technical sizes (`maxBytes`, `maxSeconds`, the research `cost`) stay in the deployment config. The alpha uses one plan for everyone; per-account plans come with billing. The search cap applies only while deep research is on, as today.

### 6. The usage meter

- `GET /api/usage/meter` returns only the signed-in account's own numbers: units used and left this period and in the last 24 hours, the plan's caps with today's counts, units and tokens per feature this period, and the last 8 requests, with a calculation's free follow-ups folded into the message that paid for them.
- The account's usage page shows the full meter (`src/UsageMeter.tsx`): two bars, the daily caps, a table per feature, the last requests ("Calculation with code: 1 request, 2 follow-ups at no charge · 3,600 tokens"), the weights in plain words and what tokens are.
- The account menu shows a compact line and bar ("138 of 150 requests left this week · 32 left today").
- Under an answer calculated with code: "Used 1 request; the calculation needed 2 more steps at no charge." (or, past the free steps, how many were counted as a new message). Recorded on the device only while metering is on (`Message.codeSteps`).
- English and German, native `<meter>` elements with names, no new status notices, no sideways scrolling at 375, 768 and 1280 px (`tests/usage-meter-ui.test.ts`). The meter reloads with the status (every 30 s) and on window focus.
- Euros are not shown to the user; tokens and requests are. Owner decision if euros should appear.

### 7. Weekly reconciliation

`node --import tsx scripts/usage-metering.ts reconcile --from 2026-11-16 --to 2026-11-23 --database-url-file <file> --portal-tokens <N> [--portal-eur <X>]` prints per feature and in total: requests, units, reported and flagged reports, unreported and incomplete requests, prompt, completion and cached tokens, tokens as the free quota counts them (cached at the cached:regular price ratio, audio at 2,800 per minute), unreported complete requests estimated at the feature's median, list-price euros, and the gap to the portal reading in tokens and percent. Steps: `docs/week-one-monitoring.md`.

### 8. Storage, retention, erase, export

- Migration 0022 (next after 0021; `tests/account-migrations.test.ts` now expects 16). Indexes by account and time, and by time.
- Runtime role: `SELECT, INSERT` and `UPDATE` of the report columns only (`server/account-privileges.ts`). No delete.
- 90-day purge: `purge_expired_requests()` now also deletes usage records older than 90 days (they hold no allowance, so nothing is held back). The function signature is unchanged; the operator must re-run the privilege SQL once so the new function body is installed.
- Account erase (`scripts/account-operator.ts`) and the account data export (`server/account-auth.ts`, `usage.records`) include the records.

## Where voice metering plugs in (for the lead)

The voice route (`server/providers/privatemode-voice.ts`, the voice agent's file) is untouched. To connect it:

1. Pass the metering object into `voiceRoute` (in `server/app.ts` the `voiceRoute({...})` call; `metering` is in scope there).
2. After a forwarded transcription, call `metering.record({ requestId, accountId, feature: "voice", units, outcome, model: speech.model, requestBytes: body length, responseBytes, durationMs })`. `units` is what the route reserved (`speech.allowanceCost`, which with metering on is already the weights' `voice` value through `withWeights`).
3. Set `x-privateai-request: <requestId>` on the transcription response (`REQUEST_ID_HEADER` in `shared/usage-config.ts`).
4. In the browser, after the transcription, post `{ requestId, promptTokens: 0, completionTokens: 0, audioSeconds }` to `/api/usage/report` (helper `usageReportBody` in `src/usage-report.ts` can be extended). The report schema already accepts `audioSeconds` (0 to 3,600); the reconciliation counts 2,800 tokens per minute and the whisper or voxtral price per minute. A plausibility rule for audio (seconds against the upload size and `maxSeconds`) should be added to `implausible` then.
5. If voice gets a different unit (per chunk or per minute), add it as a new weights version (for example `voice` per chunk) rather than editing version 1, and rename the feature only together with the records' feature list in `shared/usage-config.ts`.

Background runs plug in the same way in `server/background-tasks.ts` (feature `background-run`). There the server's own Privatemode client decrypts the reply, so the server can record exact token counts itself, without a browser report.

## Limits, stated honestly

- Not verified live: that the Privatemode SDK's `asResponse()` keeps our `x-privateai-request` header (if not, no reports arrive and nothing else breaks); that Privatemode sends `cached_tokens` and `reasoning_tokens`; the real bytes-per-token ratios behind the bounds.
- The research cost and free follow-ups are read from the weights at start; a version with a future date applies to them only after the next restart (deploys restart anyway).
- Requests made without a signed-in account (development server without accounts) are recorded under `local-development`.
- The meter's period start assumes the plan's period length (true for the automatic allowance; a billing allowance of 31 days would be read as 7).
- Interrupted and refused requests have no tokens; the reconciliation counts them but cannot price them.
- The usage report adds one small POST per reply; it is not counted against the evaluation session's 200-POST limit.
- `scripts/usage-metering.ts` is not in the Docker image: it runs on a machine that can reach the database with a URL file. If the hosted database is reachable only from the service shell, add one `COPY` line for it to the Dockerfile (lead's decision).
- Migration number 0022 may collide with another branch that also adds a migration; renumber at merge time.

## Live checks for the lead

1. Development server with `PRIVATEAI_METERING=1`, a real report: send a Fast message, a Thinking message and a calculation with code. In the browser's network tab, check `x-privateai-request` on each chat response and a 204 for each `/api/usage/report`. Then `GET /api/usage/meter` shows the three and the calculation folded into one line.
2. Note `prompt_tokens`, `completion_tokens`, `cached_tokens`, `reasoning_tokens` from one report and the record's `request_bytes`, `response_bytes`, `duration_ms`: send the ratios to the agent to calibrate the bounds.
3. On the hosted candidate: migration 0022 applied, privilege SQL re-run, a chat through the Render bridge still gets the header, and the first `reconcile` run against the portal the following week.

## Files

`shared/usage-weights.json`, `shared/usage-plans.json`, `shared/usage-config.ts`, `server/usage-records.ts`, `server/usage-records-postgres.ts`, `server/usage-metering.ts`, `server/migrations/0022-usage-records.sql`, `scripts/usage-metering.ts`, `src/usage-report.ts`, `src/UsageMeter.tsx`, `src/text/usage-meter.ts`; small changes in `server/app.ts`, `server/deployment-config.ts`, `server/consumer-workspace.ts`, `server/index.ts`, `server/continuation-credit.ts`, `server/request-retention.ts`, `server/account-privileges.ts`, `server/account-auth.ts`, `server/account-migrations.ts`, `scripts/account-operator.ts`, `shared/contracts.ts`, `src/verified-chat.ts`, `src/App.tsx`, `src/AccountUsagePage.tsx`, `src/WorkspaceNavigation.tsx`, `src/CodeRuns.tsx`, `src/saved-conversation.ts`, `src/chat-design.css`. Tests: `tests/usage-metering.test.ts`, `tests/usage-metering-relay.test.ts`, `tests/usage-meter-ui.test.ts`, `tests/usage-records-postgres.test.ts` (durable), `tests/deployment-inference-config.test.ts`, `tests/account-migrations.test.ts`.
