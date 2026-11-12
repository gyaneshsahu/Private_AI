# Provider parity matrix: Tinfoil and Privatemode — 12 November 2026 (overnight task 1)

**Method.** Every provider-neutral check that so far ran live on Tinfoil only was rerun, where it is meaningful, on Privatemode **through our relay in a real browser** (Privatemode adapter, approved manifest by SHA-256, placeholder key in the browser), and on Tinfoil over plain TLS. Both sides use the app's own stream code (`completionEvents` + `consumeReply`), so differences come from the provider, not the harness. One repetition of the nine frozen stage-1 cases (two turns each) plus stop, cut-off and long-conversation cases. Synthetic data only. Harness: `evaluation/privatemode/parity.ts` on the local branch `privatemode-parity` (commit `853193d`, not pushed, like `privatemode-eval`). Privatemode on the free quota; Tinfoil about 19,400 tokens, about USD 0.005 (bounded at USD 0.0099).

## Which live checks ran where

| Check | Tinfoil | Privatemode before tonight | Tonight |
| --- | --- | --- | --- |
| Stage-1 nine cases (arithmetic, open question, coding, placeholders, citation, attachments in 05/06/09, safety 07) | SDK-free TLS, 3 reps (11 Nov) | SDK in Node, 3 reps (11 Nov) | both, 1 rep, **Privatemode through the relay and browser** |
| Stop mid-reply, next request works | app T6 (12 Nov) | never | both |
| Cut-off reply at the output limit | app T6 | never | both |
| Long conversation (recall after 24 turns) | never | never | both |
| Wrong deployment refused, nothing sent | app T6 (wrong digest) | browser spike (wrong manifest, swapped manifest) | not rerun (already covered on both) |
| Arithmetic gates v1–v3 (frozen sets) | 3 runs, all failed the verified bar | never | **not run**: the held-out sets are spent and the gate is parked; stage-1 case 03 is the arithmetic check here |
| Research and assisted runs (October) | Tinfoil only | never | not run (product experiments, large; not needed for the provider choice) |
| Attestation CLI smoke | Tinfoil-specific | — | not applicable |
| Masking, remote-content canary | provider-independent (on the device or stubbed) | — | not needed |

## Results (one repetition; a bar is met when the case passed)

| Case | Tinfoil gpt-oss-120b | Privatemode gpt-oss-120b | Privatemode glm-5.3-flash |
| --- | --- | --- | --- |
| Arithmetic (case 03) | met | met | met |
| Open question (case 05, attachment) | **not met** | **not met** | met |
| Coding (case 04, code runs) | met | met | met |
| Placeholders kept (case 08) | met | met | met |
| Citation format (case 09, attachment) | met | **not met** | met |
| Errors in 18 turns | 0 | 0 | 0 |
| Time to first token, median / max | 543 / 909 ms | 578 / 1,977 ms | 558 / 1,672 ms |
| Whole reply, median | 955 ms | 1,232 ms | 1,787 ms |
| Stop after 200 characters | stopped, next request works | same | same |
| Cut-off at 16 tokens | "reached its output limit" | same | same |
| Long conversation (2,536 characters, fact from turn 1) | recalled | recalled | recalled |

Safety case 07 replies are in `.local/parity-20261112/` (local, not committed) for the owner's grade, next to the 11 November ones.

## What differs

1. **No protocol difference.** Privatemode's decrypted stream passes the app's parser unchanged: usage at the end, finish reasons, output-limit and stop handling all behave the same. Nothing in the app's stream code is provider-specific.
2. **Quality matches the 11 November screen.** GLM-5.3-Flash meets every automatic bar again; both gpt-oss arms miss the open question; Privatemode's gpt-oss also missed citation format. One repetition is weak evidence; it agrees with the three-repetition screen.
3. **Speed.** Tinfoil is faster end to end (median 955 ms against 1.2 to 1.8 s); first-token times are similar. The 60-second outlier seen on Privatemode on 11 November did not recur.
4. **Metering.** On Tinfoil the relay reads token usage from the trailer; on Privatemode usage is inside the encrypted reply, so the relay can only count requests (Stage 3 plan, spend section).
5. **Bug found on the way, fixed.** The spike relay crashed the whole server when a browser disconnected mid-reply (unhandled abort from `pipe`). Fixed on `privatemode-parity` with a test that fails without the fix. It must be carried into Stage 3 if Privatemode wins.
