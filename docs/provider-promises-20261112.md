# What we promise about the provider, and where each promise comes from — 12 November 2026 (checklist B19, B20)

Rule (B19): CometRow's copy never promises more about the AI provider than the provider's own terms or written statements. Every provider claim in our text is listed here with its source. Rule (B20): the sources are checked weekly with `node scripts/provider-terms-check.mjs` (baseline `docs/provider-terms-baseline.json`, recorded 12 November); any change means re-reading the page and this table before the next release.

## Claims in the approved privacy statement (`shared/privacy-copy.ts`)

| Our claim | Section | Source | Holds for Tinfoil | Holds for Privatemode |
| --- | --- | --- | --- | --- |
| The company "states that it does not keep your question or answer after the reply is sent" | What the secure server keeps | Tinfoil Terms §2 ("not retained after the response is returned"); Privatemode DPA §11 and FAQ (no persistent storage of prompts and responses) | yes | yes |
| "does not use them to train any AI" | same | Tinfoil DPA Annex I.A; Privatemode DPA §2 (purpose limited to providing the service) | yes | yes (purpose limitation; no explicit training sentence read) |
| Short-term working memory "usually within minutes, sometimes hours", "no button", "no promised maximum", "the company has said it does not plan to add one" | same | Tinfoil prompt-caching docs and Tinfoil email of 22 October | yes | **no**: Privatemode documents a per-salt prompt cache; the "said it does not plan" sentence is Tinfoil's email |
| Records of "time, model and token counts, without content", kept "90 days, longer for accounting records" | same | Tinfoil email of 22 October | yes | **partly**: Privatemode FAQ says up to 90 days and token usage per key **permanently** for billing |
| "spending limits on the secure server are soft" | Spending and limits | Tinfoil pricing page | yes | **no**: Privatemode has per-key limits set in its portal; wording would change |
| The company "says it is a sealed computer with a protected graphics processor" (attributed to the company; "your browser does not check the graphics processor") | What is sealed and sent | Tinfoil docs, Containers overview: "GPU workloads run inside NVIDIA confidential-computing enclaves with the same attestation"; Tinfoil JS SDK docs (the browser verifier checks AMD SEV-SNP only, no TDX or GPU) | yes | not checked (wording proposed 12 November, privacy-wording-20261112; owner approval pending) |
| The browser check "is partial today … the company has given no date for a fuller browser check" | What is sealed and sent | Tinfoil JS SDK docs and email of 22 October | yes | **no**: different gaps (SNP and TDX checked in the client, GPU server-side) |

## Claims in the drafts

| Draft | Claims | Source |
| --- | --- | --- |
| Provider section (`shared/provider-disclosure.ts`) | Tinfoil: US processing, SCCs, 90-day metadata. Privatemode: EU/EEA only, Scaleway and Lyceum, 90 days and permanent per-account token counts | Listed per entry in the file (DPA sections, email, FAQ) |
| Health consent (`shared/health-consent.ts`) | "sent, locked, to the secure server of our AI provider"; identifiers replaced, health details not | Our own design (no provider claim) |

## Result

The approved privacy statement is accurate for **Tinfoil**. If Privatemode is chosen, four sentences must change before chat goes on (owner decision D17). No claim was found that goes beyond the source for the current provider.
