# Privatemode attestation limit: a capacity decision for the alpha (12 November 2026)

**Status: finding measured; owner accepted option B ("Option 1", 12 November); built on branch `privatemode-session-verify` (see "Built" below). Option A (higher limit) is still open.**

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
