# Identifier masking — miss rate on document text — 22 October 2026

Ledger fragment for prepending to `docs/READINESS.md` (owner decides). Measured, not owner-reported: every row below is pinned by an assertion in `tests/identifier-masking-documents.test.ts` against `src/identifier-masking.ts` at commit 7ce181a (handoff branch `codex/development-handoff`). The detector was NOT changed; proposals are in the last section only. Checks run: `npx tsc --noEmit` (clean) and `npx vitest run tests/identifier-masking-documents.test.ts tests/identifier-masking.test.ts` (27 passed, 23 of them in the new file). Playwright, Docker and PostgreSQL suites were not run.

## Why this matters

The same `mask()` runs over text extracted from attachments (PDF via pdfjs in `src/extraction.worker.ts`, DOCX via `src/docx.ts`, PNG/JPEG via tesseract) because `composeContext` in `src/conversation.ts` puts selected sources into the outbound messages that `src/verified-chat.ts` masks. pdfjs joins text items with `\n` at each end-of-line, so an identifier that the page layout wrapped arrives split across lines; OCR confuses `O`/`0` and `l`/`1`. The fixtures imitate exactly those shapes as plain strings; no real documents were used.

## Result table (23 cases: 10 correct, 13 misses)

"Correct" means the identifier was fully masked, or (control block) nothing was masked. "Miss" means at least part of the identifier reaches the relay in clear text. Four misses are worse than a plain miss: the phone detector grabs a digit fragment of a broken IBAN, so the user sees `Kept on this device: 1 phone number` while most of the IBAN leaked.

| # | Case (extractor shape) | Result | What actually happens |
|---|---|---|---|
| 1 | Tax receipt: formatted Steuernummer `12/345/67890` on its own line | correct | `{{TAX-ID-1}}` |
| 2 | Tax receipt: Steuer-ID `86 095` / line break / `742 719` | **miss** | nothing masked; both halves in clear text |
| 3 | Steuer-ID spaced in groups on one line | correct | `{{TAX-ID-1}}` (mod 11,10 check passes) |
| 4 | IBAN wrapped mid-number at a line end (`DE89 3704 0044 0532` / `0130 00`) | **miss (mislabelled)** | no IBAN hit; `0044 0532` masked as `{{PHONE-1}}`; `DE89 3704` and `0130 00` leak |
| 5 | IBAN with country code on the previous line (`DE` / `89 3704 …`) | **miss (mislabelled)** | `0044 0532 0130 00` masked as PHONE; `DE` and `89 3704` leak |
| 6 | Card number with dashes `4111-1111-1111-1111` | correct | `{{CARD-1}}` |
| 7 | Card number in fullwidth digits (U+FF10–FF19) | **miss** | nothing masked; `\d` is ASCII-only |
| 8 | Card number in Arabic-Indic digits (U+0660–0669) | **miss** | nothing masked |
| 9 | Phone `0170/1234567` | correct | `{{PHONE-1}}` |
| 10 | Phone `(030) 123 45 67` | correct | all digits masked; the opening `(` stays outside the placeholder (`({{PHONE-1}}`), cosmetic only |
| 11 | Phone `+49 (0) 30 1234567` | correct | `{{PHONE-1}}` |
| 12 | Phone `0049 30 1234567` | correct | `{{PHONE-1}}` |
| 13 | Partial number: last four digits of a card / account / phone | **miss (by design)** | nothing masked |
| 14 | Numbers written as words (phone and IBAN in German number words) | **miss (by design)** | nothing masked |
| 15 | Email with zero-width space inside the local part (`anna​.weber@…`) | **miss (partial)** | `.weber@example.test` masked; `anna` leaks next to the placeholder |
| 16 | Email with zero-width space directly before `@` | **miss** | nothing masked |
| 17 | Passport number, label on the same line | correct | `{{ID-NUMBER-1}}` |
| 18 | Passport number, label `Reisepass` on the previous line, `Nr.: C01X00T47` below | **miss** | nothing masked; label window stops at `\n` |
| 19 | Birth date, label on the same line | correct | `{{BIRTH-DATE-1}}` |
| 20 | Birth date, label `Geburtsdatum` two lines above | **miss** | nothing masked |
| 21 | OCR: `O` for `0` inside an IBAN (`37O4`) | **miss (mislabelled)** | mod-97 fails; `0044 0532 0130 00` masked as PHONE; `DE89 37O4` leaks |
| 22 | OCR: `O` for `0` and `l` for `1` inside an IBAN | **miss (mislabelled)** | only `0044 0532 0` masked as PHONE; rest leaks |
| 23 | Control block: amounts, dates, invoice numbers, customer number, percentages, years, `112`, house number, article number | correct | nothing masked (no false positives) |

Hit rate on the 22 identifier cases: 9 of 22 (41 %). Excluding the two by-design cases (13, 14): 9 of 20 (45 %). On clean single-line input the earlier unit tests already show every kind hits; the drop comes entirely from document layout and OCR, which is exactly the input path the attachment feature feeds.

## Per-miss assessment: could a cheap pattern catch it, and at what false-positive cost?

