# CometRow against ChatGPT: blind comparison, 12 November 2026

**Status: done for our side and ChatGPT. Gemini dropped by the owner.** Same 51 prompts, frozen bars (`BARS.md`). The full scorer output is `results-2026-11-12.md`; the 204 blind scores with one-line reasons are in `scoring-sheet.csv`; the label key is in `.local/blind-benchmark/key.json`.

## How it was scored

- Our answers: the real app in Auto, Fast and Thinking (one run each), with live Tinfoil and, on level 4, Brave through the Research flow.
- ChatGPT answers: from the owner's file, split per prompt and converted to plain text so that formatting could not give them away.
- **Graders:** four fresh model graders. They saw only the shuffled sheet, never the key, and scored 1 to 5 with a hallucination flag.
  - They checked level 4 live on the web today.
  - They ran the level-5 code.
  - They checked level 6 against the documents.
- **These are model scores, not the owner's.** The owner can overwrite any row and rerun `npx tsx evaluation/blind-benchmark/score.ts`.
- **Caveats:**
  - There was one run per prompt and one grader per answer, so a one-point difference on a single prompt is noise.
  - The ChatGPT file says its facts and links "were checked against sources", so it may come from a stronger setup than one plain chat per prompt.
  - ChatGPT has no timings, so the relative speed bars do not apply.

## Result

| | Auto | Fast | Thinking | ChatGPT |
| --- | --- | --- | --- | --- |
| Mean score (51 prompts) | 4.43 | 4.43 | 4.37 | **4.69** |
| Answers scored 5 | 30 | 30 | 27 | 39 |
| Answers scored 3 or lower | 6 | 7 | 8 | 3 |
| Hallucination flags | 7 | 5 | 4 | 1 |
| Silent maths errors | 0 | 0 | 0 | 0 |
| Level-8 wording checks | 6/6 | 6/6 | 6/6 | 6/6 |
| Verdict under the frozen bars | below bar | below bar | below bar | |

**Mean score per level (ChatGPT in the last column):**

| Level | Auto | Fast | Thinking | ChatGPT | Against ChatGPT |
| --- | --- | --- | --- | --- | --- |
| 1 Facts, rewriting | 4.6 | 4.2 | 4.2 | 5.0 | loss, all modes |
| 2 Explanations | 4.2 | 4.4 | 4.6 | 5.0 | loss, all modes |
| 3 Maths | 5.0 | 5.0 | 5.0 | 5.0 | **tie**, all correct |
| 4 Research | 2.8 | 3.0 | 3.4 | 4.2 | **clear loss**, 0 wins in 15 |
| 5 Coding | 4.5 | 4.3 | 4.3 | 4.7 | narrow loss |
| 6 Long documents | 4.4 | 4.8 | 4.4 | 4.8 | Fast ties; Auto and Thinking lose |
| 7 German | 4.5 | 4.3 | 4.0 | 4.7 | Auto ties; Thinking FAIL (see below) |
| 8 Health and safety | 4.7 | 4.7 | 4.5 | 4.2 | **we win or tie** |
| 9 Instructions | 4.8 | 4.8 | 4.7 | 4.7 | tie |

**In one line:**
- Equal on maths and instruction-following, and ahead on health.
- Behind on research by a wide margin.
- Behind on everything else by about half a point, mostly from small invented details.

## Why we lost points

1. **Research (level 4) is the real gap.**
   - Our Research flow sends one approved query and gives the model the result snippets, not the pages. So it often could not give opening hours (L4-05) or official sources, and leaned on secondary sites (L4-03).
   - One answer said it "has no browsing tools" (Auto, L4-05).
   - One answer shows a raw citation tag `[2c0b433bea]` (Thinking, L4-01), and the page titles of citation chips clutter the text.
   - Two answers had wrong AI Act details (Auto, Thinking on L4-02).
   - ChatGPT was also wrong once: it gave a museum price of €16, but today it is €18. Our three modes had €18.
2. **Small invented details**, in all modes:
   - wrong self-reported word counts ("43 words" when it is 33: L1-02, L1-04)
   - "sextillion" for 10²⁴ (Auto, L2-05)
   - a false claim that 7 % VAT can apply to craftsman repairs (Thinking, L7-03)
   - 116 117 called a pharmacist line (Auto, L8-03)
   - a wrong claim in a code note (L5-03, L5-06)

   ChatGPT had one flag in 51 answers. Our modes had 4 to 7 each.
3. **German everyday-admin facts (L7-04, moving house):** all three modes invented a rule. The rules involved were the driving licence address, a one-month Rundfunkbeitrag deadline, and "some Länder allow one month" to register.
4. **Stale knowledge:** our modes gave the Saturn moon count from 2025 (274). The count today is 293. Our app does not search unless the user approves a query.
5. **Thinking FAIL at level 7** is a single answer: the 7 % VAT claim on L7-03. Under the bars, a hallucination on a maths prompt fails the level even when the total is right.

**Where we were better:** health (L8-02, L8-03, L8-04). Our answers gave the German numbers and red flags. ChatGPT's resting-heart-rate answer gave no 112 and no German services, and its paracetamol answer gave no red flags.

## What to adjust (recommendation, in order of effect)

1. **Research pipeline (biggest gain).**
   - Find out why the raw citation tag was not turned into a link, and strip any tag that does not match a source.
   - Show chip titles as links, not inline text.
   - Tell the model it is working from search results, never "no browsing tools".
   - Rank official domains first.
   - Optionally fetch the top official page's text, not only snippets. This one changes what our server contacts on the user's behalf, so it is an owner decision (privacy and disclosure).
2. **Product prompt, two lines:**
   - "Do not state word or character counts unless asked."
   - "For German rules, fees and deadlines you are not sure of, say so and suggest checking the official source, instead of giving a number."

   This targets most of the hallucination flags. It needs a rerun of the affected prompts and of level 8, to make sure the health wins hold.
3. **Thinking (glm-5-3 max)** adds unprompted side claims (7 % VAT, extra commentary). Either add a prompt line to answer only what was asked, or let Auto keep German and everyday prompts off Thinking (Auto and Fast scored 4.5 and 4.3 on German; Thinking 4.0). No model change is indicated yet: on levels 1 and 2 the gap is about half a point, and on level 6 Fast already matches ChatGPT.
4. **Keep:**
   - the health policy (we beat ChatGPT there)
   - the maths path (all correct)
   - the speed: medians are 1.3 to 4.4 s to the first word and 2.4 to 5.8 s for the whole reply

## Spend

Grading used no Tinfoil or Brave calls. The comparison itself made no model calls to our providers.
