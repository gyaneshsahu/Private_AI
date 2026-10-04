# First live synthetic conversation — bounded success

Reviewed user-supplied WSL result dated 2026-10-04T19:00:26.901Z,
run `synthetic_20261004_two_turns_usd2_retry1`. This is supplied evidence,
not an independently observed run on the reviewer’s machine. The accompanying
provider dashboard screenshot shows 2 model requests, 846 input tokens and
rounded 1.1K output tokens. It does not show an actual charged amount.

## Task review against the existing rubric

- Correctness: 3/3. First turn: EUR 95 subtotal, EUR 19 VAT, EUR 114 total.
  Second turn: EUR 90 subtotal, EUR 18 VAT, EUR 108 total, EUR 6 reduction.
  All arithmetic agrees with the synthetic source and user correction.
- Completeness: 3/3 for the textual task. Both answers show the arithmetic,
  amounts, VAT rule and source; the follow-up explains each change.
- Context preservation: 3/3. The response distinguishes the source’s original
  EUR 5 discount from the user’s EUR 10 correction and retains the VAT rule.
- No serious factual error found in this conversation. This is one development
  conversation, not held-out coverage, a family-level pass or comparative evidence.
- Source ID `7283fc55` exists and supports the cited original invoice facts.
  The model emitted `【7283fc55】` instead of the requested `[7283fc55]`.
  The current UI only links square-bracket citations. Source fidelity passes
  for this transcript; clickable citation usability is unresolved and needs repair.
  Markdown/LaTeX presentation was not evaluated in the product UI by this run.

## Transport and performance evidence

Both turns report verification of `inference.tinfoil.sh` with pinned digest
`ad95d02b2e27b3c1d5c327f2ee9616634f841e4b2ed5a48f404e4e9f595a4876`.
Both gateway attempts report encrypted response relay, valid protocol headers,
and absence of the synthetic plaintext canary. The client records complete
answers and usage, with no failure. These support successful operation of this
browser verification/encrypted transport adapter for this synthetic exchange;
header/canary observations alone are not a proof of confidentiality.

Turn durations are 4.2772 and 5.1805 seconds, including verification and response
completion. Time to first token and sustained reliability were not measured.
Two LOCAL `net::ERR_ABORTED` events remain unexplained. They did not prevent
recorded answer completion; do not silently reclassify them as harmless without
identifying the associated requests. No retry or additional charge is needed
merely to review this evidence.

Usage: 846 input and 1,070 output tokens. At user-transcribed rates of USD 0.15
and USD 0.60 per million tokens respectively, estimated total is USD 0.00076890
(0.07689 US cents). This is a token-based estimate, not a reconciled invoice;
additional fees and actual charged amount remain unverified.

## Decision

The two-turn synthetic functionality smoke test succeeds. Provider qualification
remains NOT_PASSED. No private user data is authorized. Downstream protected
processing, retention, freshness/revocation, negative tests and complete billing
still need qualification evidence. Quality coverage and customer demand remain
separate gates. Preserve previous failed-run evidence; its original cause was
not established. No further paid run is authorized by this review.

## Offline follow-up implementation

After reviewing this run, the answer renderer was updated to link both `[id]`
and `【id】` to existing supplied sources. Unknown IDs remain plain text and
model HTML is escaped. This fixes the observed format mismatch; it does not
validate the truth of a citation or add remote link fetching.

Future experiment reports identify each browser request by an ephemeral numeric
ID, fixed route label and relative timestamp. Relay response/finish events can
now be correlated with failures. No query strings, arbitrary hostnames, request
bodies or headers are added. The old two abort events remain unresolved:
SDK cancellation code is a possible mechanism, not evidence of their cause.
No events are suppressed or automatically graded as harmless.

A local synthetic-peer crypto regression uses the locked EHBP implementation
with real encryption/decryption. A valid response succeeds; ciphertext
modification, incomplete framing, a wrong nonce and a different request context
all fail. These are injected local faults, not live provider qualification,
remote attestation checks or proof of the full protected processing chain.
