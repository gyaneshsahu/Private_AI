# Independent masking check

A second measurement of `src/identifier-masking.ts` on documents that the benchmark generator did not produce. The owner asked for it on 23 October 2026: "add an independent check on documents not produced by the same generator, and tell me whether names and addresses are measured".

## What is independent and what is not

- The 54 documents in `documents.ts` and `documents-2.ts` were written by hand as literal text: no seeded values, no layout templates, no noise model. Nothing in this folder imports `../values.ts`, `../doc.ts`, `../layouts.ts` or `../corpus.ts`; `tests/masking-independent.test.ts` fails if it does, and also fails if any identifier value here (other than a date) appears in the development split.
- Check digits come from `check-digits.ts`, written for this folder (IBAN mod-97, Luhn, ISO 7064 for the tax ID and VAT ID, health and pension insurance numbers, ICAO machine-readable zone).
- The scorer is shared on purpose: `evaluate-independent.ts` uses `../score.ts` unchanged, so recall, precision and Wilson intervals mean the same as in the benchmark.
- Not independent: the documents were written by one model, the same model family that built the generator and tuned the detector, so blind spots may be shared. Everything is still synthetic; no real document was used.

## Ground truth

Same rules as `../README.md`, with these additions: birth dates also count when the label follows the date ("ist am 17.4.58 geboren"), when written with an ordinal ("15th of February 1977"), when typed into one-character boxes, and when OCR has moved the value away from its label. A truncated IBAN typed by a customer counts (variant `truncated-invalid`, unrecoverable by design). Names and addresses are recorded as `notCovered`: they are never ground truth, never misses, and are counted only to show how many stay in clear text and how many a detection touched.

Markup in the documents: `⟦KIND|value⟧` or `⟦KIND~variant|value⟧`, with codes IBAN, CARD, TAX, INS, IDN, MAIL, TEL, DOB (promised kinds) and NAME, ADDR (not covered). `build.ts` removes it and records exact spans.

## Use

This is a measurement set, not a tuning set. Do not change the detector to fit these documents; a fix should be described in the generator's own terms and measured here afterwards, or this set loses its independence and a new one must be written.

```
npx vitest run tests/masking-independent.test.ts
WRITE_INDEPENDENT_RESULTS=1 npx vitest run tests/masking-independent.test.ts   # rewrite ../results/independent.json
```
