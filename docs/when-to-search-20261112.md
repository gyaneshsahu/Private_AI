# When to search — design, 12 November 2026

Written before the tests and the code, as the owner asked. Status: implemented on branch `codex/development-handoff` (not deployed). Every new user-facing string is quoted verbatim below; the code takes these strings from `src/when-to-search.ts`, `src/research-result.ts`, `src/conversation.ts` and `shared/privacy-copy.ts`.

## Why

The blind benchmark of 12 November found answers to time-sensitive questions (prices, opening hours, current office holders) given from the model's training data without saying that it may be out of date, and no easy way to search. Today a search needs four steps in the Research tab.

## What changes

1. **Detection on the device.** `needsCurrentInformation(text)` in `src/when-to-search.ts` applies fixed rules, in English and German, to the message being written. Nothing is sent to detect.
2. **One-tap suggestion.** When a draft is detected, a box above the composer shows the exact search text (identifiers removed on the device, as in the Research tab). One tap runs that exact text and then sends the question. The tap is the approval, because the text that will be sent is on screen. The Research tab's review-then-approve flow stays the default path and is unchanged. Pressing Send without tapping answers without searching.
3. **Knowledge date in the answer.** The default product prompt tells the model to say, when an answer may depend on recent or changing information, that its training data ends at an unpublished date and may be out of date, and to offer a web search. No date is given because neither model's cutoff is published (see below).
4. **Optional automatic search.** A setting in the Research tab, off by default, kept only on this device. When on, Send on a detected question first runs the search with the same masked text, then sends the question. The exact search text is shown under the composer.

Nothing is searched without either a tap on a suggestion that shows the text, the existing Research approval, or the opt-in setting. Tests check each of these.

## Detection rules

A question is time-sensitive when one of the **time rules** matches, or when one of the **topic rules** matches and the question is not a request to explain or define something.

Time rules (always count):
- English: current, currently, latest, newest, today, today's, tonight, right now, as of now, at the moment, these days, this week, this month, this year, yesterday, last week, recent, recently, "in the news", "still valid", "in force", "who won", election result(s).
- German: aktuell, aktuelle(n/r/s), derzeit, zurzeit, momentan, im Moment, heute, heutige, neueste, neuste, diese Woche, diesen Monat, dieses Jahr, in diesem Jahr, gestern, letzte Woche, "noch gültig", "in Kraft", "wer hat gewonnen", Wahlergebnis.
- An explicit year from last year onward on the device clock (in 2026: 2025, 2026, 2027 …), unless it is part of a calculation such as "2025 * 3".
- Office holders: "who is the (current) CEO / president / prime minister / chancellor / minister / mayor / head / leader / chair of …", "who runs …"; German: Bundeskanzler(in), Bundespräsident(in), Ministerpräsident(in), Bürgermeister(in), Vorsitzende(r), "wer ist (der/die) Chef(in) von", "wer leitet".

Topic rules (count unless the question asks to explain or define):
- Prices, fees, rates: price(s), cost(s), "how much is/are/does/do" not followed by a number, fee(s), fare(s), tariff, interest rate, exchange rate, inflation rate, tax rate, minimum wage; German: Preis(e), kostet, Kosten, Gebühr(en), Beitrag, Tarif, Zinssatz, Zinsen, Leitzins, Wechselkurs, Inflationsrate, Steuersatz, Mindestlohn, Rundfunkbeitrag.
- Opening hours, timetables, schedules: opening hours, open on/until, closing time, timetable, schedule, departures; German: Öffnungszeiten, geöffnet, Fahrplan, Abfahrt(en), Termine.
- Counts that change: how many moons, population, how many people live, number of members/employees/users; German: wie viele Monde, Einwohner, Einwohnerzahl, Bevölkerung, wie viele Menschen leben, Anzahl der Mitglieder.

Explain-or-define requests (switch off topic rules only): explain, define, definition, "what does … mean", "how does … work", "why"; German: erkläre, erklär, definiere, Definition, "was bedeutet", "wie funktioniert", warum.

Not detected (tested): "What is photosynthesis?", "Explain recursion", "How does the exchange rate mechanism work?", "How much is 15% of 80?", "Was ist Photosynthese?", "Erkläre Rekursion", "Write a poem about the sea", "Wie funktioniert der Leitzins?", "Calculate 2025 * 3", "What does a prime minister do?".

