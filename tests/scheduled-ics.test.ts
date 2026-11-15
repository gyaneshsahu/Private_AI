// Calendar files for scheduled tasks (src/scheduled-ics.ts): RFC 5545 structure, line folding,
// CRLF, escaping, time zones and the repeat rule for each unit. No instruction text in the file.
import { describe, expect, it } from "vitest";
import { calendarFile, escapeText, fold } from "../src/scheduled-ics";
import type { ScheduledTask } from "../shared/scheduled-tasks";

const task = (change: Partial<ScheduledTask> = {}, trigger: Partial<ScheduledTask["trigger"]> = {}): ScheduledTask => ({
  id: "6f1d2c1e-8a4b-4c3d-9e2f-1a2b3c4d5e6f",
  name: "German word",
  instruction: "SECRET INSTRUCTION: give me a new German word, my CV is attached.",
  trigger: { every: 2, unit: "day", time: "10:00", timeZone: "Europe/Berlin", ...trigger },
  mode: "manual",
  notify: { inApp: true, calendar: true },
  answerMode: "fast",
  useSearch: false,
  createdAt: "2026-11-15T10:00:00.000Z",
  nextDueAt: "2026-11-17T09:00:00.000Z",
  ...change,
});
const options = { names: false, url: "https://app.example/", title: "CometRow task", description: "Open CometRow to run it.", now: new Date("2026-11-15T12:34:56Z") };
const unfold = (text: string) => text.replace(/\r\n /g, "");
const lines = (text: string) => unfold(text).split("\r\n").slice(0, -1);
const field = (text: string, name: string) => lines(text).filter((line) => line.startsWith(name));
// The events' repeat rules, not the time zone's yearly ones.
const repeat = (text: string) => field(text, "RRULE").filter((line) => !line.includes("YEARLY"));

