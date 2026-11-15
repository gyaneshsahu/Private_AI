/**
 * Scheduled tasks on the device (docs/scheduled-20261115.md). Every task, Manual and Auto, is
 * kept in one encrypted record in the vault (src/vault.ts); this module holds the decrypted list
 * while the vault is unlocked and has the pure changes the vault applies. An Auto task's server
 * copy is changed through src/background-tasks-client.ts first, then here.
 */
import { z } from "zod";
import {
  advanceAfterRun,
  nextDue,
  SCHEDULE_LIMITS,
  scheduledTaskSchema,
  type ScheduledTask,
  type ScheduleTrigger,
} from "../shared/scheduled-tasks";

export const scheduledTasksSchema = z
  .array(scheduledTaskSchema)
  .max(SCHEDULE_LIMITS.maxManualTasks + SCHEDULE_LIMITS.maxAutoTasks)
  .refine((list) => new Set(list.map((t) => t.id)).size === list.length, "Duplicate task identity.")
  .refine((list) => list.filter((t) => t.mode === "manual").length <= SCHEDULE_LIMITS.maxManualTasks, "Too many tasks.")
  .refine((list) => list.filter((t) => t.mode === "auto").length <= SCHEDULE_LIMITS.maxAutoTasks, "Too many background tasks.");

export type TaskProblem = "full" | "autoFull" | "gone" | "changed";
/** A change that was refused; the screen has a sentence for each `problem`. */
export class TaskError extends Error {
  constructor(public problem: TaskProblem) {
    super(`Scheduled task not changed: ${problem}`);
  }
}
export const taskProblem = (error: unknown) => (error instanceof TaskError ? error.problem : "failed");

const count = (list: readonly ScheduledTask[], mode: ScheduledTask["mode"]) =>
  list.filter((t) => t.mode === mode).length;
function roomFor(list: readonly ScheduledTask[], task: ScheduledTask, except?: string) {
  const others = list.filter((t) => t.id !== except);
  if (task.mode === "manual" && count(others, "manual") >= SCHEDULE_LIMITS.maxManualTasks) throw new TaskError("full");
  if (task.mode === "auto" && count(others, "auto") >= SCHEDULE_LIMITS.maxAutoTasks) throw new TaskError("autoFull");
}

export type TaskFields = Omit<ScheduledTask, "id" | "createdAt" | "nextDueAt" | "lastRunAt">;
/** A new task from the form: its first due time is the next slot after now. */
export function newTask(fields: TaskFields, now = new Date()): ScheduledTask {
  return scheduledTaskSchema.parse({
    ...fields,
    id: crypto.randomUUID(),
    createdAt: now.toISOString(),
    nextDueAt: nextDue(fields.trigger, now).toISOString(),
  });
}
/** The task after an edit. A changed trigger starts again from now; otherwise the due time stays. */
export function editedTask(task: ScheduledTask, fields: TaskFields, now = new Date()): ScheduledTask {
  const sameTrigger = JSON.stringify(task.trigger) === JSON.stringify(fields.trigger);
  const { searchText: _old, paused: _paused, ...kept } = task;
  return scheduledTaskSchema.parse({
    ...kept,
    ...fields,
    nextDueAt: sameTrigger ? task.nextDueAt : nextDue(fields.trigger, now).toISOString(),
  });
}

// Each change takes the list as stored and returns the next one, for Vault.writeTasks.
export const addTask = (task: ScheduledTask) => (list: ScheduledTask[]): ScheduledTask[] => {
  roomFor(list, task);
  return [...list, task];
};
export const replaceTask = (task: ScheduledTask) => (list: ScheduledTask[]): ScheduledTask[] => {
  if (!list.some((t) => t.id === task.id)) throw new TaskError("gone");
  roomFor(list, task, task.id);
  return list.map((t) => (t.id === task.id ? task : t));
};
export const removeTask = (id: string) => (list: ScheduledTask[]): ScheduledTask[] => list.filter((t) => t.id !== id);
export const removeAllTasks = () => (): ScheduledTask[] => [];
/** After "Run now" answered: the last run is now, and the next due time moves on past now. */
export const markRun = (id: string, now = new Date()) => (list: ScheduledTask[]): ScheduledTask[] => {
  if (!list.some((t) => t.id === id)) throw new TaskError("gone");
  return list.map((t) =>
    t.id === id
      ? { ...t, lastRunAt: now.toISOString(), nextDueAt: advanceAfterRun(t.trigger, new Date(t.nextDueAt), now).toISOString() }
      : t,
  );
};
/** "Skip this time": the next due time moves on; no run is recorded. */
export const skipTask = (id: string, now = new Date()) => (list: ScheduledTask[]): ScheduledTask[] =>
  list.map((t) =>
    t.id === id ? { ...t, nextDueAt: advanceAfterRun(t.trigger, new Date(t.nextDueAt), now).toISOString() } : t,
  );
