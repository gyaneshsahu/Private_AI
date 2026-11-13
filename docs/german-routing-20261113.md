# German routing, detection and answer language (13 November 2026)

The owner requires a German and English interface and that the model answers in the user's language. This note covers the parts on the device: Auto's mode choice (`src/answer-modes.ts`), the German-rules detector (`src/german-rules.ts`), the when-to-search detector (`src/when-to-search.ts`) and the model's instructions (`src/conversation.ts`). Everything here was measured offline. No model was called.

## Result

### Frozen check: 60 new prompts (`evaluation/german-routing-20261113/`)

Prompts, expected results and bars were committed before the first run (`ce2e0c3`). `check.ts` runs `autoDecision`, `germanRulesQuestion` and `needsCurrentInformation` on them.

| Measure | Before | After | Bar | Met after |
| --- | --- | --- | --- | --- |
| German routing agreement (40) | 24 of 40 (60 %) | 39 of 40 (97.5 %) | within 5 points of English | yes (English 100 %) |
| English routing agreement (20) | 15 of 20 (75 %) | 20 of 20 (100 %) | | |
| German rules recall (14) | 4 of 14 (29 %) | 14 of 14 (100 %) | at least 70 % | yes, but see the hold-out |
| False alarms, German prompts not about rules (26) | 0 of 26 | 0 of 26 | at most 5 % | yes |
| English rules recall (4) | 4 of 4 | 4 of 4 | | |
| When-to-search agreement, German (26) / English (16) | 24 / 14 | 25 / 15 | | |
| Answer-side false alarms, stored answers not about rules | 3 of 501 (0.6 %) | 3 of 501 (0.6 %) | at most 0.6 % | yes |

Before the change the bars failed: German routing was 15 points below English and German rules recall was 29 %.

German routing by category, before and after: urgent 3/3 and 3/3, coding 1/3 and 3/3, maths 1/3 and 3/3, rewriting 3/3 and 3/3, reasoning 2/3 and 3/3, everyday 3/4 and 3/4, health 3/3 and 3/3, time-sensitive 3/4 and 4/4, rules 5/14 and 14/14.

**Caveat:** the cues were changed after seeing the misses on this set, so its "after" column is optimistic. The hold-out below is the honest number.

### Second hold-out: 20 German prompts written after the change (`holdout.json`, committed in `ae125a7` before it was run)

| Measure | Code before the change | Code after the change |
| --- | --- | --- |
| Routing agreement | 11 of 20 | 13 of 20 |
| Rules recall (12) | 3 of 12 (25 %) | **5 of 12 (42 %)** |
| False alarms (8 not about rules) | 0 of 8 | 0 of 8 |
| When-to-search agreement (8) | 8 of 8 | 7 of 8 |

**The rules-recall bar (70 %) is not met on the hold-out.** The new cues generalise only partly. Missed: a delayed flight and compensation, notice to a gym, Christmas bonus for part-time work, a student's tax-free earnings ("ohne Steuern zu zahlen"), repair of a broken phone by the shop, barbecue on the balcony, a child cycling on the road. These are everyday permission and entitlement questions about things (Balkon, Flug, Fahrrad) rather than about a person or an office, which the cues need. Nothing was tuned on the hold-out.

New when-to-search false alarm: "Warum sind die Spritpreise am Wochenende oft höher?" now counts as time-sensitive ("am Wochenende"). Its mode is unchanged (Thinking, reasoning); only the search suggestion appears.

### The 40-question set (measured only, not tuned)

The question detector now fires on 23 of 40 (was 20), 19 of the 30 German questions (was 16). I read the 40 prompt texts to avoid overlap with the new prompts, so this number is not clean either. Two words that occur there (Halteverbot, Ruhezeit) were taken out of the change for that reason.

### Older benchmark prompts

On the 168 prompts of the older sets, only five decisions changed, all German-rules prompts now recognised (F-09, F-11, Q20, Q21, Q28). No maths, code, health or everyday prompt changed mode.

## What changed

### 1. Interface texts in German and English (`351a6e9`)

