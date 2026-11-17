// The Web Audio parts of live voice: the level meter that feeds the silence detector, and the
// short tones. Everything runs on the device: no audio file, no network.
import { createSilenceDetector, type Earcon } from "./live-voice";

type AudioContextClass = typeof AudioContext;
const contextClass = (): AudioContextClass | undefined =>
  globalThis.AudioContext ??
  (globalThis as unknown as { webkitAudioContext?: AudioContextClass }).webkitAudioContext;

/**
 * Watches a microphone stream and reports the end of speech, or that nothing was said.
 * Returns the function that stops watching. Without Web Audio it reports nothing: the
 * "Done speaking" button and the maximum length still end the recording.
 */
export function watchSpeech(
  stream: MediaStream,
  on: (event: "speechEnd" | "noSpeech") => void,
  sliceMs = 50,
): () => void {
  const Context = contextClass();
  if (!Context) return () => {};
  const context = new Context();
  const analyser = context.createAnalyser();
  analyser.fftSize = 1024;
  context.createMediaStreamSource(stream).connect(analyser);
  void context.resume().catch(() => {});
  const samples = new Float32Array(analyser.fftSize);
  const detector = createSilenceDetector();
  const timer = setInterval(() => {
    analyser.getFloatTimeDomainData(samples);
    let sum = 0;
    for (const sample of samples) sum += sample * sample;
    const event = detector.push(Math.sqrt(sum / samples.length), performance.now());
    if (event) on(event);
  }, sliceMs);
  return () => {
    clearInterval(timer);
    void context.close().catch(() => {});
  };
}

/**
 * Talk-over detection while the answer is spoken (voice conversation, 18 November). The microphone
 * opens with the browser's echo cancellation; the first 400 ms set the level of what the speaker
 * leaks back, and the user counts as talking once the level stays at 2.5 times that (and at least
 * `minLevel`) for `holdMs`. Reports once. Limit: on loudspeakers without good echo cancellation the
 * answer itself can trigger it; the Interrupt button and the setting are the fallbacks.
 */
export function createTalkOverDetector(o = { calibrateMs: 400, factor: 2.5, minLevel: 0.045, holdMs: 350 }) {
  let first: number | undefined;
  let sum = 0;
  let count = 0;
  let threshold: number | undefined;
  let loudSince: number | undefined;
  let done = false;
  return {
    push(level: number, at: number): boolean {
      if (done) return false;
      first ??= at;
      if (at - first < o.calibrateMs) {
        sum += level;
        count++;
        return false;
      }
      threshold ??= Math.max(o.minLevel, (count ? sum / count : 0) * o.factor);
      if (level <= threshold) {
        loudSince = undefined;
        return false;
      }
      loudSince ??= at;
      if (at - loudSince < o.holdMs) return false;
      done = true;
      return true;
    },
  };
}

/** Opens the microphone (echo cancellation on) and calls `on` once the user talks over the answer. */
export async function watchTalkOver(on: () => void, sliceMs = 50): Promise<() => void> {
  const Context = contextClass();
  if (!Context || !navigator.mediaDevices?.getUserMedia) return () => {};
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: false },
  });
  const context = new Context();
  const analyser = context.createAnalyser();
  analyser.fftSize = 1024;
  context.createMediaStreamSource(stream).connect(analyser);
  void context.resume().catch(() => {});
  const samples = new Float32Array(analyser.fftSize);
  const detector = createTalkOverDetector();
  const timer = setInterval(() => {
    analyser.getFloatTimeDomainData(samples);
    let total = 0;
    for (const sample of samples) total += sample * sample;
    if (detector.push(Math.sqrt(total / samples.length), performance.now())) on();
  }, sliceMs);
  return () => {
    clearInterval(timer);
    stream.getTracks().forEach((track) => track.stop());
    void context.close().catch(() => {});
  };
}

const TONES: Record<Earcon, readonly number[]> = {
  listen: [660, 880], // rising: you can speak
  heard: [660], // one tone: got it
  sent: [520],
  end: [660, 440], // falling: over
};
let tones: AudioContext | undefined;
/** A quiet generated tone of about a tenth of a second per note. Never throws. */
export function playEarcon(name: Earcon) {
  try {
    const Context = contextClass();
    if (!Context) return;
    tones ??= new Context();
    void tones.resume().catch(() => {});
    TONES[name].forEach((frequency, index) => {
      const at = tones!.currentTime + index * 0.11;
      const oscillator = tones!.createOscillator();
      const gain = tones!.createGain();
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(0.08, at + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.1);
      oscillator.connect(gain).connect(tones!.destination);
      oscillator.start(at);
      oscillator.stop(at + 0.11);
    });
  } catch {
    /* no sound is never a failure */
  }
}
