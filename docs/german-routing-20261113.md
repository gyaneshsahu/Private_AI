# German routing, detection and answer language (13 November 2026)

The owner requires a German and English interface and that the model answers in the user's language. This note covers the parts on the device: Auto's mode choice (`src/answer-modes.ts`), the German-rules detector (`src/german-rules.ts`), the when-to-search detector (`src/when-to-search.ts`) and the model's instructions (`src/conversation.ts`). Everything here was measured offline. No model was called.

## 14 November 2026: English coverage

This section adds English to the rules detector. The German cues are unchanged except for one fix (the cost split, below). Measured offline. No model was called. The two blind sets (`evaluation/german-rules-fresh-20261114/`, `evaluation/english-rules-fresh-20261114/`) were not opened for this work.

### Diagnosis

English needed the country named or a topic from a fixed list. The blind set said 4 of 8. The 40-pair run said 7 of 13 English rules questions against 12 of 13 German ones. The English frames were there every time ("can my boss", "do I have to", "how much is", "am I allowed"). There was no second half to pair them with unless the text said "in Germany".

Owner's assumption, adopted here: CometRow's users live in Germany, Austria or Switzerland. So an English question about an official rule, fee, amount or deadline counts with no country named. A question that names another country does not count.

### What changed (`src/german-rules.ts`)

The same design as German: a frame counts only with a domain.

- **Someone else's permission or duty** counts as it stands: "Can my boss ...", "Can the landlord ...", "Must the shop ...". The counterparty is the domain (landlord, employer, boss, insurer, bank, shop, airline, neighbour, police, authority, school).
- **Permission or consequence** ("allowed", "legal", "illegal", "forbidden", "what happens if I", "at what age") with an official word, a dealing, or an everyday place or role: home, road and travel, work, children.
- **The user's own duty** ("do I have to", "need to", "must", "mandatory") only with an official word, a dealing or a counterparty. "Do I have to water my tomatoes" stays out.
- **An amount, date or need** ("how much", "how long", "by when", "what is the", "do I need", "can I") only with an official word.
- **Entitlement and legality wording counts alone:** "entitled", "by law", "legally", "statutory", "my rights", "time-barred".
- **Official words** are what the state, a law or an authority sets or decides: tax, benefit, allowance, pension, fee, fine, penalty, deposit, permit, visa, licence, residence, authority, deadline, limit, sick pay, parental leave, overtime, refund, compensation. English frames also take the German official words, so "How much Kirchensteuer do I pay" works. "Anmeldung", "Ummeldung" and "Abmeldung" count with an English frame.
- **Registering** an address, car, dog or business counts, as in German.
- **Kept out:**
  - Another country: a place ("in France", "in California") or the rule itself ("US tax", "UK visa", "visa for Thailand"), unless Germany, Austria, Switzerland or "here" is also named. "I am from India" or "my Turkish passport" changes nothing.
  - The rules of a game or sport (chess, Monopoly, football).
  - An organisation's own rule in English ("company policy", "at our company", "my team").
  - "Help me write ..." and "Can you write ...", like "Write ...".
- **With the country named,** an own-duty frame is now enough ("How long does the rest period have to be in Germany?").
- **The German cost split.** A sum on two or more of the user's own figures is now also a sum when it asks for a split or a share ("aufgeteilt", "pro Person", "jede Person", "split", "each person"). The holiday-flat question with "mieten" no longer fires. "euros" and "percent" now count as the user's own figures.
- "landlord" and "tenant" stay topics on their own. "pension" alone no longer counts. It needs a frame now.

No network, no model call, no new dependency. About fifteen more small pattern tests per message.

### How it was measured

- An English development set of 79 prompts (36 rules, 43 not, of which 31 are near-misses) was written and committed before the detector was touched (`evaluation/english-rules-dev-20261114/prompts.json`, commit `be3dbc8`).
- A second round of 34 prompts on other topics was written after the first change and committed before it was run (`round2.json`, commit `c670b17`).
- `tests/german-rules-sets.test.ts` holds the bars for both.

