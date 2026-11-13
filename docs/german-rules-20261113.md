# German rules, fees and deadlines (13 November 2026)

## Brave Goggles — 13 November 2026 (latest)

### Finding

- **Supported, inline.** Brave's Web Search API takes a `goggles` query parameter. It accepts a hosted Goggle URL or an inline definition; inline rules need no registration and no public file. Syntax: one rule per line, for example `$boost=3,site=example.de` ([Goggles documentation](https://api-dashboard.search.brave.com/documentation/resources/goggles)). The documentation names no plan restriction.
- **Our plan accepts it.** One probe with our key on 13 November (an older prompt, F-07 "Was kostet die Ummeldung in München und in Stuttgart?", 10 results), 2 Brave searches:
  - without the Goggle: 0 official results (was-kostet.org, stadtverwaltungen.net, umzug1.de, ummelden.de …);
  - with the inline Goggle: HTTP 200, 9 of 10 results on stuttgart.de or stadt.muenchen.de. The request address was about 2,800 characters.

### What changed

1. **The Goggle** (`RULES_GOGGLE` in `server/research.ts`): `$boost=4` for every official domain and `$boost=2` for every public-interest domain in `RULES_SOURCE_DOMAINS`. It is built from the documented list only; nothing from the user is in it.
2. **Only for German-rules searches, behind a server flag.** `searchGoggles` in the server config, set by `PRIVATEAI_SEARCH_GOGGLES=1`; **off by default**. Turning it on or off needs no client change.
3. **The search text is unchanged:** `q` is exactly the approved text, and `count` is 10 as before; only the `goggles` parameter is added. Our own tier re-ranking and the page choice still run on what Brave returns.
4. **Runner:** `run-ours.ts --goggles` sets the flag; `run.json` records it. The runner now also records `uncheckedWarning` per answer.

### Privacy copy (proposed; needs the owner)

Brave now receives one more thing with a rules search: the fixed list of official sites. Only the Privatemode draft variant of "When you search the web" changes. After "your own address is not sent." it adds:

> For a question about rules, fees or deadlines, our server may also ask the search provider to rank official sites first, by sending a fixed list of those sites; nothing from you is added.

"May" keeps the sentence true while the flag is off. The approved Tinfoil text is unchanged. The mirror `docs/privacy-copy-privatemode-20261112.md` is regenerated.

### Tests

`tests/search-provider.test.ts`: with the flag, a rules search sends exactly the approved text, `count=10` and the Goggle, which holds only `$boost` rules for the documented domains; with the flag off, or for a non-rules search, no Goggle is sent.

## Answer-side check — 13 November 2026

### Decision

The owner's instruction (13 November): build the answer-side check first. The question detector missed 4 of 13 fresh questions, and those unsearched answers held most of the confident wrong figures. A check on the answer text does not depend on how the question was worded.

### What changed

1. **The check** (`answerStatesRules` in `src/german-rules.ts`). It is deterministic and runs on the device: no model call, nothing sent. It fires when the answer text contains any of these:
   - a law reference: a § with a number and a word after it ("§ 17 BMG", "§ 5 Abs. 1"), or a German law abbreviation (BGB, StVO, StVG, BKatV, UStG, EStG, AO, SGB, BUrlG, KSchG, ArbZG, EFZG, FZV, BMG, PassG, MiLoG and others), or gesetze-im-internet;
   - a fine or points word: Bußgeld, Verwarnungsgeld, Fahrverbot, Punkte in Flensburg, penalty points;
   - in one sentence, a EUR amount together with a fee, fine, tax, allowance, benefit or authority word (Gebühr, Steuer, Freibetrag, Pauschale, Beitrag, Strafe, Amt, Behörde, Zoll, fee, fine, tax, allowance, authority…);
   - in one sentence, a period or deadline ("3 Monate", "14 days", "bis zum", "bis spätestens") together with legal or authority vocabulary (Frist, Kündigung, Widerruf, gesetzlich, Anspruch, Pflicht, Behörde, Antrag, Vermieter, Arbeitgeber, statutory, entitled, landlord, employer…).