Detected (tested): "What is the current ECB deposit rate?", "Who is the CEO of Siemens?", "How many moons does Saturn have?", "Deutsches Museum opening hours", "How much does the BahnCard 25 cost?", "What happened in the 2026 election?", "Wer ist Bundeskanzler?", "Was kostet das Deutschlandticket?", "Wie hoch ist der Mindestlohn?", "Öffnungszeiten Rathaus München", "Wie viele Einwohner hat Berlin?", "Welche Regeln gelten heute?".

## Search text

The search text is the question as typed, with recognised identifiers removed on the device by `prepareSearchQuery` (the same function as the Research tab). If the result is shorter than 2 or longer than 200 characters, no suggestion is shown and automatic search does not run: long messages are rarely a simple lookup, and the provider limit is 400.

**Update, 14 November 2026 (owner decision):** for a rules question that names no country, the search text ends with "Germany" ("Deutschland" for a German interface or a German question). The word is added on the device after the identifiers are removed, is shown in the box before the tap, and is part of the exact text sent to Brave Search; the server adds nothing. Ordinary time-sensitive searches are unchanged. Rule and examples: `docs/german-routing-20261113.md`, last section.

**Update, 14 November 2026: the search text can be edited.** The text in the box is now a text field, filled with the suggestion. It is the same field in all three places the box appears: the suggestion above the message box, the search-first choice on Send, and the search-again box under an answer.

- **Nothing edited:** one tap sends the suggestion, as before.
- **Edited:** what the user types is masked again on the device on every change, by the same `prepareSearchQuery` (`editedSearchText` in `src/when-to-search.ts`). The field keeps what the user typed. When the masked text differs from it (an identifier was removed, or a line break or double space became one space), the line "This text will be sent:" and the exact text appear under the field, and the "Removed from the search text before approval" line counts what was removed from the question and from the edit together. The tap sends the masked text, never the typed one. The field is not rewritten while the user types, because that would move the cursor in the middle of a word.
- **Limits:** the server accepts a search text of 2 to 400 characters after trimming (`disclosureSchema` in `shared/contracts.ts`), and the device checks the masked text against that same schema. Shorter, or empty: the search button is disabled and "The search text needs at least 2 characters." is shown. Longer (possible only when masking lengthens the text, since the field stops at 400 typed characters): the button is disabled and "The search text is too long. The limit is 400 characters." is shown. The 200-character rule still decides whether a suggestion is offered at all; it does not limit the edit.
- **Enter** in the field does what the search button does. It never sends the chat message. Escape still closes the search-first choice.
- **Scope of an edit:** one suggestion for one draft. Changing the question brings the new suggestion. Sending (also after a search) or another conversation drops the edit; after a failed search it is kept. Nothing is stored.
- **Automatic paths** ("Search automatically ..." and "Always search for rules, fees and deadlines") show no box and send the unedited suggestion.
- **The question is not changed.** The edit changes only what goes to Brave Search. The chat message is sent as typed and masked as before.
- The disclosure sentence ("One tap sends exactly this text ...") is unchanged: with no difference the field is the text, and with a difference the exact text stands directly above the sentence.
- Tested by `tests/when-to-search.test.ts` and, in a local Chromium at 375 px, `tests/when-to-search-ui.test.ts` and `tests/german-rules-ui.test.ts` (the request body equals the shown text). Not checked: real phones, Safari, Firefox, a screen reader, an on-screen keyboard.

## Exact wording (verbatim)

Suggestion box above the composer:
- Heading: **"This question may need current information."**
- Label before the text: **"Search the web for:"** followed by the exact search text (since 14 November an editable field; this text is its label).
- When an edit was changed by masking: **"This text will be sent:"** followed by the exact text.
- When an edit is too short or too long: **"The search text needs at least 2 characters."** / **"The search text is too long. The limit is 400 characters."**
- When identifiers were removed (existing wording from `describeKept`): **"Removed from the search text before approval: 1 email address."** (counts and kinds vary).
- When the text may still name a person (existing wording): **"This search text may still contain personal details, such as a name or a long number, that cannot be recognised automatically. The search provider will see exactly this text. Approve only if that is fine."**
- Explanation: **"One tap sends exactly this text to Brave Search through our server, and our server opens the top result page, preferring an official site. Nothing else from your conversation is sent. Press Send instead to answer without searching."**
- Button: **"Search and answer"**

Setting in the Research tab (checkbox, off by default):
- Label: **"Search automatically when a question needs current information"**
- Help: **"Off unless you switch it on. When it is on, a question that looks time-sensitive is searched before it is answered, without asking each time. Recognised personal details are removed from the search text on this device first, and the exact text sent is shown under the message box. This setting is kept only on this device."**

