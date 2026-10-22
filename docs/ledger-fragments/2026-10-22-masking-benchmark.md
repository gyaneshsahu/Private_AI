## 22–23 October 2026 - Masking benchmark: synthetic corpus, locked held-out split, detector tuning

Status: benchmark and detector changes committed on the sub-agent branch only; not merged, not pushed. Gates stay closed. Product wording stays "assisted redaction with review". Every number below is measured by the sub-agent on SYNTHETIC documents from one generator written for this purpose; none is a measurement on real user documents and none may be quoted as product accuracy.

Evidence (verified locally by the sub-agent): `npx tsc --noEmit` clean; `npx vitest run tests/masking-benchmark.test.ts tests/identifier-masking.test.ts tests/identifier-masking-documents.test.ts tests/research-query-masking.test.ts` 37 passed; the dependent mock-only transport tests `tests/context-coverage.test.ts tests/calculation-continuation-transport.test.ts tests/assisted-structured-transport.test.ts` 22 passed. No Playwright, Docker, PostgreSQL, ingress, server, network or model call.

### What was built

- `evaluation/masking/`: seeded generator (`values.ts`, `doc.ts`, `layouts.ts`, `corpus.ts`), scoring with Wilson 95 % intervals (`score.ts`), `generate-dev.ts`, `evaluate-dev.ts`, `write-heldout.ts`, `evaluate-heldout.ts`, READMEs. 46 layouts (44 in ten document categories plus identity-card and passport scans), German and English (495 and 225 documents per split).
- Identifiers carry valid check digits where the real ones do (IBAN mod-97, card Luhn, tax ID and VAT ID ISO 7064, pension and health insurance numbers, machine-readable-zone check digits). People, companies, addresses and numbers are invented; landline numbers use the Bundesnetzagentur and Ofcom fiction ranges; email domains are reserved example domains. No public dataset was used.
- Ground truth: every value of a promised kind (IBAN, CARD, TAX-ID, INSURANCE, ID-NUMBER, EMAIL, PHONE, BIRTH-DATE), whoever owns it. Names (1,581 spans in dev) and addresses (435) are recorded as "not covered" and are never counted as misses.
- Scoring: an identifier is caught only if every letter and digit in it is masked (any label); partly masked counts as missed. A detection overlapping no identifier is a false positive.
- Splits, 720 documents each: 60 per category, 120 for scans. Development split `evaluation/masking/dev/dev.json`, SHA-256 `7671578cd5c71de6503ab7803e51a80fb79293146af91adceb1726e40f01117a`, used for all tuning. Held-out split `evaluation/masking/heldout/heldout.json`, SHA-256 `8848cf4ed9578a6f6e8e8604bcbb68a411c85c98114fd33da3c300044b3c3f17`, written once before any detector change (commit `81489d3`), read only by `evaluate-heldout.ts` (enforced by a test that fails if any other file refers to it), evaluated once after tuning was committed (`1b54ee1`). It was not tuned against and was not re-run. It is now used: the next tuning round needs a new held-out split.

### Development split, before and after tuning

| Category | Identifiers | Recall before (95 % CI) | Precision before (FP) | Recall after (95 % CI) | Precision after (FP) | Missed after |
| --- | --- | --- | --- | --- | --- | --- |
| invoice | 273 | 82.4 % (77.5–86.5) | 94.9 % (12) | 100.0 % (98.6–100) | 100.0 % (0) | 0 |
| tax-letter | 276 | 85.5 % (80.9–89.2) | 97.9 % (5) | 100.0 % (98.6–100) | 100.0 % (0) | 0 |
| contract | 360 | 91.4 % (88.0–93.9) | 100.0 % (0) | 100.0 % (98.9–100) | 100.0 % (0) | 0 |
| cv | 180 | 80.6 % (74.2–85.7) | 100.0 % (0) | 100.0 % (97.9–100) | 100.0 % (0) | 0 |
| medical-letter | 225 | 60.9 % (54.4–67.0) | 95.8 % (6) | 100.0 % (98.3–100) | 100.0 % (0) | 0 |
| bank-statement | 209 | 97.1 % (93.9–98.7) | 95.8 % (9) | 100.0 % (98.2–100) | 100.0 % (0) | 0 |
| email | 308 | 84.7 % (80.3–88.3) | 98.1 % (5) | 100.0 % (98.8–100) | 100.0 % (0) | 0 |
| chat | 217 | 80.7 % (74.9–85.4) | 99.4 % (1) | 100.0 % (98.3–100) | 100.0 % (0) | 0 |
| form | 240 | 87.1 % (82.3–90.8) | 98.1 % (4) | 100.0 % (98.4–100) | 100.0 % (0) | 0 |
| table | 839 | 56.4 % (53.0–59.7) | 94.8 % (26) | 99.6 % (99.0–99.9) | 100.0 % (0) | 3 |
| scan-ocr | 637 | 64.7 % (60.9–68.3) | 97.5 % (11) | 90.3 % (87.7–92.3) | 100.0 % (0) | 62 |
| **overall** | 3,764 | 74.5 % (73.1–75.9) | 97.3 % (79) | 98.3 % (97.8–98.6) | 100.0 % (0) | 65 |

