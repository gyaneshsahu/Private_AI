# Privatemode attestation limit: a capacity decision for the alpha (12 November 2026)

**Status: finding measured; decision needed from the owner.**

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
