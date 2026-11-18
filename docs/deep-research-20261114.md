# Deep research (14 November 2026)

Status: **built and tested offline, switched off by default, nothing verified live.** No request went to Privatemode or Brave while building it.

**Update, 14 November:** three questions were later run live through the app; the citations defect found there was fixed and rechecked (see "Live check, 14 November" at the end, and `docs/wake-up-report-20261114.md`).

Owner's words: "premium only, strict token caps, clear progress and cancel."

## Update, 18 November: starts at once, charged once at the start

Owner's words: "Deep research starts straight away. Remove the plan card and the approval step. Show only a simple progress line with a Stop button. Charge all 15 units at the start (no 5 + 10 split)." And for every feature: the allowance is checked only at the start of a request or run, never during it; a start is allowed while at least 1 unit is left; the balance stops at 0; at 0 the next start shows one calm "Limit reached. It resets at X." with no unit counts.

What changed (this replaces the older sections below where they disagree):

- **No plan card, no approval step.** In the chat, Send starts the run. In the Research tab, "Start research" starts it. The panel shows one progress line ("Planning", "Searching 2 of 4", "Reading 3 of 6 pages", "Writing the answer") with "Stop the research". The step list and the "counted N of 15" lines are gone.
- **Search texts are still masked on the device**, but no longer shown for approval. `parsePlan` masks each proposed text, drops one the masking cannot make safe (too short, too long), drops repeats, and falls back to the masked question. `runResearch` checks every text against the masking again before the first search. This follows the consent model of 18 November (one acceptance at sign-in, no per-feature approvals).
- **All 15 units are charged at the plan request.** The plan is charged `cost` (or what is left, see below); the answer is a continuation of that counted run and is never charged or refused for allowance. The ledger accepts up to 20 units per request now (`usageUnits`). `researchWeights` (the 5 + 10 split) is deleted.
- **Start rule.** A run starts while at least 1 unit is left in the period and in the rolling day. It is charged 15 or what is left, whichever is smaller, so the balance never goes below 0 (`server/usage-charge.ts` `chargeStart`).
- **The answer belongs to the counted run.** The relay still admits an answer only with the run's ticket (one per accepted plan, 30 minutes). The answer's ledger row is `run-<uuid>`: dispatched, settled and inside the spend guard like any request, but not an allowance unit, so it never counts toward the limit, the day or the balance (`COUNTED_ROW` in `server/usage-contract.ts`).
- **The run's searches are counted at its start.** When the plan is accepted, up to 4 searches are taken from the day's search count and kept with the run; the run's searches use them, so the daily search cap can no longer refuse a search halfway through a run. Unused ones go back to the day when the answer is requested. A run does not start when no search is left in the day.
- **The 8-minute clock no longer touches the answer.** It stops searching and reading; once the answer is being written only the user's Stop ends it (`src/deep-research.ts`). Before, a finished answer could be reported as "timeout".
- **Calm limit message.** A refused start (relay 429 with `code: "limit"` and `resetsAt`) shows "Limit reached. It resets at 14:05." (German: "Limit erreicht. Es wird um 14:05 zurückgesetzt."), with the date when it is not today (`src/limit-message.ts`).

Still true and still a limit: the ticket is in server memory, so a restart between plan and answer refuses the answer after the run was paid; the run count and the search count are per process.

## What it does

One question. A few web searches. A few pages read. One answer with numbered sources.

It runs in the browser. The server stays a relay and a search proxy. No research job is stored or run on the server. The panel is in the Research tab, under the existing search.

| Step | What happens | Who sees what |
|---|---|---|
| 1. Plan | One request to the Fast model. It proposes at most 4 search texts for the question. | The secure model gets the question, masked like every chat message. Nothing is searched. |
| 2. Approve | The 4 texts are shown. The user can change or remove each one. One button: "Search for these 4 texts". | Nobody. Each text is masked on the device again before it is shown, and again after every edit. |
| 3. Search | Each approved text goes through the existing approved search (`/api/research/prepare` and `/api/research/execute`). | Brave gets exactly the approved texts. Our server opens the top result page of each search, as it does today. |
| 4. Read | The browser asks our server to open more result pages through the existing approved page fetch, official sites first, until 6 pages are reached. | Each site sees our server's address, not the user's. |
| 5. Write | One request to the Thinking model with the question and the chosen passages. It goes through the ordinary send, so masking, the stop switch, citations, the source list and the answer checks are the same as for any message. | The secure model. |

