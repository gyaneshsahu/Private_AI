# Privatemode evidence: benchmark, arithmetic and 25-prompt check (12-13 November 2026)

All runs went through the real app on Privatemode (Stage 3 branch `privatemode-stage3`) in Auto, Fast and Thinking, with **Fast `glm-5.3-flash` low** and **Thinking `glm-5.3` max**. Blind model graders scored the answers and checked facts live on 13 November; code was run.

| Set | Files |
| --- | --- |
| 51-prompt benchmark against ChatGPT | `evaluation/blind-benchmark-privatemode-20261112/results-2026-11-12-privatemode.md`, `scoring-sheet.csv` |
| 60 arithmetic questions | `evaluation/arithmetic-app-20261112/results-2026-11-12-privatemode.md` |
| 25-prompt check | this folder: `scoring-sheet.csv`, `checks.ts` |

## 1. The 51-prompt benchmark against ChatGPT (same ChatGPT answers as 12 November, graded again)

| | Mean | Invented details |
| --- | --- | --- |
| ChatGPT | 4.61 | 1 |
| **Auto (Privatemode)** | **4.49** | 3 |
| Thinking | 4.41 | 4 |
| Fast | 4.39 | 4 |

On Tinfoil on 12 November, Auto was 4.43 against ChatGPT's 4.69, with different graders. The gap has narrowed from about 0.26 to 0.12.

- **Research:** level with ChatGPT or ahead (4.0 vs 3.8). The research fixes of 12 November work.
- **Equal or better:** maths (all 5.0), instruction-following (Auto 5.0 vs 4.5) and health (Thinking 4.83 vs 4.33).
- **Behind:**
  - easy facts (4.2 vs 5.0: stale counts such as Saturn's moons)
  - German (3.8-4.3 vs 4.8)
  - Thinking on coding (3.5: two long answers timed out)

## 2. Arithmetic through the app (60 standalone questions)

| Mode | Correct | Flagged by the app | Silently wrong | No answer |
| --- | --- | --- | --- | --- |
| Auto | 58 | 1 | **0** | 1 (time-out) |
| Fast | 58 | 2 | **0** | 0 |
| Thinking | 59 | 0 | **0** | 1 (time-out) |

**No silent wrong numbers in any mode.** Fast's one wrong sum (12.40 + 7.95 + 23.10 + 4.55 = 47.00, which is 48.00) was caught by the app's recalculation warning.

Compared with the Design B harness (Flash 22 silent out of 90), ordinary chat plus the app's checks does far better on these questions.

## 3. The 25-prompt check (frozen bars in `BARS.md`)

**Deterministic checks: met in every mode.**
- Research: source links 5/5 and page read 4/5.
- Search suggestion: 4/4 on the time-sensitive questions, 0/1 on the control.
- Maths: 4/4 correct.
- Health checks: 2/2.
- Auto sent all 8 code and maths questions to Thinking and the chest-pain emergency to Fast.

Graded:

| Level | Auto | Fast | Thinking |
| --- | --- | --- | --- |
| Research | 4.0, 0 invented | 4.0, 0 | 4.2, 0 |
| German rules, fees, deadlines | **2.6, 2 invented** | **1.8, 4** | **3.0, 2** |
| Time-sensitive | 4.0, 1 | 3.6, 0 | 4.2, 0 |
| Coding | 4.75 | 3.5 (one failing test) | 4.75 |
| Maths | 5.0 | 5.0 | 5.0 |
| Health | 4.0 | 4.5 | 5.0 |
| **Overall** | **4.00** | **3.60** | **4.24** |

**Verdict under the frozen bars:**
- **Every mode is below bar on German rules.**
- **Fast is also below bar** on time-sensitive questions and coding.
- **Auto** misses time-sensitive questions by one stale answer.
- **Thinking** misses only German rules.

**The German rules failures, concretely:**
- a speeding fine of EUR 80 or EUR 100 (it is EUR 115 and 1 point)
- "silence counts as consent" to a rent increase (false; the landlord has to sue)
- two time-outs on the rent question (P-G5) in Auto and Thinking

The "say when unsure and point to the official source" instruction is not enough on any model. The app's search suggestion fires on these questions; the runner did not tap it, so that the model alone was tested.

## What this means

1. **German rules, fees and deadlines need the search.**
   - Model choice does not fix them: every model on both providers failed in at least one run.
   - The detector already fires on them, and the one-tap check appears after an unsearched answer.
   - **Recommendation (needs your decision):** for this one class of question, put the search suggestion above the answer before Send, with "Fees and deadlines change: search the official source first" wording.
   - Searching automatically by default would break the approval rule, so it is not proposed.
2. **Privatemode's Thinking tier (`glm-5.3` at max) is slow and sometimes too slow.**
   - Median first word 9.8-13 s, against about 5 s on Tinfoil.
   - Four answers timed out: two long coding answers and two rent-law answers.
   - **Recommendation:** test `glm-5.3` at high effort against max on the timed-out prompts, and lengthen the reply time limit for Thinking. This is a tier setting, not a routing change.
3. **The routing rules hold on Privatemode overall.**
   - Auto as run scored highest on the benchmark (4.49, against Fast 4.39 and Thinking 4.41).
   - On the 25-prompt check, Auto matched the better mode on coding and maths.
   - The level differences that changed between providers (coding vs long documents) come from the Thinking tier's settings, not from the rules.
4. **Fast on Privatemode is weaker than Fast on Tinfoil** on time-sensitive questions and code. Auto keeps those off Fast. A user who forces Fast gets the completeness and recalculation warnings for numbers, but no help on stale facts beyond the after-answer search offer.
5. **Speed:** Fast median first word 2.1-2.3 s, just over the 2 s bar. Part of this is the verification before every message in this run; per-session verification (built 13 November, now merged) removes most of that.
