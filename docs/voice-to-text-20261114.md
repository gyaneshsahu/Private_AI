# Voice-to-text (dictation) in the composer, 14 November 2026

Status: **built and tested offline. Switched off by default. Nothing was verified live.** No call was made to Privatemode, no key was read, no real microphone was used.

**Update, 15 November:** metering by speaking time. A recording is cut into chunks of up to 30 seconds that are turned into text while the user keeps talking. 1 voice unit is 2 seconds of recording. Each account has a daily voice budget (proposed 150 units, 5 minutes) kept in the usage ledger. The relay checks each chunk's encrypted size against its reported length. See "Metering by speaking time (15 November)" below. The config, caps and cost sections are updated; the rest still describes the 14 November build.

**Update, 14 November:** transcription was later checked live with synthetic German and English samples; both models were exact (see "Checked live, 14 November 2026" at the end). The path through the app in a real browser is still not verified.

## What it does

The user taps the microphone button in the message box, speaks, and taps again to stop. The recording is turned into text. The text lands in the message box at the cursor. The user reads it, edits it and presses Send as usual. Nothing goes to the chat model before that.

## Privacy rules it follows

- Audio goes only to a Privatemode speech-to-text model, through the same verified and encrypted SDK session the chat uses. Our relay forwards encrypted bytes and adds the API key. It cannot read the recording.
- The browser's own dictation (Web Speech API) is not used. It would send audio to Google or Apple. A test fails if that API name appears in the voice code.
- Audio is never stored. In the browser the recording lives in memory until the transcription call ends, then it is dropped. It never goes to the vault, a saved conversation or browser storage. On the server the encrypted body lives in memory for the one request. Nothing is written to disk and no body is logged.
- The microphone is requested only after the user taps the button. It is released the moment recording stops.
- The only value the feature stores is a flag that the first-use note was shown (`localStorage`, `cometrow.voice.note-seen`).

**One limit the owner must know:** identifier masking works on text. A bank or ID number that the user says aloud is inside the recording and reaches the speech model (encrypted, inside the confidential environment). The typed or dictated text is masked at send time as before. The first-use note says this. The sentence "ID, bank and contact details stay on your device" in the privacy copy is not true for spoken numbers once voice input is on. See the wording draft.

## The two switches (both off by default)

Voice input is live only when both are set:

1. Deployment config: `inference.voice`

   ```json
   "voice": { "enabled": true, "chunkSeconds": 30, "maxTurnSeconds": 180, "dailyUnits": 150 }
   ```

   | Field | Range | Meaning |
   | --- | --- | --- |
   | `enabled` | true or false | The switch. Absent or false: no route, no button |
   | `chunkSeconds` | 10 to 30 | Longest chunk. Each chunk is its own file, turned into text while the user keeps talking. It sets the largest upload (248,192 bytes at 30) |
   | `maxTurnSeconds` | 30 to 300 | Longest dictation or live voice question. A warning shows 20 seconds before; then the browser stops by itself |
   | `dailyUnits` | 1 to 1,000 | Voice units per account in any 24 hours. 1 unit = 2 seconds of the user's recording, rounded up per chunk. 150 = 5 minutes |

   The 14 November shape (`maxSeconds`, `dailyMinutes`) is still read: 30-second chunks, `maxSeconds` as the turn maximum, `dailyMinutes` x 30 as units.

2. Qualification report: `speech`

   ```json
   "speech": { "model": "whisper-large-v3", "allowanceCost": 1 }
   ```

   The speech model is a field of the report, not a constant in the code. It must be an exact model ID (no `-latest` alias), it needs a Privatemode report, and it must not be one of the chat models. The chat route never accepts it. The daily model check (`server/model-watch.ts`) watches it together with the chat models, so record a new baseline after adding it: `scripts/privatemode-models-check.ts --record --models glm-5.3,glm-5.3-flash,whisper-large-v3`.

`speech.allowanceCost` is charged per chunk since 15 November (proposed 1).

