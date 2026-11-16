# Cost weights from real token figures (14 November 2026)

## Update 16 November: billing is on, and prices are versioned and applied per model

**Owner-reported, 16 November 2026 (not verified):** Pay-As-You-Go is on (individual account; business with VAT ID after registration); a EUR 50 monthly cost cap is set on the CometRow API key; the key shows 100 requests per minute, 400K prompt tokens and 20K completion tokens; the owner holds the price list (input, cached input and output per 1M tokens per model, audio per minute). The figures below are still those of the owner's notes of 11 November and wait for the owner's confirmation (`docs/owner-walkthrough.md`, step 1).

| Model | Input | Cached input | Output |
| --- | ---: | ---: | ---: |
| `glm-5.3` (Thinking) | 1.55 | 0.15 | 5.74 |
| `glm-5.3-flash` (Fast) | 0.20 | 0.05 | 0.65 |
| `gpt-oss-120b` (not used) | 0.20 | 0.04 | 0.65 |

Speech-to-text, EUR per audio minute: `whisper-large-v3` 0.014, `voxtral-mini-3b` 0.004.

What was checked and changed in the code (16 November):

- **Checked:** the weekly reconciliation (`scripts/usage-metering.ts`, over the per-request records the browser reports) already priced input, cached input and output apart, per model. No blended number there.
- **Changed, prices are versioned:** `prices` in `shared/usage-weights.json` is now a dated list like the weights (version 1, in force from 11 November). `pricesAt(time)` picks the list in force when a record was made, so a later price change never re-prices older records. A new price is a new version, never an edit.
- **Changed, one function for the three prices:** `chatEuros` in `shared/usage-config.ts` (non-cached input, cached input, output; each at the model's own price). The script and the ledger both use it.
- **Fixed, the ledger's cost of a background run:** `costOf` (`server/background-tasks.ts`) used the report's single input and output price for every model and knew no cached price. It now uses the model's own three prices, converted at the report's EUR to USD rate (the old way remains only when a model has no listed price or the report has no rate).
- **Not changed, and you should know:** an ordinary chat request has no cost in the older ledger table (`usage_metrics.cost_usd`): its usage is encrypted, the server cannot read it. Its tokens come from the browser's report (`usage_records`) and are priced by the weekly script. The spend guard still books every request at the worst case; that is a safety ceiling and your decision.
- **Test:** `tests/usage-metering.test.ts`, "prices: input, cached input and output are priced apart per model".

**The EUR 50 cap in requests** (list prices before VAT, token figures from the table below): a Fast message of about 1,000 tokens costs about EUR 0.0003 to 0.0005; a Thinking message of about 1,900 tokens about EUR 0.005 to 0.01; a deep research run about EUR 0.02 to 0.04. Real use by a few invitees stays far below EUR 50; the worst case booked by the spend guard (EUR 0.11 to 0.14 per request) would reach it after about 360 to 450 requests.

Each request costs allowance units (Fast 1, Thinking 5, and the feature weights below). This note compares those weights with what each request actually used in the live runs of 13 and 14 November, so the owner can decide before switching features on. Nothing was changed in the code: the weights are owner decisions.

Two currencies matter:
- **Free-quota tokens.** While Privatemode bills the free 5M quota, every token counts the same for both chat models (multiplier 1.0 for `glm-5.3` and `glm-5.3-flash`). Audio counts about 2,800 tokens per minute.
- **Euros, after paid billing.** `glm-5.3` costs EUR 1.55 / 5.74 per million input / output tokens, `glm-5.3-flash` EUR 0.20 / 0.65 (owner's notes, plus VAT). A Thinking token is about 8 times a Fast token.

## Measured, live, through the app (tokens as reported by the app per request)

| What | Tokens | Source |
| --- | --- | --- |
| Fast message, everyday question | about 700 to 1,100 (median 1,123 over 84 recorded answers) | blind benchmark, parity and smoke runs |
| Thinking message (effort high) | about 1,900 median (170 recorded answers; many older runs were at max effort, so high is lower) | same runs |
| Calculation with code, Fast, per turn (two requests) | about 3,600 | arithmetic set through the app, 14 November |
| Deep research run (plan on Fast plus answer on Thinking) | about 7,000 to 7,500 | three live runs, 14 November |
| Memory notes added to a question | about 65 | memory probe |
| Picture question (tiny synthetic picture) | 62 for the picture | image probe; a real photo is not measured |
| Voice transcription | about 2,800 per audio minute | Privatemode's rule (owner's notes), not measured |

**Prompt cache:** Privatemode reported `cached_tokens: 0` on every request we measured, including two identical requests with the same salt and a 2,232-token prompt. So the fixed system message (about 685 tokens for a plain question) is paid in full on every request. Worth one question to Privatemode support (owner decisions, 14 November block).

## Weights compared with tokens

Taking one Fast message (about 1,000 tokens) as one unit:

| Feature | Weight today | Tokens per use | Units if weighted by tokens | Euro ratio to a Fast message (paid) |
| --- | --- | --- | --- | --- |
| Fast message | 1 | ~1,000 | 1 | 1 |
| Thinking message | 5 | ~1,900 | about 2 | about 15 |
| Calculation turn with code (Fast) | 1, plus 2 free follow-ups | ~3,600 | about 3.5 | about 3.5 |
| Deep research run | 15 | ~7,300 | about 7 | about 30 |
| Voice, one 2-minute recording (14 November design) | 2 | ~5,600 | about 5.5 | Whisper EUR 0.028, about 10 |
| Voice since 15 November, per chunk of up to 30 s (1 voice unit = 2 s, about 93 tokens) | 1 proposed | ~470 (10 s) to ~1,400 (30 s) | 0.5 to 1.4 | Whisper EUR 0.007 per full chunk, about 2.5 |
| Picture question | 2 | not measured for real photos | unknown | unknown |
| Memory, project instructions | 0 | +65 to +600 | under 1 | small |

## What this means

- **Thinking at 5** is right for euros (a Thinking message costs about 15 Fast messages after paid billing) and generous for free-quota tokens. Keep it.
- **Deep research at 15** is right for euros and about double for tokens. Keep it.
- **Code execution is under-weighted for tokens:** a calculation costs about 3.5 Fast messages but uses 1 unit. With the 150-unit week, a user who only calculates could use about 3.5 times the tokens of an average user. Recommended default: keep 1 unit for the alpha (exact answers are the point of the feature, and calculations are a small share of messages), and watch it in the weekly reconciliation.
- **Voice is under-weighted:** a full 2-minute recording uses the tokens of about 5 Fast messages for 2 units. Recommended default: weight 3, or keep 2 with 30-second recordings (which also gives live voice more turns a day).
- **Voice, 15 November:** recordings are now charged per chunk of up to 30 seconds, plus a daily voice budget (proposed 150 units = 5 minutes = about 14,000 tokens, `docs/voice-to-text-20261114.md`). Recommended weight: **1 per chunk**. A full chunk is about 1.4 Fast messages of tokens, a 10-second one about 0.5; the budget caps the shortfall at about 4 units a day. With the budget: 30 ten-second, 15 twenty-second or 10 thirty-second turns a day, each 2 units with a Fast answer.
- **Pictures:** measure one real photo (about 1,500 px) before deciding; the weight of 2 is a guess.

## Update 15 November: weights are now versioned configuration

The weights above moved into `shared/usage-weights.json` as version 1, with the same values (Fast 1, Thinking 5, picture 2, voice 2, deep research 15, two free code follow-ups, background extras 1 and 2) and the measured basis of this note. With `inference.metering` switched on, the relay charges from that file and records every request with its feature, units and version; the browser reports the real token counts per request. From the first week of data, `node --import tsx scripts/usage-metering.ts suggest` prints the median tokens and euros per use, the ratio to a Fast message and a proposed next version; code execution's weight (today 1 unit plus two free follow-ups) is reviewed there with real data. A new value needs the owner's approval and a new version, never an edit of version 1 (`docs/usage-metering-20261115.md`).

## Live check of the smaller prompt (14 November)

After the prompt change (`docs/prompt-size-20261114.md`): six everyday questions in Fast used 721 to 1,491 tokens; four calculation conversations used 2.6 % to 3.8 % fewer tokens than the same conversations in the morning and were all exact; the stroke question still says "Call 112 immediately", the crisis question still gives a crisis number, the rules question still hedges its figures, the German question is answered in German. Spend: about 35,000 tokens.
