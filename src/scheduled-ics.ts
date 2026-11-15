/**
 * Calendar files for scheduled tasks (RFC 5545; docs/scheduled-20261115.md). The file is made on
 * the device and downloaded; nothing is sent. It holds a neutral title ("CometRow task") unless
 * the user ticks "include task names", the app's plain address, the time and the repeat rule. It
 * never holds the instruction, so a synced calendar learns only that something is due.
 */
import { zonedDate, zoneOffset, type ScheduledTask } from "../shared/scheduled-tasks";

const BYDAY = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];
const UTC_ZONES = new Set(["UTC", "Etc/UTC", "Etc/GMT", "GMT"]);
const pad = (n: number, width = 2) => String(n).padStart(width, "0");
const stamp = (d: Date) =>
  `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}`;
const offsetText = (ms: number) => {
  const minutes = Math.round(ms / 60_000);
  const sign = minutes < 0 ? "-" : "+";
  return `${sign}${pad(Math.floor(Math.abs(minutes) / 60))}${pad(Math.abs(minutes) % 60)}`;
};

/** TEXT values: backslash, semicolon, comma and line breaks are escaped. */
export const escapeText = (text: string) =>
  text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

/** Lines of at most 75 octets; a continuation starts with one space. Never splits a character. */
export function fold(line: string): string {
  const encoder = new TextEncoder();
  const out: string[] = [];
  let current = "";
  let bytes = 0;
  for (const char of line) {
    const size = encoder.encode(char).length;
    const room = out.length ? 74 : 75;
    if (bytes + size > room) {
      out.push(current);
      current = "";
      bytes = 0;
    }
    current += char;
    bytes += size;
  }
  out.push(current);
  return out.map((part, index) => (index ? ` ${part}` : part)).join("\r\n");
}

/** Clock changes of a zone in one year: [instant, offset before, offset after]. */
function transitions(zone: string, year: number): [number, number, number][] {
  const found: [number, number, number][] = [];
  const DAY = 86_400_000;
  let at = Date.UTC(year, 0, 1);
  let before = zoneOffset(at, zone);
  for (let day = 1; day <= 366; day++) {
    const next = at + DAY;
    const offset = zoneOffset(next, zone);
    if (offset !== before) {
      // To the minute: the change lies between `at` and `next`.
      let low = at;
      let high = next;
      while (high - low > 60_000) {
        const middle = low + Math.floor((high - low) / 120_000) * 60_000;
        if (zoneOffset(middle, zone) === before) low = middle;
        else high = middle;
      }
      found.push([high, before, offset]);
      before = offset;
    }
    at = next;
  }
  return found;
}

/**
 * A VTIMEZONE for the zone, from the browser's own time zone data: the clock changes of the year
 * before the first event as yearly rules (last or nth Sunday of the month), or one fixed offset.
 */
function timezone(zone: string, year: number): string[] {
  const changes = transitions(zone, year - 1);
  const lines = ["BEGIN:VTIMEZONE", `TZID:${zone}`];
  if (!changes.length) {
    const offset = offsetText(zoneOffset(Date.UTC(year, 0, 1), zone));
    lines.push("BEGIN:STANDARD", "DTSTART:19700101T000000", `TZOFFSETFROM:${offset}`, `TZOFFSETTO:${offset}`, "END:STANDARD");
  }
  for (const [instant, from, to] of changes) {
    const local = new Date(instant + from);
    const day = local.getUTCDate();
    const month = local.getUTCMonth() + 1;
    const length = new Date(Date.UTC(local.getUTCFullYear(), month, 0)).getUTCDate();
    const nth = day + 7 > length ? -1 : Math.ceil(day / 7);
    const kind = to > from ? "DAYLIGHT" : "STANDARD";
    lines.push(
      `BEGIN:${kind}`,
      `DTSTART:${stamp(local)}`,
      `RRULE:FREQ=YEARLY;BYMONTH=${month};BYDAY=${nth}${BYDAY[local.getUTCDay()]}`,
      `TZOFFSETFROM:${offsetText(from)}`,
      `TZOFFSETTO:${offsetText(to)}`,
      `END:${kind}`,
    );
  }
  lines.push("END:VTIMEZONE");
  return lines;
}

export function repeatRule(task: ScheduledTask, start: { weekday: number; day: number }): string {
  const { every, unit } = task.trigger;
  if (unit === "day") return `RRULE:FREQ=DAILY;INTERVAL=${every}`;
  if (unit === "week") return `RRULE:FREQ=WEEKLY;INTERVAL=${every};BYDAY=${BYDAY[task.trigger.weekday ?? start.weekday]}`;
  return `RRULE:FREQ=MONTHLY;INTERVAL=${every};BYMONTHDAY=${task.trigger.dayOfMonth ?? start.day}`;
}

/**
 * The calendar file for these tasks. `names`: the user ticked "include task names"; otherwise
 * every event is called `title`. `url` is the app's plain address. `description` is a neutral
 * line in the interface language.
 */
export function calendarFile(
  tasks: readonly ScheduledTask[],
  options: { names: boolean; url: string; title: string; description: string; now?: Date },
): string {
  const now = options.now ?? new Date();
  const zones = new Map<string, number>();
  const events: string[] = [];
  for (const task of tasks) {
    const zone = task.trigger.timeZone;
    const date = zonedDate(new Date(task.nextDueAt), zone);
    const [hour, minute] = task.trigger.time.split(":").map(Number);
    // The wall clock of the next due day at the task's time: also on a day the clock skipped it.
    const wall = `${date.year}${pad(date.month)}${pad(date.day)}T${pad(hour)}${pad(minute)}00`;
    const utc = UTC_ZONES.has(zone);
    if (!utc) zones.set(zone, Math.min(zones.get(zone) ?? date.year, date.year));
    const summary = options.names ? `${options.title}: ${task.name}` : options.title;
    events.push(
      "BEGIN:VEVENT",
      `UID:${task.id}@cometrow`,
      `DTSTAMP:${stamp(now)}Z`,
      utc ? `DTSTART:${wall}Z` : `DTSTART;TZID=${zone}:${wall}`,
      "DURATION:PT15M",
      repeatRule(task, { weekday: new Date(Date.UTC(date.year, date.month - 1, date.day)).getUTCDay(), day: date.day }),
      `SUMMARY:${escapeText(summary)}`,
      `DESCRIPTION:${escapeText(options.description)}`,
      `URL:${options.url}`,
      "BEGIN:VALARM",
      "ACTION:DISPLAY",
      "TRIGGER:PT0M",
      `DESCRIPTION:${escapeText(summary)}`,
      "END:VALARM",
      "END:VEVENT",
    );
  }
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//CometRow//Scheduled tasks//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    ...[...zones].flatMap(([zone, year]) => timezone(zone, year)),
    ...events,
    "END:VCALENDAR",
  ];
  return `${lines.map(fold).join("\r\n")}\r\n`;
}

/** Saves the file through the browser's download; nothing leaves the device. */
export function downloadCalendar(text: string, filename: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/calendar;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