`GET /api/status` then carries `voice: { "chunkSeconds": 30, "maxTurnSeconds": 180, "dailyUnits": 150, "usedUnits": 12 }`. `usedUnits` is this account's units in the last 24 hours; it is absent when usage cannot be read. The browser shows the microphone button only when that field is present. The field is absent when the switch is off, when the report has no `speech`, when chat is paused by the stop switch, and when the spending limit is reached.

On the development server (`server/index.ts`) the switch is the environment variable `PRIVATEAI_VOICE=1` (30-second chunks, 180-second turns, 150 units). The report still needs `speech`.

## Design

| Part | File | What it does |
| --- | --- | --- |
| Recorder | `src/voice-input.ts` (`createVoiceRecorder`) | `getUserMedia({ audio: true })`, then `MediaRecorder` at 32,000 bit/s. States: idle, starting, recording. Since 15 November a new recorder every `chunkSeconds` (see below). Stops on tap, at the turn maximum, when the tab is hidden. Dropped when the page is left, the composer goes away or a message is sent |
| Button | `src/VoiceInput.tsx` | A real button with a name, a pressed state and a visible countdown. Start, stop, result and failures go to the app's notice line, which is a live region. The first tap shows the note and asks before recording |
| Client call | `src/providers/privatemode-client.ts` (`transcribe`) | `client.audio.transcriptions.create()` on the cached verified client. One verification covers chat and transcription |
| Relay route | `server/providers/privatemode-voice.ts` | `POST /v1/audio/transcriptions` at the site root, mapped under `/api/inference` like chat. Admission, limits, counts |
| Shared limits | `shared/voice.ts` | Bitrate, voice units per chunk, the size limit per chunk (since 15 November) |
| Texts | `src/text/voice.ts` | English and German with the same keys |

Format: the recorder takes the first container the browser supports from WebM/Opus, WebM, MP4, Ogg/Opus. Chromium and Firefox record WebM/Opus. Safari records MP4/AAC. The file is sent as `recording.webm` or `recording.mp4` with the matching type. **Not known:** which containers the Privatemode endpoint accepts. The SDK types say nothing about formats. This is live check 2.

Language: no language is sent. The model detects German or English itself. A wrong hint would be worse than none, because the interface language does not tell us the spoken language.

Result: the text is inserted at the cursor (or replaces the selection), with a space to its neighbours, inside the 20,000 character limit of the box. It passes through nothing else. When the user sends, the same masking runs as for typed text (asserted in `tests/voice-input.test.ts`).

## Admission at the relay

The route is reached only after the session and CSRF checks that guard every `/api` path. Then, in this order:

1. Qualification present and API key present, else 503.
2. Stop switch (`inferenceStopped`), else 503.
3. Body size. Over the limit: 413, nothing forwarded.
4. The report names a speech model, else 404.
5. The `privatemode-target-model` header must equal the report's speech model, else 400. The relay sets the header itself on the upstream call. Since 15 November also: the `X-PrivateAI-Voice-Units` header (1 to 15) must be present, else 400 `refused_units`, and the body must fit those units, else 413 `refused_size`.
6. Three requests per instance and one request per account. These are the same slots chat uses, so a recording being transcribed blocks a chat message from the same account and the other way round.
7. Spend guard (`server/spend-guard.ts`).
8. The daily voice budget in units (since 15 November; before: recordings per day).
9. The chat allowance's daily cap (`allowance.dailyLimit`), in units.
10. Allowance: `reserve`, `dispatch`, `finish` on the same usage ledger as chat, with `speech.allowanceCost` units.

Forwarded upstream: the body bytes, `content-type`, `accept`, the SDK's `privatemode-*` headers and the real key. Nothing else. A reply that is not 200 is never passed on: the browser gets 502 and only the class of failure. After such a refusal the same account's next recording within one minute is not charged again (the retry credit, as for chat).

Counts (names only, no content, no account): `voice.completed`, `voice.interrupted`, `voice.refused_size`, `voice.refused_units`, `voice.refused_model`, `voice.refused_allowance`, `voice.refused_daily`, `voice.refused_voice_daily`, `voice.refused_spend`, `voice.refused_account_busy`, `voice.refused_instance_busy`, `voice.upstream_rejected`, `voice.upstream_unavailable`, `voice.upstream_model-not-found`, `voice.retry_not_counted`, `voice.stopped`, `voice.off`, `voice.unavailable`, `voice.usage_unavailable`. They appear in the hourly counts line.