describe("calendar file", () => {
  it("is CRLF throughout, folded at 75 octets, and well nested", () => {
    const text = calendarFile([task({ name: "Ü".repeat(60) })], { ...options, names: true });
    expect(text.endsWith("\r\n")).toBe(true);
    expect(text.replace(/\r\n/g, "")).not.toMatch(/[\r\n]/);
    for (const line of text.split("\r\n")) expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
    expect(text).toContain("\r\n ");
    const stack: string[] = [];
    for (const line of lines(text)) {
      if (line.startsWith("BEGIN:")) stack.push(line.slice(6));
      if (line.startsWith("END:")) expect(stack.pop()).toBe(line.slice(4));
    }
    expect(stack).toEqual([]);
    expect(lines(text)[0]).toBe("BEGIN:VCALENDAR");
    expect(field(text, "VERSION")).toEqual(["VERSION:2.0"]);
    expect(field(text, "PRODID")).toHaveLength(1);
    expect(field(text, "SUMMARY")[0]).toBe(`SUMMARY:CometRow task: ${"Ü".repeat(60)}`);
  });
  it("folding never splits a character and keeps every character", () => {
    const long = `SUMMARY:${"😀ä".repeat(40)}`;
    const folded = fold(long);
    expect(folded.replace(/\r\n /g, "")).toBe(long);
    for (const line of folded.split("\r\n")) expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
  });
  it("escapes text values", () => {
    expect(escapeText("a,b;c\\d\ne")).toBe("a\\,b\\;c\\\\d\\ne");
    const text = calendarFile([task({ name: "Rent, gas; and \\ more" })], { ...options, names: true });
    expect(field(text, "SUMMARY")[0]).toBe("SUMMARY:CometRow task: Rent\\, gas\\; and \\\\ more");
  });
  it("uses the neutral title by default and never holds the instruction", () => {
    const text = calendarFile([task()], options);
    expect(field(text, "SUMMARY")).toEqual(["SUMMARY:CometRow task"]);
    expect(text).not.toContain("German word");
    expect(text).not.toContain("SECRET");
    expect(text).not.toContain("CV");
    expect(field(text, "URL")).toEqual(["URL:https://app.example/"]);
    expect(field(text, "UID")).toEqual(["UID:6f1d2c1e-8a4b-4c3d-9e2f-1a2b3c4d5e6f@cometrow"]);
    expect(field(text, "DTSTAMP")).toEqual(["DTSTAMP:20261115T123456Z"]);
  });
  it("starts at the next due day in its zone with a VTIMEZONE for that zone", () => {
    const text = calendarFile([task()], options);
    expect(field(text, "DTSTART;TZID")).toEqual(["DTSTART;TZID=Europe/Berlin:20261117T100000"]);
    const zone = unfold(text).slice(unfold(text).indexOf("BEGIN:VTIMEZONE"), unfold(text).indexOf("END:VTIMEZONE"));
    expect(zone).toContain("TZID:Europe/Berlin");
    expect(zone).toContain("BEGIN:DAYLIGHT\r\nDTSTART:20250330T020000\r\nRRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU\r\nTZOFFSETFROM:+0100\r\nTZOFFSETTO:+0200");
    expect(zone).toContain("BEGIN:STANDARD\r\nDTSTART:20251026T030000\r\nRRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU\r\nTZOFFSETFROM:+0200\r\nTZOFFSETTO:+0100");
  });
  it("a zone without clock changes gets one fixed offset; UTC gets a UTC time and no VTIMEZONE", () => {
    const tokyo = calendarFile([task({ nextDueAt: "2026-11-17T01:00:00.000Z" }, { timeZone: "Asia/Tokyo" })], options);
    expect(unfold(tokyo)).toContain("TZID:Asia/Tokyo\r\nBEGIN:STANDARD\r\nDTSTART:19700101T000000\r\nTZOFFSETFROM:+0900\r\nTZOFFSETTO:+0900");
    expect(field(tokyo, "DTSTART;TZID")).toEqual(["DTSTART;TZID=Asia/Tokyo:20261117T100000"]);
    const utc = calendarFile([task({ nextDueAt: "2026-11-17T10:00:00.000Z" }, { timeZone: "UTC" })], options);
    expect(utc).not.toContain("VTIMEZONE");
    expect(field(utc, "DTSTART")).toEqual(["DTSTART:20261117T100000Z"]);
    const newYork = calendarFile([task({ nextDueAt: "2026-11-17T15:00:00.000Z" }, { timeZone: "America/New_York" })], options);
    expect(unfold(newYork)).toContain("RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU");
    expect(unfold(newYork)).toContain("RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU");
  });
  it("has the repeat rule for each unit", () => {
    expect(repeat(calendarFile([task()], options))).toEqual(["RRULE:FREQ=DAILY;INTERVAL=2"]);
    // 18 November 2026 is a Wednesday.
    const weekly = task({ nextDueAt: "2026-11-18T09:00:00.000Z" }, { unit: "week", every: 1, weekday: 3 });
    expect(repeat(calendarFile([weekly], options))).toEqual(["RRULE:FREQ=WEEKLY;INTERVAL=1;BYDAY=WE"]);
    const fortnight = task({ nextDueAt: "2026-11-22T09:00:00.000Z" }, { unit: "week", every: 2 });
    expect(repeat(calendarFile([fortnight], options))).toEqual(["RRULE:FREQ=WEEKLY;INTERVAL=2;BYDAY=SU"]);
    const monthly = task({ nextDueAt: "2026-12-01T08:00:00.000Z" }, { unit: "month", every: 1, dayOfMonth: 1 });
    const file = calendarFile([monthly], options);
    expect(repeat(file)).toEqual(["RRULE:FREQ=MONTHLY;INTERVAL=1;BYMONTHDAY=1"]);
    expect(field(file, "DTSTART;TZID")).toEqual(["DTSTART;TZID=Europe/Berlin:20261201T100000"]);
  });
  it("several tasks: one VTIMEZONE per zone, one VEVENT per task, each with an alarm", () => {
    const second = task({ id: "7f1d2c1e-8a4b-4c3d-9e2f-1a2b3c4d5e6f" });
    const text = calendarFile([task(), second], options);
    expect(field(text, "BEGIN:VTIMEZONE")).toHaveLength(1);
    expect(field(text, "BEGIN:VEVENT")).toHaveLength(2);
    expect(field(text, "BEGIN:VALARM")).toHaveLength(2);
    expect(field(text, "TRIGGER")).toEqual(["TRIGGER:PT0M", "TRIGGER:PT0M"]);
  });
});
