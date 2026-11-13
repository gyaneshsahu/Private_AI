# Thinking time-outs on Privatemode (13 November 2026)

Branch `thinking-timeouts`. All measurements went through the real app (browser, relay, live Privatemode) with `evaluation/blind-benchmark/run-ours.ts --privatemode`. Prompts are synthetic. Raw results: `.local/thinking-timeouts-20261113/<run>/thinking/*.json` (local only).

## 1. What fired: the diagnosis

Every limit on the path before this change:

| Where | Limit | Effect |
| --- | --- | --- |
| Browser, `src/verified-chat.ts` (`withDeadline`) | **90 s total per attempt**, the same in every mode | The limit that ended the replies. There was no separate first-word limit. |
| Browser, `src/App.tsx` backup retry | A fresh 90 s for the backup | The retry started at about 90 s and could run to about 180 s. |
| Server, `server/app.ts` upstream request | 90 s total (`AbortSignal.timeout(90000)`) | Ends at about the same time as the browser's limit. |
| Server, Privatemode key exchange | 30 s | Not involved. |
| Browser SDK (Privatemode) | OpenAI SDK default of 10 min, `maxRetries: 0` | Not involved. |
| Render bridge, `server/render-bridge.ts` | 15 s socket idle; 30 s to receive the request | Not involved locally. On Render it cuts a reply after 15 s of silence. The stream measured below never went quiet for longer than 1 s, because reasoning is streamed while the model thinks. |
| Node servers | `headersTimeout` 10-15 s, `requestTimeout` 30 s, `keepAliveTimeout` 5 s | Apply only to receiving the request, not to the reply. |

