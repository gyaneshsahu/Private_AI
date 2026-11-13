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

- Only one repetition; the 12 November baselines had three. A second repetition costs about 60,000 tokens.
- Streaming with tool calls through the app's own path (this run used non-streaming calls from Node).
- Pyodide itself: download size, start time on a phone, and whether its `decimal` output matches local Python exactly (it should, it is the same CPython).
- Data analysis on an uploaded table (the set is word problems only).
- The Thinking model on the 14 non-critical cases.

Spend: 104,574 Privatemode tokens as reported by the API (pilot 6,067, Fast 59,508, Thinking 39,000). No searches.