The relay names its refusal in the response header `X-PrivateAI-Voice`, because the SDK hands the browser the status and headers of a refused reply but not its text. The browser turns that into a plain message in the interface language.

## Metering by speaking time (15 November)

This replaces the 14 November caps (one recording of up to 120 s, every recording counted as a full one, 5 recordings a day, so live voice had only 5 turns a day).

### Chunks in the browser

- The recorder (`createVoiceRecorder` in `src/voice-input.ts`) stops its MediaRecorder every `chunkSeconds` and starts a new one on the same microphone stream; the new one starts first, so no speech falls between them. Each chunk is a complete file with its own header. MediaRecorder's own `timeslice` pieces are not: only the first carries the header. Tested with Chromium's real MediaRecorder: every chunk starts with the WebM header and the browser decodes it (`tests/voice-input-ui.test.ts`).
- Each chunk goes to the speech model as soon as it is complete, while the user keeps talking (`createChunkQueue`). Chunks go one after the other, because the relay allows one request per account. The texts are joined in order when the user stops.
- A failed chunk is tried once more after 1 second. If it fails again, its place gets the marker "[part not transcribed]" ("[Teil nicht umgewandelt]") and the rest goes on. The notice says how many parts are missing. A final refusal (voice budget, allowance, daily cap, spending limit, stop switch, busy verification) is not retried: recording stops, the remaining chunks are marked without being sent, and the reason is shown with the text so far.
- A chunk under 1,000 bytes holds no sound and is not sent.
- A word that is spoken across a chunk boundary is split between two files. The model may lose or garble that word. Not measured; device test below. Cutting at a quiet moment instead would need a level meter in dictation too; not built.

### The units

- 1 voice unit = 2 seconds of the user's own recording, measured in the browser from the start to the stop of each chunk, rounded up per chunk (`voiceUnits` in `shared/voice.ts`), at least 1 and never more than `chunkSeconds / 2` (15).
- What counts is the time the microphone records in a turn, pauses included, because that is what the speech model is billed for. The AI's processing and reading aloud are not counted: the microphone is closed then.
- The browser sends the units in the `X-PrivateAI-Voice-Units` header with each chunk.

### What the relay checks (`server/providers/privatemode-voice.ts`)

It cannot hear the encrypted audio, so it checks the size against the reported length:

```
largest body for u units = u x 2 s x 32,000 bit/s / 8 x 2 + 8,192
                         = u x 16,000 + 8,192 bytes
 1 unit  (2 s)  =  24,192 bytes
 5 units (10 s) =  88,192 bytes
15 units (30 s) = 248,192 bytes (also the body parser's limit; far below the bridge's 1,048,576)
```

The factor 2 is room for a recorder that overshoots the bitrate and for the encryption encoding. An honest WebM chunk is about 4,400 bytes a second (Opus at 32,000 bit/s plus the container). Even if the encryption grew it by a third (as base64 would), a 30-second chunk is about 178,000 bytes, well inside 248,192. Units missing, 0 or over 15: 400 `refused_units`. Body over the limit for its units: 413 `refused_size`. Both are counted and nothing is forwarded or charged.

**The abuse bound, honestly.** A modified browser can record at a lower bitrate, so a body that fits its units holds more speech than it claims. At 6,000 bit/s (the lowest Opus speech rate) a body of u units holds up to about 21 x u + 11 seconds:

| A modified browser sends | Audio per day per account | Tokens (2,800 per minute) | Whisper | Allowance units used (cost 1 per chunk) |
| --- | ---: | ---: | ---: | ---: |
| 10 chunks of 15 units (the 150-unit budget) | about 55 minutes | about 154,000 | EUR 0.77 | 10 |
| 150 chunks of 1 unit | about 81 minutes | about 226,000 | EUR 1.13 | 150 (a whole 150-unit week) |
| An honest browser | 5 minutes | 14,000 | EUR 0.07 | 10 to 30 |

