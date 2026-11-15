/**
 * Recognises a scheduling request in a chat message, on the device, without a model
 * (docs/scheduled-20261115.md, "Chat detection"). English and German. The result only fills a
 * confirmation card: nothing is scheduled without the user's tap. Simple rules, tuned on the
 * cases in tests/fixtures/schedule-detection-cases.ts; when in doubt it does not trigger, so a
 * question about schedules is answered as usual.
 */
import type { ScheduleUnit } from "../shared/scheduled-tasks";

export interface DetectedSchedule {
  /** What the task is about, for its name ("a new German word to learn"); may be empty. */
  content: string;
  /** What "Run now" sends: the message without the schedule words. */
  instruction: string;
  every: number;
  unit: ScheduleUnit;
  weekday?: number;
  dayOfMonth?: number;
  /** "HH:MM" when the message gave a time; else the card asks, starting at `suggestedTime`. */
  time?: string;
  suggestedTime: string;
  lang: "en" | "de";
}

// Letters, not ASCII word characters: \b does not see "ä", "ö", "ü" or "ß".
const B = "(?<![\\p{L}\\d])";
const E = "(?![\\p{L}\\d])";
const re = (source: string, flags = "iu") => new RegExp(source.replaceAll("\\b<", B).replaceAll("\\b>", E), flags);

const NUMBERS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, other: 2,
  zwei: 2, drei: 3, vier: 4, fünf: 5, sechs: 6, sieben: 7, acht: 8, neun: 9, zehn: 10,
  zweite: 2, zweiten: 2, zweiter: 2, dritte: 3, dritten: 3, dritter: 3, vierte: 4, vierten: 4, vierter: 4,
};
const number = (word: string) => (/^\d+$/.test(word) ? Number(word) : NUMBERS[word.toLowerCase()]);
const NUMBER = "(\\d{1,2}|one|two|three|four|five|six|seven|eight|nine|ten|zwei|drei|vier|fünf|sechs|sieben|acht|neun|zehn)";
const DAYS_EN = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const DAYS_DE = ["sonntag", "montag", "dienstag", "mittwoch", "donnerstag", "freitag", "samstag"];
const weekdayOf = (word: string) => {
  const w = word.toLowerCase();
  const en = DAYS_EN.findIndex((d) => w.startsWith(d));
  return en >= 0 ? en : DAYS_DE.findIndex((d) => w.startsWith(d));
};
const PART = "(morning|evening|afternoon|night|morgen|abend|nachmittag|mittag)";
const unitOf = (word: string): ScheduleUnit =>
  /^(day|tag|morning|evening|afternoon|night|morgen|abend|nachmittag|mittag|nacht)/i.test(word)
    ? "day"
    : /^(week|woche)/i.test(word)
      ? "week"
      : "month";

type Frequency = { every: number; unit: ScheduleUnit; weekday?: number; dayOfMonth?: number; de: boolean };
type Rule = { pattern: RegExp; read: (m: RegExpExecArray) => Frequency | undefined };
const PLAN_NOUNS = re(
  "^\\s*(?:[\\p{L}-]+\\s+){0,2}?(plan|schedule|routine|budget|planner|timetable|overview|calendar|report|ticket|fee|newspaper|limit|rate|pass|subscription)s?\\b>",
);
const ADVERB_FOLLOWERS = re("^(?:\\s*$|\\s*[,.;:!?]|\\s+(?:(?:at|on|in|from|to|please|until|starting|and|or|for|around|about)\\b>|\\d))");
const GIVE_A = re("\\b<(?:give|send|bring|show|tell|teach|text|email|write)\\s+me\\s+(?:a|an|one|my)?\\s*$");

