# Processor record: Privatemode (Edgeless Systems GmbH) — DRAFT, 12 November 2026

**Status: draft by the agent, needs owner approval (with D16).** This is the processor entry for activity 2 ("Chat answers") of the record of processing (`docs/art30-record-draft-20261112.md`) now that Privatemode is the primary provider for the alpha (owner decision, 12 November). It uses only what the repository records; every fact names its source, "owner-reported" marks what the owner relayed and the agent could not check, and **unknown** marks what no document read answers. It is not legal advice and not published.

## Parties

| Role | Who | Source |
| --- | --- | --- |
| Controller | Ganesh Sahu, individual, Germany (address in the imprint); privacy contact privacy@cometrow.com | `docs/art30-record-draft-20261112.md` |
| Processor | Edgeless Systems GmbH, Bochum, Germany, operating the Privatemode service | `shared/provider-disclosure.ts` (DPA of 24 July 2026) |
| Processor contact | hello@privatemode.ai (general); the 12 November answer came from the Privatemode team (owner-reported) | `docs/privatemode-master-notes.md` §1; `docs/supplier-privatemode-20261112.md` |
| Sub-processors | Scaleway (France) and Lyceum (Germany), which run the confidential-computing infrastructure | Privatemode DPA of 24 July 2026, sections 9 and 10, as cited in `shared/provider-disclosure.ts` |

Other sub-processors (for example for the Privatemode portal, billing or support) are **unknown**: the DPA sections read name only the two infrastructure providers. The portal's sign-in uses Clerk session tokens (JWT probe, 11 November); the portal holds only the controller's own account, not user data.

## What is processed

| Item | Detail | Source |
| --- | --- | --- |
| Purpose | Answering the user's chat question (inference) on the controller's instructions; no other use | DPA §2 purpose limitation, as cited in `docs/provider-promises-20261112.md` |
| Data subjects | CometRow users, and anyone they write about | art30 draft, activity 2 |
| Content | The question, selected files and included earlier messages, after identifiers are masked on the device; encrypted in the browser to the attested server. Neither CometRow's relay nor Edgeless's operators can read it in transit | `shared/privacy-copy.ts`; live test of 12 November (no plaintext at the relay) |
| Special categories | Possible (health questions). The DPA allows special-category data on the controller's Art. 9(2) basis | DPA §2(5), as cited in `docs/provider-qualification-20261026.md`; consent step drafted (D2) |
| Metadata at Edgeless | IP address (CometRow's server, never the user's: all calls go through our relay), timestamp, API key, token usage | Privatemode FAQ Q5 (`docs/privatemode-master-notes.md` §7) |
| Pseudonymous cache key | A per-account `cache_salt`, derived on our server (HMAC of the account ID with a server secret); it isolates each account's prompt cache and does not name the account | `server/app.ts`; Privatemode FAQ Q7 and email of 12 November |
| Not shared | User email, account ID, name and sign-in data never reach Edgeless; users never receive a Privatemode key or account | `server/providers/privatemode-relay.ts` (only routing headers forwarded; tested); email of 12 November |

## Location and transfers

Processing only in the EU and the European Economic Area (DPA section 10). No transfer to a third country is documented. Source: `shared/provider-disclosure.ts`.

## Retention

| Data | Retention | Source |
| --- | --- | --- |
| Prompts and responses | Not stored after inference completes | DPA §11; FAQ Q5 |
| Prompt cache in worker memory | Transient, keyed by the secret salt; no promised maximum time and no delete control | FAQ Q7; `docs/provider-qualification.md` (cache isolation does not erase entries) |
| Metadata (IP, time, key, token usage) | Up to 90 days | FAQ Q5 |
| Token usage per API key | Permanently, for billing. CometRow uses one key for all users, so these records are per CometRow, not per user | FAQ Q5; Stage 3 plan |

## Technical and organisational measures

At Edgeless (as documented by the supplier, not audited by us):
- Confidential computing: AMD SEV-SNP and Intel TDX confidential VMs (both in the live manifest's reference values, 11 and 12 November); NVIDIA GPUs whose attestation Privatemode checks on its side before keys are released (attestation overview).
- End-to-end encryption from the client to the attested workers; AES for data in use and the hybrid post-quantum key exchange X25519MLKEM768 in transit (FAQ Q8).
- Certifications: ISO 27001 and a BSI C5 attestation, no SOC 2 (P7 in `docs/provider-qualification-20261026.md`). Audit reports are available to Enterprise customers (wording **unclear**; open question in the master notes).

At CometRow (built and tested in this branch):
- The browser verifies the deployment against a manifest the controller approved (SHA-256 in the report), with a pinned Wasm hash; a changed deployment stops before anything is sent (live tests of 12 November).
- The API key stays on our server; the browser holds a placeholder. Only routing headers reach Edgeless.
- Every call (attestation, key exchange, chat) passes session, CSRF, invite gate, request limits and the operator stop switch; chat also the allowance, the spending ceiling and one request per account.
- Per-account cache salt; exact model IDs only; NVIDIA OCSP set to refuse unknown statuses with no grace period.

## The §2.4 confirmation

Owner-reported (Privatemode team email, 12 November; `docs/supplier-privatemode-20261112.md`): using the organisation's API key on CometRow's own server to serve CometRow users, who never receive the key or a Privatemode account, is covered by the standard terms; §2.4 forbids passing keys to third parties. Our design keeps the key on the server (tested). For apps serving end users, Privatemode recommends the Enterprise plan.

## Still missing (owner actions, in order)

1. **File the email** of 12 November (the §2.4 confirmation) with the contract records; the agent has only the owner's summary.
2. **DPA in force:** confirm how the Privatemode DPA (version of 24 July 2026) was concluded for the CometRow organisation (accepted with the terms at sign-up, or to be signed). Download and file the accepted version with its date. **Unknown** today.
3. **Enterprise agreement:** decide whether to book the call Privatemode offered (https://www.privatemode.ai/book-a-meeting) before inviting users beyond the alpha; it is their recommended starting point for apps serving end users.
4. **Sub-processor changes:** find out how Edgeless announces sub-processor changes and the objection period (**unknown**), and subscribe.
5. **Notice periods:** model deprecations are announced in the changelog and a deprecated exact ID may route to its successor during the window (email of 12 November); the length of the window and the notice for manifest rotations are **unknown**. Weekly checks: changelog, `scripts/privatemode-manifest.ts --check`, `scripts/provider-terms-check.mjs`.
6. **Open supplier questions** carried from the master notes: the DPA's "attestation prior to each processing operation" against the documented flow, and the DPA naming SEV-SNP only while the deployment also uses TDX and GPUs.
7. **Record of processing:** update activity 2 in `docs/art30-record-draft-20261112.md` to name Edgeless as the processor in use and Tinfoil as the standby (D16), and the privacy policy's provider section (D8, D10).
