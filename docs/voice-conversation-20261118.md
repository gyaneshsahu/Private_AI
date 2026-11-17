# Voice conversation (18 November 2026)

Owner's brief, 18 November: make live voice feel real-time without changing the turn-based design; call it "Voice conversation"; keep the daily voice metering as decided. Earlier design: `docs/live-voice-20261114.md` (still valid apart from what this note changes).

## What changed

| Before (14 November) | Now |
| --- | --- |
| Name: "Live voice" | "Voice conversation" (German "Sprachgespräch") |
| End of speech after 1.5 s of silence | After 1.0 s (`SILENCE_DEFAULTS.silenceMs`) |
| The text was shown for 3 s ("Sending in 3 ...") before it was sent | Sent at once. "Always ask before sending" still waits for a tap |
| The answer was read only after it was completely written | Read sentence by sentence while it is still being written (`followAnswer` in `src/LiveVoice.tsx`) |
| Interrupt only by tapping "Interrupt and speak" | Also by talking over the answer (`watchTalkOver` in `src/live-voice-audio.ts`), on by default, setting "Interrupt by talking". The button stays as the fallback |
| Voice: the default local voice | The best local voice: an operating system's higher-quality voice ("Premium", "Enhanced", Siri) first, then the default. Still only voices that work on the device (`chooseVoice`, the same local-voice rule as read aloud) |
| No timing | Each turn measures the delay from the end of speech to the first spoken word (`replyDelayMs`, shown on the panel as `data-reply-delay-ms`) |

Not changed: turn by turn (one side speaks at a time), metering per transcribed chunk plus one message per turn, the daily voice budget, all stops and pauses, no new server route.

## Delay from the end of speech to the first spoken word

Measured parts:

| Part | Time | Source |
| --- | --- | --- |
| End-of-speech detection | 1.0 s (fixed setting) | `SILENCE_DEFAULTS` |
| Transcription of the last chunk, 3.6 s of speech | Whisper 405 ms, Voxtral 252 ms | live, 18 November, one synthetic sentence ("What is a good name for a small grey cat?", Windows speech), `evaluation/privatemode/voice-probe.ts` |
| First token of the answer, Fast | median 558 ms, max 1,672 ms | `docs/parity-matrix-20261112.md` (12 November, 18 turns) |
| First sentence written, then picked up | about 0.3 s plus up to 0.2 s polling | estimate |
| Speech engine starts | about 0.1 to 0.3 s | estimate (local voice) |
| The app's own share, fakes for transcription and answer | under 1.5 s including the 1 s silence (test asserts it) | `tests/live-voice-ui.test.ts` |

**Result: about 2.5 s typical (2.2 to 3.0 s), about 4 s in a slow case**, from the moment the user stops talking to the first word of the answer. Before this change the same path took about 7 s (1.5 s silence + transcription + 3 s countdown + the whole answer + speech start).

Not measured: one complete turn end to end with a real microphone, real transcription and a real answer (it needs a person and a running hosted app). The panel now records every real turn's delay, so the first hosted test gives the true figure: open the panel, talk, and read `data-reply-delay-ms` (or ask the agent to add it to the walkthrough).

## Talk-over: how it works and its limit

While the answer is spoken, the microphone opens with the browser's echo cancellation. The first 400 ms measure what the speaker leaks back; talking counts once the level stays at 2.5 times that (at least 0.045) for 350 ms. Then the speech stops: if the answer is already complete, the microphone opens for the next question at once; if it is still being written, the reading stops and listening starts as soon as the answer is complete (the full answer stays in the chat).

Limit: on loudspeakers without good echo cancellation, the answer itself can trigger it. With headphones, phones and most laptops it does not. The setting turns it off; the Interrupt button always works. Tested with synthetic levels (echo, a click, real talk-over); not tested with real rooms and speakers.

## Spend

18 November: one voice probe, one verification, two transcriptions of 3.6 s (Whisper and Voxtral) and one short chat call. About EUR 0.001.

## Tests

- `tests/live-voice.test.ts`: sending at once, the speaker asked to follow the answer, the reply delay measured once per turn, talk-over while spoken and while written, 1 s silence, and the talk-over detector (echo ignored, a click ignored, real talk-over after 350 ms). 48 tests pass.
- `tests/live-voice-ui.test.ts`: a whole turn in the browser with a synthetic microphone: ended by silence, sent at once, read aloud, delay recorded under 1.5 s with fakes; "Always ask before sending" still gives the review. 12 tests pass.
- `tests/read-aloud.test.ts`: the voice choice still refuses network voices.
