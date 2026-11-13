# Privatemode attestation limit: a capacity decision for the alpha (12 November 2026)

**Status: finding measured; owner accepted option B ("Option 1", 12 November); built on branch `privatemode-session-verify` (see "Built" below). Attestation queue built and checked live on 13 November (see "Queue (built)" below): it stops the 429 storm, but five sessions starting together still fail when Privatemode's allowance is used up. Option A (higher limit) is still open and now the main fix.**

## What was measured

The Privatemode browser adapter (Stage 3) creates a fresh SDK client and runs a full attestation (`verify()`) before every message. Before each message, that means three calls: attest, secret and chat. The first in-app benchmark run on Privatemode failed on about 40 % of answers with "Protected response unavailable", in bursts.

Probes with the same pattern (`evaluation/privatemode/attest-burst-probe.mts`, `attest-paced-probe.mts`, small synthetic requests):

| Pattern | Result |
| --- | --- |
| 3 in parallel, back to back | 15 succeeded in 29 s, then **HTTP 429 on the attest request** (`updating mesh CA: doing attest request: unexpected status code: 429`) |
| 1 every 3 s (20 per minute) | 16 of 25 succeeded; 429s in bursts |
| 1 every 6 s (10 per minute) | **15 of 15 succeeded** |

The limit applies to the attestation call, not to chat tokens, and Privatemode applies rate limits per organisation (their email of 12 Nov).

## What it means

- **Capacity:** with a fresh attestation per message, the **whole alpha** can send only about 10-15 messages a minute, all users together. Beyond that, users see "Protected response unavailable", and the backup retry does not help because it attests again.
- **This is not a model or prompt problem.** The benchmark runs now pace message starts at 6.5 s, one mode at a time.

## Options

| Option | Effect | Privacy wording |
| --- | --- | --- |
| A. Keep a fresh attestation per message, and ask Privatemode for a higher attestation limit (Enterprise plan) | No code change; depends on Privatemode | Unchanged ("before each request your browser checks …") |
| **B. Recommended: reuse a verified client per browser session for a bounded time (10 minutes)** | About 1 attestation per user per 10 minutes. Re-verify at once when the manifest changes, after any error, and on a new tab or reload. Capacity becomes the chat limit (Standard tier: 100 requests per minute) | Change to "Your browser checks the sealed computer against a release we approved when you start chatting and again at least every 10 minutes" |
| C. Both A and B | B now, and A before growing beyond the alpha | as B |

**Recommendation: C.** Option B is how the SDK is designed to be used (verify once, then many requests). The weaker part is freshness: a manifest withdrawn mid-session would be noticed within 10 minutes instead of at the next message. The Tinfoil path is not changed.

**Owner decision needed:** accept B, including the wording change. Building it is small: one client cache in `src/providers/privatemode-client.ts` with a time limit and a manifest check, plus tests.

## Built (12 November 2026, branch `privatemode-session-verify`)

Owner decision, verbatim: "Option 1 accepted: verify once per browser session, refreshed at most every 10 minutes, and immediately on any failure or release change. Fail closed on a failed re-verification."

**What changed (Privatemode path only; the Tinfoil path is untouched):** `src/providers/privatemode-client.ts` keeps one verified SDK client per browser session, in memory only (a reload or new tab starts afresh).

- **Time limit:** `PRIVATEMODE_VERIFY_MAX_AGE_MS` = 10 minutes. A message whose client was verified 10 minutes ago or more verifies again first; the old client is closed.
- **Re-check on error:** any failed request on the client (transport error, 4xx/5xx from key exchange or chat, a refused reply, a reply that breaks or is stopped mid-stream) closes and forgets it. A failed verification (including HTTP 429 on attest) caches nothing. The next message verifies afresh before sending; the same-tier backup retry therefore also gets a new, freshly verified client.
- **Release change:** the client is reused only under the exact origin, approved digest list and CSRF token it was verified under. A changed digest list (or a new session token) means a new verification; the SDK's own manifest-update signal still stops the client and now also forgets it.
- **Fail closed:** a failed re-verification throws before any chat request; the closed old client refuses to send ("Nothing was sent."), so there is no fallback to a stale client. The user sees the existing "Protected response unavailable" notice.
- **Pins:** every (re)verification fetches the manifest, checks its SHA-256 against the approved digests and builds the client with the pinned Wasm hash.
- **Lifecycle:** discarded clients are closed (this replaces the old `shortcut:` note about clients never being closed). A stop during verification closes the client and caches nothing.

**Wording (Privatemode only; exact text):**

- Privacy statement and policy page, "What is sealed and sent": "When you start chatting and again at least every 10 minutes, your browser checks the sealed computer against a release we approved; …" (was "Before each request your browser checks …"). Mirror regenerated: `docs/privacy-copy-privatemode-20261112.md`.
- Connection banner (`verificationSummary`): "The secure server is checked when you start chatting and again at least every 10 minutes, and every review check passed." (and the two shorter variants). Tinfoil keeps "before each request".
- Status reason (`/api/status`): "Provider qualification recorded; the browser still verifies when chat starts and again at least every 10 minutes."
- Also updated: `docs/privacy-wording-privatemode-20261112.md`, `docs/provider-promises-20261112.md`, `docs/qualification-report-draft-privatemode-20261112.md`, `evaluation/qualification-drafts/privatemode-20261112.json`, `docs/threat-model-20261022.md`.

