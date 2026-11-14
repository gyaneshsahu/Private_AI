# Voice-to-text (dictation) in the composer, 14 November 2026

Status: **built and tested offline. Switched off by default. Nothing was verified live.** No call was made to Privatemode, no key was read, no real microphone was used.

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
   "voice": { "enabled": true, "maxSeconds": 120, "dailyMinutes": 10 }
   ```

   | Field | Range | Meaning |
   | --- | --- | --- |
   | `enabled` | true or false | The switch. Absent or false: no route, no button |
   | `maxSeconds` | 10 to 300 | Longest recording. The browser stops by itself with a visible countdown. It also sets the upload size limit |
   | `dailyMinutes` | 1 to 120 | Audio minutes per account in any 24 hours. Every recording counts as a full one |

2. Qualification report: `speech`

   ```json
   "speech": { "model": "whisper-large-v3", "allowanceCost": 2 }
   ```

   The speech model is a field of the report, not a constant in the code. It must be an exact model ID (no `-latest` alias), it needs a Privatemode report, and it must not be one of the chat models. The chat route never accepts it. The daily model check (`server/model-watch.ts`) watches it together with the chat models, so record a new baseline after adding it: `scripts/privatemode-models-check.ts --record --models glm-5.3,glm-5.3-flash,whisper-large-v3`.

`GET /api/status` then carries `voice: { "maxSeconds": 120 }`. The browser shows the microphone button only when that field is present. The field is absent when the switch is off, when the report has no `speech`, when chat is paused by the stop switch, and when the spending limit is reached.

On the development server (`server/index.ts`) the switch is the environment variable `PRIVATEAI_VOICE=1` (120 seconds, 10 minutes). The report still needs `speech`.

## Design

| Part | File | What it does |
| --- | --- | --- |
| Recorder | `src/voice-input.ts` (`createVoiceRecorder`) | `getUserMedia({ audio: true })`, then `MediaRecorder` at 32,000 bit/s. States: idle, starting, recording. Stops on tap, at the maximum, when the tab is hidden. Dropped when the page is left, the composer goes away or a message is sent |
| Button | `src/VoiceInput.tsx` | A real button with a name, a pressed state and a visible countdown. Start, stop, result and failures go to the app's notice line, which is a live region. The first tap shows the note and asks before recording |
| Client call | `src/providers/privatemode-client.ts` (`transcribe`) | `client.audio.transcriptions.create()` on the cached verified client. One verification covers chat and transcription |
| Relay route | `server/providers/privatemode-voice.ts` | `POST /v1/audio/transcriptions` at the site root, mapped under `/api/inference` like chat. Admission, limits, counts |
| Shared limits | `shared/voice.ts` | Bitrate, upload size limit, recordings per day |
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
5. The `privatemode-target-model` header must equal the report's speech model, else 400. The relay sets the header itself on the upstream call.
6. Three requests per instance and one request per account. These are the same slots chat uses, so a recording being transcribed blocks a chat message from the same account and the other way round.
7. Spend guard (`server/spend-guard.ts`).
8. Recordings per day (count).
9. The chat allowance's daily cap (`allowance.dailyLimit`), in units.
10. Allowance: `reserve`, `dispatch`, `finish` on the same usage ledger as chat, with `speech.allowanceCost` units.

Forwarded upstream: the body bytes, `content-type`, `accept`, the SDK's `privatemode-*` headers and the real key. Nothing else. A reply that is not 200 is never passed on: the browser gets 502 and only the class of failure. After such a refusal the same account's next recording within one minute is not charged again (the retry credit, as for chat).

Counts (names only, no content, no account): `voice.completed`, `voice.interrupted`, `voice.refused_size`, `voice.refused_model`, `voice.refused_allowance`, `voice.refused_daily`, `voice.refused_voice_daily`, `voice.refused_spend`, `voice.refused_account_busy`, `voice.refused_instance_busy`, `voice.upstream_rejected`, `voice.upstream_unavailable`, `voice.upstream_model-not-found`, `voice.retry_not_counted`, `voice.stopped`, `voice.off`, `voice.unavailable`, `voice.usage_unavailable`. They appear in the hourly counts line.

The relay names its refusal in the response header `X-PrivateAI-Voice`, because the SDK hands the browser the status and headers of a refused reply but not its text. The browser turns that into a plain message in the interface language.

## Caps, with the arithmetic

The server cannot see inside the encrypted body. A length the browser declares cannot be trusted. So cost is bounded by upload size and by count.

**Length of one recording.** `maxSeconds`, proposed 120. The browser stops by itself and shows "Recording 0:47 of 2:00".

**Upload size** (`voiceUploadLimit` in `shared/voice.ts`):

```
maxSeconds x 32,000 bit/s / 8      = 120 x 4,000 = 480,000 bytes of audio at the requested bitrate
x 2                                = 960,000      room for a recorder that overshoots, and for the encryption encoding
+ 65,536                           = 1,025,536    container headers and form fields
```

1,025,536 bytes is below the Render bridge's body limit of 1,048,576 bytes (`server/render-bridge.ts`). That is why the factor is 2 and not higher. If the encryption turns out to enlarge the body by more than about 2 times, full-length recordings will be refused as too large, and either the bitrate or the bridge limit must change. This is live check 4.

**Recordings per day** (`voiceDailyCount`): `dailyMinutes x 60 / maxSeconds`, at least 1. With 10 minutes and 120 seconds: 5 recordings per account in any 24 hours. Every recording counts as a full one, also a 5-second one.

**Allowance.** Each recording uses `speech.allowanceCost` units of the account's request allowance, through the same ledger. Proposed: 2. This follows row K3 ("voice minute 1") with every recording counted at its 2-minute maximum. The chat daily cap and the period limit apply to these units too.

**Spend guard.** Each recording is one ledger request without metering. The spend guard counts it at a chat request's worst case. That is far more than a recording costs, never less. No second accounting was built.

**What a modified browser could do.** It can ignore the countdown and record at a lower bitrate. At 6,000 bit/s (the lowest Opus speech rate) 1,025,536 bytes hold about 23 minutes. Five such uploads a day are about 114 audio minutes per account per day: EUR 1.60 with Whisper, EUR 0.46 with Voxtral, and about 319,000 tokens of the quota. The allowance units and the spend guard still apply. An honest browser cannot exceed 10 minutes a day.

**Shortcut to know:** the recordings-per-day count and the retry credit live in the server's memory, like chat's retry credit. A restart forgets them. The allowance units are in the durable ledger and survive.

## Cost

Prices and the token rate are **owner-reported** (from `docs/privatemode-master-notes.md`), not verified by us: Whisper large-v3 EUR 0.014 per audio minute, Voxtral Mini 3B EUR 0.004, 1 audio minute counts about 2,800 tokens, free tier 100 audio minutes per month for the whole organisation. Prices are before 19% VAT.

| | Audio minutes | Whisper | Voxtral | Tokens of the quota |
| --- | ---: | ---: | ---: | ---: |
| One recording at the maximum (2 minutes) | 2 | EUR 0.028 | EUR 0.008 | 5,600 |
| One account, one day at the cap (10 minutes) | 10 | EUR 0.14 | EUR 0.04 | 28,000 |
| 30 invitees, one day, all at the cap | 300 | EUR 4.20 | EUR 1.20 | 840,000 |
| 30 invitees, 30 days, all at the cap every day | 9,000 | EUR 126.00 | EUR 36.00 | 25,200,000 |
| The same with `dailyMinutes` 4 (2 recordings a day) | 3,600 | EUR 50.40 | EUR 14.40 | 10,080,000 |
| An assumed real use: 30 invitees, 5 minutes on 10 days each | 1,500 | EUR 21.00 | EUR 6.00 | 4,200,000 |

The last row is an assumption, not a measurement.

**The token quota is the tighter limit, not the money.** The owner reported 1.579M of 5M free tokens left on 13 November, and pay-as-you-go cannot be switched on yet (checklist rows K6 and P12). 30 invitees at the cap use 840,000 tokens in one day. So voice input should stay off until pay-as-you-go works, or start with a small `dailyMinutes`. The free tier of 100 audio minutes a month for the whole organisation is used up by 30 invitees in well under a day at the cap.

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
4. **Encrypted size.** Record a full 120 seconds in Chrome and in Safari. Read the request size in the network panel. It must stay under 1,025,536 bytes. Safari may ignore the requested bitrate.
5. **German accuracy.** Read a made-up German paragraph with umlauts, numbers, a date and an amount ("Am 3. März überweise ich 1.250,50 Euro für die Müllgebühr"). Run the probe with both models. Compare the texts. Do the same in English. Never use real personal content.
6. **Response shape.** The code expects JSON with a `text` field (`response_format: "json"`). The probe prints the keys.
7. **Billing.** After the probe, read the portal: is the audio billed per minute at the listed price, and how many tokens did the quota lose?
8. **The Render bridge.** `server/render-bridge.ts` forwards a fixed list of request headers, and no `privatemode-*` header is on it. The relay needs `privatemode-target-model` for chat and for voice. Confirm on the hosted path that these headers arrive. If they do not, voice input fails there with 400 (and Privatemode chat would too). This was found by reading the code, not by a live run.
9. **Real devices.** Permission prompt, countdown and the stop at 2:00 on an iPhone (Safari), an Android phone (Chrome), and desktop Chrome, Firefox and Safari. Screen reader: the button's name and pressed state, and the announcements.
10. **Retention.** Ask Privatemode in writing, or find in its documents, that audio and transcripts are not stored, as for chat content. Our texts say only what CometRow does.

## Tests (all offline)

- `tests/voice-input.test.ts` (12 tests): the recorder with a fake `MediaRecorder` and fake timers (start, stop, maximum, cancel, cancel during the permission prompt, each permission failure, track released, WebM or MP4), the transcript into the draft, masking at send time, the transcription call with the SDK as a test double (one verification for chat and transcription, the pinned model header, failure messages in both languages, session kept on our own refusal and ended on a provider failure, the verification countdown).
- `tests/voice-relay.test.ts` (11 tests): off by default, session and CSRF, forwarding with the real key and nothing logged, the speech model pin, the stop switch, the size limit, allowance units, recordings per day, the chat daily cap, the spend guard, the retry credit, one request per account, the report field and the model watch.
- `tests/deployment-inference-config.test.ts`: the `voice` config fields.
- `tests/security-headers.test.ts` and the bridge and operations header tests: `microphone=(self)`.
- `tests/i18n-modules.test.ts`: every voice text has a German entry.

Not run: the whole suite, the durable suite, the Playwright end-to-end specs. No spec under `tests/browser` was edited. With the switch off the old disabled button is unchanged, so `tests/browser/workspace-organization.spec.ts` should still pass, but it was not run.

## Not built

- No live voice conversation and no spoken answers.
- No streaming transcription: the text appears after the recording ends.
- No conversion of audio formats in the browser.
- No lock between a running transcription and the Send button. If the user sends a message while a recording is being turned into text, the relay refuses the message with "A request is already running for this account".
- The recordings-per-day count is not in the durable ledger (see the shortcut above).

## Open decisions for the owner

1. Switch on now or after pay-as-you-go works (the token quota, above).
2. `maxSeconds` (proposed 120) and `dailyMinutes` (proposed 10, or 4 while tokens are short).
3. `speech.allowanceCost` (proposed 2).
4. The model: Whisper large-v3 (proposed) or Voxtral Mini 3B, after live check 5.
5. The privacy wording in `docs/voice-privacy-wording-draft-20261114.md`, including the sentence about spoken numbers.
6. `microphone=(self)` for everyone from the next deploy, or only while voice input is on (that needs a small change to the header code and to `scripts/check-headers.mjs`).
