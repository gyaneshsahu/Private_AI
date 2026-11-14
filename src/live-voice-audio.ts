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
