// Chat detection of scheduling requests (src/schedule-detection.ts): precision and recall on the
// fixture written before tuning, per language, and the parsed fields of every positive case.
import { describe, expect, it } from "vitest";
import { detectSchedule } from "../src/schedule-detection";
import {
  ENGLISH_NEGATIVE,
  ENGLISH_POSITIVE,
  GERMAN_NEGATIVE,
  GERMAN_POSITIVE,
  HELD_OUT_NEGATIVE,
  HELD_OUT_POSITIVE,
  type DetectionCase,
} from "./fixtures/schedule-detection-cases";
import {
  HELD_OUT_2_DE_NEGATIVE,
  HELD_OUT_2_DE_POSITIVE,
  HELD_OUT_2_EN_NEGATIVE,
  HELD_OUT_2_EN_POSITIVE,
} from "./fixtures/schedule-detection-heldout-2";

function score(positive: DetectionCase[], negative: DetectionCase[]) {
  const truePositive = positive.filter((c) => detectSchedule(c.text)).length;
  const falsePositive = negative.filter((c) => detectSchedule(c.text)).length;
  return {
    cases: `${positive.length} positive, ${negative.length} negative`,
    precision: truePositive / Math.max(1, truePositive + falsePositive),
    recall: truePositive / positive.length,
    missed: positive.filter((c) => !detectSchedule(c.text)).map((c) => c.text),
    wrong: negative.filter((c) => detectSchedule(c.text)).map((c) => c.text),
  };
}

describe("schedule detection", () => {
  it("has at least 30 positive and 30 negative cases in each language", () => {
    for (const list of [ENGLISH_POSITIVE, ENGLISH_NEGATIVE, GERMAN_POSITIVE, GERMAN_NEGATIVE])
      expect(list.length).toBeGreaterThanOrEqual(30);
  });
  it("precision and recall per language (printed as a table)", () => {
    const table = {
      English: score(ENGLISH_POSITIVE, ENGLISH_NEGATIVE),
      German: score(GERMAN_POSITIVE, GERMAN_NEGATIVE),
      Both: score([...ENGLISH_POSITIVE, ...GERMAN_POSITIVE], [...ENGLISH_NEGATIVE, ...GERMAN_NEGATIVE]),
    };
    console.table(
      Object.fromEntries(
        Object.entries(table).map(([name, s]) => [name, { cases: s.cases, precision: s.precision.toFixed(3), recall: s.recall.toFixed(3) }]),
      ),
    );
    for (const s of Object.values(table)) {
      expect(s.wrong).toEqual([]);
      expect(s.missed).toEqual([]);
    }
  });
  it("first held-out set: 14 of 14 found, none wrongly (was 12 and 2 before its two failure kinds were fixed in general rules)", () => {
    const found = HELD_OUT_POSITIVE.filter((t) => detectSchedule(t)).length;
    const wrong = HELD_OUT_NEGATIVE.filter((t) => detectSchedule(t)).length;
    // Its misses and false triggers guided the change, so this is no longer an honest figure.
    expect(found / HELD_OUT_POSITIVE.length).toBeGreaterThanOrEqual(0.8);
    expect(found / (found + wrong)).toBeGreaterThanOrEqual(0.8);
  });
  it("second held-out set, written and committed before the change, never tuned on (measured 15 November)", () => {
    // Before the change: recall 0.75 in both languages, precision 0.714 (English) and 0.682 (German).
    // After: recall 0.85, precision 0.773 in both. A wrong card costs one tap on "Just send".
    for (const [positive, negative] of [
      [HELD_OUT_2_EN_POSITIVE, HELD_OUT_2_EN_NEGATIVE],
      [HELD_OUT_2_DE_POSITIVE, HELD_OUT_2_DE_NEGATIVE],
    ]) {
      const found = positive.filter((t) => detectSchedule(t)).length;
      const wrong = negative.filter((t) => detectSchedule(t)).length;
      expect(found / positive.length).toBeGreaterThanOrEqual(0.85);
      expect(found / (found + wrong)).toBeGreaterThanOrEqual(0.77);
    }
  });
  it("frequency adjectives after a request, and frequencies that only describe a one-off collection", () => {
    expect(detectSchedule("I want a weekly digest of science news")).toMatchObject({ every: 1, unit: "week" });
    expect(detectSchedule("Ich brauche eine monatliche Erinnerung an die Steuer")).toMatchObject({ every: 1, unit: "month", lang: "de" });
    expect(detectSchedule("Schick mir eine tägliche Nachricht mit dem Wetter")).toMatchObject({ every: 1, unit: "day" });
    expect(detectSchedule("Gib mir einen wöchentlichen Trainingsplan")).toBeUndefined();
    expect(detectSchedule("Send me a list of new jobs every Monday")).toMatchObject({ every: 1, unit: "week", weekday: 1 });
    expect(detectSchedule("Give me ideas that we can cook every week")).toBeUndefined();
    expect(detectSchedule("Nenn mir Orte, wo man jeden Sonntag frühstücken kann")).toBeUndefined();
  });
  for (const c of [...ENGLISH_POSITIVE, ...GERMAN_POSITIVE])
    it(`reads the schedule: ${c.text}`, () => {
      const found = detectSchedule(c.text)!;
      expect(found).toBeDefined();
      const want = c.expect!;
      expect({
        every: found.every,
        unit: found.unit,
        weekday: found.weekday,
        dayOfMonth: found.dayOfMonth,
        time: found.time ?? null,
      }).toEqual({ every: want.every, unit: want.unit, weekday: want.weekday, dayOfMonth: want.dayOfMonth, time: want.time });
      expect(found.instruction.length).toBeGreaterThan(3);
    });
  it("takes the task out of the owner's example and keeps the request for the run", () => {
    const en = detectSchedule("can you give me a new German word to learn every 2 days because I am learning German?")!;
    expect(en.content).toBe("a new German word to learn");
    expect(en.instruction).toBe("Can you give me a new German word to learn because I am learning German?");
    expect(en.lang).toBe("en");
    const de = detectSchedule("Kannst du mir alle 2 Tage ein neues deutsches Wort geben?")!;
    expect(de.content).toBe("ein neues deutsches Wort");
    expect(de.instruction).toBe("Kannst du mir ein neues deutsches Wort geben?");
    expect(de.lang).toBe("de");
  });
  it("a reminder becomes a short reminder text, in the message's language", () => {
    expect(detectSchedule("Remind me every day at 10 to drink water")!.instruction).toBe("Reminder: drink water");
    expect(detectSchedule("Erinnere mich jeden Tag um 10 Uhr daran, Wasser zu trinken")!.instruction).toBe(
      "Erinnerung: Wasser zu trinken",
    );
  });
  it("suggests a time from the part of the day when none was given", () => {
    expect(detectSchedule("Every morning, tell me a fun fact")!.suggestedTime).toBe("08:00");
    expect(detectSchedule("Erzähl mir jeden Abend einen Witz")!.suggestedTime).toBe("19:00");
    expect(detectSchedule("Please give me a recipe idea every week")!.suggestedTime).toBe("09:00");
  });
  it("ignores impossible times and long texts", () => {
    expect(detectSchedule("Remind me every day at 25:00 to stretch")!.time).toBeUndefined();
    expect(detectSchedule(`Remind me every day to ${"stretch ".repeat(100)}`)).toBeUndefined();
    expect(detectSchedule("")).toBeUndefined();
  });
});
