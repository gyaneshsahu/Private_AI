# Privacy and failure-handling batch — 4 October 2026

## Implemented behavior

The locked OpenAI SDK streaming implementation logs raw SSE data on some JSON
parse failures (`openai/core/streaming.mjs`, normal error logger and a direct
console path for named thread events). A malformed decrypted response could
therefore enter the browser console. The PrivateAI inference path now constructs
its fixed chat request directly through the same EHBP transport and parses the
chat SSE protocol in `src/completion-events.ts`. It does not invoke OpenAI's
runtime client or stream parser. The dependency is retained for types and the
Tinfoil dependency graph; this change is not a claim that all SDK code was removed.

The parser supports LF/CRLF frames, split UTF-8, comments, multi-line data and
usage frames. It bounds each frame to 256 Ki characters, requires the `[DONE]`
marker and an explicit text `stop` completion, and rejects malformed JSON,
unsupported named events, post-completion data, tools and inconsistent or
repeated usage. It produces fixed error messages without logging frame content.
Silent EOF does not make a partial answer complete. Received usage is retained
when later stream validation fails; it is not proof of final billing.

A 90-second deadline and cancellation stop the caller waiting on verification,
key setup and streaming. The SDK's attestation method has no signal parameter:
its underlying public lookup/verification work can continue after the caller
stops waiting. No conversation is supplied to that lookup, and cancellation
prevents subsequent inference. No TLS/attestation bypass, automatic retry,
release expansion or provider switch was introduced.

Experiment reports now print a compact, content-free summary. The deliberately
blocked diagnostic request is labelled `DIAGNOSTIC_REACHED_INFERENCE_BOUNDARY`
when matching verification evidence exists and no forward was recorded. A
completed paid run still says `TWO_TURNS_RETURNED_REVIEW_REQUIRED`, never
qualified or quality-passed. Token estimates use Decimal arithmetic and the
recorded permit rates. Actual charge stays unknown. Historical review does not
refresh, modify or consume an approval.

## Evidence and its limits

| Check | Evidence | Limit |
| --- | --- | --- |
| Browser request encryption and response decryption | Real browser EHBP against a local synthetic peer; plaintext canary absent from relayed body; decrypted request inspected by test peer | Attestation mocked explicitly; no live provider or hardware assurance |
| Verification/permission rejection | Wrong host, verifier error, false verification, unapproved release and expired permission each send zero inference requests | Injected fixtures, not provider revocation or release-rotation tests |
| Cancellation | Pre-cancelled request, stalled verification and cancellation during response all stop; no request for pre-send cancellation | Public SDK work may continue internally as described above |
| Response failures | Tampered ciphertext, missing nonce, HTTP failure, malformed JSON, unexpected named event and truncation fail without retry | Does not establish provider reliability or billing behavior on failure |
| Conversation state | Every failed reply remains partial and excluded from subsequent context; usage retained on truncation | Test conversation, not broad answer-quality evaluation |
| Diagnostic privacy | Request/response/error canaries absent from browser console; summarizer omits transcript and raw errors | Does not prove OS memory erasure or provider-side retention |
| Normal transport closure | Local successful encrypted request completes with a browser `requestfinished` event and no recorded relay failure | Historical WSL `ERR_ABORTED` events remain unexplained |

The browser test covers 15 scenarios in one regression test. The parser and
report tests provide additional protocol, accounting and redaction coverage.
All external requests are blocked in the browser fixture. Local mocks do not
establish live capability.

## Readiness decision and remaining gates

The earlier two-turn WSL success applies to the previous adapter version. The
revised parser/adapter passes local tests but still needs a future synthetic live
compatibility check before its live-streaming evidence can be considered current.
No new paid experiment was run or authorized by this batch. No private user data
is approved, and no operational qualification file was generated.

Provider qualification remains NOT_PASSED: full protected downstream processing,
retention/egress behavior, attestation freshness/revocation and reconciled billing
remain open. Broader held-out quality comparison and customer demand are separate
questions. None is established by these regressions.