| Kind (dev) | Identifiers | Recall before | Recall after | Detections before / FP | Detections after / FP |
| --- | --- | --- | --- | --- | --- |
| IBAN | 648 | 94.9 % | 99.4 % | 615 / 0 | 644 / 0 |
| CARD | 45 | 97.8 % | 97.8 % | 61 / 7 | 44 / 0 |
| TAX-ID | 422 | 82.0 % | 98.8 % | 336 / 0 | 414 / 0 |
| INSURANCE | 400 | 40.3 % | 98.0 % | 161 / 0 | 392 / 0 |
| ID-NUMBER | 279 | 34.4 % | 98.2 % | 96 / 0 | 279 / 0 |
| EMAIL | 610 | 92.1 % | 98.2 % | 567 / 0 | 602 / 0 |
| PHONE | 791 | 95.7 % | 98.6 % | 839 / 72 | 786 / 0 |
| BIRTH-DATE | 569 | 39.4 % | 96.5 % | 223 / 0 | 538 / 0 |

Baseline gaps the benchmark exposed: health insurance numbers were not detected at all (the most common identifier on medical letters); birth dates were caught only with a label on the same line and a numeric date; passport numbers only with a same-line label and both letters and digits (UK passports are nine digits); VAT IDs and two Steuernummer forms were not detected; phones fired on customer, staff, case and reference numbers with a leading zero (72 false positives); cards fired on order numbers and EAN barcodes that happen to pass Luhn.

### Detector changes (`src/identifier-masking.ts`, tuned on dev only)

IBAN: lower case, one or two spaces between groups, country code before a line break, `IBAN` glued to the number, and letter-for-digit OCR slips repaired only for countries whose IBAN is all digits and only if the check digits then pass; a failed candidate no longer swallows a real IBAN later on the line (bug found by the benchmark: "will be paid to IBAN DE…" was missed). The guard that stops a phone being reported inside a rejected IBAN now applies only to real IBAN country codes (bug: "Steuer-ID⏎<number>⏎Telefon⏎0179/…" hid the phone). CARD: known issuer prefix and length plus card-like grouping, or any grouping next to a card label. TAX-ID: 11-digit tax ID in any grouping, German VAT ID with check digit, `12345/67890`, OCR `l`/`|` separators, and 10–13 digit numbers after a Steuernummer label. INSURANCE: health insurance number with check digit (O/l/S/B repaired); pension number across a line break. ID-NUMBER: machine-readable-zone lines; label on the previous line, in a table column header or in an OCR label block; nine-digit and all-letter German document numbers under a label. BIRTH-DATE: German and English month names, two-digit years and `,` separators when labelled, the CV `*`, label on the previous line (including a question such as "date of birth?"), column header, label block; in a table row only the column header counts. EMAIL: `(at)`, `[at]`, `(dot)`, `©`, comma read for a dot. PHONE: a line break after a short area code or before a short last group; trailing groups that ran into a following number are dropped; rejected after a non-phone label (customer number, staff number, case, reference, mandate, order) or under such a column header; `00` must be followed by a country code, a national number must not start `00`, `+` must be followed by a non-zero digit.

Existing tests: all kept green. Five of the nine "known miss" cases in `tests/identifier-masking-documents.test.ts` are now caught and were rewritten to assert the new behaviour (country code before a line break, passport label on the previous line, birth-date label two lines above, both OCR IBANs); two new known misses added: a wrong digit cannot be repaired, and the table-header gap found by the held-out run (recorded after that run, detector unchanged). New unit cases cover each rule above and the two bugs, plus precision negatives.