The answer is a normal message in the conversation. It carries a note of what was searched and read, for example "Deep research: 4 searches, 6 pages; 2 could not be opened. Searched for: ...". The note, the numbered source list and the addresses are in the PDF export and in "Copy conversation as text", because both already export the note line and the source list of a message.

## The privacy rule

Every search text that leaves the device is masked and shown, and the user approves the set once. This is enforced in three places:

- The model's plan is masked on the device before it is shown (`parsePlan` in `src/deep-research.ts`, using `editedSearchText`). The model's reply can repeat a detail of the question, because the reply is unmasked on the device. That detail never reaches a search text.
- An edited text is masked again by the same function, and the exact text that will be sent is shown under the field (the existing `SearchSuggestionField`).
- The pipeline checks each text against the masking once more before the first search. A text the masking would change stops the run before anything is sent.

There are no hidden follow-up searches. The pipeline has no second planning step. If a later version wants more searches, it must show them and ask again.

Page addresses come only from the search results. A result address that contains a recognised personal detail is not opened.

## Caps

All are enforced in code. The numbers are in `shared/deep-research.ts`.

| Cap | Value | Where enforced |
|---|---|---|
| Model requests per run | 2 (plan and answer). No retry, no backup model, no code tool. | Browser. Relay: one answer per accepted plan. |
| Searches per run | 4 | Browser. |
| Pages per run | 6, at most 3 per search. The top page our server opens with each search counts. | Browser. |
| Sources given to the model | 10 | Browser. |
| Source text given to the model | 16,000 characters over all sources, titles and addresses counted. Less when the report's input limit leaves less room. | Browser. |
| Text of one page given to the model | 2,400 characters: the passages that match the question, chosen on the device by the existing ranker (`src/passage-retrieval.ts`). | Browser. |
| Question | 1,000 characters | Browser. |
| Whole request | The report's `maxInputCharacters`, as for every message. | Browser (`composeContext`) and relay (body size). |
| Time for searching and reading | 150 seconds. Then reading stops and the answer is written from what was read. | Browser. |
| Time for the whole run after approval | 8 minutes. Then the run is stopped. | Browser. The answer request also has the Thinking limit of 300 seconds. |
| Runs per account per 24 hours | `dailyRuns` (proposed 3) | Relay. |
| Searches per account per 24 hours | `dailySearches` (proposed 24). Ordinary approved searches count too. | Relay, in the search route. |
| Allowance | One run costs `cost` units (proposed 15). | Relay. |

Honest limits of these caps:

- **The browser caps are the honest app's caps.** A modified browser can ignore them. What it cannot ignore are the relay caps: body size, the allowance, the daily request limit, the spend guard, runs per day and searches per day.
- **Pages.** The existing top-page step on the server may try up to 3 addresses per search before one opens. So the server can make up to 12 page requests for 4 searches, plus up to 2 from the browser. The cap of 6 is on pages used, not on connection attempts.
- **Page fetches are not counted per day on the server.** They cost no supplier money. The session limits that exist today still apply.
- **The run and search counts are in the server's memory**, like the image count. A restart forgets them. On more than one server instance each instance counts for itself.
- **Long pages.** The existing page fetch refuses a page whose text is over 60,000 characters. Such a page counts as "could not be opened". Not changed here.

## Allowance: how 15 units are charged (before 18 November; see the update at the top)

The usage ledger accepts 1 to 10 units per request (`usageUnits` in `server/usage-contract.ts`). No schema change was made. A run's cost is split over its two requests:

- plan request: `cost` minus the answer's share. For 15: **5**.
- answer request: as much as one request can carry. For 15: **10**.

The browser declares each request with the header the image feature uses: `x-privateai-kind: research-plan` and `research-answer`. The relay (`server/research-admission.ts`, wired in `server/app.ts`):

- refuses both unless the switch is on and the account may use the feature;
- admits a plan only in Fast and an answer only in Thinking;
- **admits a plan only when the whole run fits**: the allowance left must be at least 15, and the day's requests plus 15 must be within the daily limit. So a run cannot be started without enough allowance;
- counts the plan against the day's runs;
- admits an answer only after an accepted plan of the same account, once, within 30 minutes. So the answer's 10 units cannot be skipped and every answer belongs to a counted run;
- gives the run back when the provider refused the plan before any reply, and does not charge the repeat twice (the existing retry credit).

