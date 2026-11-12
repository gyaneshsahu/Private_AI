# How CometRow chooses a model and when it searches (design, 12 November 2026)

**Status: built and tested; not deployed.**

- **Owner brief (12 Nov):** design model routing and search decisions for a general-purpose private assistant.
- **Goals:**
  - the best answers on maths, coding, research, German rules and everyday questions
  - fast on simple questions
  - no silent wrong numbers
  - no stale facts presented as current
  - reasonable cost
- **Constraints:**
  - nothing that reads the user's text runs outside the device or the attested provider
  - no message content in logs or analytics
  - search approval by default
  - the user's mode choice always wins
  - every switch or retry is labelled and stays within the provider
  - works on Tinfoil and Privatemode alike

**Evidence:**
- **Other assistants:** `docs/routing-research-20261112.md`.
- **Two blind benchmarks:** `evaluation/blind-benchmark/`, and `evaluation/benchmark-fresh-20261112/` with two runs.
- **The arithmetic gate on four systems:** `evaluation/arithmetic-gate/results-v3-unseen-20261112.md`.
- **An offline routing check:** `evaluation/routing-sim.ts`. It scores any routing rule with the blind grades already collected.

## What I chose

### 1. Auto: small on-device rules, now tuned to evidence, leaning towards Thinking where Thinking proved better

The router stays on the device: a few readable rules in `src/answer-modes.ts`. It is not a learned model, not a model call and not a hosted router. Only the chosen mode leaves the function; its reason (`autoDecision().reason`) is never logged or sent.

| Order | Signal | Mode | Why (evidence) |
| --- | --- | --- | --- |
| 1 | Emergency words (112, stroke, unconscious, swallowed, Notfall …) | Fast | Speed first. Health scores were close (Fast 4.0-5.0, Thinking 4.5 across three samples), every safety check passed in both, and Fast's first word arrives about 4-5 s sooner. |
| 2 | Code: a request to write, fix or review code; code inline; a language named with a code word; stack traces | Thinking | Coding: Thinking 4.75 / 4.00 vs Fast 3.75 / 3.75 in the two fresh runs. The old rules sent all four coding prompts to Fast, because they recognised only code fences and stack traces. |
| 3 | Maths: formulas, two or more calculations, or a word problem (two or more quantities plus "how much", "total", "pro Monat", "brutto" …) | Thinking | Arithmetic gate, 90 conversations each: Thinking 87 % correct on Tinfoil and 90 % on Privatemode, against 48 % for both Fast models. Privatemode's Fast model had **22 silent wrong answers**, Thinking 3. |
| 4 | Rewrite, translate or summarise given text | Fast | Fast was as good or better on documents (4.8 vs 4.4) and German writing (4.3 vs 4.0). Words inside the given text ("today", "why", a year) no longer misroute it. |
| 5 | Reasoning words: why, compare, step by step, "think hard" … | Thinking | Explanations 4.6 vs 4.4. Kept from the old rules. |
| 6 | Time-sensitive question **without** web results | Thinking | Without search, Thinking said what it could not know (4.50 / 4.13 vs Fast 3.50 / 3.63) and had fewer stale facts. |
| – | Time-sensitive question **with** web results | Fast | With results, both modes score the same (research 4.14-4.43 for both), and Fast is about 3× faster. |
| 7 | Everything else | Fast | Simple questions: equal quality, much faster. |

**Result of the offline check (105 graded prompts from both benchmarks):**

| | Mean score | Invented details |
| --- | --- | --- |
| Always Fast | 4.15 | 13 |
| Always Thinking | 4.29 | 12 |
| Old Auto rules | 4.10 | 12 |
| **New Auto rules** | **4.33** | **11** |
| Best possible per prompt | 4.51 | 5 |

The old rules beat neither single model, which is the failure the routing research warns about (LLMRouterBench, 2026). The new rules beat both.

**Caveat:** the rules were adjusted on the same prompts they are scored on, so 4.33 is optimistic. The next fresh prompt set is the real test.

**Cost:** in these benchmarks the new rules send 42 % of prompts to Thinking, which counts 3 against the allowance. The benchmarks are weighted towards hard prompts; everyday chat should send far fewer.

### 2. The user's choice always wins, and switching up is one tap

- Fast and Thinking chosen in the mode control are never overridden. Auto is the only mode that routes.
- **New: "Answer again with Thinking".**
  - It appears under an answer that was made on Fast.
  - It is one request in Thinking, labelled "Thinking".
  - The remembered choice is unchanged.
  - Same provider, user-initiated.

  This is the remedy for a routing mistake that the research recommends; unlabelled or unwanted switches are what users punish.
- Unchanged: one automatic retry on the same tier's backup model, at the same provider, only when no answer text arrived. It is labelled "Answered by the backup model".

### 3. Search: approval by default, with three conveniences that keep it

1. **Before sending (built earlier today):** the device spots time-sensitive questions and shows the exact masked search text with "Search and answer". The tap is the approval because the text is shown.
2. **New, after an answer without web results:** for a time-sensitive question answered from training data, the same box offers to check it. One tap searches exactly the shown text and answers the question again, replacing the old answer.
3. **Opt-in automatic search** (off by default; built earlier today). Identifiers are masked on the device and the exact text sent is shown.