Independent precision probe (not part of the corpus): over the repository's own `docs/*.md`, `README.md` and `CLAUDE_HANDOFF.md` (66 files, 1.57 M characters) the new detector reports 26 detections, all email-shaped strings (one inside a database URL); the old detector reported the same 26 plus 3 false positives (two `+0.01…` amounts as phones, one 13-digit file-name timestamp as a card). Over the 31 evaluation case fixtures (365 k characters) both report nothing. This probe caught two regressions before commit (a space before `@` turned "pinned @zip.js" into an email; `+` after a letter turned "+0.0163552" into a phone); both were removed.

### Held-out split, headline (run once, 23 October, after `1b54ee1`)

| Category | Documents | Identifiers | Caught | Missed (partial) | Detections | FP | Recall (95 % CI) | Precision (95 % CI) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| invoice | 60 | 272 | 271 | 1 (0) | 271 | 0 | 99.6 % (98.0–99.9) | 100.0 % (98.6–100) |
| tax-letter | 60 | 276 | 276 | 0 | 276 | 0 | 100.0 % (98.6–100) | 100.0 % (98.6–100) |
| contract | 60 | 360 | 360 | 0 | 360 | 0 | 100.0 % (98.9–100) | 100.0 % (98.9–100) |
| cv | 60 | 180 | 180 | 0 | 180 | 0 | 100.0 % (97.9–100) | 100.0 % (97.9–100) |
| medical-letter | 60 | 225 | 225 | 0 | 225 | 0 | 100.0 % (98.3–100) | 100.0 % (98.3–100) |
| bank-statement | 60 | 203 | 203 | 0 | 203 | 0 | 100.0 % (98.1–100) | 100.0 % (98.1–100) |
| email | 60 | 308 | 308 | 0 | 308 | 0 | 100.0 % (98.8–100) | 100.0 % (98.8–100) |
| chat | 60 | 210 | 210 | 0 | 210 | 0 | 100.0 % (98.2–100) | 100.0 % (98.2–100) |
| form | 60 | 240 | 240 | 0 | 240 | 0 | 100.0 % (98.4–100) | 100.0 % (98.4–100) |
| table | 60 | 847 | 844 | 3 (0) | 844 | 0 | 99.7 % (99.0–99.9) | 100.0 % (99.6–100) |
| scan-ocr | 120 | 653 | 590 | 63 (5) | 593 | 2 | 90.3 % (87.8–92.4) | 99.7 % (98.8–99.9) |
| **overall** | 720 | 3,774 | 3,707 | 67 (5) | 3,710 | 2 | 98.2 % (97.8–98.6) | 99.95 % (99.8–100) |

By kind (held-out): IBAN 98.5 % of 673; CARD 100 % of 47 (CI 92.4–100); TAX-ID 98.1 % of 412; INSURANCE 99.5 % of 378; ID-NUMBER 96.3 % of 270; EMAIL 98.8 % of 641; PHONE 98.5 % of 809, precision 99.8 % (2 false positives); BIRTH-DATE 96.9 % of 544. Scans by OCR quality: clean 95.1 % of 325 (92.2–97.0), medium 88.3 % of 214 (83.3–92.0), poor 80.7 % of 114 (72.5–86.9). 3,693 of the 3,707 caught were caught under the right label. Names: 1,570 of 1,571 left in clear text; addresses 438 of 438 (not covered, as designed).