const RULES: Rule[] = [
  {
    pattern: re(`\\b<(?:every|each)\\s+(other|${NUMBER})\\s+(days?|weeks?|months?)\\b>`),
    read: (m) => ({ every: number(m[1]), unit: unitOf(m[3]), de: false }),
  },
  {
    pattern: re(`\\b<alle\\s+${NUMBER}\\s+(tage|wochen|monate)\\b>`),
    read: (m) => ({ every: number(m[1]), unit: unitOf(m[2]), de: true }),
  },
  {
    pattern: re("\\b<jede[nrs]?\\s+(zweite[nr]?|dritte[nr]?|vierte[nr]?)\\s+(tag|woche|monat)\\b>"),
    read: (m) => ({ every: number(m[1]), unit: unitOf(m[2]), de: true }),
  },
  {
    pattern: re(`\\b<(?:every|each)\\s+(${DAYS_EN.join("|")})(?:\\s+${PART})?\\b>`),
    read: (m) => ({ every: 1, unit: "week", weekday: weekdayOf(m[1]), de: false }),
  },
  {
    pattern: re(`\\b<on\\s+(${DAYS_EN.join("|")})s\\b>`),
    read: (m) => ({ every: 1, unit: "week", weekday: weekdayOf(m[1]), de: false }),
  },
  {
    pattern: re(`\\b<jeden\\s+(${DAYS_DE.join("|")})(?:morgen|abend|nachmittag|mittag)?\\b>`),
    read: (m) => ({ every: 1, unit: "week", weekday: weekdayOf(m[1]), de: true }),
  },
  {
    pattern: re(`\\b<(${DAYS_DE.join("|")})s\\b>`),
    read: (m) => ({ every: 1, unit: "week", weekday: weekdayOf(m[1]), de: true }),
  },
  {
    pattern: re("\\b<(?:every|each)\\s+(day|morning|evening|afternoon|night)\\b>"),
    read: () => ({ every: 1, unit: "day", de: false }),
  },
  {
    pattern: re("\\b<(?:jeden\\s+(tag|morgen|abend|mittag|nachmittag)|jede\\s+nacht|täglich)\\b>"),
    read: () => ({ every: 1, unit: "day", de: true }),
  },
  {
    pattern: re("\\b<(?:every|each)\\s+(week|month)\\b>"),
    read: (m) => ({ every: 1, unit: unitOf(m[1]), de: false }),
  },
  {
    pattern: re("\\b<(?:jede\\s+woche|wöchentlich)\\b>"),
    read: () => ({ every: 1, unit: "week", de: true }),
  },
  {
    pattern: re("\\b<(?:jeden\\s+monat|monatlich)\\b>"),
    read: () => ({ every: 1, unit: "month", de: true }),
  },
  {
    pattern: re("\\b<am\\s+(\\d{1,2})\\.\\s+jede[ns]\\s+monats\\b>|\\b<am\\s+ersten\\s+jede[ns]\\s+monats\\b>"),
    read: (m) => ({ every: 1, unit: "month", dayOfMonth: m[1] ? Number(m[1]) : 1, de: true }),
  },
  {
    // "daily", "weekly", "monthly": as an adverb ("quote daily at 7"), or after "give me a" unless
    // a plan or schedule follows ("give me a weekly meal plan" is one plan, not a task).
    pattern: re("\\b<(daily|weekly|monthly)\\b>"),
    read: (m) => {
      const after = m.input.slice(m.index + m[0].length);
      const before = m.input.slice(0, m.index);
      if (!ADVERB_FOLLOWERS.test(after) && !(GIVE_A.test(before) && !PLAN_NOUNS.test(after))) return undefined;
      return { every: 1, unit: m[1].toLowerCase() === "daily" ? "day" : m[1].toLowerCase() === "weekly" ? "week" : "month", de: false };
    },
  },
];

const MARKERS = [
  re("\\b<remind\\s+me\\b>"),
  re("\\b<(?:give|send|tell|teach|show|bring|write|text|email|ping|quiz|test|notify|recommend)\\s+me\\b>"),
  re("\\b<(?:suggest|i'?d\\s+like|i\\s+would\\s+like|i\\s+want|i'?d\\s+love|let\\s+me\\s+know)\\b>"),
  re("\\b<erinner(?:e|n\\s+sie)?\\s+mich\\b>"),
  re("\\b<(?:gib|geben\\s+sie|schick|schicke|sende|senden\\s+sie|erzähl|erzähle|zeig|zeige|schreib|schreibe|bring|bringe|empfiehl|nenn|nenne|schlag|schlage)\\s+(?:mir|uns)\\b>"),
  re("\\b<(?:frag|frage)\\s+mich\\b>|\\b<mich\\b.*\\babfragen\\b>"),
  re("\\b<(?:ich\\s+hätte\\s+gerne?|ich\\s+möchte|ich\\s+will)\\b>"),
  re("\\b<(?:kannst|könntest|würdest|magst)\\s+du\\s+(?:mir|mich)\\b>|\\b<(?:können|könnten|würden)\\s+sie\\s+(?:mir|mich)\\b>"),
];
const REMIND = re("\\b<(?:remind\\s+me|erinner(?:e|n\\s+sie)?\\s+mich)\\b>");
const POLITE = re("^\\s*(?:please\\s+|bitte\\s+)?(?:(?:can|could|would|will)\\s+you|(?:kannst|könntest|würdest|magst)\\s+du|(?:können|könnten|würden)\\s+sie)\\b>");
const QUESTION_START = re(
  "^\\s*(?:what|what's|whats|how|why|when|where|who|which|is|are|was|were|should|does|do|did|has|have|wie|warum|wieso|weshalb|wann|wo|wer|welche[rsnm]?|ist|sind|soll|sollte|sollten|gibt\\s+es|hat|haben|kann\\s+man|muss)\\b>",
);
const OTHER_TASK_START = re(
  "^\\s*(?:please\\s+|bitte\\s+)?(?:translate|summari[sz]e|explain|write\\s+(?!me\\b>)|plan|create|list|draft|define|correct|describe|compare|übersetze?|fasse|erkläre?|schreibe?\\s+(?!mir\\b>)|plane|erstelle|nenne?\\s+(?!mir\\b>)|beschreibe|vergleiche|korrigiere)",
);
const ASKS_ABOUT = re(
  "\\b<(?:remind\\s+me|tell\\s+me)\\s*,?\\s+(?:what|how|who|where|why|when|which|whether|if|of|about)\\b>|\\b<erinnere?\\s+mich\\s*,?\\s+(?:was|wie|wer|wo|warum|ob|worüber|woran|wann)\\b>|\\b<erzähle?\\s+mir\\s+(?:etwas\\s+)?über\\b>",
);
const ONE_OFF_EN = re("\\b<(?:tomorrow|tonight|today|later|next|in\\s+\\d+|in\\s+an?\\s+(?:hour|minute))\\b>");
// Case matters: "morgen" is tomorrow, "Morgen" the morning.
const ONE_OFF_DE = re("\\b<(?:morgen|heute|übermorgen|später|nächste[nrs]?|in\\s+\\d+)\\b>", "u");
const REMIND_TO = re("\\b<remind\\s+me\\s+(?:please\\s+)?to\\b>|\\b<erinnere?\\s+mich\\s+(?:bitte\\s+)?(?:daran|an)\\b>");

