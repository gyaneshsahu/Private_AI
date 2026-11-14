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

## Through the real app, 14 November (code execution merged, switch on locally)

The same set, this time through the app itself: browser, relay, streamed replies, the model's tool calls assembled from the stream, the code run in the Pyodide sandbox in the browser, the app's own long system message beside the tool instruction. Runner: `run-ours.ts --privatemode --code --cases evaluation/arithmetic-gate/unseen-v3-20261023.json`, scored with `score-app-code.ts` (frozen scorer).

| Mode | Conversations | Exact | Wrong | No answer | Turns marked "Calculated with code" |
| --- | --- | --- | --- | --- | --- |
| Fast (`glm-5.3-flash`, low) | 30 | **30** | 0 | 0 | 60 of 60 |
| Thinking (`glm-5.3`, high), critical only | 16 | **16** | 0 | 0 | 32 of 32 |

- **Streamed tool calls work on both models.** This was the main unverified point. 188 relay requests for 92 turns: every turn made one follow-up request, a few made two.
- The model called the tool on every calculation although the app's system message is much longer than the harness's.
- One repetition. The Swiss 5-centime cases that failed in the Node harness passed here; with one repetition that is not evidence that the app's prompt fixes them.
- **Cost is higher than in the harness:** about 7,700 tokens per two-turn conversation (the harness: about 2,000), because every request carries the app's system message and each calculation is two requests. About 370,000 tokens for this run and its pilot.
- The relay counted 8 of 184 replies as interrupted (the runner closes the page right after the answer).
- Not checked: the follow-up credit and allowance counting with a signed-in account (the runner has no account; covered by unit tests only), a phone, Safari, Firefox, the hosted path.

## Rounding set v1, prepared 14 November, not yet run

Why: every real error above was a rounding rule stated in words. Adding a sentence and re-running this set would be tuning on the test, so a new set was written first.

- **Set:** `rounding-v1-20261114.json`, 24 new two-turn conversations (12 German, 12 English, 18 critical), generated once by `make-rounding-v1.py` with Python's `decimal`. Each value is computed again from its written derivation by `tests/arithmetic-rounding-v1.test.ts`, which also pins the SHA-256 (`6e65df79...`), checks that no turn appears in an earlier set, that echoing the question fails, and that the frozen scorer accepts every expected value (and the Swiss format for CHF cases).
- **Kinds:** Swiss 5-centime rounding of the total only (with discount, with lines, the till's line rounding); each line rounded then summed versus rounding the sum; whole euros or dollars half up, up and down; 10 cents; half up versus half to even; percentages to one decimal (rounded, truncated, half to even); whole packs, buckets, boxes, tables.
- **Scoring:** the frozen `scorer.ts`, unchanged. No item uses the scorer's `rounding` field, because it would round the model's figure half up first (an unrounded 355.50 would pass for 356). 49 forbidden values catch the wrong rule (for example the tax rounded to 5 centimes).
- **Frozen before the instruction changed** (commit `ccd9a6e`). Then one sentence was added to the code-tool instruction, in the app and the harness alike: "If the question states how to round, follow it exactly: round only the figures it names, at the step it names, in the way it names." (131 characters; the instruction is now 772.)
- **To run (lead):** the Fast model before and after the change, 24 conversations each, about 50,000 tokens per run, about 100,000 together. The harness scores each conversation with the frozen scorer and prints the totals. "Before" runs from a worktree at the freeze commit, which has the old instruction:

```powershell
# before: instruction without the rounding sentence
git worktree add .local/rounding-before ccd9a6e
New-Item -ItemType Junction -Path .local/rounding-before/node_modules -Target C:\Gyanesh\Startups\Private_AI\node_modules
Push-Location .local/rounding-before
Invoke-WithPrivateAiSecret -Name PRIVATEMODE_API_KEY -Action {
  npx tsx evaluation/arithmetic-gate/harness-tools.ts --cell flash --label rounding-v1-before --cases evaluation/arithmetic-gate/rounding-v1-20261114.json --cap 60000 }
Pop-Location
# after: from the checkout that has the new sentence
Invoke-WithPrivateAiSecret -Name PRIVATEMODE_API_KEY -Action {
  npx tsx evaluation/arithmetic-gate/harness-tools.ts --cell flash --label rounding-v1-after --cases evaluation/arithmetic-gate/rounding-v1-20261114.json --cap 60000 }
# re-score either results file with the frozen scorer (lists the wrong case ids)
npx tsx -e "import { readFileSync } from 'node:fs'; import { scoreConversation } from './evaluation/arithmetic-gate/scorer.ts'; const set = JSON.parse(readFileSync('evaluation/arithmetic-gate/rounding-v1-20261114.json', 'utf8')).cases; const run = JSON.parse(readFileSync(process.argv[1], 'utf8')).records; const wrong = run.filter((r) => !scoreConversation(set.find((c) => c.id === r.caseId), r.turns.map((t) => t.answer)).pass).map((r) => r.caseId); console.log({ conversations: run.length, exact: run.length - wrong.length, wrong })" .local/rounding-before/.local/arithmetic-tools-20261114/rounding-v1-before/results.json
```

  Then read every wrong answer: a misread rule, a scorer artefact (as `unseen3-23` was) or a real error. `--cap 60000` stops a run before a conversation once 60,000 tokens are passed. Remove the worktree afterwards with `git worktree remove .local/rounding-before`.
- **Read the result honestly:** 24 conversations, one repetition each. A clear drop in wrong answers is a signal; a difference of one or two is noise.

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

## Rounding set v1, run 14 November (Fast model, one repetition each)

| Run | Scored exact | Real errors after reading each answer | Scoring artefacts |
| --- | --- | --- | --- |
| Before (instruction without the rounding sentence) | 22 of 24 | 2 | 0 |
| After (with the sentence) | 20 of 24 | 1 | 3 |

- **Real errors before:** round1-14 and round1-22, both the same mistake: the model stated a total like CHF 35.58 and wrote "already a multiple of 5 centimes, so no adjustment", which is false; it did not round in the code.
- **Real error after:** round1-10, the correction turn: the total CHF 13'280.07 is wrong arithmetic (the discount change was not carried through), then rounded.
- **Artefacts after:** round1-05, round1-12 and round1-24 give the right figures, but their explanations name the wrong alternative ("9 buckets would not be enough", "17 tables seat 136"), and the frozen scorer counts any forbidden value in the text. The scorer stays frozen; read results by hand.
- **Conclusion:** with 24 conversations, 2 real errors against 1 is noise. The sentence costs 131 characters per request and did no harm, so it stays; it is not shown to help. Calculation in code is reliable; reading a rounding rule in words remains the weak point, in both runs. Showing the code to the user (built) is what makes such an error visible.
- Spend: 114,581 Privatemode tokens (before 57,364, after 57,217).
