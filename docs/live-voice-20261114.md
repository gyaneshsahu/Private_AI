# Live voice conversation (14 November 2026)

Status: **built and tested offline. Switched off by default. Nothing was verified live.** No call was made to Privatemode, no key was read, no real microphone, speaker or phone was used.

## What it is, and what it is not

A hands-free conversation, turn by turn. The user speaks, CometRow turns the speech into text, shows it for a moment, sends it as an ordinary chat message, reads the answer aloud with a voice on the device, and then opens the microphone again.

It is **not** a real-time voice model. Privatemode has none. One side speaks at a time. The user cannot interrupt while the answer is read (no barge-in). The panel says this in plain words before the first turn.

It is built only from parts that exist: voice input (`docs/voice-to-text-20261114.md`) and read aloud (`docs/read-aloud-and-pdf-export-20261114.md`). No new server route, no new server field, nothing new is stored.

## The switch

Build variable `VITE_LIVE_VOICE=1` in `src/device-features.ts`, off by default. The feature needs nothing new from the server, so a build switch is enough (rule 8). The button appears only when all of these hold:

- `VITE_LIVE_VOICE=1`;
- `VITE_READ_ALOUD=1` (read aloud);
- the server sends `voice` in `/api/status` (voice input is on: `inference.voice` plus `speech` in the report) and chat is ready.

Otherwise the old disabled "Coming later" button stays, and the tools menu still lists live voice as coming later.

## The loop and its states

The loop is a pure module, `src/live-voice.ts`, with everything that touches the browser injected (recorder, transcriber, sender, speaker, clock, tones). The panel is `src/LiveVoice.tsx`, the tones and the level meter `src/live-voice-audio.ts`, the labels `src/text/live-voice.ts`.

| State | What happens | Controls |
| --- | --- | --- |
| idle | The panel explains the feature, the voice note and the cost | Start talking, Close |
| starting | The microphone opens (the browser may ask for permission) | Pause, End |
| listening | Recording, with the clock and the maximum length | Done speaking, Pause, End |
| transcribing | The recording goes to the speech model | Pause, End |
| review | The text is shown: "Sending in 3 ..." | Send now, Cancel, Edit, Pause, End |
| answering | Sent through the app's own send path; the answer streams into the chat | Pause, End |
| speaking | The answer is read aloud; the microphone is closed | Skip reading, Pause, End |
| paused | Nothing runs; the reason is shown | Resume, End |
| ended | The reason is shown | Start again, Close |

- **End** stops everything at once: the recording is dropped and the microphone released, a running transcription or answer is aborted, speech is cancelled, timers are cleared. Nothing is sent after End (tested from every state).
- **Pause** does the same but keeps the session; Resume opens the microphone again.
- Escape closes the panel and ends the session.
- Each change of state is announced politely to screen readers (a hidden `aria-live="polite"` line; no new `role="status"`). The ticking clock and countdown are not announced.
- Focus moves into the panel when it opens, to the next action when the focused button disappears, and back to the button when it closes.

## End of speech

Two ways, both always available:

1. **Silence detection** with the Web Audio API (`watchSpeech` and `createSilenceDetector`). An AnalyserNode measures the level every 50 ms. The first 300 ms set the room's noise floor; the threshold is 3 times that, kept between 0.015 and 0.06 so talking during the measurement cannot push it out of reach. Speech counts after 150 ms above the threshold. The recording ends 1.5 s after speech falls below it. If no speech comes within 8 s, nothing is transcribed or sent ("No speech was heard").
2. **"Done speaking"**, a big button, always shown while listening.

The existing maximum length of voice input (120 s by default) is the backstop.

Tested: the detector with synthetic level sequences (quiet room, noisy room, a pause inside a sentence, a click, talking during calibration), and in real headless Chromium with a generated tone as the microphone: the first turn of every UI test ends by silence alone, with no tap. **Not tested:** real voices, real rooms, real microphones with noise suppression. Limits: loud steady noise looks like speech; a long thinking pause looks like the end. The button and the maximum length cover both.

## Review before sending

The transcript is shown for 3 seconds ("Sending in 3 ... 2 ... 1") with Send now, Cancel and Edit. A setting in the panel, "Always ask before sending", makes it wait for a tap instead. Cancel pauses and sends nothing. Edit ends the session and puts the text into the message box.

The transcript then goes through `send()` in `src/App.tsx` like typed text: identifier masking, verification, allowance, the stop switch and the Stop button all apply. Numbers the user says aloud are part of the audio and are not masked there; the panel's note says so, as the voice input note does.

## Interruptions