Before (14 November) the same trick gave about 114 minutes a day. Refusing chunks that are *smaller* than plausible would not help: a low bitrate makes a chunk long, not small, and a quiet stretch of honest speech can be small. Any real encryption overhead shrinks the numbers above. The money stays small; the free token quota is the exposure, and the owner's weekly reconciliation against the Privatemode portal is the check. Metering by bytes alone (no reported units) would give the same bound with one header less, but an honest user's "seconds" would then depend on the browser's bitrate (Safari records AAC), so the reported length plus the size check was kept.

### The daily voice budget

- `dailyUnits` per account in any 24 hours, proposed 150 (5 minutes), spendable at once or spread out.
- Durable: each chunk is one request in the usage ledger, and its request ID carries its units (`voice-<units>-<uuid>`, `voiceRequestId` in `server/usage-contract.ts`). The relay sums them (`voiceUnitsInLast`, SQLite and Postgres) before it reserves the chunk. A restart forgets nothing (tested). No schema change, no new table. What is stored is a number of 2-second steps per chunk, beside the request's time and state: content-free, like the token counts already in the ledger. Without a ledger (the development server) the units live in memory.
- The browser shows the budget: in the first-use note, in the notice line when a recording starts and after the text is inserted, and in the live voice panel: "Voice today: 2:10 used, 2:50 left." When nothing is left the microphone button is disabled and says why. A turn is never longer than what is left (less 1 unit for rounding), so the last chunk is not refused.
- Before it is used up, the turn maximum (`maxTurnSeconds`, proposed 180) applies: the button shows "Stops in 0:19" for the last 20 seconds and the notice line says once "The recording stops in 20 seconds." This protects against a forgotten open microphone; the server does not see turns, the budget is its bound.

### Allowance weight (cost per chunk)

Each chunk is one charge of `speech.allowanceCost` units on the chat allowance, as before for a recording. **Recommended: 1 per chunk.** Numbers from `docs/cost-weights-20261114.md`: 1 audio minute is about 2,800 tokens, so 1 voice unit (2 s) is about 93 tokens; a Fast message is about 1,000 tokens.

| Chunk | Tokens | Fast messages by tokens | Charged at 1 per chunk |
| --- | ---: | ---: | ---: |
| 10 s | about 470 | 0.5 | 1 |
| 20 s | about 930 | 0.9 | 1 |
| 30 s (full) | about 1,400 | 1.4 | 1 |

Per speaking unit (0.09 allowance units) cannot be charged: the ledger counts whole units per request. Per turn cannot be enforced: the server does not see turns. Per chunk is enforceable and within a factor of 1.4 for full chunks. The daily voice budget limits the gap to at most about 4 units a day. The alternative, charging voice only from the chat allowance by weight with no voice budget, was rejected: it gives no "minutes left" a user understands, and a user could put a whole week's allowance into audio minutes, which the free tier counts separately.

Turns per day with the 150-unit budget (live voice or dictation), a Fast answer each:

| Turn length | Voice units | Turns per day | Allowance per turn | Tokens per turn (voice + answer) |
| --- | ---: | ---: | ---: | ---: |
| 10 s | 5 | 30 | 2 | about 1,470 |
| 20 s | 10 | 15 | 2 | about 1,930 |
| 30 s | 15 | 10 | 2 | about 2,400 |
| 3 minutes | 90 | 1 (then 2 minutes) | 7 (6 chunks + 1) | about 9,400 |

With Thinking answers each turn costs 4 more units. In live voice a turn also records the 1.5 s of silence that ends it, so a "10-second question" is about 6 units (25 turns a day). With a 150-unit allowance week, 30 ten-second turns a day use 60 units: the weekly allowance, not the voice budget, ends heavy use first.

### Rate limits and attestation (checked in the code)

