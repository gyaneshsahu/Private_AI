import { describe, expect, it } from "vitest";
import { nextDue, scheduledTaskSchema, type ScheduleTrigger } from "../shared/scheduled-tasks";

const berlin = (over: Partial<ScheduleTrigger> = {}): ScheduleTrigger => ({
  every: 1,
  unit: "day",
  time: "08:00",
  timeZone: "Europe/Berlin",
  ...over,
});
const iso = (trigger: ScheduleTrigger, after: string) => nextDue(trigger, new Date(after)).toISOString();

describe("nextDue", () => {
  it("daily: later today, else tomorrow; from a due time, every N days", () => {
    expect(iso(berlin(), "2026-11-15T06:00:00Z")).toBe("2026-11-15T07:00:00.000Z");
    expect(iso(berlin(), "2026-11-15T07:00:00Z")).toBe("2026-11-16T07:00:00.000Z");
    expect(iso(berlin(), "2026-11-15T07:00:01Z")).toBe("2026-11-16T07:00:00.000Z");
    expect(iso(berlin({ every: 2 }), "2026-11-15T07:00:00Z")).toBe("2026-11-17T07:00:00.000Z");
    // Created between due times: the first due time comes next, then every 2 days.
    expect(iso(berlin({ every: 2 }), "2026-11-15T09:00:00Z")).toBe("2026-11-16T07:00:00.000Z");
  });

  it("keeps the wall-clock time across both daylight-saving changes (Berlin)", () => {
    // Spring 2027: 28 March, clocks go from 02:00 to 03:00.
    expect(iso(berlin(), "2027-03-27T07:00:00Z")).toBe("2027-03-28T06:00:00.000Z");
    expect(iso(berlin(), "2027-03-28T06:00:00Z")).toBe("2027-03-29T06:00:00.000Z");
    // Autumn 2026: 25 October, clocks go back from 03:00 to 02:00.
    expect(iso(berlin(), "2026-10-24T06:00:00Z")).toBe("2026-10-25T07:00:00.000Z");
    // A time that does not exist moves forward; one that exists twice runs once.
    expect(iso(berlin({ time: "02:30" }), "2027-03-27T01:30:00Z")).toBe("2027-03-28T01:30:00.000Z");
    const twice = berlin({ time: "02:30" });
    const first = nextDue(twice, new Date("2026-10-24T12:00:00Z"));
    expect(nextDue(twice, first).getTime() - first.getTime()).toBeGreaterThan(20 * 3_600_000);
  });

  it("weekly on a weekday, and every N weeks from a due time", () => {
    // 15 November 2026 is a Sunday; Monday is 1.
    expect(iso(berlin({ unit: "week", weekday: 1 }), "2026-11-15T12:00:00Z")).toBe("2026-11-16T07:00:00.000Z");
    expect(iso(berlin({ unit: "week", weekday: 0 }), "2026-11-15T12:00:00Z")).toBe("2026-11-22T07:00:00.000Z");
    expect(iso(berlin({ unit: "week", weekday: 1, every: 2 }), "2026-11-16T07:00:00Z")).toBe("2026-11-30T07:00:00.000Z");
  });

  it("monthly on a day, clamped to short months without one", () => {
    expect(iso(berlin({ unit: "month", dayOfMonth: 1 }), "2026-11-15T12:00:00Z")).toBe("2026-12-01T07:00:00.000Z");
    expect(iso(berlin({ unit: "month", dayOfMonth: 1, every: 3 }), "2026-12-01T07:00:00Z")).toBe("2027-03-01T07:00:00.000Z");
    expect(iso(berlin({ unit: "month" }), "2027-01-31T12:00:00Z")).toBe("2027-02-28T07:00:00.000Z");
  });

  it("works in other zones", () => {
    expect(iso({ every: 1, unit: "day", time: "23:30", timeZone: "America/New_York" }, "2026-11-15T12:00:00Z")).toBe(
      "2026-11-16T04:30:00.000Z",
    );
    expect(iso({ every: 1, unit: "day", time: "00:15", timeZone: "UTC" }, "2026-12-31T23:59:00Z")).toBe(
      "2027-01-01T00:15:00.000Z",
    );
  });
});

describe("scheduledTaskSchema", () => {
  const task = {
    id: "0b6f7a52-4f4e-4c1e-9f55-8f3d7c2a1b10",
    name: "Job search",
    instruction: "Find new jobs that match my CV.",
    trigger: berlin(),
    mode: "auto",
    notify: { inApp: true, calendar: false },
    answerMode: "fast",
    useSearch: true,
    searchText: "Data analyst jobs Berlin",
    createdAt: "2026-11-15T10:00:00.000Z",
    nextDueAt: "2026-11-16T07:00:00.000Z",
  };
  it("accepts a valid task and refuses unknown fields, bad zones and long text", () => {
    expect(scheduledTaskSchema.safeParse(task).success).toBe(true);
    expect(scheduledTaskSchema.safeParse({ ...task, extra: 1 }).success).toBe(false);
    expect(scheduledTaskSchema.safeParse({ ...task, trigger: berlin({ timeZone: "Mars/Base" }) }).success).toBe(false);
    expect(scheduledTaskSchema.safeParse({ ...task, instruction: "x".repeat(2001) }).success).toBe(false);
    expect(scheduledTaskSchema.safeParse({ ...task, searchText: undefined }).success).toBe(false);
    expect(scheduledTaskSchema.safeParse({ ...task, trigger: berlin({ weekday: 1 }) }).success).toBe(false);
    expect(scheduledTaskSchema.safeParse({ ...task, trigger: berlin({ time: "24:00" }) }).success).toBe(false);
  });
});
