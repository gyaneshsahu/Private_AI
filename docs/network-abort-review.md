# Recorded network aborts — bounded investigation

The user-supplied live result from `2026-10-04T19:00:26.901Z` contains two
`REQUEST_FAILED`, `LOCAL`, `net::ERR_ABORTED` entries. That report did not retain
request IDs, paths, event timestamps or response correlation. Both inference
attempts separately record encrypted response relay; both answers have explicit
completion and usage. Therefore:

- It is not possible to identify which local requests generated the aborts.
- The entries do not, by themselves, establish interrupted model output, an
  attestation failure, another billable attempt or an external disclosure.
- They must not be relabelled harmless or discarded merely because answers arrived.

## Offline investigation in this batch

A test-only reconstruction of the prior OpenAI 6.46.0 + EHBP 0.3.3 composition
was exercised with Chromium and a local encrypted synthetic peer. Attestation
was explicitly mocked; inference never left localhost. It returned a complete
answer and usage, and the identified relay request ended with `requestfinished`
(`FINISHED`), not an abort. The current adapter also finishes normally in its
positive case. SDK cancellation code exists, but it did not reproduce the
historical signature in this normal-completion test. Neither version's local
result proves the cause of the WSL observations. No repeated live test is warranted
just to chase an unidentifiable old event.

An independent reliability failure **was** reproduced while running two local
Vite browser fixtures concurrently: a module script failed to load before the
inference test began. Their dependency optimizer cache was shared despite
using different mock/plugin settings. Giving each fixture a separate cache
made the combined suite pass. The experiment runner now also uses its own
`.local/vite-experiment` cache rather than the app/preflight cache. This fixes
the observed concurrent-fixture collision; it is **not evidence** that the old
WSL aborts or its earlier 5.5-ms failure had that cause.

The original first attempt's cause remains unknown: it had no verification
record and no gateway inference attempt; its old report hid the exception.

## Evidence for the next compatibility check

The prepared one-request check records a Git commit/dirty flag and a SHA-256
fingerprint of adapter/runner sources and the lockfile. Browser events carry
numeric request IDs, fixed route labels and relative timestamps, including
relay HTTP response and terminal events. The gateway records its attempt before
forwarding. No prompt, key, raw URL, headers or arbitrary error message is added
to network diagnostics. Synthetic answer text stays in the local experiment
result for task review.

Acceptance: complete answer, valid usage, matching verification, one relay
attempt, and an identifiable relay terminal event. A relay failure, missing
terminal event, missing usage, verification mismatch or truncated answer blocks
live-compatibility acceptance pending review. No automatic retry. The original
unknown events stay in historical evidence regardless of a later result.
