# Locked German held-out split

`heldout-de.json` was written once, on 12 November 2026, by `../write-heldout-de.ts` (German layouts only, all eleven categories, 720 samples, seed in the writer). Its SHA-256 is

`0258709ac23656fd4cfb524b7ebc6eaf37d8a15df858121cdea2161696877909`

and is pinned in `../evaluate-heldout-de.ts`.

Rules (as for `../heldout/`):

- Exactly one script reads this file: `evaluation/masking/evaluate-heldout-de.ts`. `tests/masking-benchmark.test.ts` fails if any other file refers to it.
- Nobody tunes the detector against it; misses are studied on the development split only.
- The evaluation runs once and refuses to run again while `../results/heldout-de.json` exists. Re-running it after a detector change burns the set for that change.
- All content is synthetic: invented names, addresses and numbers with valid check digits.
