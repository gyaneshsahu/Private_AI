# Tool calling on the arithmetic set (14 November 2026)

**Question (owner):** does GLM-5.3 call tools reliably through Privatemode, and does running the model's code fix the arithmetic set?

**Answer: yes on both, in this run.** One repetition, so read the counts as a strong signal, not a gate.

## Result

Set: `unseen-v3-20261023.json` (30 two-turn conversations, 15 German, 15 English, 16 critical). The set is not unseen for this project any more (it was run on 24 October and 12 November), but this pipeline was never tuned on it: the prompt was written once and not changed after the 3-conversation pilot.

| System | n | Exact | Wrong | No answer | Turns with a tool call | Malformed calls | Code errors | Tokens |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **Fast model + code** (`glm-5.3-flash`, effort low) | 30 | **29 (96.7 %)** | 1 | 0 | 60 of 60 | 0 | 0 | 59,508 |
| **Thinking model + code** (`glm-5.3`, effort high), critical cases only | 16 | **16** | 0 | 0 | 32 of 32 | 0 | 0 | 39,000 |

For comparison, the same set on 12 November without code (`results-v3-unseen-20261112.md`, 90 conversations each, three repetitions):

| System | Exact, no flag | Flagged | Silently wrong |
| --- | --- | --- | --- |
| `glm-5.3-flash` low, two-call check pipeline | 43 of 90 (47.8 %) | 25 | 22 (24.4 %) |
| `glm-5.3` max, two-call check pipeline | 81 of 90 (90.0 %) | 6 | 3 (3.3 %) |

- The Fast model with code is more exact than the Thinking model was without it, at about 2,000 tokens per two-turn conversation (the 12 November pipeline used about 6,400 on `glm-5.3` low).
- Tool calling worked on every turn: the model called the tool before answering each time, every call was valid JSON, and no code raised an error. One Thinking turn used two tool calls.

## The one wrong answer

`unseen3-07` (Swiss quote): "Steuer auf den Rappen, Total auf 5 Rappen gerundet". The model rounded the tax to 5 Rappen too (354.80 instead of 354.78). The code ran correctly; the model read the question wrongly. **Code execution makes the arithmetic exact. It does not fix a misread question, and this error was silent.** Showing the user the code (or at least "tax rounded to 0.05") is what makes such an error visible.

## Second repetition (owner approved, 14 November)

| System | Rep 1 | Rep 2 | Both | Turns with a tool call | Malformed calls | Code errors |
| --- | --- | --- | --- | --- | --- | --- |
| Fast model + code, 30 conversations | 29 | 27 | **56 of 60 (93 %)** | 120 of 120 | 0 | 0 |
| Thinking model + code, 16 critical | 16 | 15 | **31 of 32 (97 %)** | 64 of 64 | 0 | 0 |

The five answers scored wrong, read one by one:

- **Four are the same mistake: Swiss rounding to 5 centimes.** `unseen3-07` (Fast, both repetitions: tax rounded to 5 Rappen although only the total should be) and `unseen3-22` (Fast and Thinking, repetition 2: the total left at 989.12 instead of 989.10). The code ran as written; the model wrote the wrong rounding step. Both models make it.
- **One is a scoring artefact, not an error.** `unseen3-23` (Fast, repetition 2) answered "1 053.50 EUR" with a narrow space as the thousands separator, which the frozen scorer does not read. The figure is right. Counting it, Fast is 57 of 60.
- No answer was wrong because of arithmetic.

So the remaining risk is narrow and known: rounding rules stated in words. A line in the product prompt about "round to 0.05 only what the question says" is the obvious fix, but it would be tuning on this set, so it has to be tried on new cases. The scorer was not changed (it is frozen).

## How it was run

- `evaluation/arithmetic-gate/harness-tools.ts`: Privatemode SDK (attested, encrypted), one tool `python`, the harness runs the code in local Python with a deny-list (test harness only) and returns what it printed, at most 5 rounds per turn, the final text is scored by the frozen `scorer.ts`.
- No two-call check, no flags: an answer is exact, wrong or missing.
- Raw results: `.local/arithmetic-tools-20261114/` (local only).

## What this decides

1. **Code execution is worth building, in the browser.** The model's code is plain standard-library Python (`decimal`, `datetime`), which Pyodide runs on the device. No data leaves the device for the calculation.
2. **Fast maths:** calculations can stay in Fast with code instead of going to Thinking. That is cheaper and, on this set, more exact.
3. **Each tool round is one more request to Privatemode.** A calculation is two requests (ask, then answer with the result). Design choice for the build: a paid message may make up to two follow-up tool requests without using more allowance, tracked on the server like the retry credit.
4. **The existing check pipeline** (two calls, recomputation, flags) becomes the fallback when the tool is not used, not the main path.

## Not checked

- Streaming with tool calls through the app's own path (this run used non-streaming calls from Node).
- Pyodide itself: download size, start time on a phone, and whether its `decimal` output matches local Python exactly (it should, it is the same CPython).
- Data analysis on an uploaded table (the set is word problems only).
- The Thinking model on the 14 non-critical cases.

Spend: 202,842 Privatemode tokens as reported by the API (pilot 6,067; repetition 1: Fast 59,508, Thinking 39,000; repetition 2: Fast 59,168, Thinking 39,100). No searches.
