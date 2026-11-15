// shared/scheduled-tasks.ts: the schema and nextDue (docs/scheduled-20261115.md).
import { describe, expect, it } from "vitest";
import {
  advanceAfterRun,
  nextDue,
  scheduledTaskSchema,
  zonedDate,
  type ScheduleTrigger,
  type ScheduledTask,
} from "../shared/scheduled-tasks";

const berlin = (time: string, rest: Partial<ScheduleTrigger> = {}): ScheduleTrigger => ({
  every: 1,
  unit: "day",
  time,
  timeZone: "Europe/Berlin",
  ...rest,
});
const iso = (d: Date) => d.toISOString();
/** The wall clock in Berlin, for readable expectations. */
const wall = (d: Date) =>
  new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
  }).format(d);

describe("nextDue", () => {
  it("daily: today when the time is still ahead, else tomorrow", () => {
    expect(iso(nextDue(berlin("10:00"), new Date("2026-11-16T08:00:00Z")))).toBe("2026-11-16T09:00:00.000Z");
    expect(iso(nextDue(berlin("10:00"), new Date("2026-11-16T09:00:00Z")))).toBe("2026-11-17T09:00:00.000Z");
    expect(iso(nextDue(berlin("10:00"), new Date("2026-11-16T09:00:01Z")))).toBe("2026-11-17T09:00:00.000Z");
  });
  it("every 2 days keeps its rhythm from the previous due time", () => {
    const t = berlin("10:00", { every: 2 });
    const first = nextDue(t, new Date("2026-11-16T12:00:00Z"));
    expect(wall(first)).toContain("2026-11-18 10:00");
    expect(iso(first)).toBe("2026-11-18T09:00:00.000Z");
    expect(iso(nextDue(t, first))).toBe("2026-11-20T09:00:00.000Z");
  });
  it("weekly on a weekday, and every 2 weeks", () => {
    // 16 November 2026 is a Monday.
    const wednesday = berlin("07:30", { unit: "week", weekday: 3 });
    expect(iso(nextDue(wednesday, new Date("2026-11-16T12:00:00Z")))).toBe("2026-11-18T06:30:00.000Z");
    const monday = berlin("07:30", { unit: "week", weekday: 1 });
    expect(iso(nextDue(monday, new Date("2026-11-16T05:00:00Z")))).toBe("2026-11-16T06:30:00.000Z");
    expect(iso(nextDue(monday, new Date("2026-11-16T07:00:00Z")))).toBe("2026-11-23T06:30:00.000Z");
    const fortnight = { ...monday, every: 2 };
    expect(iso(nextDue(fortnight, new Date("2026-11-16T06:30:00Z")))).toBe("2026-11-30T06:30:00.000Z");
    // Sunday is 0.
    const sunday = berlin("20:00", { unit: "week", weekday: 0 });
    expect(iso(nextDue(sunday, new Date("2026-11-16T12:00:00Z")))).toBe("2026-11-22T19:00:00.000Z");
  });
  it("monthly on day 1 and day 28, across the year end and February", () => {
    const first = berlin("09:00", { unit: "month", dayOfMonth: 1 });
    expect(iso(nextDue(first, new Date("2026-11-16T12:00:00Z")))).toBe("2026-12-01T08:00:00.000Z");
    expect(iso(nextDue(first, new Date("2026-12-01T08:00:00Z")))).toBe("2027-01-01T08:00:00.000Z");
    const late = berlin("09:00", { unit: "month", dayOfMonth: 28 });
    expect(iso(nextDue(late, new Date("2027-01-28T08:00:00Z")))).toBe("2027-02-28T08:00:00.000Z");
    expect(iso(nextDue(late, new Date("2027-02-28T08:00:00Z")))).toBe("2027-03-28T07:00:00.000Z");
    const quarterly = { ...first, every: 3 };
    expect(iso(nextDue(quarterly, new Date("2026-12-01T08:00:00Z")))).toBe("2027-03-01T08:00:00.000Z");
  });
  it("month ends and leap years: daily runs through 29 February 2028 and 31 December", () => {
    expect(iso(nextDue(berlin("10:00"), new Date("2028-02-28T10:00:00Z")))).toBe("2028-02-29T09:00:00.000Z");
    expect(iso(nextDue(berlin("10:00"), new Date("2028-02-29T10:00:00Z")))).toBe("2028-03-01T09:00:00.000Z");
    expect(iso(nextDue(berlin("10:00"), new Date("2027-02-28T10:00:00Z")))).toBe("2027-03-01T09:00:00.000Z");
    expect(iso(nextDue(berlin("23:30"), new Date("2026-12-31T23:00:00Z")))).toBe("2027-01-01T22:30:00.000Z");
    // Every 2 days across a month end.
    expect(iso(nextDue(berlin("10:00", { every: 2 }), new Date("2026-11-30T09:00:00Z")))).toBe("2026-12-02T09:00:00.000Z");
  });
  it("Europe/Berlin across the spring change: the wall time stays 10:00", () => {
    // Clocks go forward on Sunday 28 March 2027 at 02:00.
    const before = nextDue(berlin("10:00"), new Date("2027-03-27T09:00:00Z"));
    expect(iso(before)).toBe("2027-03-28T08:00:00.000Z");
    expect(wall(before)).toContain("2027-03-28 10:00");
    expect(iso(nextDue(berlin("10:00"), before))).toBe("2027-03-29T08:00:00.000Z");
  });
  it("Europe/Berlin across the autumn change: the wall time stays 10:00", () => {
    // Clocks go back on Sunday 31 October 2027 at 03:00.
    const sunday = nextDue(berlin("10:00"), new Date("2027-10-30T08:00:00Z"));
    expect(iso(sunday)).toBe("2027-10-31T09:00:00.000Z");
    expect(wall(sunday)).toContain("2027-10-31 10:00");
    const weekly = berlin("10:00", { unit: "week", weekday: 6 });
    expect(iso(nextDue(weekly, new Date("2027-10-30T08:00:00Z")))).toBe("2027-11-06T09:00:00.000Z");
  });
  it("a time that does not exist on the spring-forward day moves forward by the gap", () => {
    const night = berlin("02:30");
    const due = nextDue(night, new Date("2027-03-27T12:00:00Z"));
    // 02:30 is skipped; it becomes 03:30 summer time, which is 01:30 UTC.
    expect(iso(due)).toBe("2027-03-28T01:30:00.000Z");
    expect(wall(due)).toContain("2027-03-28 03:30");
    // The next day is 02:30 again.
    expect(iso(nextDue(night, due))).toBe("2027-03-29T00:30:00.000Z");
  });
  it("a time that exists twice on the autumn day is the later one, and the next day is normal", () => {
    const night = berlin("02:30");
    const due = nextDue(night, new Date("2027-10-30T12:00:00Z"));
    expect(iso(due)).toBe("2027-10-31T01:30:00.000Z");
    expect(iso(nextDue(night, due))).toBe("2027-11-01T01:30:00.000Z");
  });
  it("other zones: New York, Tokyo, UTC, and a half-hour zone", () => {
    const ny: ScheduleTrigger = { every: 1, unit: "day", time: "09:00", timeZone: "America/New_York" };
    // US clocks go forward on 14 March 2027.
    expect(iso(nextDue(ny, new Date("2027-03-13T15:00:00Z")))).toBe("2027-03-14T13:00:00.000Z");
    const tokyo: ScheduleTrigger = { every: 1, unit: "day", time: "00:00", timeZone: "Asia/Tokyo" };
    expect(iso(nextDue(tokyo, new Date("2026-11-16T12:00:00Z")))).toBe("2026-11-16T15:00:00.000Z");
    const utc: ScheduleTrigger = { every: 1, unit: "day", time: "12:00", timeZone: "UTC" };
    expect(iso(nextDue(utc, new Date("2026-11-16T12:00:00Z")))).toBe("2026-11-17T12:00:00.000Z");
    const india: ScheduleTrigger = { every: 1, unit: "day", time: "10:00", timeZone: "Asia/Kolkata" };
    expect(iso(nextDue(india, new Date("2026-11-16T00:00:00Z")))).toBe("2026-11-16T04:30:00.000Z");
  });
  it("the local date decides, not the UTC date", () => {
    // 23:30 UTC on 16 November is already 17 November in Berlin.
    expect(zonedDate(new Date("2026-11-16T23:30:00Z"), "Europe/Berlin")).toEqual({ year: 2026, month: 11, day: 17 });
    expect(iso(nextDue(berlin("10:00"), new Date("2026-11-16T23:30:00Z")))).toBe("2026-11-17T09:00:00.000Z");
  });
  it("advanceAfterRun skips missed slots: one run, the rhythm kept", () => {
    const t = berlin("10:00", { every: 2 });
    const due = new Date("2026-11-02T09:00:00Z");
    // Ran on the 11th at noon: the slots of the 4th, 6th, 8th and 10th are not caught up.
    expect(iso(advanceAfterRun(t, due, new Date("2026-11-11T11:00:00Z")))).toBe("2026-11-12T09:00:00.000Z");
    // Ran on time: the next slot.
    expect(iso(advanceAfterRun(t, due, new Date("2026-11-02T09:05:00Z")))).toBe("2026-11-04T09:00:00.000Z");
    // Years late: from now.
    const old = advanceAfterRun(berlin("10:00"), new Date("2010-01-01T09:00:00Z"), new Date("2026-11-16T12:00:00Z"));
    expect(iso(old)).toBe("2026-11-17T09:00:00.000Z");
  });
});

