# Official-source preference: bars

**Status: FROZEN on 13 November 2026, before any run.**

## Setup

- **Prompts:** 13 fresh German rules, fees and deadlines questions in `prompts.json`. None was used to tune the product or the earlier sets.
- **Runs:** Auto, search path (the runner picks "Search and answer"), on Privatemode, through the real app. Once **before** the official-source preference, on the code at the start of the build, and once **after**.
- **Search text:** the same exact text the suggestion shows. The approval rule is unchanged.
- **Grading:** one fresh blind grader scores before and after together on one shuffled sheet, so both are judged the same way. It checks facts live on the run day.

## Bars for the "after" run

| Measure | Bar |
| --- | --- |
| Confident wrong figure, deadline or rule | at most 1 of 13 |
| Mean score (1-5) | at least 4.2 |
| An official or primary source cited for the key fact | at least 10 of 13 |
| The page the server read is official | at least 9 of 13 |
| When no official source was in the results, the answer says so | every time |
| Not worse than "before" on any measure above | required |

## What a failure tells us

| Failure | Next step |
| --- | --- |
| Official pages are found but not read | the page choice |
| Official pages are not in the results at all | the search side: more results, a second query the user sees, or an official-site hint in the shown text |
| Official page read, still wrong | the model's reading (excerpt length, page text cut at 6,000 characters) |