| Set | Before | After |
| --- | --- | --- |
| English development set: recall (36) | 22 of 36 (61 %) | 36 of 36 |
| English development set: false alarms, ordinary (12) | 0 | 0 |
| English development set: false alarms, near-misses (31) | 4 | 2 (6 %) |
| English round 2, first run: recall (16) | 5 of 16 (31 %) | **11 of 16 (69 %)** |
| English round 2, first run: false alarms, ordinary (4) | 0 | 0 |
| English round 2, first run: false alarms, near-misses (14) | 0 | **3 (21 %)** |
| English round 2, after the fixes it led to | | 15 of 16, 1 near-miss |
| German development set (30 / 30) | 30 of 30, 0 | 30 of 30, 0 |
| German round 2 (22 / 14) | 19 of 22, 0 | 19 of 22, 0 |
| Frozen set of 13 November (18 / 42) | 18 of 18, 0 | 18 of 18, 0 |
| First hold-out of 13 November (12 / 8) | 12 of 12, 0 | 12 of 12, 0 |
| 40-question set, all rules questions | 32 of 40 | 34 of 40 |
| 40-pair run, English rules questions (13) | 7 of 13 | 12 of 13 |
| 40-pair run, German rules questions (13) | 12 of 13 | 12 of 13 |
| 40-pair run, German maths (13), false alarms | 1 (the cost split) | 0 |
| 40-pair run, English general and maths (27), false alarms | 0 | 0 |
| 478 stored prompts outside the new English sets: decisions changed | | 9: eight rules questions now recognised, one false alarm gone |

**How to read this.**
- The development set is optimistic. I wrote it and tuned on it.
- **The honest number is the first run of round 2: 69 % recall, 3 false alarms of 14 near-misses, none on ordinary questions.** Before the change the same round was 31 %.
- The 40-pair numbers are not clean either. I read the three English misses there after the first change. Two led to general fixes (time-barred, an own duty with the country named).
- Expect about 70 to 85 % English recall on a fresh set, a few false alarms on hard near-misses, and none or nearly none on ordinary questions. The lead's blind sets give the clean number.
- The nine changed decisions: R-03, Q35, Q38, and P-R01, R03, R08, R09, R13 in English are now recognised. P-M12 in German no longer fires. No general, maths, code or health prompt changed.

`tests/german-rules.test.ts` and `tests/german-rules-sets.test.ts` pass (170 tests). Ten neighbouring test files for Auto, when-to-search and the search ranking pass unchanged. `npx tsc --noEmit` is clean. The whole suite and the browser tests were not run.

### What still slips through

Missed English rules questions:
- **"Can I" as a permission with no legal word:** "How late can I make noise on a Saturday?", "Can I park here overnight?". English "can" is "darf" and "kann" in one word. Counting it with a place gave too many false alarms ("Can I take the train to Prague?").
- **An amount about a counterparty with no official word:** "How long does my employer keep paying my salary when I am sick?" German misses this one too.
- **A rule with no frame and no official word:** "Quiet hours on Sunday?"
- **Legality with nothing from a domain:** "Is it legal to record a call?" It is caught with "in Germany" or with a place or counterparty.
- **Typos in English official words.** German compounds survive a typo in the first part. English words do not.

False alarms that remain possible:
- **Personal questions with permission wording about a counterparty:** "My boss never says thank you. Am I allowed to be annoyed?"
- **A landlord or tenant with no rule asked:** "My landlord is rude to me. How do I stay calm?" This fired before too.
- **Sport and history with a penalty or fee word:** "What is the penalty for a false start in the 100 metres?"
- **Private prices and limits with an official-looking word:** a gym fee, a baggage allowance, a character limit.
- **Another country that the cues do not see:** "Do I need a visa for Thailand?" is kept out, but "Do I need a visa to go to Thailand?" still fires. So does a fee or fine in a country that is not on the list of names ("in Vietnam").
- **A custom with the country named:** "Do I have to tip in Germany?"

The answer-side check stays the safety net for misses.

### Knock-on effects

- **Auto and cost.** A newly recognised English question goes to Thinking with reason "rules" (Fast when web results are selected). On the 40-pair run English was 20 Fast and 20 Thinking. With this detector it is 15 and 25. German is 14 and 26. So English now costs about what German costs. In that run German used about 11 % more tokens per message (median 1,032 against 931) and took longer (5.5 s against 3.9 s). The rise applies only to rules questions. On my English development set 12 of 36 rules questions moved from Fast to Thinking and 2 more changed only their reason.
- **The scoped prompt rule** is now added for these English questions: without web results the model is told not to state figures as facts.
- **Before sending.** These questions now get the rules heading and the search-first choice. That is one more tap for the user, on real rules questions and on the false alarms above.
- **The search text has no country.** The search sends exactly the user's text. "How much is the TV licence?" names no country, and the Brave request sets none. The results may be British. The ranking then puts German official sites first if any came back, and the model is told to prefer official sources. If none came back, the answer carries the note that no official source was found. That note is honest, but the answer may rest on another country's page. **This is the main risk of this change.** Not fixed here, because it changes what is sent to the search provider. Options for the owner: add the country to the Brave request as a parameter, or show "Germany" in the suggested search text so the user sees and approves it.
- **Austria and Switzerland.** The official list is German on purpose (gv.at is "other"). The prompt rule says "German rules" and names gesetze-im-internet.de. An Austrian or Swiss question is detected but ranked and instructed as if it were German. This was already so for "in Austria" since the second pass. More such questions reach it now.
- **Server.** `server/research.ts` uses the same detector, so these English searches ask for 10 results, are ranked by tier and cut to 6. `src/german-rules.ts` still imports nothing at run time.

