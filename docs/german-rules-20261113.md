# German rules, fees and deadlines (13 November 2026)

## Why

Blind-graded runs on 12-13 November showed that answers on German rules, fees and deadlines are confidently wrong in every mode, on every model and on both providers:

- Privatemode, level "German rules": Auto 2.6, Fast 1.8, Thinking 3.0 out of 5 (`evaluation/benchmark-privatemode-20261112/SUMMARY.md`). Examples: a speeding fine of EUR 80 or EUR 100 (it is EUR 115 and 1 point); "silence counts as consent" to a rent increase (false).
- Tinfoil fresh benchmark: invented rules in both runs (`evaluation/benchmark-fresh-20261112/SUMMARY.md`).
- The default-prompt line "say that you are not sure and point to the official source" was not enough.
- The time-sensitive detector missed some of these questions, for example "Welche Kündigungsfrist habe ich als Mieter…" and "Wie viele Tage Mindesturlaub…".
- Answers built from approved web results with the server reading the top official page scored 4.0-4.4.

So the fix leads the user to the official source before the answer, makes the model hedge when no source is there, warns when it still states figures, and routes to the stronger mode.

## Constraints kept

- Everything that reads the text runs on the device. No model call for classification.
- Search still needs the user's approval: the one tap on the shown text is the approval, as before. Automatic search runs only for users who switched it on.
- The user's mode choice wins; only Auto routes.
- No silent switches: every added step is visible (suggestion, warning, mode label).
- Provider-agnostic: nothing depends on Privatemode or Tinfoil.

## The parts

### 1. Detector (`src/german-rules.ts`, `germanRulesQuestion`)

Deterministic word rules in German and English. A question counts when it:

- names a German rules topic: fines and points (Bußgeld, geblitzt, innerorts, Flensburg, rote Ampel), deadlines and notice periods (any word with "Frist", Kündigung), tenancy (Miete, Vermieter, Nebenkosten), employment (Mindesturlaub, Probezeit, Mindestlohn), consumer rights (Gewährleistung, Widerruf), tax (Steuererklärung, Freibetrag, Finanzamt, aufbewahren), benefits (Kindergeld, Elterngeld, Bürgergeld, Rente), authorities and documents (Bürgeramt, Behörde, ummelden, Personalausweis, Reisepass, Führerschein, Zulassung), Rundfunkbeitrag, Krankenkasse, and the English equivalents (speeding fine, notice period, landlord, tax return, child benefit, ID card, passport…);
- cites a law (§, BGB, StVO, UStG, BUrlG and others); or
- says "in Germany" / "in Deutschland" together with a rule or fee word (legal, allowed, darf, Pflicht, Gebühr…).

It does not count when:

- the message is a rewriting, translating, summarising or writing task ("Formuliere…", "Übersetze…", "Schreib mir…", "Rewrite…");
- it asks for a general explanation ("Was ist eine Rente?", "Wie funktioniert das Elterngeld?") without a concrete rule ask (how much, how long, by when, Frist, Kosten).

Why: the time-sensitive detector is about change over time; these questions are about rules that may be stable but that the models get wrong.

### 2. Before sending: the search suggestion with its own heading

When the detector fires and no web results are selected, the existing one-tap suggestion in `src/App.tsx` appears even if the time-sensitive detector did not fire (`searchSuggestion` in `src/when-to-search.ts` now returns `rules: true`). Heading:

> Rules, fees and deadlines change. Check the official source first:

The rest of the box is unchanged ("Search the web for:", the exact masked text, the explanation and "Search and answer"). The tap is the approval, as before. If the user has switched on automatic search, these questions are searched automatically too, and the exact text sent is shown.

Why: the search path scored 4.0-4.4; this is the cheapest way to get users onto it.

### 3. The scoped prompt rule (`composeContext` in `src/conversation.ts`)

For the default product prompt only, when the latest question is a German-rules question and no web result is in the context, this is added for that turn:

> This question is about German rules, fees, deadlines or legal consequences, and no official source is in this conversation. Do not state specific amounts, deadlines, point values or legal consequences as facts. Explain the general rule and what it depends on, name the official place to check (the law on gesetze-im-internet.de or the responsible authority), and offer a web search. If you mention a figure, say that it is unchecked.

The frozen variants v1-v4 are unchanged (their sha256 test passes). With web results the rule is not added, because the answer should then use the figures from the sources.

Why: the general "if you are not sure" line left the choice to the model, and the models were sure and wrong. This rule is specific and only applies where it is needed.

### 4. After the answer: the unchecked-figures warning

For a German-rules question answered without web results, if the answer states a money amount, a period or deadline ("3 Monate", "drei Monate", "bis zum", a date), points or a § reference, the answer shows, in the existing warning style:

> This answer gives figures or deadlines that were not checked against an official source.

The existing after-answer box ("This answer did not use current information." / "Search and answer again") now also appears for German-rules questions. The flag `uncheckedFigures` is stored on the message on the device only, like `arithmeticCheck` and `completenessCheck`: it is never model context and never sent or logged.

Why: the prompt rule lowers, but cannot remove, the risk. The warning tells the user exactly when to check, and the box gives them the one tap to do it.

### 5. Auto routing (`src/answer-modes.ts`)

German-rules questions without web results go to Thinking (reason `rules`); with web results they go to Fast. On Privatemode, Thinking scored 3.0 against Fast's 1.8 without sources; with sources Fast answered as well and faster. Rewrites stay on Fast. `evaluation/routing-sim.ts` still runs.

## Tests

- `tests/german-rules.test.ts`: the detector on the real benchmark prompts (both sides) and on extra English and German cases, the suggestion's `rules` flag, the scoped prompt rule (present only for a German-rules question without web results, only on the product prompt, only for the latest question, within the 8,000-character size limit), the warning logic, storage and routing.
- `tests/german-rules-ui.test.ts`: the real app with the Vite stub: heading, warning, search-again box, and no warning after the search.

## Measured result (13 November, Privatemode, blind-graded)

Details are in `evaluation/german-rules-20261113/SUMMARY.md`.

| Run (12 prompts) | Mean | Confident wrong | Warning shown when needed | Suggestion shown |
| --- | --- | --- | --- | --- |
| Auto | 3.50 | 2 | 12 of 12 | 12 of 12 |
| Fast | 3.17 | 3 | 9 of 9 | 12 of 12 |
| Thinking | 3.08 | 2 | 11 of 11 | 12 of 12 |
| Auto, suggestion tapped | **4.25** | 2 (side claims) | not needed | 12 of 12 |
| Bar | 3.8 | at most 1 | every time | 11 of 12 |

- **P-G1..P-G5 on Privatemode, before and after:**

  | Mode | Before | After |
  | --- | --- | --- |
  | Auto | 2.6 | 3.4 |
  | Fast | 1.8 | 3.2 |
  | Thinking | 3.0 | 3.2 |

  Confident wrong answers across the three modes fell from 8 of 15 to 1 of 15.
- **Deterministic parts:** the suggestion and the warning met their bars in every run.
- **The search path** (one tap) met the score bar.
- **Missed bars:**
  - Answers without search still miss the hallucination bar in every mode, and so does the tapped run (2 side claims).
  - No unsearched mode reaches a mean of 3.8.