2. **Exclusions.**
   - Code blocks and inline code.
   - Figures that appear in the user's question.
   - A calculation question that contains a money amount counts as arithmetic: its EUR results never count (a VAT calculation on the user's invoice does not warn).
   - A law the user named in the question (a text to translate, say).
   - "Frist" on its own is vocabulary, not a figure: "fristgerecht zum nächstmöglichen Termin" in a cancellation letter does not warn.
   - A § inside a document citation ("[d5ef4c4c, §4]") does not count.
3. **When it fires.** An answer given without web results gets the existing warning ("This answer gives figures or deadlines that were not checked against an official source.") and the "Search and answer again" box, even when the question detector did not fire. `checkUncheckedFigures` is now "question detector and figures, or the answer-side check". The flag is the existing device-only `uncheckedFigures`: never model context, never sent. The search-again box takes the flag into account (`searchSuggestion(text, now, rulesAnswer)`), so it appears for a question that is neither time-sensitive nor recognised.

### Calibration (older stored answers only)

Measured on 784 stored answers from `.local/` (german-rules-20261113, german-rules-official-20261113, benchmark-fresh-20261112, benchmark-privatemode-20261112, blind-benchmark-privatemode-20261112, blind-benchmark). `arithmetic-app-20261112` has no stored answers under `.local/`. The frozen 40-question set was not opened.

| Measure | Result |
| --- | --- |
| Graded confident errors on German-rules prompts (our answers, older sheets, unique) | fires on 48 of 48 |
| … of these, answered without web results | fires on 32 of 32; the question detector warned on 28 of 32 |
| All unsearched answers to German-rules prompts | fires on 105 of 112 |
| **False alarms: non-rules answers** (maths, health, coding, everyday, research, instruction-following) | **3 of 501 (0.6 %)**; 3 of 441 unsearched (0.7 %). Bar: at most 3 % |

- The 3 false alarms are all L7-02 ("Erkläre … Brutto- und Nettogehalt in Deutschland"): the answer gives a net pay example "je nach Steuerklasse". It is close to a rules answer.
- Two changes during calibration removed 14 false alarms: a § must be followed by a number and a word (document citations "[id, §4]" had fired), and "Frist" alone no longer counts as a deadline (cancellation letters had fired).
- "Non-rules" excludes the German-rules levels and eight rules prompts in other levels (R-01, R-04, R-05, R-07, P-R1, P-R5, L7-04, L4-03), labelled from the prompt text.

### Tests

- `tests/german-rules.test.ts`: fires on law references, fines, fees, allowances, deadlines, English answers and a Verwarnungsgeld, independent of the question detector and never with web results; stays quiet on VAT arithmetic on the user's amounts, given figures, code blocks, health, study and letter answers, document citations and a law the user quoted; the search-again suggestion for an unrecognised question.
- `tests/german-rules-ui.test.ts`: a rules question the detector misses is sent directly, and the answer with a law reference gets the warning and the search-again box, at phone width.

## Official-source preference — 13 November 2026

### Decision

On the search path, answers still scored about 3.8, with several confident wrong figures. The cause was source quality: for example, the server read a moving company's page about re-registering a car. The owner decided to prefer official sources when ranking and choosing the page, **without a hard filter**.

### What changed

1. **More results, same text.**
   - When the search text is a German-rules question (`germanRulesQuestion`, checked on the server), the server asks Brave for 10 results instead of 5.
   - The search text is exactly the approved text, with no added operators.
   - The results are re-ranked in three tiers, official, then public-interest, then other, keeping Brave's order within each tier. The top 6 are kept (`RULES_RESULTS`, `searchWeb` in `server/research.ts`).
   - No tier is dropped and nothing is filtered: without an official result, the others stay.
   - Other searches are unchanged (5 results, Brave's order).
2. **One documented domain list:** `RULES_SOURCE_DOMAINS` in `src/german-rules.ts`, shared by the server and the device.
   - **Official:** federal laws, the government, ministries and agencies (`gesetze-im-internet.de`, `*.bund.de`, `bmj.de`, `bmas.de`, `zoll.de`, `bundesjustizamt.de`, `familienportal.de`, `deutsche-rentenversicherung.de`, `minijob-zentrale.de`, `auswaertiges-amt.de` …), the Länder and city service portals (`berlin.de`, `bayern.de`, `nrw.de`, `muenchen.de` …), and EU law (`eur-lex.europa.eu`, `europa.eu`).
   - **Public-interest:** the consumer centres (`verbraucherzentrale.de`, `vzbv.de`, `evz.de`), `test.de`, the federal courts and `justiz.de`, and the social associations (`sovd.de`, `vdk.de`).
   - A host counts when it is the domain or a subdomain of it.
   - These are authorities, not facts, so the list stays stable when the rules change.
   - Foreign authorities (`gv.at`, `gov`) are deliberately "other" here. On 13 November the old code read Austria's `bmi.gv.at` as "official" for a German passport question.
   - For a rules search, a private site named after the topic (`kindergeld.org`) is no longer preferred.
3. **Page choice.**
   - The page read is the first official result. Without one, it is the first public-interest result. Without either, it is the top result.
   - The next candidates are still tried when a page cannot be opened, three at most.
   - The redirect, identifier-masking and size checks are unchanged.
   - The server returns the tier with the page record (`topPage.tier`).
4. **The page note names the tier.** This applies to rules searches only; other searches keep the old wording (`topPageNote` in `src/research-result.ts`):
   - "Our server also opened an official source and read its text: <address>"
   - "Our server also opened a public-interest page (not an official source) and read its text: <address>"
   - "Our server also opened a non-official page and read its text: <address>"
   - Without an official result among the kept results, this is added: "No official source was found in the search results. Check the responsible authority before relying on these figures."
5. **The model sees each source's type.** For a German-rules question with web results (default product prompt only), each web source's text given to the model starts with "[official source]", "[public-interest source]" or "[other source]" (`composeContext`). The sourced-only rule ends with:
   > Prefer official sources; if they disagree with other sources, follow the official one. If no source is official, say that no official source was found, that the figures may be wrong, and name the authority to check.
6. **The note under the answer.**
   - It appears when a German-rules question is answered from web results that hold no official source. It uses the existing warning style:
     > No official source was found in the search results. Check the responsible authority before relying on these figures.
   - The flag `noOfficialSource` is stored on the message on the device only, like `uncheckedFigures`. It is never model context and never sent.
7. **Copy unchanged.** The approval and suggestion texts already say "preferring an official site". The client accepts 7 sources from a search (6 results and the page).

### Why this design

- **Re-ranking, not filtering,** keeps an answer possible when no authority ranks.
- **Page choice is the cheapest lever:** the server reads only one page, so it should be the most authoritative one.
- **The type labels and the rule** let the model weigh the sources it already has.
- **The note** tells the user when nothing official backed the figures.

### Tests

- `tests/search-provider.test.ts`: exactly the approved text with `count=10`; tiers with order kept and the top 6; without an official result nothing is dropped.
- `tests/research-top-page.test.ts`:
  - page choice by tier;
  - a foreign authority counts as "other";
  - the note's wording per tier, with and without an official result;
  - other searches carry no tier.
- `tests/german-rules.test.ts`:
  - ranking and tiers;
  - the labels and the rule, only for rules questions with web results, not for v1-v4, within the 8,000 limit;
  - the device-only flag.
- `tests/german-rules-ui.test.ts`: the official page note and no note under the answer; then a non-official result with the page note and the note under the answer, at phone width.

### Measured (fresh prompts, before and after; `evaluation/german-rules-official-20261113/SUMMARY.md`)

| Measure (13 prompts, Auto, search path) | Bar | Before | After |
| --- | --- | --- | --- |
| Confident wrong | at most 1 | 2 | 5 |
| Mean | at least 4.2 | 3.92 | 3.69 |
| Official source cited | at least 10 | 4 | 4 |
| Page read official | at least 9 | 3 | 4 |
| No official source, and the answer says so | every time | 0 of 5 | 4 of 5 (the note 5 of 5) |

**Every bar is missed.** The page choice works: the official page was read every time one was in the results, 4 of 4 against 3 of 4 before. The answer now says when no official source was found.

The answers did not improve, for two reasons outside the page choice:

1. **4 of 13 questions were not searched at all,** because the detector misses them: Führungszeugnis, Sachgeschenke steuerfrei, Arbeitsunfähigkeitsbescheinigung, and cash brought into Germany.
   - Their code path is identical in both runs. They account for 3 of the 5 confident wrong answers after, against 1 before: run-to-run variation.
   - The detector was not widened on frozen test prompts.
2. **For 5 of the 9 searched questions, no official source was among the 10 results.**

On the 9 searched questions, the mean is 4.22 in both runs.

**Next lever: the search side** (a second query the user sees, or an official-site hint in the shown text) **and detector coverage.** Both need the owner.

## Search first by default — 13 November 2026 (later)

### Decision

The owner decided to build search first by default, after the first check: the one-tap search scored 4.25, and answers without it still had 2-3 confident wrong figures in 12.

### What changed (`822a35e`)

1. **Send asks first.** This applies when the detector fires, no web results are selected, automatic search is off, and the masked search text can be shown. Pressing Send then does not answer. The suggestion box turns into an inline choice that shows the exact masked search text, and the primary button gets the focus:
   - heading: "This is about rules, fees or deadlines, which change. Search the official source first?" followed by "Search the web for:" and the text;
   - explanation: "One tap sends exactly this text to Brave Search through our server, and our server opens the top result page, preferring an official site. Nothing else from your conversation is sent.";
   - primary button "Search and answer": this tap is the approval, as before;
   - secondary button "Answer without checking";
   - Enter or Space on the focused button chooses. Escape goes back to editing with the draft kept. Editing the draft drops the choice. Nothing is remembered, and nothing new is stored on the server.
   - Code: `asksBeforeSending` in `src/german-rules.ts`; the box in `src/App.tsx`.
2. **The box before Send** now has the heading "Rules, fees and deadlines change. Check the official source first." The full stop fixes the double colon before "Search the web for:". Where Send asks first, the box drops "Press Send instead to answer without searching", which is no longer true.
3. **Sourced-only rule.** It is added to the default product prompt for that turn when the question is a German-rules question and web results are in context:
   > For this question about German rules, fees or deadlines, state figures, deadlines and legal consequences only if they appear in the web results; for anything they do not cover, say so instead of filling it in.

   This changes the suggested text: "above" was dropped, because the web results come after the system prompt. The variants v1-v4 are unchanged (sha256 test). The web product prompt with the rule fits the 8,000 limit (test).
4. **Automatic search help** (`src/when-to-search.ts`): "…a question that looks time-sensitive or is about rules, fees or deadlines is searched before it is answered…". The behaviour itself was already in place.
5. **Privacy copy.**
   - The automatic-search sentence is in the shared "When you search the web" section, so the approved Tinfoil text mentions it too.
   - **The Tinfoil text is unchanged and now incomplete. Updating it needs the owner's approval.**
   - Only the Privatemode draft variant says "a question that looks time-sensitive or is about rules, fees or deadlines is searched without asking each time". Its mirror `docs/privacy-copy-privatemode-20261112.md` is regenerated.
6. **Runner:** `run-ours.ts --choice search|without`. The default is `without`, which is what Send did before.

### Tests

- `tests/german-rules.test.ts`:
  - the choice logic (asks only without web results and without automatic search, not for the after-answer box, not without showable text);
  - the sourced-only rule (with web results only, product prompt only, size limit);
  - figures written in words.
- `tests/german-rules-ui.test.ts`, at phone width with the Vite stub:
  - a non-rules question sends directly;
  - Send on a rules question shows the choice, focuses "Search and answer" and sends nothing;
  - Escape goes back to editing;
  - "Answer without checking" answers without a search, with the warning and the search-again box;
  - with web results selected, a follow-up is answered directly;
  - Enter on "Search and answer" searches exactly the shown masked text, then answers;
  - with automatic search on, no choice is shown.
- `tests/privacy-copy.test.ts`: Tinfoil unchanged; the Privatemode research sentence changed.

### Measured (Privatemode, Auto, blind-graded; `evaluation/german-rules-20261113/SUMMARY.md`)

| Run | Mean | Confident wrong | Bar |
| --- | --- | --- | --- |
| (a) Search first, "Search and answer" | 3.83 | 5 | at least 4.2, at most 1: **missed** |
| (b) "Answer without checking" | 3.33 | 1 (+4 labelled unchecked) | warning every time: **missed once** (P-G4, figures in words; fixed after the run) |
| First-check tapped, same grader | 3.83 | 5 | |
| First-check tapped, first grader | 4.25 | 2 | |

- The choice appeared on 12 of 12 in both runs.
- This grader was stricter than the first. On the same grader, search first equals the earlier tapped path: the sourced-only rule did not measurably cut side-claim errors.
- **What remains on the search path is mainly source quality.** The server read official pages for some prompts only. L7-04's "meist vier Wochen" is now cited to a moving-company page. The next lever is the sources, not the prompt.

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
