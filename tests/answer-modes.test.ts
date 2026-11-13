// Answer modes (owner, 12 November): schema, Auto's on-device rules, the one-retry rule and labels.
import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import {
  checks,
  emptyConversation,
  largestOutputLimit,
  policyForTier,
  qualifiedModels,
  qualificationSchema,
  REPLY_LIMITS,
  replyLimits,
  tierFor,
  validateQualification,
} from "../shared/contracts";
import {
  answerLabel,
  autoDecision,
  autoMode,
  shouldRetryOnBackup,
  stillThinkingStatus,
} from "../src/answer-modes";
import { IncompleteReplyError } from "../src/reply-stream";
import type { StreamFailureCode } from "../src/stream-failure";

const base = () => ({
  provider: "tinfoil",
  model: "gpt-oss-120b",
  origin: "https://test.tinfoil.sh/",
  repository: "tinfoilsh/test-only",
  releaseDigests: ["a".repeat(64)],
  reviewedAt: new Date(Date.now() - 1000).toISOString(),
  validUntil: new Date(Date.now() + 60000).toISOString(),
  review: Object.fromEntries(
    checks.map((key) => [key, { status: "pass", evidence: ["TEST ONLY not provider evidence"] }]),
  ),
  maxInputCharacters: 5000,
  maxOutputTokens: 1000,
  pricing: { inputPerMillion: 1, outputPerMillion: 1, currency: "USD" },
  approvedSpendUSD: 1,
});
const modes = () => ({
  fast: {
    model: "gpt-oss-120b",
    gptOssReasoningEffort: "low",
    backupModel: "gemma4-31b",
    gemmaThinking: false,
    maxOutputTokens: 1024,
    allowanceCost: 1,
  },
  thinking: {
    model: "gpt-oss-120b",
    gptOssReasoningEffort: "high",
    backupModel: "gemma4-31b",
    gemmaThinking: true,
    maxOutputTokens: 4096,
    allowanceCost: 3,
  },
});

describe("report schema", () => {
  it("accepts modes and gives each request only its tier's model, backup, settings and limit", () => {
    const report = validateQualification({ ...base(), modes: modes() });
    expect(qualifiedModels(report)).toEqual(new Set(["gpt-oss-120b", "gemma4-31b"]));
    expect(largestOutputLimit(report)).toBe(4096);
    expect(policyForTier(report, "thinking", "primary")).toMatchObject({
      model: "gpt-oss-120b",
      gptOssReasoningEffort: "high",
      maxOutputTokens: 4096,
    });
    const backup = policyForTier(report, "fast", "backup");
    expect(backup).toMatchObject({ model: "gemma4-31b", gemmaThinking: false, maxOutputTokens: 1024 });
    expect(backup.gptOssReasoningEffort).toBeUndefined();
    expect(policyForTier(report, "thinking", "backup").gemmaThinking).toBe(true);
  });

  it("keeps a report without modes as today: one model, its optional fallback as backup, cost 1", () => {
    const report = validateQualification({ ...base(), fallbackModel: "gemma4-31b" });
    expect(tierFor(report, "thinking")).toEqual({
      model: "gpt-oss-120b",
      backupModel: "gemma4-31b",
      maxOutputTokens: 1000,
      allowanceCost: 1,
    });
    expect(() => policyForTier(validateQualification(base()), undefined, "backup")).toThrow("No backup");
  });

  it("refuses invalid tiers", () => {
    const bad = (change: (m: ReturnType<typeof modes>) => void) => {
      const m = modes();
      change(m);
      return () => validateQualification({ ...base(), modes: m });
    };
    expect(bad((m) => (m.fast.backupModel = "gpt-oss-120b"))).toThrow("must differ");
    expect(bad((m) => (m.fast.maxOutputTokens = 16385))).toThrow();
    expect(bad((m) => (m.thinking.maxOutputTokens = 16384))).not.toThrow();
    expect(bad((m) => (m.thinking.allowanceCost = 0))).toThrow();
    expect(bad((m) => (m.thinking.allowanceCost = 1.5))).toThrow();
    expect(bad((m) => (m.fast.model = "auto"))).toThrow();
    // A setting must belong to a model its tier uses.
    expect(
      bad((m) => Object.assign(m.fast, { glmReasoningEffort: "low" })),
    ).toThrow("mode does not use");
    expect(() => validateQualification({ ...base(), modes: { fast: modes().fast } })).toThrow();
  });

  it("accepts a report-level setting for a model only a tier qualifies", () => {
    expect(
      validateQualification({ ...base(), modes: modes(), gemmaThinking: true }).gemmaThinking,
    ).toBe(true);
    expect(() => validateQualification({ ...base(), gemmaThinking: true })).toThrow("does not qualify");
  });

  it("never crosses providers: a report has one provider and a tier cannot name another", () => {
    const m = modes();
    Object.assign(m.fast, { provider: "privatemode", origin: "https://elsewhere.example/" });
    const report = validateQualification({ ...base(), modes: m });
    expect(report.modes!.fast).not.toHaveProperty("provider");
    expect(report.modes!.fast).not.toHaveProperty("origin");
    for (const mode of ["fast", "thinking"] as const)
      for (const choice of ["primary", "backup"] as const)
        expect(policyForTier(report, mode, choice)).toMatchObject({
          provider: "tinfoil",
          origin: "https://test.tinfoil.sh/",
        });
    // Stage 3: a report may name Privatemode, but still exactly one provider for every tier.
    expect(qualificationSchema.shape.provider.safeParse("privatemode").success).toBe(true);
    expect(qualificationSchema.shape.provider.safeParse("both").success).toBe(false);
  });

  it("the draft report's modes block (wide screen picks) is a valid tier pair", async () => {
    const draft = JSON.parse(
      await readFile("evaluation/qualification-drafts/tinfoil-gpt-oss-120b-20261112.json", "utf8"),
    );
    expect(draft.modesStatus).toContain("WIDE_SCREEN");
    const report = validateQualification({ ...base(), modes: draft.modes });
    expect(report.modes!.thinking.allowanceCost).toBeGreaterThan(report.modes!.fast.allowanceCost);
  });
});

