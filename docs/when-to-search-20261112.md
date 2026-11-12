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

## Exact wording (verbatim)

Suggestion box above the composer:
- Heading: **"This question may need current information."**
- Label before the text: **"Search the web for:"** followed by the exact search text.
- When identifiers were removed (existing wording from `describeKept`): **"Removed from the search text before approval: 1 email address."** (counts and kinds vary).
- When the text may still name a person (existing wording): **"This search text may still contain personal details, such as a name or a long number, that cannot be recognised automatically. The search provider will see exactly this text. Approve only if that is fine."**
- Explanation: **"One tap sends exactly this text to Brave Search through our server, and our server opens the top official result page. Nothing else from your conversation is sent. Press Send instead to answer without searching."**
- Button: **"Search and answer"**

Setting in the Research tab (checkbox, off by default):
- Label: **"Search automatically when a question needs current information"**
- Help: **"Off unless you switch it on. When it is on, a question that looks time-sensitive is searched before it is answered, without asking each time. Recognised personal details are removed from the search text on this device first, and the exact text sent is shown under the message box. This setting is kept only on this device."**

Status line under the composer after a search from a suggestion or from the setting:
- After a tap: **"Searched the web for: "…""** followed by the exact text and, when there is one, the top-page note below.
- Automatic: **"Searched the web automatically for: "…""** followed by the same.
- If an automatic search fails, the question is still answered from the model's knowledge: **"The automatic search did not complete, so this answer does not use web results."**

Top-page notes (from part 1 of today's work; `src/research-result.ts`):
- **"Our server also opened the top official result and read its text: <address>"**
- **"Our server also opened the top official result without the part of its address after "?", because that part contained a personal detail: <address>"**
- **"The top result (<site>) was not opened, because its address contained a personal detail. The answer uses the search excerpts only."**
- **"The top result (<site>) could not be opened. The answer uses the search excerpts only."**
- Added to every search approval in the Research tab: **"Our server will also open the top official result page and read its text for this answer. That site sees our server's address, not yours."**

Model prompt (default product prompt only; the model's own words will vary):
- Without web results: "When an answer may depend on recent or changing information, such as prices, office holders or current events, say that your knowledge comes from training data with an unpublished end date and may be out of date, and offer a web search."
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