**Tests (offline, mocked SDK), `tests/privatemode-client.test.ts`:** (a) two messages within 10 minutes use one verification; (b) at exactly 10 minutes a new verification happens (fake clock; 1 ms earlier it does not); (c) after a transport error, a 5xx, a 4xx, a refused reply, a broken stream, a stop mid-stream or a failed verification, the next message verifies afresh; (d) a changed approved digest list, a new CSRF token or an SDK manifest update forces a new verification; (e) a failed re-verification sends no chat request and the old client refuses; (f) an unapproved manifest is refused on first verification and on re-verification, a cached client is not reused across a pin change, and every client carries the pinned Wasm hash; (g) a stop during verification closes the client and caches nothing. Each was checked by breaking the matching code (removing the cache, the time check, the discards, the digest in the key, the digest check, the close on failure, or adding a stale fallback): every break fails at least one of these tests. Banner: `tests/qualification-acceptance.test.ts`; statement: `tests/privacy-copy.test.ts` (Tinfoil text and mirror unchanged byte for byte).

**Not done:** no live run against Privatemode (mocks only); option A (a higher attestation limit) is a supplier request for the owner.

## Queue (built, 13 November 2026, branch `attest-queue`)

Why: the live test of 13 November (session verification, `37b0985`) passed one session, Stop and the 10-minute refresh, but **three sessions starting together lost 6 of 12 answers to 22 HTTP 429s on attest**. Each refused verification produced more calls: the SDK tries every attest call three times (about 1 s and 2 s apart), and every following message verified again.

### Design

- **One queue for all attest calls of this server** (`server/providers/privatemode-attest-queue.ts`, used only by the Privatemode relay). Key exchange (`/privatemode/v1/secret`) and chat never pass through it: only attest was ever refused.
- **Adaptive rate (token bucket, in attest calls):** start at 6 a minute with 6 allowed at once. On every upstream 429 the rate halves (once per pause, not once per refused call in flight), the queue pauses for `Retry-After` (60 s when absent, which is what Privatemode sends), and the refused call goes back in line by arrival; a 429 never reaches the browser. After 10 successful calls in a row the rate grows by 1 a minute, up to 120 a minute, so a raised limit is used with no code change. Floor: 2 a minute.
- **Bounded wait:** a call waits at most 20 s. A call that cannot be sent in that time is refused at once (so the SDK's three attempts do not each wait 20 s), and a call still waiting at 20 s is refused then. The refusal is HTTP 503 `{"error": "CometRow is busy checking the secure server. Please try again in a minute.", "reason": "attestation_busy"}`.
- **Browser:** the SDK reports the refusal only as text (`... doing attest request: unexpected status code: 503`, or 429), from `verify()` or as the cause of a connection error when it refreshes a secret mid-chat. The Privatemode adapter turns that into `AttestationBusyError`; the app shows "CometRow is busy checking the secure server. Please try again in a minute. Nothing was sent." Fail closed: nothing is sent unverified.
- **No backup retry after a busy or rate-limited verification** (`shouldRetryOnBackup`): the backup must verify too. The retry stays for real model unavailability (upstream rejected, service unavailable, no first word in time).
- **One attest call per verification instead of two.** The client now sets the encryption secret during verification (`verify()` then `refreshSecret()`); before, the SDK's first chat found no secret and verified a second time by itself. Measured live: scenario A went from 2 attest calls to 1 for the same 20 messages.
- **Race fix:** a verification that finishes after another one cached a client keeps the newer client and closes only its own (before, it closed the newer client a request might be using). A stopped request's late cleanup already closed only its own client; both cases now have tests.
- **Logs:** counts only (`sent`, `waited`, `waitedMs`, `limited429`, `busy`, `perMinute`, `lastPauseMs`), on each 429 and each refusal; no bodies, paths, headers or account data.
- shortcut: queue state is in memory per server instance. With several instances (or another process using the same key, such as a live test), each paces on its own and together they can exceed the limit.

### Numbers (all in `ATTEST_LIMITS`, one place)

| Setting | Value | Basis |
| --- | --- | --- |
| Start rate | 6 calls a minute | below the 9 to 10 calls that passed live on 13 Nov |
| Allowed at once | 6 | 5 sessions starting together need 5 |
| On 429 | halve; pause for `Retry-After` (default 60 s) | Privatemode sent `Retry-After: 60` |
| Growth | +1 a minute after 10 successes in a row, ceiling 120 | slow probing; ceiling far above today's limit |
| Floor | 2 a minute | |
| Longest wait | 20 s | owner; Fast mode allows 30 s for verification plus first word |

**The limit measured on 13 November is lower than on 12 November.** Through the queue, Privatemode answered 429 with `Retry-After: 60` after 10 calls within about 8 s in one run, and after the 7th call within about two minutes in another (runs 2 and 4 below). On 12 November, Node probes passed 10 verifications a minute and 15 back to back. Repeated test runs on 13 November may have used part of the allowance; Privatemode does not publish the window.

### Live result (13 November, `evaluation/privatemode/session-verify-live.ts`, real app, synthetic prompts, Fast mode)

Raw results: `.local/session-verify-live/result-*.json` in this worktree; logs `.local/session-verify-live-queue-run*.log`.

Baseline before the queue (00:51, session verification only): three sessions at once lost **6 of 12** answers to 22 HTTP 429s on attest.

| Run (time) | Code | A: burst, 1 session, 20 messages | B: 5 sessions at once, 4 messages each | C: Stop, then next message | D: 10.5-minute refresh |
| --- | --- | --- | --- | --- | --- |
| 1 (01:55) | first numbers (8 verifications a minute, 2 attest calls each, 15 s wait, 6 s default pause) | 20/20, 1 verification, 2 attest calls | **0/20**: Privatemode refused 3 of B's first 4 attest calls (429, a long Retry-After); the queue then answered busy to all, no 429 reached a browser, no backup retry | busy (still in Privatemode's pause) | first message busy; after 10.5 min ok, 1 verification |
| 2 (02:10) | same, B only | – | **16/20**: 10 attest calls passed within about 8 s, the 11th got 429 with `Retry-After: 60`; one session got the busy message on all 4 messages | – | – |
| 4 (02:18) | final (6 calls a minute, burst 6, 20 s, one attest call per verification) | 20/20, 1 verification, **1 attest call** | **8/20**: 6 calls passed (A's 1, B's 5), the 7th got 429 → 60 s of busy messages | busy (in the pause) | first message ok; after 10.5 min ok, 1 verification, 1 attest call |
| 5 (02:30) | final, B only, right after run 4 | – | **18/20, 0 attestation failures**: 7 verifications, 7 attest calls, 0 refused, 0 busy. The 2 failures were our relay's own limit of 3 chats at once (HTTP 429 "Three requests are already running") | – | – |
| 6 (02:41) | final, after a 10-minute pause | 20/20, 1 verification, 1 attest call | **10/20**: chats refused by our 3-chat limit discarded their verified clients, so 14 verifications were asked for; the queue sent 7 at once and answered busy to the rest, then the 8th call got 429 → 60 s of busy messages | busy (in the pause) | first message busy (in the pause); after 10.5 min ok, 1 verification, 1 attest call |