### How to rerun

- `npx vitest run tests/german-rules-sets.test.ts --disable-console-intercept`
- `npx vitest run tests/german-rules.test.ts`

## 14 November 2026: the rules detector, second pass

This section replaces the hold-out numbers and the first limit below for the rules detector. Nothing else in this note changed. Measured offline. No model was called. The answer-side warning, the always-search setting and the official-source preference are untouched.

### Diagnosis: why 7 of the 12 fresh prompts were missed

The detector knew topics by name and one question shape (permission or duty about a person or an office). Each miss had a clear rules shape but no word from the lists.

| Prompt | What it asks | What was absent |
| --- | --- | --- |
| HD-01 delayed flight, "Bekomme ich da Geld zurück?" | a claim | no cue for "bekomme ich" or for money back |
| HD-02 notice to the gym, "Wie lange vorher muss ich ..." | own duty and a deadline | the gym is not a listed party |
| HD-03 "Anspruch auf Weihnachtsgeld" | an entitlement | "Anspruch" counted only next to a listed party. Weihnachtsgeld was not a listed benefit |
| HD-05 student job, "Wie viel Geld darf ich ... verdienen, ohne Steuern zu zahlen" | a limit | "darf ich" needed a party. "ohne Steuern zu zahlen" is not the listed order "Steuern zahlen" |
| HD-07 broken phone, "Muss der Laden es reparieren?" | someone else's duty | "muss der" was not a duty form. "Laden" is not a listed party |
| HD-09 "Darf ich auf meinem Balkon grillen?" | a permission | permission about a place, not a person |
| HD-10 child cycling on the road, "Ab wann darf mein Kind ..." | a permission by age | permission about a thing and a place |

The pattern: the question frame was there every time (darf, muss, Anspruch, bekomme ich, wie viel, ab wann). What was missing was the second half. The lists named persons and offices, but people ask about places, things, contracts and payments. More topic words would not fix this. The next fresh set would use other words again.

### What changed (`src/german-rules.ts`)

The old cues stay. Added on top:

- **Missing umlauts.** The text and every cue are compared in one folded spelling (ä as ae, ß as ss). "kuendigung" and "Kündigung" are the same word now.
- **Frames with domains.** A question counts when a frame meets a domain:
  - permission, punishment, or someone else's duty ("darf", "verboten", "Muss der Laden ...", "Müssen Überstunden ...") with an everyday-law word: home, school and age limits, road and travel, work, buying and contracts;
  - the user's own duty ("muss ich") only with a counterparty (contract, seller, invoice, records) or an official word. "Muss ich" is as often practical as legal, see the false alarms below;
  - an amount, date, need or payment ("wie viel", "wie hoch", "bis wann", "ab wann", "brauche ich", "bekomme ich", "kann ich") only with an official word.
- **Official words by their last part.** German official words are compounds on a few heads: -geld, -steuer, -beitrag, -gebühr, -pauschale, -zuschlag, -beihilfe, -sicherung, -grenze, -amt, -bescheid, -antrag, -genehmigung, -bewilligung, -verbot, -strafe, -lohn. Any compound on such a head counts, named or not (Grundsicherung, Familienbeihilfe, Aufenthaltsbewilligung, Autobahnvignette). A typo in the first part still matches ("Mindeslohn"). Everyday compounds are kept out (Trinkgeld, Taschengeld, insgesamt).
- **Entitlement and legality wording counts alone:** "Anspruch auf", "steht mir ... zu", "gesetzlich", "rechtlich", "rechtens", "strafbar", "verjährt".
- **Kept out:** a sum on the user's own figures (two or more money or percent amounts), a question about software (Python, Excel, SQL ...), code identifiers (`checkFrist`, `max_miete`), an organisation's own rule ("bei uns in der Firma", "Intranet"), and "Darf ich dich ... fragen".
- **English:** "in Austria" and "in Switzerland" count like "in Germany". A few more rule words count next to the country (visa, permit, tax, insurance, eligible, "can my", "how long can I", "do I need to"). English without a country and without a listed topic is unchanged.