**Superseded on 18 November** (see the update at the top): the whole run is charged at the plan, and the answer is a continuation. The older choice, kept for the record: the plan reserves 5 and the answer reserves 10 when it is sent. The alternative was to reserve all 15 at the plan. I did not do that, because a run the user stops after the plan would then cost 15 for nothing, and because a prepaid row with no request behind it would count as an unmetered request in the spend guard for the whole review window. The price of this choice: between the plan and the answer another tab of the same account can use up the allowance. Then the answer is refused and the plan's 5 units and the searches are spent. The panel says what was counted.

### What a modified browser gets

Stated plainly, as asked. The chat body is encrypted, so the relay cannot see what a request is for.

- A research request is **never larger than an ordinary message**: same body bound, same models, same output limit. There is no "research-sized" request to get at the chat price.
- A modified browser can therefore build its own research from ordinary parts: one Fast message (1 unit), one Thinking message (5 units) and ordinary approved searches. It pays 6 units instead of 15 for the same work.
- It stays inside every relay cap: the period allowance, the daily request limit, the spend guard, one request at a time, and the searches per day.
- So the weight of 15 is a **price for the honest app**, not a wall. The walls are the caps above. If the owner wants the price to hold against a modified browser, the lever is the daily search cap and the daily request limit, not the weight.

## "Premium only"

There are no paid plans in the alpha. It is implemented as:

1. the deployment switch `inference.research.enabled`, off by default, and
2. an optional list `inference.research.allowedEmails`. When the list is present, only those accounts see the panel and only their research requests are admitted. Others get no status field, so the feature is invisible to them, and a declared research request from them is refused.

Why a list in the deployment config and not a flag in the database: there is no per-account flag today. `scripts/account-operator.ts` only prints SQL for existing tables, and allowances are per account in the usage ledger, which has no feature column. A database flag needs a migration and an operator command. For 30 invitees a list in the config does the job with no schema change. The cost: changing the list needs a config edit and a restart. When billing exists, the plan should set this instead of the list.

## The switch

```json
"inference": {
  "research": {
    "enabled": true,
    "cost": 15,
    "dailyRuns": 3,
    "dailySearches": 24,
    "allowedEmails": ["someone@example.com"]
  }
}
```

- Absent or `enabled: false`: off. Nothing changes for anyone, including search (no daily search cap).
- `cost` 2 to 20, `dailyRuns` 1 to 20, `dailySearches` 1 to 500, `allowedEmails` optional (1 to 200 addresses). Checked by the strict schema in `server/deployment-config.ts`; tested in `tests/deployment-inference-config.test.ts`.
- It also needs the search key (`searchKeyFile`) and a ready report with answer modes.
- The browser reads the status field `research: { cost, dailyRuns }`.
- Development server: `PRIVATEAI_RESEARCH=1` (cost 15, 3 runs, 24 searches).

**The report's input limit decides whether a run is possible.** The answer request needs room for the source text. With `maxInputCharacters` 32,000 a run in a short conversation uses the full 16,000 characters of sources. With 20,000 it uses about 9,900. Below about 14,000 the panel refuses to start ("too long"), because under 4,000 characters of sources would fit. The local test report has 8,000: **with that value deep research cannot run at all.** The benchmark runner sets 32,000.

## Cost

Prices used: the highest rate among the report's models, GLM-5.3 at EUR 1.55 per million input tokens and EUR 5.74 per million output tokens, plus 19 % VAT (owner-reported, from the Privatemode draft report). Brave: USD 0.005 per search (owner-reported). Tokens are estimated at 3 characters per token. **None of this is measured**; the live check will give real numbers.

| Per run | Expected in a short conversation | At the caps |
|---|---|---|
| Plan, input | about 5,400 characters, 1,800 tokens | the same |
| Plan, output | about 80 tokens | 2,048 tokens (Fast limit) |
| Answer, input | about 24,600 characters, 8,200 tokens | 32,000 characters, 10,700 tokens |
| Answer, output (thinking included) | about 5,000 tokens (a guess) | 16,384 tokens (Thinking limit) |
| Tokens in total | about 15,000 | about 31,000 |
| Model cost, net | about EUR 0.045 | about EUR 0.125 |
| Model cost, with VAT | about EUR 0.053 | about EUR 0.149 |
| Searches | 4, USD 0.02 (about EUR 0.02) | the same |
| **One run** | **about EUR 0.07** | **about EUR 0.17** |