- Case 2 (tax ID across a line break): cheap. Allow `[ \n]?` instead of `[ ]?` between groups in the TAX-ID pattern; the ISO 7064 check digit still guards it, so the false-positive risk is near zero (an 11-digit run that passes the check by chance is ~1 in 10, but the "exactly one repeated digit" rule plus a label-free 11-digit run spanning a line break is rare in invoices). Risk: a table column of amounts that happens to wrap. Low.
- Case 4 (IBAN wrapped mid-number): cheap. Allow `\s` (including one newline) between IBAN groups; mod-97 keeps the false-positive rate at ~1 %, and the candidate must still start with two letters and two digits. The bigger win is stopping the PHONE mislabel: a candidate that looks like an IBAN prefix (`[A-Z]{2}\d{2}`) should either be masked whole or at least suppress the phone detector on its digits. Low risk.
- Case 5 (country code on the previous line): same fix as case 4 (`\s*` after the country code). Slightly higher risk: `DE` at a line end followed by a digit run is also how "DE" (Germany) appears in address blocks, but mod-97 rejects almost all of them. Low.
- Case 7/8 (fullwidth and Arabic-Indic digits): cheap if done as normalisation, not as pattern changes: map Unicode `Nd` digits to ASCII before detection (`String.prototype.normalize("NFKC")` handles fullwidth; Arabic-Indic needs an explicit map). Offsets must be tracked so the original text is replaced, which is the only real cost. False-positive risk: none beyond what the ASCII detectors already have. Realistic frequency in a German user's documents is low; fullwidth digits appear mainly in text copied from East-Asian sources.
- Case 13 (last four digits): no honest pattern. Masking every 4-digit group would hit years, PLZ, and amounts. Leave as a stated limitation.
- Case 14 (number words): no cheap pattern; a word-to-digit pass is a parser, not a regex, and German number words also appear in prose. Leave as a stated limitation.
- Case 15/16 (zero-width space in an email): cheap. Strip U+200B/U+200C/U+200D/U+FEFF (and soft hyphen U+00AD) before detection, again with offset tracking, or simply let the EMAIL pattern tolerate `​` between characters. Zero false-positive risk: these characters have no meaning in an address. Case 15 is the nastier of the two because the partial mask gives a false sense of coverage and leaves the user's first name next to a placeholder.
- Case 18 (passport label on the previous line): cheap. Let `LABEL_BEFORE` look back across one newline (e.g. `[^\n]{0,24}\n?[^\n]{0,24}$`). False-positive risk: the ID-NUMBER pattern (`[A-Z0-9]{8,10}` with at least one letter and one digit) also matches order codes, SKUs and hashes, so widening the window to the previous line will catch a product code on the line after "Ausweis kopiert" in a cover letter. Moderate; keep it to one line, not two.
- Case 20 (birth-date label two lines above): cheap in the same way (look back two lines), and the false-positive risk is lower than for passports because the candidate must still be a plausible day/month/19xx-20xx date, but a form that lists "Geburtsdatum" as a column header over a list of unrelated dates (e.g. children's dates of birth, which ARE personal) would all be masked, which is the right outcome. Low.
- Case 21/22 (OCR `O`/`l` in an IBAN): a cheap substitution (`O`→`0`, `l`/`I`→`1` inside a candidate that already starts with `[A-Z]{2}\d{2}` and is near the label `IBAN`) followed by the mod-97 check would recover case 21 and, with both substitutions, case 22. The check digit makes the false-positive risk low, but a wrong substitution can also produce an IBAN that passes mod-97 by accident (~1 % per candidate). Better to require the `IBAN` label within the same line for the fuzzy path. Also the PHONE mislabel must be suppressed when the candidate was rejected by the IBAN detector, otherwise the user is told a phone number was kept.

A general observation beyond the single cases: `findIdentifiers` runs detectors in a fixed order and a candidate rejected by the IBAN/CARD check digit is then free for the PHONE detector, which has no check digit. Four of the thirteen misses are "mislabelled partial masks" for that reason. A one-line mitigation is to record rejected IBAN/CARD spans and skip PHONE matches that fall inside them; that reduces the misleading summary line without adding any false positives.

## What the detector can and cannot honestly claim (as of 7ce181a)

Can claim: on clean single-line text (typed chat, most e-mails, DOCX body text that is not column-wrapped) IBANs, card numbers, German tax IDs and Steuernummern, pension insurance numbers, labelled passport/ID numbers, e-mail addresses, phone numbers in the common German layouts (`0170/…`, `(030) …`, `+49 (0) …`, `0049 …`) and same-line labelled birth dates are replaced before encryption, and ordinary invoice numbers, amounts, dates, percentages and `112` are not touched (no false positives in the control block).

Cannot claim: that identifiers in attached PDFs or scanned images are reliably masked. Any identifier that the PDF layout wrapped across a line, any label that sits on the line above its value, any OCR-corrupted IBAN, and any e-mail with an invisible character is passed through in clear text, in several cases with a misleading "kept on this device: 1 phone number" note. Partial numbers and numbers written as words are out of scope and should be named as such in the product copy. The privacy statement must keep the wording "identifiers we can recognise" and must not say "all personal numbers in your documents".

Gate state: unchanged. This fragment adds evidence; it does not pass or fail a gate.

Files: `tests/identifier-masking-documents.test.ts` (23 cases, 13 tagged `[known miss]`), this fragment. No change to `src/`, `server/`, `shared/`, `README.md`, `package.json` or `docs/READINESS.md`.