**Extra wait per session (run 5, the clean B run):** the first message took 2.7 to 3.5 s against 0.3 to 0.6 s for later messages, so verification added about 2.3 to 3 s per session; attest time through the relay per session was 0.7 to 1.4 s, and 8.9 s for the one session that verified a second time and waited in the queue (about 7.7 s).

**Expectation "0 failed answers with 5 sessions": not met.** Met for attestation only in run 5 (the queue held everything under the limit). In runs 4 and 6 one upstream 429 after 7 calls stopped all verifications for 60 s. In every run, no 429 reached a browser, the busy message appeared within 3.5 s (or after at most about 20 s of waiting), and no backup retry followed a busy verification.

**C and D:** the Stop scenario ran inside Privatemode's 60 s pause in runs 4 and 6, so the next message showed the busy message (fail closed) instead of verifying. In both runs the stop phase itself counted 1 chat and 2 of our verifications (manifest fetches), both refused as busy, so one extra verification around a Stop is still there; its cause is not established (the cache race fixed here is one candidate; a backup retry after the chat is another). The 10.5-minute refresh passed in every run: exactly one verification and one attest call after 10.5 minutes.

### Remaining limits

- **Today's allowance is the ceiling, not the queue.** One 429 makes Privatemode refuse for 60 s; during that minute every new verification gets the busy message. Five sessions starting together pass only when the organisation's allowance has not been used in the minutes before. Option A (a higher attestation limit from Privatemode) is still the real fix for growth.
- **Our own chat limit:** the relay allows 3 chats at once per server instance (`active >= 3` in `server/app.ts`). With 5 sessions sending at the same moment, 2 answers in run 5 were refused with "The protected service is limiting requests" (HTTP 429 from our relay, not from Privatemode). Each such refusal also discards the verified client (owner rule: re-verify after any failure), so the next message verifies again and adds to the attest demand (run 6). Owner decision needed: keep the client when our own relay refused the chat before anything reached Privatemode, and/or raise the 3-chat limit.
- **SDK refreshes inside a chat:** when Privatemode no longer knows a client's secret, the SDK refreshes it inside the chat, which costs one more attest call outside our verification. The live script now counts these (`sdkSecretRefresh`).
- **Fast mode:** a verification that waits the full 20 s leaves about 10 s of Fast mode's 30 s first-word limit; if an SDK refresh inside the chat also waits, the limit can expire, and the app then reports a time-out and may try the backup once (a time-out is still treated as model unavailability).
- **Multi-instance:** see the `shortcut:` note above.
