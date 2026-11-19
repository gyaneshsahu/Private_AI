# When to search — design, 12 November 2026

Updated 19 November 2026: search is automatic (`docs/owner-decisions.md`); this file keeps only the detection rules.

The rules run on the device, in `needsCurrentInformation(text)` in `src/when-to-search.ts`, in English and German. Nothing is sent to detect.

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

Explicit ask (added 19 November 2026): a message that asks for a look-up in words always counts, like a time rule, and the explain-or-define exception does not switch it off. English: "search the web for …", "search online", "look it up", "look up online", "google it", "find it online", "check online", "browse the web". German: "such im Internet …", "im Web suchen", "online suchen", "schlag das nach", "recherchiere …", "google …".

## Knowledge dates

Checked on 12 November 2026 (model cards, vendor release notes, Tinfoil's catalogue `evaluation/results/model-catalog-20261112.json` and docs.tinfoil.sh/models/chat):

| Mode model | Training cutoff | Sources |
| --- | --- | --- |
| `deepseek-v4-1-flash` (Fast; Thinking backup) | **Unknown, not published.** | huggingface.co/deepseek-ai/DeepSeek-V4.1-Flash-1017 and /DeepSeek-V4.1-Flash (corpus size only); api-docs.deepseek.com/news/news260910 (release 10 Sep 2026) and news261017 (1017 checkpoint, 17 Oct 2026); DeepLearning.AI The Batch lists the cutoff as undisclosed. |
| `glm-5-3` (Thinking; Fast backup) | **Unknown, not published.** | huggingface.co/zai-org/GLM-5.3 and docs.z.ai/guides/llm/glm-5.3 (no cutoff); DeepLearning.AI The Batch lists it as undisclosed; release about 14 Aug 2026 (third parties only). Z.ai says it shares GLM-5.2's base model; that cutoff was not checked. |

Tinfoil's catalogue gives only a `created` timestamp, which is when the model was added, not a cutoff. Third-party claims based on asking the model itself were inconsistent and are not used. Hence the wording without a date. If a vendor publishes a cutoff, the prompt can name it per mode.