const ask = (text: string, documents = 0) => {
  const c = emptyConversation();
  c.messages.push({ id: "u", role: "user", text, status: "complete", included: true });
  if (documents)
    c.attachments.push({
      id: "a",
      name: "synthetic.txt",
      selected: true,
      sources: [{ id: "s", title: "synthetic", text: "x".repeat(documents) }],
    });
  return c;
};

describe("Auto", () => {
  it.each([
    "What is the capital of France?",
    "Write a short thank-you note to my neighbour.",
    "Translate 'good morning' into Spanish.",
    "Wie spät ist es in Tokio?",
    "Schreib mir eine kurze Einladung zum Grillen.",
    "Meeting at 3 pm, room 2.",
  ])("answers simple requests with Fast: %s", (text) => {
    expect(autoMode(ask(text))).toBe("fast");
  });

  it.each([
    "Explain step by step how compound interest works.",
    "Explain why the sky is blue.",
    "Why does my bread not rise?",
    "Prove that the square root of 2 is irrational.",
    "Can you debug this function for me?",
    "Compare a fixed and a variable mortgage.",
    "Calculate 1250 * 12 + 300 - 45.",
    "Solve the equation x^2 - 4 = 0",
    "Erkläre Schritt für Schritt, wie eine Steuererklärung funktioniert.",
    "Warum ist der Himmel blau?",
    "Berechne die monatliche Rate für 20.000 Euro.",
    "Vergleiche diese zwei Angebote.",
    "Beweise, dass es unendlich viele Primzahlen gibt.",
    "Was sind die Vor- und Nachteile von Solarstrom?",
    "Here is my code:\n```js\nconst a = 1;\n```",
    "TypeError: Cannot read properties of undefined\n    at render (app.js:10:5)",
    'Traceback (most recent call last):\n  File "main.py", line 3, in <module>',
  ])("answers demanding requests with Thinking: %s", (text) => {
    expect(autoMode(ask(text))).toBe("thinking");
  });

  // Routing of 12 November (docs/routing-and-search-20261112.md, evaluation/routing-sim.ts).
  it.each([
    ["Write a Python function merge_intervals(intervals) that merges overlapping intervals.", "code"],
    ["We validate German postcodes with /^\\d{4,5}$/ in JavaScript. What's wrong with it?", "code"],
    ["PostgreSQL: table events(user_id bigint). Write a query for daily active users.", "code"],
    ["Schreib mir eine Funktion, die zwei Listen zusammenführt.", "code"],
    ["A shop sells notebooks for €2.40 each, or packs of 6 for €12.60. What is the cheapest way to buy 20?", "maths"],
    ["Ein Handwerker berechnet 45 € pro Stunde und arbeitet 3,5 Stunden. Was kostet das brutto?", "maths"],
    ["Who is the current President of the European Commission?", "current"],
    ["Was kostet das Deutschlandticket gerade im Monat?", "current"],
  ])("sends %s to Thinking (%s)", (text, reason) => {
    expect(autoDecision(ask(text))).toEqual({ mode: "thinking", reason });
  });

  it.each([
    ["My dad suddenly has slurred speech and his face droops. What do I do?", "simple"],
    ["My 2-year-old swallowed a button battery, why is that dangerous?", "urgent"],
    ["Rewrite this so it sounds polite: I want the invoice today.", "rewrite"],
    ["Übersetze ins Englische: Das Meeting heute fällt aus, warum auch immer.", "rewrite"],
    ["Summarise the following annual report for 2026 in 200 words.", "rewrite"],
    ["What is the latest stable release of Python?", "current"],
  ])("keeps %s off the slow path unless needed (%s)", (text, reason) => {
    const decision = autoDecision(ask(text));
    expect(decision.reason).toBe(reason);
    if (reason !== "current") expect(decision.mode).toBe("fast");
  });

  it("answers a time-sensitive question with web results on Fast, and long documents on Fast", () => {
    const searched = ask("Who is the current President of the European Commission?");
    searched.attachments.push({
      id: "w",
      name: "web",
      selected: true,
      sources: [{ id: "w1", title: "web", text: "result", url: "https://example.org/" }],
    } as never);
    expect(autoDecision(searched)).toEqual({ mode: "fast", reason: "simple" });
    expect(autoMode(ask("Summarise the attached file.", 9000))).toBe("fast");
    expect(autoMode(ask("Please summarise. ".repeat(80)))).toBe("fast");
  });
});

