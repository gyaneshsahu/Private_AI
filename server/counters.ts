// Content-free operating counts for the alpha (docs/alpha-plan-20261113.md, metrics M1 to M4):
// fixed category names only, never an account, session, address, text or URL. One process,
// in memory; the entry file logs and resets them hourly.
const counts = new Map<string, number>();
// The same counts a second time, for the owner's dashboard (server/analytics.ts): it takes them on
// its own rhythm, so the hourly log line below still shows every count.
const forAnalytics = new Map<string, number>();

export function count(name: string) {
  counts.set(name, (counts.get(name) ?? 0) + 1);
  forAnalytics.set(name, (forAnalytics.get(name) ?? 0) + 1);
  // Nobody takes them while analytics is off: forget rather than grow (names are fixed, so this is a guard, not a need).
  if (forAnalytics.size > 2000) forAnalytics.clear();
}

/** The counts since the last call, for the dashboard's day totals; then reset. */
export function takeAnalyticsCounts(): Record<string, number> {
  const out = Object.fromEntries(forAnalytics);
  forAnalytics.clear();
  return out;
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
