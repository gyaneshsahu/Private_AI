// "Scheduled" tasks, Manual and Auto (shared contract of 15 November 2026). Manual tasks live only
// in the encrypted vault; an Auto task ("Background task") is also stored on the server, which runs
// it (docs/background-tasks-20261115.md). Pure: no browser or server imports.
import { z } from "zod";

export type ScheduleUnit = "day" | "week" | "month";
export interface ScheduleTrigger {
  every: number; // 1..31; interval in units; alpha minimum is one day
  unit: ScheduleUnit;
  time: string; // "HH:MM", 24 h, in `timeZone`
  timeZone: string; // IANA, from the browser
  weekday?: number; // 0..6 for unit "week" (optional)
  dayOfMonth?: number; // 1..28 for unit "month" (optional)
}
export interface ScheduledTask {
  id: string; // uuid
  name: string; // 1..80 characters
  instruction: string; // 1..2,000 characters
  trigger: ScheduleTrigger;
  mode: "manual" | "auto";
  notify: { inApp: boolean; calendar: boolean }; // email and push: later
  answerMode: "fast" | "thinking" | "auto";
  useSearch: boolean; // the run may search the web (approved once, at creation, with the exact search text shown)
  searchText?: string; // the masked search text approved at creation
  createdAt: string; // ISO
  nextDueAt: string; // ISO, computed
  lastRunAt?: string;
  paused?: boolean;
}

export const SCHEDULE_LIMITS = { name: 80, instruction: 2000, minIntervalHours: 24, maxAutoTasks: 3, maxManualTasks: 20 };

const validTimeZone = (zone: string) => {
  try {
    new Intl.DateTimeFormat("en", { timeZone: zone });
    return true;
  } catch {
    return false;
  }
};

export const scheduleTriggerSchema = z
  .object({
    every: z.number().int().min(1).max(31),
    unit: z.enum(["day", "week", "month"]),
    time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
    timeZone: z.string().min(1).max(64).refine(validTimeZone),
    weekday: z.number().int().min(0).max(6).optional(),
    dayOfMonth: z.number().int().min(1).max(28).optional(),
  })
  .strict()
  .refine((t) => t.weekday === undefined || t.unit === "week", "A weekday belongs to a weekly schedule.")
  .refine((t) => t.dayOfMonth === undefined || t.unit === "month", "A day of the month belongs to a monthly schedule.");

export const scheduledTaskSchema = z
  .object({
    id: z.uuid(),
    name: z.string().trim().min(1).max(SCHEDULE_LIMITS.name),
    instruction: z.string().trim().min(1).max(SCHEDULE_LIMITS.instruction),
    trigger: scheduleTriggerSchema,
    mode: z.enum(["manual", "auto"]),
    notify: z.object({ inApp: z.boolean(), calendar: z.boolean() }).strict(),
    answerMode: z.enum(["fast", "thinking", "auto"]),
    useSearch: z.boolean(),
    // The same bounds as an approved search (shared/contracts.ts disclosureSchema).
    searchText: z.string().trim().min(2).max(400).optional(),
    createdAt: z.iso.datetime(),
    nextDueAt: z.iso.datetime(),
    lastRunAt: z.iso.datetime().optional(),
    paused: z.boolean().optional(),
  })
  .strict()
  .refine((t) => !t.useSearch || !!t.searchText, "A task that searches needs its approved search text.");

/** Wall-clock fields of `at` in `timeZone`. */
function localParts(at: number, timeZone: string) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
    })
      .formatToParts(new Date(at))
      .map((p) => [p.type, Number(p.value)]),
  ) as Record<"year" | "month" | "day" | "hour" | "minute" | "second", number>;
  return parts;
}
/** Milliseconds `timeZone` is ahead of UTC at instant `at`. */
function offsetAt(at: number, timeZone: string) {
  const p = localParts(at, timeZone);
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - Math.floor(at / 1000) * 1000;
}
/**
 * The instant of a wall-clock time in `timeZone`. A time that does not exist (the hour skipped in
 * spring) moves forward by the gap; a time that exists twice (autumn) takes the later instant.
 */
function instantOf(y: number, m: number, d: number, hour: number, minute: number, timeZone: string) {
  const guess = Date.UTC(y, m, d, hour, minute);
  const first = guess - offsetAt(guess, timeZone);
  const second = guess - offsetAt(first, timeZone);
  return offsetAt(second, timeZone) === offsetAt(first, timeZone) ? second : Math.max(first, second);
}
const daysIn = (y: number, m: number) => new Date(Date.UTC(y, m + 1, 0)).getUTCDate();

/**
 * The next due time strictly after `after`. Pure and DST-safe: the wall-clock time stays the same
 * across daylight-saving changes. When `after` is itself a due time (the run that just happened),
 * the next one is `every` units later; otherwise it is the first matching time after `after`.
 * A monthly task without `dayOfMonth` keeps the day of `after`, moved to the month's last day when
 * the month is shorter.
 */
export function nextDue(trigger: ScheduleTrigger, after: Date): Date {
  const [hour, minute] = trigger.time.split(":").map(Number);
  const zone = trigger.timeZone;
  const t = after.getTime();
  const p = localParts(t, zone);
  const y = p.year,
    m = p.month - 1;
  const at = (yy: number, mm: number, dd: number) => instantOf(yy, mm, dd, hour, minute, zone);
  const today = at(y, m, p.day);
  const weekdayOf = (yy: number, mm: number, dd: number) => new Date(Date.UTC(yy, mm, dd)).getUTCDay();
  const onSlot =
    today === t &&
    (trigger.unit !== "week" || trigger.weekday === undefined || weekdayOf(y, m, p.day) === trigger.weekday) &&
    (trigger.unit !== "month" || trigger.dayOfMonth === undefined || p.day === trigger.dayOfMonth);
  if (trigger.unit === "day") return new Date(onSlot ? at(y, m, p.day + trigger.every) : today > t ? today : at(y, m, p.day + 1));
  if (trigger.unit === "week") {
    if (onSlot) return new Date(at(y, m, p.day + 7 * trigger.every));
    const target = trigger.weekday ?? weekdayOf(y, m, p.day);
    let ahead = (target - weekdayOf(y, m, p.day) + 7) % 7;
    if (ahead === 0 && today <= t) ahead = 7;
    return new Date(at(y, m, p.day + ahead));
  }
  const dayFor = (yy: number, mm: number) => Math.min(trigger.dayOfMonth ?? p.day, daysIn(yy, mm));
  const month = (offset: number) => {
    const first = new Date(Date.UTC(y, m + offset, 1));
    const yy = first.getUTCFullYear(),
      mm = first.getUTCMonth();
    return at(yy, mm, dayFor(yy, mm));
  };
  if (onSlot) return new Date(month(trigger.every));
  const here = month(0);
  return new Date(here > t ? here : month(1));
}
