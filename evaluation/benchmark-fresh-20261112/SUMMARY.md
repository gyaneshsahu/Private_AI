# Fresh benchmark, run 1: summary (12 November 2026)

27 fresh prompts with bars frozen before the run (`BARS.md`). Our three modes ran through the real app with live Tinfoil and Brave. Blind model graders checked the facts live on the web and ran the code. The full output is `results-2026-11-12.md`; scores with reasons are in `grader-sheet.csv`.

**Run 1 was made before two fixes found by this run (`e259b11`).** Run 2, after the fixes, stopped at its first prompt: Tinfoil paused API access ("this billing period's usage limit was reached"). Run 2 needs the owner to raise the account-level limit.

## Result

| | Auto | Fast | Thinking |
| --- | --- | --- | --- |
| Research (mean, hallucinations) | 4.43, 0 | 4.43, 0 | 4.57, 0 |
| German rules, fees, deadlines | 4.00, 0 | 4.17, 0 | 3.50, **3** |
| Time-sensitive facts | 3.63, 1 | 3.63, 1 | 4.13, 0 |
| Coding | 3.50 | 3.75 | 4.00 |
| Health regression | 5.0, checks 2/2 | 4.0, checks 2/2 | 4.5, checks 2/2 |
| Median first word / whole reply | 1.3 s / 2.8 s | 1.2 s / 3.0 s | 5.3 s / 6.9 s |
| Verdict under the frozen bars | below bar | below bar | below bar |

## What worked

- **Research improved sharply.**
  - Means are 4.4 to 4.6, against 2.8 to 3.4 in the ChatGPT comparison. ChatGPT scored 4.2 there.
  - Zero hallucinations in 21 answers.
  - The one-tap suggestion appeared for all 7 research questions.
  - No raw citation codes and no "no browsing tools" claims in research answers.
  - One stray fragment "[2e2?]" (Fast, R-04).
- **The when-to-search detector** fired on 6 of 6 time-sensitive questions and on 0 of 2 timeless controls, in every mode.
  - It also fires on most German fee and deadline questions (G-01, G-02, G-03, G-06), which is where Thinking invented facts.
  - It fires on one coding prompt that names "October 2026" (C-03), a small false positive.
- **No unrequested word counts** anywhere. The new instruction line works.
- **Health holds:** all deterministic checks pass.

## What did not

1. **Top page read on 4 of 7.**
   - bmi.bund.de redirects, and the reader refused redirects. Two other top results could not be opened.
   - Fixed in `e259b11`: same-site redirects are followed, with every target checked again, and up to three results are tried. The note says "official" only when the page read is official.
   - Not yet measured: needs run 2.
2. **Source-link count 1 of 7 is a measuring error, not a product error.**
   - Citations now render as site-name links, so the captured text holds no web addresses.
   - The runner now records the link addresses; run 2 will measure this properly.
3. **Thinking invents German rules with confidence:**
   - a one-week deadline for re-registering a car (the rule is "unverzüglich")
   - e-mail allowed for a tenant's notice "after a 2025 reform" (written form is still required)
   - a €28.10 ID-card fee (it is €46 since February 2026)

   Auto and Fast had none. The new "say when unsure" line helps Auto and Fast, but not Thinking (glm-5-3 max).
4. **Time-sensitive answers without search are often stale:**
   - the Deutschlandticket at €58 (now €63)
   - Jupiter's moons at 97 (now 101)
   - Germany's population "84–85 million" (83.5 million)

   They come with weak caveats and often no search offer. Fast still said "I don't have web access" once; fixed in `e259b11` but not yet measured. In the app, the search suggestion is shown above the message box before Send for all of these questions.
5. **Coding is weaker than expected:**
   - C-03 (Berlin day boundaries in SQL) was wrong under a UTC session in Fast and Thinking.
   - C-04 answers rambled, and Auto made a false claim about JavaScript regex.
   - Auto scored lowest (3.5): it answered all four coding prompts on the Fast path, none on Thinking.

## Recommendation

- **Run 2 when Tinfoil is unpaused,** to confirm the page reads, source links and the no-web-access line.
- **German fees and deadlines:** keep Thinking off them, or make the search suggestion the default path there. In this run Auto answered them on Fast, which had no invented rules.
- **Coding:** Auto's on-device rules should send code-writing prompts to Thinking; all four went to Fast here. Thinking itself scored 4.0, so routing alone will not reach the 4.2 bar. Consider a time-zone note in the prompt only if C-03-type errors recur.
- **Owner sample:** score `owner-sample.md` (10 prompts × 3 modes, own shuffle) into `owner-sample.csv`, then run `npx tsx evaluation/benchmark-fresh-20261112/fresh.ts score`. The graders count as trusted only if your scores agree within 1 point on average and you flag no hallucination they missed.

## Run 2 (after the fixes, same prompts, graded blind again): `results-2026-11-12-run2.md`

| | Auto | Fast | Thinking |
| --- | --- | --- | --- |
| Research (mean, hallucinations) | 4.43, 0 | 4.43, 0 | 4.43, 0 (after the R-02 correction below) |
| German rules, fees, deadlines | 3.50, 2 | 3.33, 2 | 3.83, 1 |
| Time-sensitive facts | 4.00, 0 | 3.50, 1 | 4.50, 0 |
| Coding (code fails) | 3.25 (2) | 3.75 (1) | 4.75 (0) |
| Health | 4.5 | 5.0 | 4.5 |
| Verdict | below bar | below bar | below bar (level 2 only) |

- **Every deterministic check now passes in every mode:** page address shown 7/7, source links 7/7 (counted from the citation buttons), no raw codes, no "no web access" claims, no word counts, detector 6/6 and 0/2, health 2/2.
- **R-02 corrected after an official check (12 Nov):** smb.museum lists the Neues Museum at 14,00 EUR, concessions 7,00 (https://www.smb.museum/en/museums-institutions/neues-museum/plan-your-visit/prices-tickets/). All three answers were right. The grader's hallucination flags came from a reference table I wrote that wrongly said the official site lists no stand-alone ticket. The flags were removed and the scores set to 5 / 5 / 4 (Thinking added an odd device-clock caveat); the correction is noted in each row's comment. The routing check moves to 4.35 for the new rules (always-Thinking 4.30, always-Fast 4.17).
- **German rules are weak in every mode and vary between runs.** Run 1: Thinking invented three rules, Auto and Fast none. Run 2: Auto 2, Fast 2, Thinking 1. Model choice does not fix this; the search suggestion, which fires on these questions, does.
- **Coding confirms the routing gap:** Thinking 4.75, Auto 3.25. Auto sent all four coding prompts to Fast. Fixed in the routing change (`docs/routing-and-search-20261112.md`).
- **One stuck reply:** Fast R-01 produced no text for 300 s in the first attempt of the research rerun. The rerun answered normally.