Status line under the composer after a search from a suggestion or from the setting:
- After a tap: **"Searched the web for: "…""** followed by the exact text and, when there is one, the top-page note below.
- Automatic: **"Searched the web automatically for: "…""** followed by the same.
- If an automatic search fails, the question is still answered from the model's knowledge: **"The automatic search did not complete, so this answer does not use web results."**

Top-page notes (from part 1 of today's work; `src/research-result.ts`):
- **"Our server also opened the top official result and read its text: <address>"** ("the top result" when the page read is not an official site, e.g. after a fallback)
- **"Our server also opened the top official result without the part of its address after "?", because that part contained a personal detail: <address>"**
- **"The top result (<site>) was not opened, because its address contained a personal detail. The answer uses the search excerpts only."**
- **"The top result (<site>) could not be opened. The answer uses the search excerpts only."**
- Added to every search approval in the Research tab: **"Our server will also open the top result page, preferring an official site, and read its text for this answer. That site sees our server's address, not yours."**

Model prompt (default product prompt only; the model's own words will vary):
- Without web results: "When an answer may depend on recent or changing information, such as prices, office holders or current events, say that your knowledge comes from training data with an unpublished end date and may be out of date, and offer a web search. Never claim you lack web access."
- With web results: "The web results below come from a search the user approved; CometRow's server ran it and may have opened the top result page. Build the answer from them. Never say you cannot browse or have no browsing or search tools. If something asked is missing from the results, say exactly what is missing and offer another search."

Research tab introduction (replaces "Your conversation is never automatically added to a search. Review the exact query or URL before sharing."):
- **"Nothing from your conversation goes into a search unless you approve the exact text here, tap a search suggestion that shows it, or switch on automatic search below."**

Privacy statement, research section (`shared/privacy-copy.ts`). The first sentence now reads: "A web search only happens when you approve the exact search text shown to you, in Research or by tapping a search suggestion, or when you have switched on automatic search." Added sentences:
- "Under the same approval, our server also opens the top result page, preferring an official site, and reads its text. That site sees our server's address, not yours. If the page address contains a recognised personal detail, the page is opened without the part that holds it, or not at all. The page text is used only for answers in that conversation and is never saved."
- "If you switch on automatic search, a question that looks time-sensitive is searched without asking each time: recognised identifiers are removed on your device first and the exact text sent is shown to you. The setting is off until you switch it on and is kept only on this device."

## Knowledge dates

Checked on 12 November 2026 (model cards, vendor release notes, Tinfoil's catalogue `evaluation/results/model-catalog-20261112.json` and docs.tinfoil.sh/models/chat):

| Mode model | Training cutoff | Sources |
| --- | --- | --- |
| `deepseek-v4-1-flash` (Fast; Thinking backup) | **Unknown, not published.** | huggingface.co/deepseek-ai/DeepSeek-V4.1-Flash-1017 and /DeepSeek-V4.1-Flash (corpus size only); api-docs.deepseek.com/news/news260910 (release 10 Sep 2026) and news261017 (1017 checkpoint, 17 Oct 2026); DeepLearning.AI The Batch lists the cutoff as undisclosed. |
| `glm-5-3` (Thinking; Fast backup) | **Unknown, not published.** | huggingface.co/zai-org/GLM-5.3 and docs.z.ai/guides/llm/glm-5.3 (no cutoff); DeepLearning.AI The Batch lists it as undisclosed; release about 14 Aug 2026 (third parties only). Z.ai says it shares GLM-5.2's base model; that cutoff was not checked. |

Tinfoil's catalogue gives only a `created` timestamp, which is when the model was added, not a cutoff. Third-party claims based on asking the model itself were inconsistent and are not used. Hence the wording without a date. If a vendor publishes a cutoff, the prompt can name it per mode.

## Settings and storage

`privateai.autoSearch` in `localStorage`, value `"on"` or absent. Read failures (private windows, blocked storage) mean off. It is never sent to our server and is not part of saved conversations or backups.

## Not done

- No server-side detection or logging of which questions were detected.
- No suggestion under earlier answers; the suggestion follows the draft being written.
- No per-mode dates (none are published).

**Update, 12 November (evening):** after an answer to a time-sensitive question given without web results, the same box offers to check it ("This answer did not use current information." / "Search and answer again"); Auto now routes such questions to Thinking when there are no web results. See `docs/routing-and-search-20261112.md`.