/**
 * Restoring a backup adds its tasks to the ones here, as Manual tasks with new identities: a
 * backup never creates a server copy by itself. A task with the same name and instruction is not
 * added twice; past the limit the rest is left out.
 */
export const mergeTasks = (incoming: readonly ScheduledTask[]) => (list: ScheduledTask[]): ScheduledTask[] => {
  const next = [...list];
  const key = (t: ScheduledTask) => `${t.name}\n${t.instruction}`;
  for (const task of incoming) {
    if (count(next, "manual") >= SCHEDULE_LIMITS.maxManualTasks) break;
    if (next.some((t) => key(t) === key(task))) continue;
    next.push({ ...task, id: crypto.randomUUID(), mode: "manual" });
  }
  return next;
};

/** Manual tasks whose time has come. Auto tasks run on the server and are never "due" here. */
export const dueTasks = (list: readonly ScheduledTask[], now: number) =>
  list.filter((t) => t.mode === "manual" && !t.paused && Date.parse(t.nextDueAt) <= now);
/** The next moment a held task becomes due, for one timer; undefined when none will. */
export const nextChange = (list: readonly ScheduledTask[], now: number) =>
  list
    .filter((t) => t.mode === "manual" && !t.paused && Date.parse(t.nextDueAt) > now)
    .reduce<number | undefined>((soonest, t) => Math.min(soonest ?? Infinity, Date.parse(t.nextDueAt)), undefined);

const CV = /(?<![\p{L}])(cv|résumé|resume|curriculum vitae|lebenslauf|bewerbung(?:en)?|berufserfahrung|work experience|arbeitszeugnis|anschreiben|cover letter|qualifikationen|qualifications|employment history|werdegang)(?![\p{L}])/iu;
const HEALTH =
  /(?<![\p{L}])(diagnos\p{L}*|krankheit\p{L}*|erkrank\p{L}*|disease|illness|symptom\p{L}*|medikament\p{L}*|medication|medicine|therap\p{L}*|depress\p{L}*|diabetes|blutdruck|blood pressure|schwanger\p{L}*|pregnan\p{L}*|krankenhaus|hospital|allergi\p{L}*|allergy|befund\p{L}*|psych\p{L}*|krebs|cancer|chemo\p{L}*|hiv|arztbrief|patient\p{L}*|gesundheit\p{L}*|health)(?![\p{L}])/iu;
/**
 * Whether a background task's text looks like a CV or health data, read on the device. Then the
 * form asks for an extra consent: this personal data would be stored on the server.
 */
export function looksSensitive(text: string): { cv: boolean; health: boolean } {
  return { cv: CV.test(text), health: HEALTH.test(text) };
}

/** The browser's time zone, for a new trigger. */
export const deviceTimeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
export const defaultTrigger = (): ScheduleTrigger => ({ every: 1, unit: "day", time: "09:00", timeZone: deviceTimeZone() });

// The decrypted list, only while the vault is unlocked. Empty means: nothing is shown or due.
let held: readonly ScheduledTask[] = [];
const watchers = new Set<() => void>();
export const heldTasks = () => held;
export function holdTasks(list: readonly ScheduledTask[]) {
  held = list;
  for (const watcher of watchers) watcher();
}
export function watchTasks(watcher: () => void) {
  watchers.add(watcher);
  return () => void watchers.delete(watcher);
}
