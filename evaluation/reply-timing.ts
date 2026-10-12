// Measures delivered answer text, not encrypted bytes or hidden reasoning.
// First visible text is only a proxy; human review determines its usefulness.
export function replyTiming(now: () => number = () => performance.now()) {
  const start = now();
  let firstVisibleTextMs: number | null = null;
  return {
    chunk(text: string) {
      if (firstVisibleTextMs === null && text.trim())
        firstVisibleTextMs = Math.round(now() - start);
    },
    snapshot() {
      return { firstVisibleTextMs, elapsedMs: Math.round(now() - start) };
    },
  };
}