Held-out miss list: 67 false negatives, all listed with layout and context in `evaluation/masking/results/heldout.json`. Grouped: 63 in scans (birth dates with OCR digit damage such as `1Z.12.1973`, `2.4.I998`, `16.02.197 1`; emails with a comma for the dot or a space inside; table and label-block reading orders the label logic does not follow; IBANs, phones, tax and insurance numbers with letters for digits or spaces inside where no repair applies; passport numbers in OCR'd CSV rows whose header was wrapped), 3 identity-card numbers in an aligned table in the rows BELOW a row whose IBAN wrapped onto a line of its own (the column-header search stops at that fragment line; dev tuning only handled the wrapped row itself, so this is a generalisation gap the held-out split found and that was deliberately not fixed after seeing it), and 1 VAT ID split across a line break right after its `DE` prefix. The 2 false positives are both scans: `07.05.07.05` (two dates run together by OCR) and a 9-digit doctor number after a label the OCR moved to the line above.

### Honest limits

- One generator produced both splits. The held-out split guards against tuning to particular values and combinations; it does NOT test layouts, wording, formats or decoys the generator never produces. 100 % on clean categories means the detector now handles every format this generator emits, not that it handles real documents. A real-document check (owner-supplied with consent, or a licensed public dataset without real personal data) is the only independent test, and none exists yet.
- Precision is measured against decoys I invented (customer, invoice, order, reference, tracking, EAN, case, clinic, staff numbers, amounts, dates, BIC, creditor IDs). Real text will contain number shapes not in this list. Known residual risks by design: any 16-digit reference starting 4 or 5 that passes Luhn is masked as a card; any 11-digit number passing the tax-ID check is masked; a letter plus nine digits passing the health-insurance check is masked; a date close after a birth label is masked as a birth date.
- Still missed, from the dev and held-out miss lists and the documented test cases: OCR damage that is not a single letter-for-digit slip in an all-digit IBAN or health insurance number (spaces inside numbers, letters inside phone numbers, dates and tax IDs, `,` for `.` in email domains, line breaks inside emails); label logic defeated by OCR reading order or a wrapped header; table rows below a wrapped cell (header search stops at the fragment line) and splits that are not a simple two-line wrap; last-four-digit fragments; numbers written as words; fullwidth and Arabic-Indic digits; phone numbers without a leading `0` or `+`; birth dates with no label at all; document numbers with no label and outside a machine-readable zone; UK National Insurance numbers, Austrian and Swiss social security numbers and non-German tax IDs (never covered).
- Not covered at all: names, addresses, free-text facts (employer, diagnosis, salary, family details). The detector masks more text than before (whole machine-readable-zone lines with digits; obfuscated emails; a comma-joined word before an email in OCR text), which is privacy-positive but changes what the model sees.
- OCR noise model: invented rates, not calibrated on tesseract output; covers umlaut folding (the product's OCR is English-only), letter/digit confusions, dropped and inserted spaces, `.`→`,`, `/`→`l`, `@` misreads, `m`→`rn`, lost colons, random line wrapping and label-column-first reading. It does not represent skew, blur, handwriting, stamps, low contrast, lost or merged characters across words, multi-column reading-order errors beyond the column swap, or photographs of screens. Scan numbers are therefore an optimistic proxy at best.

### Contradictions with existing documents

1. READINESS "Masking miss table" and the 22 October Phase 2 entry list as still missed: labels on the line above, OCR letter-for-digit substitutions and an IBAN with the country code on the previous line. As of `1b54ee1` these specific cases are caught (re-tagged tests); the table needs a new column when this branch is merged.
2. READINESS 22 October: "Honest claim: on clean single-line text every covered kind is caught". The baseline measurement contradicts it: single-line clean examples of covered kinds were missed, e.g. `DOB: 4 March 1975`, `USt-IdNr. DE…`, `Steuernummer 12345/67890`, `Versichertennummer A…`, `Passport number 339465800`; clean-text categories measured 56–97 % recall before tuning.
3. The module comment promised "insurance numbers" while only the pension insurance number was detected; health insurance numbers (on every medical letter and sick note) were never masked before this change.
4. `tests/identifier-masking-documents.test.ts` pointed at `docs/ledger-fragments/2026-10-22-masking-miss-rate.md`, which no longer exists (folded into READINESS); the comment now says so.

### Owner decisions

1. Whether any of these synthetic numbers may appear outside internal documents. Recommendation: no; keep "assisted redaction with review" and the per-kind list, without percentages.
2. Whether to fund a real-document check: a small owner-supplied, consented set (or a licensed dataset without real personal data) as a genuinely independent held-out set, plus running the shipped tesseract model on rendered synthetic scans to calibrate the OCR noise model. Both are outside this sub-agent's permitted actions.
3. Whether the more aggressive masking (whole machine-readable-zone lines, obfuscated emails, labelled 13-digit numbers as tax numbers) is acceptable for the product, or should be narrowed.
4. Whether to add the German OCR language data (umlauts are folded today) and which non-German identifiers, if any, enter scope.
5. The held-out split is now spent for this round; a new seed and hash are needed before the next tuning round is reported as held-out.

Files: `src/identifier-masking.ts`, `tests/identifier-masking.test.ts`, `tests/identifier-masking-documents.test.ts`, `tests/masking-benchmark.test.ts`, `evaluation/masking/**`, `.gitattributes` (LF for the benchmark JSON so the recorded hashes hold on Windows checkouts). Commits: `81489d3` (corpus, locked held-out split, baseline), `1b54ee1` (tuning on dev), and the commit adding this fragment and `results/heldout.json`.
