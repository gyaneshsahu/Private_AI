// Code execution (docs/code-execution-20261114.md): Auto's routing with the feature on and off,
// the saved conversation, and the texts in both languages.
import { expect, it } from "vitest";
import { emptyConversation } from "../shared/contracts";
import { autoDecision, autoMode } from "../src/answer-modes";
import { MAX_CODE_RUNS } from "../src/code-tool";
import { newMessage } from "../src/conversation";
import { CODE_LIMIT, OUTPUT_LIMIT } from "../src/python-sandbox";
import { savedConversationSchema } from "../src/saved-conversation";
import { codeText } from "../src/text/code";

const asking = (text: string) => {
  const c = emptyConversation();
  c.messages.push(newMessage("user", text));
  return c;
};

it("Auto keeps calculations in Fast when code execution is on, and sends them to Thinking when it is off", () => {
  for (const question of [
    "What is 19 % of 6420 EUR?",
    "Quote: 3,850.00 EUR net plus 19% VAT. What are the VAT and the total?",
    "Was ist 17 % von 2.340 €?",
    "3 Personen teilen 127,50 € und 18 € Trinkgeld. Wie viel pro Person?",
    "12 * 7 + 3 * 9 = ?",
  ]) {
    expect(autoDecision(asking(question)), question).toEqual({ mode: "thinking", reason: "maths" });
    expect(autoDecision(asking(question), true), question).toEqual({ mode: "fast", reason: "maths" });
    expect(autoMode(asking(question), true)).toBe("fast");
  }
  // Nothing else moves: code questions and reasoning stay in Thinking, simple and urgent ones in Fast.
  for (const [question, mode] of [
    ["Fix this function: `def f(x): return x +`", "thinking"],
    ["Explain step by step why the sky is blue.", "thinking"],
    ["What is the capital of France?", "fast"],
    ["He is unconscious and not breathing, 3 minutes now, 2 people here. How long?", "fast"],
  ] as const) {
    expect(autoMode(asking(question)), question).toBe(mode);
    expect(autoMode(asking(question), true), question).toBe(mode);
  }
});

it("a saved conversation keeps the code and its output with the answer, within the limits", () => {
  const c = asking("What is 19 % of 6420 EUR?");
  c.messages.push({
    ...newMessage("assistant", "The VAT is 1,219.80 EUR."),
    answeredBy: "Auto · Fast",
    codeRuns: [
      { code: "print(Decimal(1))", output: "ERROR:\nNameError: name 'Decimal' is not defined", error: true },
      { code: 'from decimal import Decimal\nprint("VAT:", Decimal("6420") * Decimal("0.19"))', output: "VAT: 1219.80" },
    ],
  });
  c.messages.push({ ...newMessage("assistant", "About 1,220 EUR."), codeUnavailable: true });
  const restored = savedConversationSchema.parse(JSON.parse(JSON.stringify(c)));
  expect(restored).toEqual(c);
  expect(restored.messages[1].codeRuns).toHaveLength(2);
  // The largest run the app can produce fits; anything beyond the limits is refused, as is an unknown field.
  const run = { code: "x".repeat(CODE_LIMIT), output: "y".repeat(OUTPUT_LIMIT + 100) };
  const withRuns = (codeRuns: unknown) => ({ ...c, messages: [{ ...c.messages[1], codeRuns }] });
  expect(savedConversationSchema.safeParse(withRuns(Array(MAX_CODE_RUNS).fill(run))).success).toBe(true);
  for (const bad of [
    Array(MAX_CODE_RUNS + 1).fill(run),
    [{ ...run, code: run.code + "x" }],
    [{ ...run, output: "y".repeat(4201) }],
    [{ ...run, error: false }],
    [{ ...run, stdout: "extra" }],
  ])
    expect(savedConversationSchema.safeParse(withRuns(bad)).success).toBe(false);
  // Conversations saved before the feature still open.
  expect(savedConversationSchema.parse(JSON.parse(JSON.stringify(asking("Hello")))).messages[0]).not.toHaveProperty("codeRuns");
});

it("has every text in German and English under the same keys", () => {
  expect(Object.keys(codeText.de).sort()).toEqual(Object.keys(codeText.en).sort());
  expect(codeText.en.calculating).toBe("Calculating on your device…");
  expect(codeText.en.used).toBe("Calculated with code on this device");
  expect(codeText.de.used).toBe("Mit Code auf diesem Gerät berechnet");
  expect(codeText.en.notRun).toContain("The calculation was not run on this device");
  expect(codeText.de.notRun).toContain("lief nicht auf diesem Gerät");
  for (const text of [...Object.values(codeText.en), ...Object.values(codeText.de)]) expect(text).not.toMatch(/—/);
});