| Case | Behaviour |
| --- | --- |
| Rules or current-facts question that would ask "search first?" (`asksBeforeSending`), or automatic search is on | **Decision: pause and ask on screen.** Nothing is searched silently and nothing is sent. The session ends, the text goes into the message box with the usual search choice, and the notice line says why. Questions that do not trigger the choice are sent without search, exactly as typed ones are |
| Health consent not yet given | The session ends; the usual consent prompt is shown with the question waiting, as for typed text |
| Allowance too low for a turn | Ends, with the units needed and left |
| Daily request limit, recordings-per-day limit, spend limit, stop switch | The relay's refusal ends the session with the voice input message |
| Verification limit | The app's countdown shows; the session pauses; Resume after it |
| Offline | Pauses before listening or sending |
| Empty recording, no words | Pauses, nothing sent (an empty transcription still costs its units) |
| Code or tables in the answer | Read aloud says "Code block omitted" and reads tables row by row (read aloud's rules); the chat shows everything |
| No on-device voice for the answer's language | Pauses; the answer stays on screen and the microphone does not open by itself |
| A speech engine that never reports the end | Timed out after 10 s plus 150 ms per character, then the microphone opens |
| Vault locks, another conversation opens, the page is left | Ends |
| Tab goes to the background | Pauses: the microphone never stays open unseen |
| Another app takes the microphone (the track ends) | Pauses |
| Another request is running | Pauses before listening or sending |

## Cost and caps

One turn is one transcription plus one chat message, charged through the existing ledger. No new server route.

| Mode | Units per turn (with the proposed speech cost of 2) |
| --- | --- |
| Fast (default) | 2 + 1 = 3 |
| Thinking (only when the user chose Thinking in the mode menu; Auto uses Fast) | 2 + 5 = 7 |

- A session ends after **15 questions or 10 minutes** (`LIVE_VOICE_CAPS`), checked before each listening. Start again for more.
- The panel shows "Questions sent: n of 15 · about x units used". "About", because a failed request may still be charged; the usage page is the truth.
- **Important:** the recordings-per-day cap of voice input applies. With today's defaults (10 minutes per day, 120 s per recording) that is **5 recordings per day**, so 5 live turns per day. See the open decisions.
- One request per turn: tested (requests equal turns, and the count stops at the cap).

## Echo

The microphone is never open while the answer is read. It opens only after speech ends (or the time-out above). The start tone plays before the microphone opens, so it is not part of the noise measurement. Barge-in is out of scope.

## Android

**Decision: not offered on Android.** Read aloud never speaks there (the page cannot check that the phone's voices stay on the device), so a voice conversation would be voice in, text out, with a manual Resume after every answer. The button is shown disabled with a sentence saying why. Voice input (dictation) still works there.

## Sounds

Short generated tones through Web Audio, no files: rising when listening starts, one tone when the recording is taken, one when sent, falling at the end. The panel has a "Sounds" checkbox (on by default). Both panel settings live in this browser's storage only (`cometrow.live-voice`).

## What is not verified

- Anything live: a real microphone, the real speech models, real voices, real rooms, timings.
- Safari, Firefox, iPhone, iPad, a screen reader.
- Whether the silence thresholds suit real microphones (with or without the browser's noise suppression).
- Whether on-device voices on macOS and Windows end every piece of a long answer properly.

## Live checks for the lead

Build with `VITE_LIVE_VOICE=1` and `VITE_READ_ALOUD=1`, voice input on (`PRIVATEAI_VOICE=1` on the development server, a report with `speech`), signed in on desktop Chrome or Edge with an on-device English and German voice.

1. Ask a short English question by voice and stay quiet. Expect: the recording ends about 1.5 s after you stop, "Sending in 3", the answer is read, the microphone opens again. Note how long each step took.
2. The same in German.
3. Pause mid-sentence for about 1 s. Expect: it keeps listening.
4. In a noisy room (music at low volume). Expect: it still ends; if not, "Done speaking" works.
5. Press End while the answer is read and while it is answering. Expect: silence at once, no further request on the usage page.
6. Ask "Wie hoch ist der Rundfunkbeitrag?". Expect: the session ends, the question is in the message box with the search choice.
7. Count the units on the usage page after three Fast turns. Expect: 3 x (speech cost + 1).

## Open decisions for the owner

- **Recordings per day.** With the defaults, live voice gets 5 turns a day. Recommended for the alpha: `maxSeconds` 30 and `dailyMinutes` 10 (20 recordings), or keep it and say so.
- **Speech cost.** The proposed 2 units per recording makes a Fast turn 3 units. Recommended: keep for the alpha and track it.
- **Review delay.** 3 seconds by default. Recommended: keep.
- **Android.** Not offered. Recommended: keep until read aloud has an answer for Android.
