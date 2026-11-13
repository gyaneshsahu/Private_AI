// Content-free operating counts for the alpha (docs/alpha-plan-20261113.md, metrics M1 to M4):
// fixed category names only, never an account, session, address, text or URL. One process,
// in memory; the entry file logs and resets them hourly.
const counts = new Map<string, number>();

export function count(name: string) {
  counts.set(name, (counts.get(name) ?? 0) + 1);
}

/** The counts since the last call, sorted by name, then reset. */
export function takeCounts(): Record<string, number> {
  const out = Object.fromEntries([...counts].sort(([a], [b]) => a.localeCompare(b)));
  counts.clear();
  return out;
}

/** Logs one line per period when anything happened; returns the stop function. */
export function scheduleCountsLog(log: (line: string) => void, everyMs = 3_600_000): () => void {
  const timer = setInterval(() => {
    const now = takeCounts();
    if (Object.keys(now).length) log(`CometRow counts (last hour): ${JSON.stringify(now)}`);
  }, everyMs);
  timer.unref();
  return () => clearInterval(timer);
}