**Also in place:**
- The model is told the current date and that its knowledge comes from training data with an unpublished end date. It offers a search, and never claims it has no web access.
- Neither mode model publishes a training cutoff, so no date is invented.

**Why not search automatically by default?** The brief requires approval. The privacy-focused assistants studied (Proton Lumo, Kagi) also keep search behind a user action.

**"No stale facts presented as current"** cannot be guaranteed without searching everything. What the design guarantees is the following:
- a time-sensitive question is either searched, or answered on the mode that best says what it cannot know
- every such answer offers the one-tap check

### 4. Numbers: checks, not model choice, make errors visible

- **Routing lowers the error rate:** word problems go to Thinking.
- **What makes an error visible is a check:**
  - The app already recomputes every calculation written in an answer and warns on a mismatch.
  - The arithmetic gate showed that the remaining silent errors are **missing figures** (an answer leaves out a figure the question asked for), not miscalculations.
- **Next step (built 12 November, see below):** a check that every figure the question asks for appears in the answer. It is deterministic and runs on the device. The research supports outside checks over "check your work": asking a model to recheck itself lowers accuracy.

#### Completeness check (built)

- **What it does:** after an answer ends, the device reads which figures the user's last question asks for and checks that the answer states each one. No model call; nothing is sent or logged. Only the count and fixed names (for example "gross") are stored with the message.
- **Warning** (same style as the arithmetic warnings, English only like them): "This answer may not state every figure you asked for: missing gross amount. Please check before you rely on it." With several: "missing tax, gross amount and pay".
- **Figures it recognises** (German and English): tax / VAT / Steuer, gross / brutto, net / netto, total / Summe / Gesamt, discount / Skonto / Rabatt, amount to pay / Zahlbetrag, pay / Lohn, amount per person, percentage change, percentage share (Anteil), average, interest / Zinsen, repayment / Rückzahlung, final amount / Endbetrag, price / Preis, refund / Erstattung, clock time, date, and "how many".
- **Conservative:** it warns only when the answer states figures, none of them is labelled as the asked-for figure, and every other new figure is labelled as something else (for example an hourly rate when the pay was asked for). Unlabelled working, an answer without figures, or a question it cannot read gives no warning. A short follow-up with a new figure and no request of its own ("Mit dem reduzierten Satz von 2.6 %?") is read with the question before it.
- **Measured on stored answers:** arithmetic gate v3 (four systems, 355 conversations): 24 of the 25 silent wrong conversations get the warning, and none of the 290 correct ones. The one it misses labels the hourly rate "Stundenlohn", which other answers also use for the pay. Blind benchmark and fresh benchmark answers (396, every prompt and mode): no warnings.
- **Code and tests:** `src/arithmetic/completeness.ts`; `tests/arithmetic-completeness.test.ts` (English and German, and the gate's question texts with synthetic complete and incomplete answers); `tests/arithmetic-completeness-ui.test.ts`.

### 5. Provider independence

- The rules choose a **mode**, never a model.
- Each provider's qualification report defines its own Fast and Thinking tiers (model, backup, settings, output limit, allowance cost).
- Nothing in the routing names Tinfoil or Privatemode.

**For Privatemode:** if its Fast tier is glm-5.3-flash, the user's own choice of Fast keeps its 24 % silent-error rate on word problems. Auto avoids that by sending them to Thinking. A user who forces Fast is not protected until the completeness check exists. This is an owner decision for the Privatemode report.

### 6. Privacy and logs

- Routing, the search detector and the masking run on the device.
- The relay sees only the mode header (`X-PrivateAI-Mode`) it already saw.
- No message text, routing reason or search text is logged or sent to analytics.
- Search text reaches Brave only after a tap or the opt-in.

## Wording (new in this change)

- **Button under a Fast answer:** "Answer again with Thinking". Tooltip: "Starts a new request and may incur another charge".
- **After an answer without web results (time-sensitive questions):**
  - Heading: "This answer did not use current information."
  - Label: "Search the web for:" with the exact text
  - Explanation: "One tap sends exactly this text to Brave Search through our server, our server opens the top result page, preferring an official site, and the question is answered again from the results. Nothing else from your conversation is sent."
  - Button: "Search and answer again"
- **Changed:**
  - The top-page note says "official" only for government, EU and central-bank sites; otherwise it says "the top result".
  - The approval and suggestion texts say "the top result page, preferring an official site".

## Tests

- **`tests/answer-modes.test.ts`:** every rule, in English and German. It includes the emergency override, rewrite tasks, code with and without a language name, word problems, and time-sensitive questions with and without web results.
- **`tests/answer-modes-ui.test.ts`:** "Answer again with Thinking": the label, a one-request override, and the remembered choice left unchanged.
- **`tests/when-to-search-ui.test.ts`:** the check after an answer. Nothing is sent before the tap, exactly the shown text is searched, and the answer is replaced rather than added.
- **`evaluation/routing-sim.ts`:** the offline check above. Rerun it whenever the rules or the models change. Ship a rule change only if it beats always-Fast and always-Thinking.