No network, no model call, no new dependency. About twenty small pattern tests per message.

### How it was measured

- A development set of 60 new prompts (30 rules, 30 not, with hard near-misses) was written and committed before the detector was touched (`evaluation/german-rules-dev-20261114/prompts.json`, commit `86ab6b7`).
- A second round of 36 prompts on other topics was written after the first change and committed before it was run (`round2.json`, commit `1f5c5e0`).
- `tests/german-rules-sets.test.ts` runs every set and holds the bars.

| Set | Before | After |
| --- | --- | --- |
| Development set: recall (30) | 8 of 30 (27 %) | 30 of 30 (100 %) |
| Development set: false alarms (30) | 3 of 30 (10 %) | 0 of 30 |
| Round 2, first run: recall (22) | 6 of 22 (27 %) | 15 of 22 (68 %) |
| Round 2, first run: false alarms (14) | 1 of 14 | 4 of 14 (29 %) |
| Round 2, after the fixes it led to | | 19 of 22 (86 %), 0 of 14 |
| Frozen set of 13 November: German recall (14) | 14 of 14 | 14 of 14 |
| Frozen set: English recall (4) | 4 of 4 | 4 of 4 |
| Frozen set: false alarms (42) | 0 of 42 | 0 of 42 |
| First hold-out of 13 November: recall (12) | 5 of 12 (42 %) | 12 of 12 |
| First hold-out: false alarms (8) | 0 of 8 | 0 of 8 |
| 40-question set, all rules questions | 23 of 40 | 32 of 40 (80 %) |
| All 347 stored prompts: decisions changed | | 9, all in the 40-question set, all now recognised |

**How to read this.**
- The development set and the first hold-out are optimistic. I wrote the first and I read the seven misses of the second before the change.
- **The honest numbers are the first run of round 2 and the 40-question set.** Round 2 said 68 % recall and 4 false alarms of 14 hard near-misses. The 40-question set says 80 %. Its texts were not read for this work, only its ids.
- The four round-2 false alarms were three kinds: a practical "muss ich" about a car and a garden, a question to the assistant ("Darf ich ... dich fragen"), and a coding question. Each led to one general fix (own duty needs a counterparty, questions to the assistant, software). After that round 2 is no longer a clean check.
- Expect about 75 to 85 % recall on a truly fresh set, and a few false alarms on hard near-misses. The lead's hold-out at `evaluation/german-rules-fresh-20261114/` is the clean number. It was not seen here.

Existing tests: `tests/german-rules.test.ts` passes with 19 new cases. The 16 other test files that use the detector, Auto, when-to-search, the prompt rule or the search ranking pass unchanged, and so do the three browser tests for these screens. `npx tsc --noEmit` is clean. The whole suite was not run.

### What still slips through

Missed rules questions:
- **Typos in the head of the word** ("kfz steur", "Kindergeldt"). A typo in the first part of a compound is fine.
- **Permission or amount about a thing no family names:** bringing cigarettes across the border, a doctor's note ("Attest"), deposits on bottles, how long a prescription is valid.
- **A practical-looking own duty:** "Muss ich im Auto eine Warnweste haben?" has "muss ich" and a place only, which is left alone on purpose.
- **"Wie viele Tage Urlaub habe ich?"** An amount with a work word but no official word. "Wie viel Urlaub steht mir zu" is caught.
- **English with no country and no listed topic:** "Can my boss read my emails?"
- **Passive and "kann" forms without an official word:** "Kann mir der Strom abgestellt werden?"
- **Eight of the 40-question set** (Q16, Q17, Q19, Q22, Q35 to Q38). Not read, so not diagnosed.

False alarms that remain possible:
- **Permission about a listed place that is not legal:** "Darf ich nach der Operation Auto fahren?", "Darf mein Kind mit Fieber in die Schule?"
- **Market prices with an official-looking head:** "Was kostet eine Haftpflichtversicherung?", "Wie hoch ist der Beitrag im Fitnessstudio?" A search still helps there, but it is not an official rule.
- **A company rule without a marker,** such as "Bis wann muss ich den Urlaubsantrag abgeben?"
- **A coding question in prose with no language named:** "Wie baue ich eine Funktion für die Kündigungsfrist?" This fired before the change too.
- **A sum with one figure, or a sum on a topic word,** such as rent with a single amount.

