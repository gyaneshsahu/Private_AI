# What the search-first tap costs, and what would work better (13 November 2026)

## What the tap costs

The tap: on a question about German rules, fees or deadlines, Send asks "Search and answer" / "Answer without checking".

| | Measured |
| --- | --- |
| How often it appears | 18 of 103 benchmark prompts (17 %). The benchmarks deliberately over-represent German rules, so in everyday use it is likely a few percent of messages. |
| Extra effort | One decision and one tap, with about a second of reading. "Search and answer" has the focus, so Enter picks it. |
| Time to the answer, with "Search and answer" | median **12 s** in total (first word 3 s, at most 16 s). The answer comes from Fast, because the web results are in the context. |
| Time to the answer, with "Answer without checking" | median **65 s** in total (first word 55 s, at most 109 s). Auto sends an unsourced rules question to Thinking. |
| Quality | With search, answers are clearly better (3.8-4.2 against 3.1-3.5 without). |

**Net:**
- For most people the tap makes the answer faster and better, not slower.
- **The real cost is interruption:** someone who just wants a rough idea, or who asks several rules questions in a row, has to decide each time.
- **The risk is habit:** people who learn to click "Answer without checking" every time get the warnings, but stop reading them.

## Official-source preference: what it showed

On 13 fresh questions it did not improve the scores (before 3.92, after 3.69; the change is within run-to-run variation; see `evaluation/german-rules-official-20261113/SUMMARY.md`). Two limits outside the page choice:

1. **The detector missed 4 of 13 fresh questions** (Führungszeugnis fee, tax-free gifts, sick notes, cash at customs). These were never searched, and they held most of the wrong answers. Keyword rules cover the words we thought of and miss the rest.
2. **Brave's results often contain no official page:** on 5 of the 9 searched questions, even with 10 results. Re-ranking cannot pick a page that is not there.

Kept from the build:
- an official page is read whenever one is in the results
- foreign authorities no longer count as official
- answers and the app now say when no official source was found

## Better than what was asked: recommendations, in order of effect

1. **Check the answer, not only the question.** The unchecked-figures warning and the one-tap "Search and answer again" now depend on the question detector. A check on the answer itself would catch what the question detector misses: German legal references (§, BGB, Gesetz), fee amounts in EUR next to authority or deadline words, and "Frist", "Bußgeld" and similar.
   - It runs on the device, with no model call and nothing sent.
   - For this risk it is the most robust fix, because it reacts to what the answer claims rather than to how the question was worded.
2. **Let Brave rank official sites higher, with the search text unchanged.** Brave's API offers re-ranking rules ("Goggles") that boost chosen domains inside Brave's own ranking, not just inside the 10 results we get. The search text the user approved stays exactly the same; only the ranking changes.
   - **To check first:** whether our Brave plan supports Goggles, and the wording for the privacy text.
   - If it is not available, the fallback is a second query restricted to official domains, which the user sees in the approval box.
3. **A scoped opt-in in the choice:** a checkbox "Always search for rules, fees and deadlines", stored on this device only. It removes the tap for people who ask these questions often, and keeps approval by default for everyone else.
   - This is narrower than automatic search, which covers every time-sensitive question.
4. **A small on-device classifier,** instead of or alongside the keyword detector, trained on synthetic German questions. It is private (it never leaves the device) and generalises better than word lists. It is worth doing after the alpha, once 1 and 2 show how much is still missed.