For 30 invitees who all use 3 runs every day (90 runs a day):

| | Expected | At the caps |
|---|---|---|
| Tokens per day | about 1.4 million | about 2.8 million |
| Model cost per day, with VAT | about EUR 4.80 | about EUR 13.40 |
| Searches per day | 360, USD 1.80 | 360, USD 1.80 |
| Per day in total | about EUR 6.60 | about EUR 15.20 |
| Per 30 days | about EUR 200 | about EUR 455 |
| Allowance units per account per day | 45 | 45 |

Also to know:

- The daily search cap of 24 covers ordinary searches too. If every one of 30 accounts used all 24 every day: 720 searches, USD 3.60 a day, USD 108 in 30 days.
- 3 runs a day need 45 allowance units a day per account. The owner sets `inference.allowance`; a daily limit under 15 makes deep research impossible, and under 45 makes the third run impossible.
- The spend guard counts every request without metering at its worst case, as today. Nothing changed there.

## Progress and stop (before 18 November; now one progress line with Stop, see the update at the top)

- The step list: Planning, Searching 2 of 4, Reading 3 of 6 pages, Writing the answer. Each finished step shows its outcome ("4 searches; 1 gave no results", "5 pages; 2 could not be opened").
- "Stop the research" stops at once. The stop signal goes into every request. After it, nothing more is sent; a search that was approved but not yet executed is not executed. The app's ordinary Stop button does the same.
- After a stop or a failure the panel says what was counted: "Requests counted for this run: 5 of 15." When the app cannot know whether a request was counted (a stop while the plan or the answer was on its way), it says "at most".
- A step that fails is not repeated. A search that fails is counted and the run goes on with the others. If no search gives results, no answer is requested. If the answer does not complete, the conversation shows what arrived.
- Partial results are kept: when a run ends before the answer was requested, the sources found so far are added to the conversation, and the user can ask about them with a normal message at the normal price.
- Resume was not asked for and is not built. A new run starts with a new plan.

## What is saved

Nothing new. Research results follow the existing rule for searches (owner decision, 22 October): a conversation with live search results is temporary, and on save the results and links are removed while the answer and the first search text stay.

## Tests (all offline)

| File | Tests | What |
|---|---|---|
| `tests/deep-research.test.ts` | 19 | The pipeline: every cap, the source budget, stop while searching, while reading, between an approval and its use, while writing and before the start; failure of one search, of all searches, of pages, of the answer; the two time limits; plan parsing and re-masking; request bodies carry only approved masked texts; official pages first; source numbering, citations and the exported note. Search and model are doubles. |
| `tests/deep-research-relay.test.ts` | 15 | The declaration and the account list; the ticket and the run's searches; a run costs 15, all at the plan, and its answer is never charged; an answer is never refused for allowance even when the rest was spent meanwhile; 3 left admits a plan charged 3, then 0 refuses it calmly with the reset time and no unit counts; the daily request limit takes what the day has left; runs per day; a refused plan is given back and its repeat not charged twice; searches per day; a run's 4 searches are held at its start; unused ones go back, and a run cannot start with no search left; no cap with the switch off. Upstream and search are doubles. |
| `tests/deep-research-ui.test.ts` | 9 | Real headless Chromium against the test's own Vite server, model and research routes faked: a whole run at 375, 768 and 1280 px in English and German (starts at once, no approval, the plan's address masked before sending, one progress line with Stop, result, answer with citations and note, no unit counts, no sideways scroll, button heights, focus); stop while searching at two sizes; at 0 left the calm limit message and nothing sent; hidden without the switch. |
| `tests/deep-research-chat-ui.test.ts` | 10 | The same in the chat: "+" > Deep research, Send starts the run at once, progress line with Stop in the card, the answer lands in the conversation; a new chat stops the run; a too-long question keeps the draft; no item without the switch. |
| `tests/deployment-inference-config.test.ts` | 1 (extended) | The switch: off, on, the account list, and six invalid forms. |

## Not verified