const failure = (code: StreamFailureCode, textCharacters = 0) =>
  new IncompleteReplyError("synthetic", undefined, {
    code,
    events: 0,
    usageEvents: 0,
    textCharacters,
    finish: "NONE",
  });

const FULL = REPLY_LIMITS.thinking.totalMs;

describe("reply time limits per mode", () => {
  it("gives Thinking a longer first-text and total limit than Fast; no mode keeps the earlier timing", () => {
    expect(replyLimits("thinking").firstTextMs).toBeGreaterThan(replyLimits("fast").firstTextMs);
    expect(replyLimits("thinking").totalMs).toBeGreaterThan(replyLimits("fast").totalMs);
    expect(replyLimits().firstTextMs).toBe(90_000);
    // A first-text time-out, after up to 10 s of setup, still leaves the backup its own first-text time.
    for (const limits of Object.values(REPLY_LIMITS))
      expect(limits.totalMs - limits.firstTextMs - 10_000).toBeGreaterThanOrEqual(limits.firstTextMs);
  });

  it("states the mode's limit in the waiting status", () => {
    const minutes = Math.ceil(REPLY_LIMITS.thinking.totalMs / 60_000);
    expect(stillThinkingStatus("thinking")).toBe(
      `Still thinking… (this can take up to ${minutes} minutes in Thinking mode)`,
    );
    expect(stillThinkingStatus(undefined)).not.toContain("mode)");
  });
});

describe("one retry on the backup model", () => {
  it("does not start a retry that could not finish in the time left", () => {
    const timedOut = failure("TIMED_OUT");
    for (const mode of ["fast", "thinking"] as const) {
      const { firstTextMs } = replyLimits(mode);
      expect(shouldRetryOnBackup(timedOut, false, false, firstTextMs - 1, mode)).toBe(false);
      expect(shouldRetryOnBackup(timedOut, false, false, firstTextMs, mode)).toBe(true);
    }
    // Primary ran into the total limit: nothing is left, so the time-out is reported as is.
    expect(shouldRetryOnBackup(timedOut, false, false, 0, "thinking")).toBe(false);
  });

  it.each(["HTTP_UPSTREAM_REJECTED", "HTTP_SERVICE_UNAVAILABLE", "TIMED_OUT"] as const)(
    "retries %s before any answer text",
    (code) => {
      expect(shouldRetryOnBackup(failure(code), false, false, FULL, "thinking")).toBe(true);
    },
  );

  it("retries a timeout before the response started", () => {
    expect(
      shouldRetryOnBackup(new DOMException("Operation timed out.", "TimeoutError"), false, false, FULL, "thinking"),
    ).toBe(true);
  });

  it("never retries after partial text, a stop, the relay's own limits or a broken answer", () => {
    expect(shouldRetryOnBackup(failure("HTTP_UPSTREAM_REJECTED"), false, true, FULL, "thinking")).toBe(false);
    expect(shouldRetryOnBackup(failure("TIMED_OUT", 12), false, false, FULL, "thinking")).toBe(false);
    expect(shouldRetryOnBackup(failure("HTTP_UPSTREAM_REJECTED"), true, false, FULL, "thinking")).toBe(false);
    for (const code of [
      "HTTP_RATE_LIMITED",
      "HTTP_RESPONSE_INVALID",
      "OUTPUT_LIMIT_REACHED",
      "INCOMPLETE_ANSWER",
      "ABORTED",
      "TRANSPORT_OR_DECRYPTION",
    ] as const)
      expect(shouldRetryOnBackup(failure(code), false, false, FULL, "thinking"), code).toBe(false);
    expect(shouldRetryOnBackup(Error("The checked server does not match"), false, false, FULL, "thinking")).toBe(false);
  });
});

it("labels replies by mode name only", () => {
  expect(answerLabel("auto", "thinking", false)).toBe("Auto · Thinking");
  expect(answerLabel("fast", "fast", true)).toBe("Fast · Answered by the backup model");
  expect(answerLabel("auto", undefined, true)).toBe("Answered by the backup model");
  expect(answerLabel("auto", undefined, false)).toBeUndefined();
});