- The verified Privatemode client is cached for the browser session and reused for 10 minutes after its verification (`PRIVATEMODE_VERIFY_MAX_AGE_MS` in `src/providers/privatemode-client.ts`); `transcribeRecording` gets it through `verify()`, which returns the cached client. So chunks do not attest again: a 3-minute turn (6 chunks) makes at most one verification, two if the 10 minutes run out during it.
- Exceptions: a failure that did not come from our own relay ends the client, so the retry verifies again. In the worst case (every chunk fails twice) a long turn could reach the relay's limit of 10 verifications per 10 minutes per browser session; the relay then answers busy, the queue treats that as final and stops, and the app shows its countdown.
- Privatemode free tier (owner's notes): 40 requests a minute and 100 audio minutes a minute for the whole organisation. One talking user makes 2 transcription requests a minute (30-second chunks). The relay runs at most 3 requests at once per instance. At alpha size this is far from the limits. About 15 or more people dictating at the same moment, plus chat, could reach 40 a minute; a refused chunk is retried once and then marked. Shorter chunks (`chunkSeconds` 10) triple the request rate.
- The spend guard counts each chunk as one unmetered request at a chat request's worst case. More chunks make it more careful, never less.

## Cost

Prices and the token rate are **owner-reported** (from `docs/privatemode-master-notes.md`), not verified by us: Whisper large-v3 EUR 0.014 per audio minute, Voxtral Mini 3B EUR 0.004, 1 audio minute counts about 2,800 tokens, free tier 100 audio minutes per month for the whole organisation. Prices are before 19% VAT.

| | Audio minutes | Whisper | Voxtral | Tokens of the quota |
| --- | ---: | ---: | ---: | ---: |
| One full chunk (30 s) | 0.5 | EUR 0.007 | EUR 0.002 | 1,400 |
| One account, one day at the budget (150 units) | 5 | EUR 0.07 | EUR 0.02 | 14,000 |
| 30 invitees, one day, all at the budget | 150 | EUR 2.10 | EUR 0.60 | 420,000 |
| 30 invitees, 30 days, all at the budget every day | 4,500 | EUR 63.00 | EUR 18.00 | 12,600,000 |
| An assumed real use: 30 invitees, 5 minutes on 10 days each | 1,500 | EUR 21.00 | EUR 6.00 | 4,200,000 |

The last row is an assumption, not a measurement.

**The token quota is the tighter limit, not the money.** The owner reported 1.579M of 5M free tokens left on 13 November (about 0.77M by the agent's counts on 14 November; the first invite waits for paid billing), and pay-as-you-go cannot be switched on yet (checklist rows K6 and P12). 30 invitees at the budget use 420,000 tokens in one day. So voice input should stay off until pay-as-you-go works, or start with a small `dailyUnits`. The free tier of 100 audio minutes a month for the whole organisation is used up by 30 invitees in under a day at the budget.

## Which model

Proposed: **`whisper-large-v3`**, named in the report so that changing it needs no code change.

Evidence gathered offline:

- The owner's notes list both models at `/v1/audio/transcriptions`, input up to 50 MB or 1 hour.
- The owner's notes say Voxtral Mini 3B "needs decent audio bitrate" and advise Whisper large-v3 for low-quality audio. Our recordings come from phone and laptop microphones at 32,000 bit/s, often in rooms with noise. That is the case the notes warn about.
- Whisper large-v3 is a multilingual model with long public use for German and English. This is general knowledge, not something we measured.
- Whisper costs 3.5 times as much as Voxtral. At alpha size the difference is small in money (see the table). The token rate is the same in the owner's notes.

Not known: how either model does on German speech from our recorder. Live check 5 compares both on the same sample. If Voxtral is as good, switch the report to it and pay less.

## What is switched off by default

Everything. Without `inference.voice.enabled: true` there is no route (the path answers 404), no status field and no microphone button: the old disabled "Coming later" button stays. Without `speech` in the report the same holds.

One change is live for everyone as soon as this code is deployed: the `Permissions-Policy` header now says `microphone=(self)` instead of `microphone=()`. The browser still asks the user before any recording, and no code asks for the microphone unless the button exists. `scripts/check-headers.mjs` expects the new value.

## What the lead must check live

Nothing below was checked. The probe script is `evaluation/privatemode/voice-probe.ts` (it needs the key and bills a few cents).

1. **Endpoint path and headers.** In the browser's network panel, with the development server and `PRIVATEAI_VOICE=1`: does the SDK post to `/v1/audio/transcriptions` at our origin, with `X-PrivateAI-CSRF` and `privatemode-target-model`? Offline evidence only: the SDK's Wasm contains the strings `/v1/audio/transcriptions`, `multipart/form-data` and `Privatemode-Target-Model`. If the header is missing, the relay answers 400 "Only the qualified speech model is accepted".
2. **Accepted audio formats.** Run the probe with a WebM/Opus file from Chrome or Firefox and an MP4/AAC file from Safari. If MP4 is refused, Safari users get the generic failure message, and we must either convert or hide the button in Safari.
3. **One session for chat and transcription.** The probe makes one verification, one chat call and the transcriptions. Check in the Privatemode portal that only one attestation was counted. Then check in the app: chat first, then dictate, and watch for a second `/privatemode/v1/attest` call in the network panel.
4. **Encrypted size (15 November: per chunk).** Record 2-, 10- and 30-second chunks of a made-up sentence in Chrome (WebM) and Safari (MP4) and run the probe on them: it now prints `encryptedBytes` for each transcription. They must stay under 24,192, 88,192 and 248,192 bytes. In the app, read the request sizes of a 70-second dictation in the network panel. Safari may ignore the requested bitrate: if its 30-second chunks pass 248,192 bytes, they are refused as too large (marked parts), and the factor in `voiceChunkLimit` must grow. If the real overhead is small, the factor can shrink, which tightens the abuse bound.
5. **German accuracy.** Read a made-up German paragraph with umlauts, numbers, a date and an amount ("Am 3. März überweise ich 1.250,50 Euro für die Müllgebühr"). Run the probe with both models. Compare the texts. Do the same in English. Never use real personal content.
6. **Response shape.** The code expects JSON with a `text` field (`response_format: "json"`). The probe prints the keys.
7. **Billing.** After the probe, read the portal: is the audio billed per minute at the listed price, and how many tokens did the quota lose?
8. **The Render bridge.** `server/render-bridge.ts` forwards a fixed list of request headers, and no `privatemode-*` header is on it. The relay needs `privatemode-target-model` for chat and for voice. Confirm on the hosted path that these headers arrive. If they do not, voice input fails there with 400 (and Privatemode chat would too). This was found by reading the code, not by a live run.
9. **Real devices.** Permission prompt, countdown, the warning 20 seconds before the turn maximum and the stop at 3:00 on an iPhone (Safari), an Android phone (Chrome), and desktop Chrome, Firefox and Safari. Screen reader: the button's name and pressed state, and the announcements.
11. **Chunk boundaries (15 November).** Dictate about 70 seconds, counting slowly from one to sixty in German, so that numbers fall on the 30- and 60-second boundaries. Expect every number in order; note any lost or doubled word at a boundary. Do the same on Safari (MP4 chunks: each must be accepted on its own).
12. **Budget display.** After three dictations, compare "Voice today: ... used" with the units on the usage page (each chunk's units are in its request ID) and with the seconds actually spoken.
13. **The new header on the hosted path.** `X-PrivateAI-Voice-Units` is on the bridge's list (`server/render-bridge.ts`). Confirm through Render that a dictation is not refused with `refused_units`.
10. **Retention.** Ask Privatemode in writing, or find in its documents, that audio and transcripts are not stored, as for chat content. Our texts say only what CometRow does.

## Tests (all offline)

- `tests/voice-input.test.ts` (20 tests): the recorder with a fake `MediaRecorder` and fake timers (start, stop, turn maximum, cancel, cancel during the permission prompt, each permission failure, track released, WebM or MP4; since 15 November: chunks of 30 s as new recorders on the same stream, units per chunk, order kept when recorders report late, a cancel drops chunks on their way, a chunk without sound is not sent), the chunk queue (one at a time, joined in order, retry once then the marker, a final refusal stops without retrying and marks the rest, cancel), the turn length from the budget, the transcript into the draft, masking at send time, the transcription call with the SDK as a test double (one verification for chat and transcription, the pinned model header and the units header, failure messages in both languages, session kept on our own refusal and ended on a provider failure, the verification countdown).
- `tests/voice-relay.test.ts` (11 tests): off by default, session and CSRF, forwarding with the real key and nothing logged, the speech model pin, the stop switch, since 15 November the size check against the reported units (honest sizes for every length from 1 to 30 s pass; a 30-second body claiming 10 s, one byte over, missing or over-long units are refused), the daily voice budget in the ledger (units add up, the status shows them, over the budget is refused, and after a restart with a new ledger object on the same database file the budget still holds), allowance units, the chat daily cap, the spend guard, the retry credit, one request per account, the report field and the model watch.
- `tests/voice-input-ui.test.ts` (6 tests, new 15 November): the app in Chromium at 375, 768 and 1280 px in English and German, the microphone a generated tone recorded by the **real** MediaRecorder in 2-second chunks: the note and the notices show used and left, the warning appears, chunks are transcribed while recording goes on, a part that fails twice is marked and the rest is kept, and every chunk is a complete WebM file the browser decodes.
- `tests/deployment-inference-config.test.ts`: the `voice` config fields, the old shape read and translated, bad values refused.
- `tests/security-headers.test.ts` and the bridge and operations header tests: `microphone=(self)`.
- `tests/i18n-modules.test.ts`: every voice text has a German entry.

Not run: the whole suite, the durable suite, the Playwright end-to-end specs. No spec under `tests/browser` was edited. With the switch off the old disabled button is unchanged, so `tests/browser/workspace-organization.spec.ts` should still pass, but it was not run.

## Not built

- No streaming text while talking: chunks are turned into text during the recording, but the text appears in the message box when the user stops.
- No cut at a quiet moment: chunks are cut at fixed times (see "Chunks in the browser").
- No conversion of audio formats in the browser.
- No lock between a running transcription and the Send button. If the user sends a message while a chunk is being turned into text, the relay refuses the message with "A request is already running for this account". Sending a message during a recording drops the recording, as before.
- The retry credit after a provider refusal still lives in the server's memory (a restart forgets it). The voice budget is durable.

## Open decisions for the owner

1. Switch on now or after pay-as-you-go works (the token quota, above).
2. `dailyUnits` (proposed 150, 5 minutes; 60 while tokens are short), `chunkSeconds` (proposed 30) and `maxTurnSeconds` (proposed 180).
3. `speech.allowanceCost` per chunk (proposed 1; 2 would make a 10-second live turn cost 3 units).
4. The model: Whisper large-v3 (proposed) or Voxtral Mini 3B, after live check 5.
5. The privacy wording in `docs/voice-privacy-wording-draft-20261114.md`, including the sentence about spoken numbers.
6. `microphone=(self)` for everyone from the next deploy, or only while voice input is on (that needs a small change to the header code and to `scripts/check-headers.mjs`).
7. The ledger now keeps each chunk's length in 2-second steps with the request (content-free, like the token counts). Proposed: accept; mention it where the usage ledger is described to users.

## Checked live, 14 November 2026 (lead, development key)

Two synthetic samples made with the laptop's own Windows voices (one German, one English sentence, about 10 seconds each, WAV), sent through the Privatemode SDK with `evaluation/privatemode/voice-probe.ts`.

- **Both models answered and both transcripts were exact**, including "Köln", "Gebühr" and "Personalausweis". `whisper-large-v3` and `voxtral-mini-3b` each took about 0.5 s.
- **One verification covered the chat call and all four transcriptions.**
- **Response shape:** JSON with `text` and `usage`; `usage` came back empty, so the relay cannot meter audio from the reply. Cost stays bounded by upload size and count, as designed.
- **Format:** WAV is accepted.
- The speech models are now in the model-watch baseline (`server/privatemode-models-baseline.json`).

Not checked: WebM/Opus from Chrome and Firefox and MP4/AAC from Safari (the formats the browser recorder produces), real human speech, accents, noise, dialect, a full 120-second recording and its encrypted size, the whole path through the app and relay in a browser, phones, how Privatemode bills the minutes. Clean synthetic speech is the easy case, so this does not choose between the two models.

Also found while merging: the Render bridge did not forward the Privatemode SDK's request headers, so chat and voice would both have failed on the hosted site. Fixed the same day (`server/render-bridge.ts`, `tests/render-bridge-headers.test.ts`).
