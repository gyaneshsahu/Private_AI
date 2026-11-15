/**
 * Scheduled tasks (docs/scheduled-20261115.md; shared contract of 15 November 2026). Manual tasks
 * live only in the encrypted vault on the device. Auto tasks ("Background task") live in the vault
 * and on the server, which runs them (docs/background-tasks-20261115.md). Both sides use this file.
 */
import { z } from "zod";

export type ScheduleUnit = "day" | "week" | "month";
export interface ScheduleTrigger {
  every: number;
  unit: ScheduleUnit;
  time: string;
  timeZone: string;
  weekday?: number;
  dayOfMonth?: number;
}
export interface ScheduledTask {
  id: string;
  name: string;
  instruction: string;
  trigger: ScheduleTrigger;
  mode: "manual" | "auto";
  notify: { inApp: boolean; calendar: boolean };
  answerMode: "fast" | "thinking" | "auto";
  useSearch: boolean;
  searchText?: string;
  createdAt: string;
  nextDueAt: string;
  lastRunAt?: string;
  paused?: boolean;
}

export const SCHEDULE_LIMITS = {
  name: 80,
  instruction: 2000,
  minIntervalHours: 24,
  maxAutoTasks: 3,
  maxManualTasks: 20,
} as const;

/** True when the runtime knows this IANA time zone. */
export function validTimeZone(zone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: zone });
    return zone.length > 0 && zone.length <= 64;
  } catch {
    return false;
  }
}

export const scheduleTriggerSchema = z
  .object({
    every: z.number().int().min(1).max(31),
    unit: z.enum(["day", "week", "month"]),
    time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
    timeZone: z.string().refine(validTimeZone, "Unknown time zone."),
    weekday: z.number().int().min(0).max(6).optional(),
    dayOfMonth: z.number().int().min(1).max(28).optional(),
  })
  .strict()
  .refine((t) => t.weekday === undefined || t.unit === "week", "A weekday belongs to a weekly trigger.")
  .refine((t) => t.dayOfMonth === undefined || t.unit === "month", "A day of the month belongs to a monthly trigger.");

export const scheduledTaskSchema = z
  .object({
    id: z.string().uuid(),
    name: z.string().trim().min(1).max(SCHEDULE_LIMITS.name),
    instruction: z.string().trim().min(1).max(SCHEDULE_LIMITS.instruction),
    trigger: scheduleTriggerSchema,
    mode: z.enum(["manual", "auto"]),
    notify: z.object({ inApp: z.boolean(), calendar: z.boolean() }).strict(),
    answerMode: z.enum(["fast", "thinking", "auto"]),
    useSearch: z.boolean(),
    // The same bounds as an approved search (shared/contracts.ts disclosureSchema).
    searchText: z.string().trim().min(2).max(400).optional(),
    createdAt: z.string().datetime(),
    nextDueAt: z.string().datetime(),
    lastRunAt: z.string().datetime().optional(),
    paused: z.boolean().optional(),
  })
  .strict()
  .refine((t) => !t.useSearch || !!t.searchText, "A task that searches needs its approved search text.");

// One formatter per zone: building them is slow, and nextDue runs in loops.
const formatters = new Map<string, Intl.DateTimeFormat>();
function parts(at: number, zone: string) {
  let format = formatters.get(zone);
  if (!format) {
    format = new Intl.DateTimeFormat("en-US", {
      timeZone: zone,
      hourCycle: "h23",
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
    });
    formatters.set(zone, format);
  }
  const value: Record<string, number> = {};
  for (const part of format.formatToParts(at)) if (part.type !== "literal") value[part.type] = Number(part.value);
  return value as { year: number; month: number; day: number; hour: number; minute: number; second: number };
}
/** Milliseconds the zone is ahead of UTC at this instant. */
export function zoneOffset(at: number, zone: string): number {
  const p = parts(at, zone);
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - Math.floor(at / 1000) * 1000;
}
/**
 * The instant of a wall-clock time in a zone. A time that does not exist (the hour skipped when
 * clocks go forward) moves forward by the gap, as calendars do: 02:30 becomes 03:30. A time that
 * exists twice (clocks go back) is the later one.
 */
export function zonedInstant(year: number, month: number, day: number, hour: number, minute: number, zone: string): Date {
  const guess = Date.UTC(year, month - 1, day, hour, minute);
  const first = guess - zoneOffset(guess, zone);
  const second = zoneOffset(first, zone);
  return new Date(second === zoneOffset(guess, zone) ? first : guess - second);
}
/** The calendar date of an instant in a zone. */
export function zonedDate(at: Date, zone: string) {
  const p = parts(at.getTime(), zone);
  return { year: p.year, month: p.month, day: p.day };
}

/**
 * The first time after `after` the trigger fires. The candidate is the matching day on or after
 * `after`'s date in the trigger's zone, at the trigger's time; if that is not later than `after`,
 * the candidate moves on by the interval (`every` days, weeks or months). Called with the previous
 * due time, this keeps the schedule's rhythm; called at creation, the first run is today if the
 * time is still ahead, else one interval on. Pure: no clock, no storage.
 */
export function nextDue(trigger: ScheduleTrigger, after: Date): Date {
  const [hour, minute] = trigger.time.split(":").map(Number);
  const zone = trigger.timeZone;
  const start = zonedDate(after, zone);
  // Dates as UTC midnights, so adding days never meets a clock change.
  let day = Date.UTC(start.year, start.month - 1, start.day);
  const DAY = 86_400_000;
  if (trigger.unit === "week") {
    const weekday = trigger.weekday ?? new Date(day).getUTCDay();
    day += ((weekday - new Date(day).getUTCDay() + 7) % 7) * DAY;
  }
  if (trigger.unit === "month") {
    const date = new Date(day);
    const wanted = trigger.dayOfMonth ?? Math.min(date.getUTCDate(), 28);
    day = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), wanted);
  }
  const at = (utcMidnight: number) => {
    const d = new Date(utcMidnight);
    return zonedInstant(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate(), hour, minute, zone);
  };
  let candidate = at(day);
  if (candidate.getTime() > after.getTime()) return candidate;
  if (trigger.unit === "month") {
    const d = new Date(day);
    day = Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + trigger.every, d.getUTCDate());
  } else day += trigger.every * (trigger.unit === "week" ? 7 : 1) * DAY;
  candidate = at(day);
  return candidate;
}

/**
 * The next due time after a run of a task that was due at `due`: the schedule's rhythm is kept and
 * missed slots are skipped, so a task that waited a week runs once, not once per missed slot.
 */
export function advanceAfterRun(trigger: ScheduleTrigger, due: Date, now: Date): Date {
  let next = nextDue(trigger, due);
  // Bounded: a task untouched for years is moved on from now instead.
  for (let i = 0; next.getTime() <= now.getTime(); i++) {
    if (i > 1000) return nextDue(trigger, now);
    next = nextDue(trigger, next);
  }
  return next;
}