Per failure (the runner's "first token" for a failed reply is the moment the failure text appeared):

| Prompt, mode | Recorded | What happened |
| --- | --- | --- |
| `L5-03` Thinking | first text 68 s, end 90 s | Text had started, so the browser's 90 s total cut a reply that was still writing. No retry (text had arrived). |
| `L5-03` Auto | first text 170 s, end 180 s | The primary gave no text in 90 s, so the browser's 90 s ended it. The backup started at about 90 s with a fresh 90 s, wrote from about 170 s and was cut at about 180 s. |
| `L5-06` Thinking | nothing by 180 s | 90 s primary + 90 s backup, both without text. |
| `P-G5` Auto and Thinking | nothing by 180 s | The same: 90 s + 90 s, no text. |
| `unseen3-19b` Thinking | "Protected response unavailable" at 3.7 s | **Not a time-out.** A failure before any reply (the same at `unseen3-24a` in Auto). Most likely a verification failure (this run still verified before every message, against Privatemode's per-organisation attestation limit). It passed in all five runs below. |

**Did the retry make it worse?** Yes. The retry was only allowed when no text had arrived, which with a single 90 s limit meant "the primary used all 90 s". So the retry always started at about 90 s, ran the backup (`glm-5.3-flash`) at the same **max** effort (the tier's setting applies to the backup too) and gave a second 90 s. Users waited 3 minutes for "Response timed out". `L5-06` in Auto was the only case the backup rescued (answered at 147 s).

## 2. Measurements: `glm-5.3` at high against max

Two runs per effort, 8 prompts, Thinking mode, backup turned off so the primary model was measured alone, limits raised to 290 s for the measurement. Order max, high, max, high. Seconds; "tokens" is the usage the app reports (input plus output, input is about 800 for these prompts); "gap" is the longest silence on the reply stream.

| Prompt | max run 1 first / total | max run 2 first / total | high run 1 first / total | high run 2 first / total | Chars max / high | Tokens max / high |
| --- | --- | --- | --- | --- | --- | --- |
| `L5-03` parser + tests | 80.3 / 103.3 | 166.4 / 189.0 | 2.5 / 24.8 | 5.2 / 21.3 | 4,317, 3,278 / 3,728, 2,635 | 6,481, 10,862 / 1,818, 1,717 |
| `L5-06` code review | 55.9 / 73.4 | 172.0 / 185.5 | 7.6 / 22.5 | 8.8 / 21.6 | 2,696, 2,821 / 2,594, 2,065 | 4,882, 10,831 / 1,825, 1,846 |
| `P-G5` rent increase | **no answer**: output limit at 284.2 | **no answer**: timed out at 290.2 | 18.2 / 25.6 | 5.8 / 14.6 | - / 1,551, 1,479 | 17,083, 14,562 / 2,041, 1,322 |
| `unseen3-19b` percent | 4.9 / 5.9 | 5.6 / 6.6 | 3.6 / 4.7 | 3.9 / 5.4 | 98, 98 / 113, 98 | 907, 879 / 837, 846 |
| `L3-03` interest | 6.7 / 8.5 | 5.0 / 6.8 | 3.0 / 5.5 | 3.0 / 4.7 | 208, 183 / 169, 179 | 1,075, 971 / 854, 853 |
| `L6-02` summary | 13.5 / 29.7 | 11.6 / 19.5 | 2.4 / 9.8 | 6.2 / 14.8 | 1,825, 1,800 / 1,747, 1,691 | 4,598, 4,566 / 4,010, 4,027 |
| `P-C3` SQL | 7.3 / 11.8 | 9.2 / 14.1 | 3.0 / 6.0 | 2.8 / 8.9 | 937, 1,019 / 702, 1,097 | 1,253, 1,343 / 950, 1,015 |
| `P-T3` ECB rate | 7.9 / 11.8 | 12.1 / 16.8 | 4.5 / 7.3 | 5.7 / 8.8 | 771, 835 / 678, 588 | 1,240, 1,427 / 956, 999 |

| | max | high |
| --- | --- | --- |
| Completed | 14 of 16 | **16 of 16** |
| Median first word (completed) | 10.4 s | **4.2 s** |
| Median total (completed) | 15.4 s | **9.4 s** |
| Slowest completed reply | 189.0 s | **25.6 s** |
| Tokens used, 16 messages | 82,960 | **25,916** |
| Longest silence on the stream | 0.97 s | 0.60 s |

Quality, checked by running the code and reading the answers (not blind-graded):
- `L5-03`: every implementation was correct. The model's own tests passed in both max runs and in high run 2; high run 1 had one wrong test line (`expect(() => parseDuration("01h")).toBe(3600)`), 7 of 8 tests passed.
- `L5-06`: all four corrected versions print the expected 59.97 and 125.99, and all name the same main bugs.
- `L3-03`, `unseen3-19b`, `P-C3`, `L6-02`: the same correct answers at both efforts.
- `P-T3`: both point to the ECB website and offer to search; high also gives a dated rate from training data.
- `P-G5`: max gave no answer in either run (it reasoned until the output limit or the time limit). High answered both times but with mistakes in German rent law (it swaps the 20 % / 15 % cap; run 2 now has the deadline right). This is the known German-rules weakness of every mode (`evaluation/benchmark-privatemode-20261112/SUMMARY.md`); the search suggestion is the fix for it, not the effort.

## 3. What changed and why

1. **Thinking runs at high, not max** (`.local/qualification-privatemode.json`; the draft `evaluation/qualification-drafts/privatemode-20261112.json` now lists only the high candidate). High was faster on every prompt, used a third of the tokens and answered both prompts that max never answered. The only quality difference found was one wrong test line in one of two coding runs. Max's long times are not long answers: on the coding prompts max used 4,900-10,900 tokens for answers of 2,700-4,300 characters, against about 1,800 at high for answers of the same length; on `P-G5` it used 14,600-17,100 and wrote nothing.
2. **Time limits per mode** (`REPLY_LIMITS` in `shared/contracts.ts`, keyed by mode, no provider names). Each mode has a limit until the first answer text and a total for the whole message, the backup retry included. A report without modes (the Tinfoil reports of today, evaluation experiments) keeps its earlier timing: 90 s to the first text, then 90 s for its backup, plus 10 s for setup. The server's upstream limit is the mode's total plus 5 s, so the browser ends a slow reply first and says so.
3. **The backup retry cannot start doomed.** The retry now shares the message's total. It starts only if at least the mode's first-text limit is left, and it runs only for the time left. So a primary that gave no text by the first-text limit gets a retry with real time left; a primary that failed late is reported as timed out at once, instead of a retry that could not finish. A real first-text limit also brings the retry rule back to what its comment says ("no first token in time").
4. **"Still thinking" status.** After 15 s with no answer text, the status line changes from "Receiving a protected response…" to the waiting text below, and goes back when text starts. There was no such status before. Stop stays visible next to it the whole time.
5. **Time-outs during the request are reported as time-outs.** If the deadline fires before the reply started, the Privatemode SDK throws its own abort error, which the app showed as "Protected response unavailable" with no retry. `withDeadline` now reports it as the time-out it is.
6. **Output limit unchanged at 16,384.** It did not drive the long times at high (no high reply used more than about 4,000 tokens, input included). At max it was the cause of one failure (`P-G5` reasoned until the limit), which high removes. Lowering it would bring back the cut-off long answers of 12 November (4,096 cut off every thinking model).

Measurement tooling: `run-ours.ts` now records the longest stream silence and the reported tokens per turn, and takes `BENCH_OUT` so a measurement does not overwrite earlier evidence.

## 4. The new limits and wording

| Mode | First answer text | Whole message (retry included) | Server backstop |
| --- | --- | --- | --- |
| Fast | 30 s (before: none) | 90 s (before: 90 s per attempt) | 95 s (before: 90 s) |
| Thinking | 120 s (before: none) | 300 s (before: 90 s per attempt) | 305 s (before: 90 s) |
| Report without modes | 90 s (before: 90 s total) | 190 s (before: 90 s per attempt, so up to 180 s with the retry) | 195 s (before: 90 s) |

Why these numbers: high's slowest first word was 18 s and slowest total 26 s, so 120 s and 300 s leave a wide margin for longer conversations and busy hours. 300 s is also about the time `glm-5.3` needs to produce its whole 16,384-token output limit (about 58 tokens per second here), so a Thinking reply ends either at its output limit or at its time limit, both reported honestly. In each case, a first-text time-out still leaves the backup at least the first-text limit after up to 10 s of setup (Fast 60 s left, Thinking 180 s, no modes 100 s). Fast's first word was 2-3 s in the earlier runs, so 30 s is generous; it lets a stuck Fast reply move to the backup after 30 s instead of 90 s.

Status after 15 s with no answer text:
- Thinking: "Still thinking… (this can take up to 5 minutes in Thinking mode)"
- Fast: "Still thinking… (this can take up to 2 minutes in Fast mode)"
- No modes: "Still thinking… (this can take up to 4 minutes)"

## 5. After the fix

One run of the same 8 prompts with the real local test report (Thinking `glm-5.3` at high, backup `glm-5.3-flash` on) and the new limits. All 8 completed on the primary model; no retry was needed. The "Still thinking" status could have shown only on `P-G5` (first text at 15.5 s), and then only briefly.

| Prompt | First word | Total | Chars | Tokens | Completed |
| --- | --- | --- | --- | --- | --- |
| `L5-03` | 6.7 | 21.4 | 2,414 | 1,798 | yes; its 20 tests pass |
| `L5-06` | 11.2 | 23.4 | 2,543 | 2,209 | yes |
| `P-G5` | 15.5 | 23.0 | 1,604 | 1,974 | yes |
| `unseen3-19b` | 3.3 | 4.4 | 112 | 848 | yes, -5.0 % |
| `L3-03` | 3.4 | 5.0 | 194 | 863 | yes |
| `L6-02` | 3.0 | 9.5 | 1,647 | 3,988 | yes |
| `P-C3` | 2.7 | 9.8 | 1,468 | 1,177 | yes |
| `P-T3` | 2.3 | 6.3 | 766 | 878 | yes |

Median first word 3.4 s, median total 9.6 s, slowest 23.4 s. Before the fix, 4 of these 8 failed in Thinking.

Messages used: 40 (32 for the comparison, 8 after the fix), 82,960 + 25,916 + 13,735 = 122,611 tokens as reported by the app. No HTTP 429.

## 6. Not done or not checked

- Not checked on Render. The stream's longest silence (under 1 s) is far below the bridge's 15 s idle limit, so it should not cut replies there, but no deployed run was made.
- Quality is checked by running code and reading, not by blind graders.
- The backup (`glm-5.3-flash`) now also runs at high, because a tier's setting applies to its backup. It was not measured separately.
