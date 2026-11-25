// Activity (docs/activity-states-20261126.md): what the app is doing for the answer in work, kept
// outside React so the one live line and the "Thought for N s" line read the same facts. A turn
// opens with the first status of a request, takes the answer's id once the answer exists, notes
// when the first text arrives, and stays readable under that id afterwards. In memory only:
// nothing here is saved, synced or sent anywhere.
export interface Turn {
  id?: string;
  startedAt: number;
  /** When the first text of the answer arrived. */
  answeredAt?: number;
  /** The steps shown so far, in order (never the quiet transport statuses). */
  steps: string[];
  /** The step on the live line now; "" means thinking. */
  live: string;
  /** The model's own reasoning text, when the provider streams it. */
  reasoning: string;
}

let open: Turn | undefined;
// A search ends before its answer starts: the steps so far wait here for the answer that follows at once.
let carried: { turn: Turn; at: number } | undefined;
const finished = new Map<string, Turn>();
const listeners = new Set<() => void>();
let version = 0;
const changed = () => {
  version++;
  listeners.forEach((tell) => tell());
};

export const subscribe = (tell: () => void) => (listeners.add(tell), () => void listeners.delete(tell));
export const snapshot = () => version;
/** The turn in work before its answer exists (searching, reading a file). */
export const pending = () => (open && !open.id ? open : undefined);
export const turnFor = (id: string) => (open?.id === id ? open : finished.get(id));

/** Called on every change of the app's status: `step` is "" while only thinking. */
export function observe(o: { active: boolean; step: string; answerId?: string; hasText: boolean; now?: number }) {
  const now = o.now ?? Date.now();
  if (!o.active) {
    if (!open) return;
    if (open.id) {
      // An answer that arrived and ended between two looks: its first text came no later than now.
      open.answeredAt ??= now;
      finished.set(open.id, open);
      // Enough for a long chat; the oldest go first.
      if (finished.size > 60) finished.delete(finished.keys().next().value!);
    } else if (open.steps.length) carried = { turn: open, at: now };
    open = undefined;
    return changed();
  }
  // A new answer after the last one: a new turn.
  if (open?.id && o.answerId && open.id !== o.answerId) {
    finished.set(open.id, open);
    open = undefined;
  }
  open ??= carried && now - carried.at < 5000 ? carried.turn : { startedAt: now, steps: [], live: "", reasoning: "" };
  carried = undefined;
  if (o.answerId) open.id = o.answerId;
  if (!open.answeredAt) {
    open.live = o.step;
    if (o.step && open.steps.at(-1) !== o.step) open.steps.push(o.step);
    if (o.hasText) open.answeredAt = now;
  }
  changed();
}
/** A step that has no status of its own (how many sources a search brought). */
export function note(step: string) {
  if (!open || open.steps.at(-1) === step) return;
  open.steps.push(step);
  changed();
}
export function addReasoning(text: string) {
  if (!open || open.reasoning.length > 20_000) return;
  open.reasoning += text;
  changed();
}
/** Tests only. */
export function reset() {
  open = carried = undefined;
  finished.clear();
  changed();
}
