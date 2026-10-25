# Identifier-masking benchmark

Measures `src/identifier-masking.ts` (browser-side assisted redaction) on synthetic documents shaped like what people paste or attach. Everything here is synthetic and deterministic; there are no network calls, no model calls and no real personal data.

## Files

- `values.ts`: seeded generators. IBANs (mod-97), card numbers (Luhn), German tax IDs (ISO 7064 MOD 11,10), VAT IDs, Steuernummern in six regional formats, pension insurance numbers (with check digit), health insurance numbers (with check digit), passport and identity-card numbers, phone numbers, emails, birth dates, plus decoys (customer, invoice, order, reference, tracking, EAN, case and clinic numbers, amounts, dates).
- `doc.ts`, `layouts.ts`: 46 layouts in ten categories (invoice, tax letter, contract, CV, medical letter, bank statement, email, chat, form, table), German and English, plus identity-card and passport scans for the OCR category.
- `corpus.ts`: builds a split, applies the PDF wrap model (one space inside an identifier becomes a line break, 10 % of identifiers in PDF-like layouts), the invisible-character model (zero-width or soft hyphen inside 30 % of identifiers in HTML-copied email) and the OCR noise model (below), and records exact ground-truth spans.
- `score.ts`: matching rules, Wilson 95 % intervals, tables.
- `generate-dev.ts` writes `dev/dev.json`; `evaluate-dev.ts [label]` writes `results/dev-<label>.json`.
- `write-heldout.ts` and `evaluate-heldout.ts`: see `heldout/README.md`. The held-out split is read by `evaluate-heldout.ts` only.
- `independent/`: a separate, hand-written corpus that shares nothing with this generator, scored with `score.ts`; see `independent/README.md` and `results/independent.json`.
- `score-openpii.ts`: one-off third-party check (plan M1.3) on the EMAIL, TELEPHONENUM and CREDITCARDNUMBER spans of German and English rows of OpenPII 1M (Ai4Privacy / Ai Suisse SA, CC-BY-4.0, https://huggingface.co/datasets/ai4privacy/pii-masking-openpii-1m), streamed on stdin and never stored; counts only in `results/openpii-validation.json`.
- `tests/masking-benchmark.test.ts`: regenerates the development split byte for byte, checks ground-truth check digits, and pins `results/dev-current.json`.

## Ground truth

Spans are recorded for every value of a kind the product promises to mask (`IDENTIFIER_KINDS`: IBAN, CARD, TAX-ID, INSURANCE, ID-NUMBER, EMAIL, PHONE, BIRTH-DATE), whoever it belongs to: a company's IBAN or phone number and a sole trader's VAT ID count, because the detector works by pattern and the promise is per kind. TAX-ID covers the 11-digit tax ID, Steuernummer and German VAT ID; INSURANCE covers the pension insurance number and the health insurance number; ID-NUMBER covers German passport and identity-card numbers and UK and Austrian passport numbers, including the copies in the machine-readable zone of a scanned document. Birth dates count wherever a person would read them as a birth date (labelled on the same line, on the line above, by a table header, or by `*`).

Names and addresses are recorded separately as `notCovered`. They are not promised, are not counted as misses, and the result files report how many were left in clear text. Card numbers shown only as the last four digits are not ground truth.

## Matching

An identifier is caught when every letter and digit of its span is inside some detection of any kind (masking under the wrong label still hides it; `kindCorrect` counts the right-label subset). Partly covered identifiers are misses. A detection that overlaps no ground-truth identifier is a false positive.

## OCR noise model and its limits

Applied to the scan category only, at three levels (clean 40 %, medium 40 %, poor 20 % of documents): umlauts folded as an English-only OCR model returns them; character confusions inside identifiers (0/O/o/D, 1/l/I/|, 5/S, 8/B, 2/Z, 6/b, and the reverse for letters) at 0.36 %, 1.2 % and 3 % per confusable character; dropped spaces; a stray space inside an identifier; `.` read as `,` and `/` read as `l`, `1` or `|`; `@` misread; `m` read as `rn` and lost colons in labels; machine-readable-zone `<` misread; lines broken at a random width between 30 and 80 characters; and in label/value blocks, a 25 % chance that the label column is read before the value column. The rates are invented, not calibrated against measured tesseract output on real scans. Not modelled: skew, blur, handwriting, stamps, low contrast, multi-column reading-order errors beyond the column swap, characters lost entirely, merged lines, and anything specific to photos of screens.

## Re-running

```
npx tsx evaluation/masking/generate-dev.ts
npx tsx evaluation/masking/evaluate-dev.ts current
npx vitest run tests/masking-benchmark.test.ts
```