const task = (change: Partial<ScheduledTask> = {}): ScheduledTask => ({
  id: "6f1d2c1e-8a4b-4c3d-9e2f-1a2b3c4d5e6f",
  name: "German word",
  instruction: "Give me a new German word to learn.",
  trigger: berlin("10:00", { every: 2 }),
  mode: "manual",
  notify: { inApp: true, calendar: false },
  answerMode: "fast",
  useSearch: false,
  createdAt: "2026-11-15T10:00:00.000Z",
  nextDueAt: "2026-11-17T09:00:00.000Z",
  ...change,
});

describe("scheduledTaskSchema", () => {
  it("accepts a whole task and rejects unknown fields", () => {
    expect(scheduledTaskSchema.parse(task())).toEqual(task());
    expect(() => scheduledTaskSchema.parse({ ...task(), extra: 1 })).toThrow();
    expect(() => scheduledTaskSchema.parse({ ...task(), notify: { inApp: true, calendar: false, email: true } })).toThrow();
    expect(() => scheduledTaskSchema.parse({ ...task(), trigger: { ...task().trigger, hours: 1 } })).toThrow();
  });
  it("holds the limits", () => {
    expect(() => scheduledTaskSchema.parse(task({ name: "" }))).toThrow();
    expect(() => scheduledTaskSchema.parse(task({ name: "x".repeat(81) }))).toThrow();
    expect(() => scheduledTaskSchema.parse(task({ instruction: "x".repeat(2001) }))).toThrow();
    expect(scheduledTaskSchema.parse(task({ instruction: "x".repeat(2000) })).instruction.length).toBe(2000);
    expect(() => scheduledTaskSchema.parse(task({ trigger: { ...task().trigger, every: 0 } }))).toThrow();
    expect(() => scheduledTaskSchema.parse(task({ trigger: { ...task().trigger, every: 32 } }))).toThrow();
    expect(() => scheduledTaskSchema.parse(task({ trigger: { ...task().trigger, every: 1.5 } }))).toThrow();
  });
  it("checks the trigger: time, zone, unit, weekday and day of month", () => {
    const trigger = (change: Partial<ScheduleTrigger>) => task({ trigger: { ...task().trigger, ...change } });
    for (const time of ["24:00", "9:00", "10:60", "10-00", ""])
      expect(() => scheduledTaskSchema.parse(trigger({ time }))).toThrow();
    expect(() => scheduledTaskSchema.parse(trigger({ timeZone: "Mars/Olympus" }))).toThrow();
    expect(() => scheduledTaskSchema.parse(trigger({ unit: "hour" as never }))).toThrow();
    expect(() => scheduledTaskSchema.parse(trigger({ weekday: 1 }))).toThrow();
    expect(scheduledTaskSchema.parse(trigger({ unit: "week", weekday: 0 })).trigger.weekday).toBe(0);
    expect(() => scheduledTaskSchema.parse(trigger({ unit: "week", weekday: 7 }))).toThrow();
    expect(scheduledTaskSchema.parse(trigger({ unit: "month", dayOfMonth: 28 })).trigger.dayOfMonth).toBe(28);
    expect(() => scheduledTaskSchema.parse(trigger({ unit: "month", dayOfMonth: 29 }))).toThrow();
    expect(() => scheduledTaskSchema.parse(trigger({ unit: "week", dayOfMonth: 2 }))).toThrow();
  });
  it("checks modes and dates", () => {
    expect(() => scheduledTaskSchema.parse(task({ mode: "server" as never }))).toThrow();
    expect(() => scheduledTaskSchema.parse(task({ answerMode: "deep" as never }))).toThrow();
    expect(() => scheduledTaskSchema.parse(task({ nextDueAt: "tomorrow" }))).toThrow();
    expect(scheduledTaskSchema.parse(task({ mode: "auto", paused: true, lastRunAt: "2026-11-15T11:00:00.000Z" })).paused).toBe(true);
    expect(scheduledTaskSchema.parse(task({ useSearch: true, searchText: "Jobs Leipzig" })).searchText).toBe("Jobs Leipzig");
    // As Agent A's copy: a task that searches needs its approved text, of 2 to 400 characters.
    expect(() => scheduledTaskSchema.parse(task({ useSearch: true }))).toThrow();
    expect(() => scheduledTaskSchema.parse(task({ useSearch: true, searchText: "x" }))).toThrow();
  });
});