The answer-side check stays the safety net for what the question detector misses.

### Effect on other routing

- **Auto:** a newly recognised question goes to Thinking with reason "rules" (Fast with web results). Urgent, code, maths and rewrite are decided first, so none of those changed. On the 347 stored prompts no mode changed outside the 40-question set.
- **When to search:** a newly recognised question gets the rules heading and the search-first choice. `needsCurrentInformation` itself is unchanged.
- **Before sending and Auto can differ:** a sum with a topic word and one figure goes to maths in Auto but still shows the search-first choice. This was so before.
- **Server:** `server/research.ts` uses the same detector for the official-source ranking, so more searches are ranked official first. `src/german-rules.ts` still imports nothing at run time.

### How to rerun

- `npx vitest run tests/german-rules-sets.test.ts --disable-console-intercept` prints recall, false alarms and every miss per set.
- `npx vitest run tests/german-rules.test.ts`

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

## 14 November 2026: result on the blind hold-out

The hold-out `evaluation/german-rules-fresh-20261114/` (60 prompts: 30 rules questions, 30 others of which 18 are deliberate near-misses) was written by a separate agent that never read the detector or earlier sets. The agent that changed the detector never saw it. Scored once, by the lead, with `npx tsx evaluation/german-rules-fresh-20261114/score.ts`.

| | Before (13 November detector) | After (second pass) |
| --- | --- | --- |
| Rules questions caught | 21 of 30 (70 %) | **24 of 30 (80 %)** |
| German | 17 of 22 | 20 of 22 (91 %) |
| English | 4 of 8 | 4 of 8 |
| False alarms, all 30 others | 5 | 6 |
| False alarms, 12 ordinary others | 0 | 0 |
| False alarms, 18 near-misses | 5 | 6 |

- German recall is now 91 % on prompts nobody tuned on. The earlier figure of 5 of 12 came from a smaller, harder sample.
- **English questions about German rules are the weak spot** (half missed, unchanged). The detector needs the country named or a listed topic.
- False alarms happen only on near-misses built to share vocabulary (a rent sum on the user's own figures, "Frist" in project management, a historical rate). A false alarm costs one extra tap (the search-first question). A miss falls back to the answer-side warning.
- This set has now been used once and is frozen. It must not be used for tuning. Which prompts were missed is recorded by id only (missed after: F2-01, F2-05, F2-07, F2-15, F2-26, F2-30; false alarms after: F2-31, F2-33, F2-38, F2-43, F2-47, F2-48).
- The time box is used up. Next step if wanted: English frames without a country, tested on a new blind set.

## 14 November 2026: English coverage, result on the blind English hold-out

The English hold-out `evaluation/english-rules-fresh-20261114/` (60 prompts: 30 rules questions of which 12 name Germany, 12 name no country, 3 Austria, 3 Switzerland; 30 others of which 25 are near-misses) was written by a separate agent that read neither the detector nor any earlier set. The agent that changed the detector never saw it. Scored by the lead with `npx tsx evaluation/english-rules-fresh-20261114/score.ts`, once before and once after the change.

| | Before | After (English coverage) |
| --- | --- | --- |
| English rules questions caught | 15 of 30 (50 %) | **26 of 30 (87 %)** |
| False alarms, 5 ordinary others | 0 | 0 |
| False alarms, 25 near-misses | 6 | 7 |

The German hold-out, scored again only to check for regression (not used for tuning): 26 of 30 caught (German 20 of 22 as before, English 6 of 8, was 4), false alarms 7 of 18 near-misses (was 6), 0 of 12 ordinary.

- **English is now at the German level** on prompts nobody tuned on: 87 % against 91 %.
- False alarms stay confined to near-misses in both sets. A false alarm costs one extra tap.
- Missed after, by id only: E-03, E-07, E-09, E-33. False alarms after: E-02, E-15, E-21, E-25, E-30, E-36, E-40. Both hold-outs are now used and frozen.
- **Open, found by the detector agent and not fixed:** the web search for an English rules question sends the user's text with no country, so "How much is the TV licence?" may bring back British pages. Austrian and Swiss questions are detected but ranked and instructed as German. Both change what is sent to the search provider, so they are a separate step.
- **Cost:** English rules questions now go to Thinking as German ones do (in the 40-pair run: English 15 Fast / 25 Thinking instead of 20 / 20).