`defineText` blocks with formal "Sie" and the glossary terms: the reply labels (Auto / Schnell / Gründlich, "Vom Ersatzmodell beantwortet"), the waiting status, the unchecked-figures warning, the "no official source" note, the search-first choice ("Ohne Prüfung antworten"), the search and search-again texts and settings, the disappearing-message labels and two context errors. `GERMAN_RULES`, `WHEN_TO_SEARCH`, `MODE_NAMES` and `DISAPPEAR_LABELS` keep their shape and read the interface language at each use, so callers in other files need no change; `answerLabel`, `stillThinkingStatus` and `composeContext` take an optional language. The four files do not import `src/i18n.tsx` at run time: the server runs `src/german-rules.ts` on its own (the Dockerfile copies it alone) and the evaluation browser page loads these files without React. So `src/german-rules.ts` reads the language by the same rule as `readLang()` (the saved pick, else the browser's first language). The English text is unchanged. The model instructions (`GERMAN_RULES.policy`, `sourcedPolicy`) stay English in both blocks.

### 2. The answer-language rule (product prompt only)

Added to the default product prompt in `composeContext`, after the knowledge-date or web rule:

> Reply in the language of the user's latest message unless they ask for another language. If that is unclear (only code, numbers or a name), reply in German, the interface language.

With an English interface the last part reads "reply in English, the interface language." The evaluation variants v1 to v4 are unchanged (their hashes still match), the rule has no digits for the identifier masking to catch, and the product prompt with a short message still fits in 8,000 characters.

### 3. Cues (`5ebedd0`)

- **Rules detector:** everyday words (GEZ, Rundfunkgebühr, Knöllchen, Strafzettel, über Rot, TÜV, Steuer absetzen or zahlen, Steuererstattung, Minijob, Mahnung, Schufa, Pfändung, Unterhalt, Sorgerecht, Scheidung, Nachtruhe, words ending in -pflicht, "welche Rechte", "Recht auf"); registering or deregistering a car, dog, business or home after a move; a permission, duty or deadline question (darf, muss, brauche ich, bis wann, Anspruch) about someone with legal standing (Chef, Arbeitgeber, Nachbar, Polizei, Händler, Versicherung, Amt, Gericht). Tax as an amount stays out: "Netto und Steuer" on the user's own invoice is a sum, not a rules question (it fired once during the change and was fixed).
- **Auto:** code with the language named after the code word ("a list in Python") and German code words (Liste, Fehler, Skript); a percentage of a number, geometry with a figure, and two plain figures with something to work out ("18 Stücke für 7 Kinder"); weighing options (was spricht für, Vorteile, Nachteile, lohnt sich, versus); emergencies in everyday words (umgekippt, nicht ansprechbar, Schmerzen in der Brust, collapsed, not responding); German rewrite imperatives without -e ("Formulier") and "kürzer machen".
- **When to search:** weather, tomorrow, the weekend, next week, and a state that changes ("still open", "noch gesperrt").
- One existing test question, "Was darf mein Chef mir schenken?", is now recognised as a rules question; the test that needs an unrecognised question uses another one.

## Answer language on stored answers (offline)

`stored-answers.ts` counts common German and English words in each question and answer (code, links and citations removed first; a word with an umlaut or ß counts as German). Questions asking for a translation or another language are not scored.

| Stored answers | German questions answered in German | In English | Unclear (figures only) |
| --- | --- | --- | --- |
| Older sets (six folders, 784 answers) | 302 of 308 (98.1 %) | 2 | 4 |
| 40-question set (runs U, S and G) | 90 of 90 (100 %) | 0 | 0 |

- The 2 "English" cases are not model answers: both are the app's notice "Response ended incomplete" (P-G5).
- The 4 unclear cases are calculations made only of figures and units (P-M1, L7-03).
- English questions: 403 of 449 answered in English on the older sets and 30 of 30 on the 40-question set; none in German; the rest are figures, JSON or one word.
- **Manual spot checks:** 27 sampled German question and answer pairs (every 15th) were all German. So before the new rule, a German question already got a German answer in every real case seen. These were all German questions with no interface language involved, so they do not test the fallback for code-only or number-only messages.

## A small live check, if wanted (not run)

About 10 requests on Privatemode, Auto, German interface: 3 German questions, 2 English questions, 2 messages that are only code or only a number, 2 German requests to translate into English, 1 German question after an English earlier turn. Pass if every answer is in the language of the latest message, the code-only and number-only messages are answered in German, and the translations come back in English. Then the two code-only messages again with the English interface. The fallback for unclear messages is the only part the stored answers cannot show.

## Limits and next steps

- **The hold-out shows the question detector still misses about half of everyday German rules questions.** The answer-side check (unchanged, false alarms 3 of 501) remains the real safety net. A broader rule (any "darf ich" or "habe ich Anspruch" question) would catch more but needs its own false-alarm measurement first; health questions ("Darf ich Ibuprofen ...") are the main risk.
- **"heute Abend" in an everyday question** (what to cook tonight) still counts as time-sensitive and sends it to Thinking.
- **One line for whoever owns `src/i18n.tsx`:** call `setTextLanguage(uiLang)` (from `src/german-rules.ts`) once, so these texts also follow a language pick kept only in memory when storage is blocked. Until then they follow the saved pick and the browser language, which covers every case with working storage.
- "Recherche" is assumed as the German name of the Research tab in "Sie können es unter Recherche ausschalten."; it must match the tab's German label.

## How to rerun

From the repository root:

- `npx tsx evaluation/german-routing-20261113/check.ts prompts.json after`
- `npx tsx evaluation/german-routing-20261113/check.ts holdout.json after`
- `npx tsx evaluation/german-routing-20261113/stored-answers.ts <folder with the stored runs, for example ../Private_AI/.local> [--samples]`