- Nothing ran against Privatemode or Brave. Whether the Fast model writes usable search texts from the plan instruction is **not known**. If it writes prose, the fallback is one search with the masked question.
- Answer quality, citation quality and timings of a real run.
- The token and euro figures above are estimates.
- Real result pages: how many refuse our server, time out, or exceed the 60,000-character limit.
- The production composition with a real account email and `allowedEmails` (tested with unit tests and with invite accounts that have no email, not with a signed-in consumer session).
- More than one server instance.
- A real phone and a screen reader.

## Live checks for the lead

1. **Three synthetic questions through the app.** With the keys loaded as for the other benchmark runs:
   `$env:BENCH_DIR = "evaluation/deep-research"; npx tsx evaluation/blind-benchmark/run-ours.ts --privatemode --research --modes auto`
   It switches deep research on in the local app, and for each question in `evaluation/deep-research/prompts.json` it starts a run (no approval since 18 November), waits for the end and writes `.local/deep-research/ours-privatemode-research/auto/<id>.json` with the planned texts, the searches sent, the pages opened, the step outcomes, the answer, its citations and the timings. Cost: at most 12 Brave searches and 6 model requests. The runner was type-checked, not run.
   Look at: are the planned texts real search texts (short, no sentences, no numbering left)? How many pages opened? Does the answer cite sources? Total time against the 8 minute limit. Tokens, to replace the estimates above.
2. **By hand on the development server** (`PRIVATEAI_RESEARCH=1`, search key loaded): one run with a question that contains an email address. The address must not appear in any proposed text. Edit one text and type the address in: the text shown as "will be sent" must not contain it.
3. **Stop** during "Searching" and during "Writing the answer". Expect: the panel says it was stopped and what was counted; the network panel shows no further request.
4. **Allowance** with a real ledger: the usage page shows 15 right after the plan and still 15 after the answer. With 3 left a run starts and the page shows 0 after it; the next start shows "Limit reached. It resets at …".
5. **Account list** on the production composition: an account on the list sees the panel; one that is not on it does not, and its usage page is unchanged.
6. **Export**: PDF and "Copy conversation as text" of a research answer show the note and the numbered sources with addresses.
7. **The input limit** in the report that will be deployed: it must be about 32,000 for the full source budget (see "The switch").

## Open decisions for the owner

| Decision | Recommended default |
|---|---|
| Cost of a run | 15, as proposed in K3 |
| Runs per account per day | 3, as proposed |
| Searches per account per day (all searches) | 24: twice what 3 runs need, so ordinary searches still have room |
| Who gets it in the alpha | Everyone on the deployment (no list), since the alpha must test what launch needs. Use the list if cost should be held down. |
| Reserve all 15 units at the plan instead of 5 and 10 | Decided 18 November: yes, all at the start |
| `maxInputCharacters` in the deployed report | 32,000 |
| Privacy wording | See `deep-research-privacy-wording-draft-20261114.md`; the binding texts were not touched |

## Live check, 14 November

The lead ran three synthetic questions through the real app with Privatemode and Brave. The plans were good and relevant (4 approved searches, 5 to 6 pages read). The answers were correct and well structured. But the citations showed as raw codes (`[2aee4cd21a78 (§ 573c Abs. 1 BGB)]`, `[b2dfe082cee1]`) with no source buttons.

Cause: the sources were recorded correctly on the answer. Two things went wrong on the screen. First, the answer is written while the Research tab is shown, so the answer renderer had never loaded; "Show answer" met its plain-text placeholder, which shows raw Markdown and codes (the benchmark runner read the page at that moment). Second, the model often adds a short note inside the brackets, and the renderer did not accept that form, so those codes stayed raw even after loading.

Fixed by: loading the renderer when a run starts and using it directly once loaded (`src/ChatMessage.tsx` `preloadAnswer`); accepting `[id (note)]` in every answer, with the note kept as text after the source button (`src/answer-format.ts`); an unknown code is still dropped and counted by the evidence notice. "Copy answer" and "Copy conversation as text" now turn known codes into the numbers of the source list, and "Copy answer" adds that list. The PDF shows the same buttons and the source list. The benchmark runner now waits for the rendered answer. Tests: `tests/citations.test.ts` (live answer shape), `tests/deep-research-ui.test.ts` (the faked answer cites like the live model; the answer is rendered at once with two buttons and the note). Not verified live: the lead should rerun the three questions and check the buttons.
