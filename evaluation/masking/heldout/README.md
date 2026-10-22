# Locked held-out split

`heldout.json` was written once, on 23 October 2026, by `../write-heldout.ts`, before any change to `src/identifier-masking.ts` in this benchmark phase. Its SHA-256 is

`8848cf4ed9578a6f6e8e8604bcbb68a411c85c98114fd33da3c300044b3c3f17`

and is pinned in `../evaluate-heldout.ts`.

Rules:

- Exactly one script reads this file: `evaluation/masking/evaluate-heldout.ts`. No test, no tuning step, no other script reads it. `tests/masking-benchmark.test.ts` fails if any other file under `src`, `tests`, `evaluation`, `scripts`, `server` or `shared` refers to it.
- Nobody tunes the detector against it. Look at misses on the development split (`../dev/dev.json`) only.
- `evaluate-heldout.ts` is run once, after tuning is finished. It refuses to run again while `../results/heldout.json` exists. If it is ever re-run after a detector change, the held-out set is burnt for that change and the ledger must say so; the new numbers are then development numbers, not held-out numbers.
- `write-heldout.ts` refuses to overwrite this file. A new held-out split needs a new seed, a new hash and a new ledger entry.
- All content is synthetic: invented names, addresses and numbers with valid check digits. No real personal data.