const DAY_MODIFIERS = [
  re("\\b<on\\s+the\\s+(\\d{1,2})(?:st|nd|rd|th)\\b>"),
  re("\\b<(?:on\\s+)?the\\s+first(?:\\s+of)?\\b>"),
  re("\\b<am\\s+(\\d{1,2})\\.(?!\\d)"),
];
const WEEKDAY_MODIFIER = re(`\\b<(?:on|am)\\s+(${[...DAYS_EN, ...DAYS_DE].join("|")})\\b>`);

type Span = [number, number];
function findTime(text: string, spans: Span[]): { time?: string; part?: string } {
  const part = re(`\\b<(morning|evening|afternoon|night|morgens|abends|nachmittags|nachts|${PART.slice(1, -1)})\\b>`).exec(text)?.[1]?.toLowerCase();
  const later = !!part && /^(evening|afternoon|night|abend|nachmittag|nacht)/.test(part);
  const patterns: [RegExp, (m: RegExpExecArray) => [number, number, string?]][] = [
    [re("\\b<(?:at\\s+)?noon\\b>|\\b<mittags\\b>|\\b<um\\s+mittag\\b>"), () => [12, 0]],
    [re("\\b<(?:at|um)\\s+midnight\\b>|\\b<um\\s+mitternacht\\b>"), () => [0, 0]],
    [re("\\b<(?:at\\s+|um\\s+)?(\\d{1,2}):(\\d{2})(?:\\s*(am|pm|a\\.m\\.|p\\.m\\.))?(?:\\s*uhr\\b>)?"), (m) => [+m[1], +m[2], m[3]]],
    [re("\\b<(?:um\\s+)?(\\d{1,2})\\.(\\d{2})\\s*uhr\\b>"), (m) => [+m[1], +m[2]]],
    [re("\\b<(?:at\\s+)?(\\d{1,2})\\s*(am|pm|a\\.m\\.|p\\.m\\.)(?![\\p{L}])"), (m) => [+m[1], 0, m[2]]],
    [re("\\b<um\\s+(\\d{1,2})(?:\\s*uhr\\b>|(?![\\d:.]))"), (m) => [+m[1], 0]],
    [re("\\b<(\\d{1,2})\\s*uhr\\b>"), (m) => [+m[1], 0]],
    [re("\\b<at\\s+(\\d{1,2})(?![\\d:.]|\\s*(?:st|nd|rd|th|days?|weeks?|months?|percent|%))\\b>"), (m) => [+m[1], 0]],
  ];
  for (const [pattern, read] of patterns) {
    const m = pattern.exec(text);
    if (!m) continue;
    let [hour, minute, half] = read(m);
    const pm = !!half && /^p/i.test(half);
    if (half && hour === 12) hour = pm ? 12 : 0;
    else if (pm || (later && hour < 12 && !half)) hour += 12;
    if (hour > 23 || minute > 59) return { part };
    spans.push([m.index, m.index + m[0].length]);
    return { time: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`, part };
  }
  return { part };
}

const tidy = (text: string) =>
  text
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/([,;:])(?=[,;:.!?])/g, "")
    .replace(/\s{2,}/g, " ")
    .replace(/^[\s,.;:!-]+/, "")
    .trim();
const capital = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);
const cut = (text: string, spans: Span[]) => {
  let out = "";
  let at = 0;
  for (const [start, end] of [...spans].sort((a, b) => a[0] - b[0])) {
    if (start < at) {
      at = Math.max(at, end);
      continue;
    }
    out += `${text.slice(at, start)} `;
    at = end;
  }
  return out + text.slice(at);
};

/** The schedule in a message, or undefined when the message is not a scheduling request. */
export function detectSchedule(message: string): DetectedSchedule | undefined {
  // Quoted words are about something, not a request ("Translate 'every Monday'").
  const text = message.replace(/(^|\s)'[^']+'(?=[\s.,!?]|$)|"[^"]*"|„[^“”]*[“”]|“[^”]*”|»[^«]*«|«[^»]*»/g, " ").trim();
  if (!text || text.length > 600) return undefined;
  const polite = POLITE.exec(text);
  if (!polite && (QUESTION_START.test(text) || text.includes("?"))) return undefined;
  if (OTHER_TASK_START.test(text) || ASKS_ABOUT.test(text)) return undefined;
  const marker = MARKERS.map((m) => m.exec(text)).find(Boolean);
  if (!marker) return undefined;
  const spans: Span[] = [];
  let frequency: Frequency | undefined;
  for (const rule of RULES) {
    const m = rule.pattern.exec(text);
    const found = m && rule.read(m);
    if (!found) continue;
    frequency = found;
    spans.push([m.index, m.index + m[0].length]);
    break;
  }
  if (!frequency) {
    // "Remind me to ..." alone: a daily reminder the user confirms. One-off reminders are not tasks.
    if (!REMIND_TO.test(text) || ONE_OFF_EN.test(text) || ONE_OFF_DE.test(text)) return undefined;
    frequency = { every: 1, unit: "day", de: /erinner/i.test(text) };
  }
  if (frequency.every < 1 || frequency.every > 31) return undefined;
  if (frequency.unit === "month" && frequency.dayOfMonth === undefined)
    for (const modifier of DAY_MODIFIERS) {
      const m = modifier.exec(text);
      if (!m) continue;
      const day = m[1] ? Number(m[1]) : 1;
      if (day >= 1 && day <= 28) frequency.dayOfMonth = day;
      spans.push([m.index, m.index + m[0].length]);
      break;
    }
  if (frequency.unit === "week" && frequency.weekday === undefined) {
    const m = WEEKDAY_MODIFIER.exec(text);
    if (m) {
      frequency.weekday = weekdayOf(m[1]);
      spans.push([m.index, m.index + m[0].length]);
    }
  }
  const { time, part } = findTime(text, spans);
  const de = frequency.de || /[äöüß]|\b(mir|mich|ich|du|bitte|jeden|alle)\b/i.test(marker[0] + text.slice(0, 40));
  const withoutSchedule = tidy(cut(text, spans).replace(/\s*,?\s*(?:,|\.)?\s*$/, ""));
  // The task's subject: also without the request words, the reason and a trailing verb.
  const markerSpans: Span[] = [...spans, [marker.index, marker.index + marker[0].length]];
  if (polite) markerSpans.push([polite.index, polite.index + polite[0].length]);
  const content = tidy(
    cut(text, markerSpans)
      .replace(re("\\s*,?\\s*\\b<(?:because|since|as\\s+i|weil|da\\s+ich|denn)\\b>.*$"), "")
      .replace(re("\\b<(?:please|bitte)\\b>"), "")
      .replace(/[?.!]+\s*$/, "")
      .replace(re("^\\s*(?:to|daran,?|an|that|dass)\\s+"), "")
      .replace(re("\\s+(?:geben|schicken|senden|zeigen|erzählen|vorschlagen|abfragen|beibringen|schreiben|vor|bei|ab)\\s*$"), "")
      .replace(/^[\s,.;:!-]+/, ""),
  );
  const instruction = REMIND.test(marker[0])
    ? `${de ? "Erinnerung" : "Reminder"}${content ? `: ${content}` : ""}`
    : capital(withoutSchedule);
  return {
    content,
    instruction,
    every: frequency.every,
    unit: frequency.unit,
    ...(frequency.weekday !== undefined && frequency.weekday >= 0 ? { weekday: frequency.weekday } : {}),
    ...(frequency.dayOfMonth ? { dayOfMonth: frequency.dayOfMonth } : {}),
    ...(time ? { time } : {}),
    suggestedTime: /^(morning|morgen)/i.test(part ?? "")
      ? "08:00"
      : /^(evening|abend|night|nacht)/i.test(part ?? "")
        ? "19:00"
        : /^(afternoon|nachmittag)/i.test(part ?? "")
          ? "15:00"
          : "09:00",
    lang: de ? "de" : "en",
  };
}
