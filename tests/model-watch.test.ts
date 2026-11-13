// The daily Privatemode model check (server/model-watch.ts). Offline: the list is injected.
import { afterEach, expect, it, vi } from "vitest";
import { modelAlerts, runModelCheck, scheduleModelCheck, type ModelBaseline } from "../server/model-watch";
import { privatemodeReport } from "./fixtures/privatemode-report";

const glm = { id: "glm-5.3", object: "model", created: 1, context_window: 1048576, endpoints: ["/v1/chat/completions"] };
const flash = { id: "glm-5.3-flash", object: "model", created: 1, context_window: 262144 };
const baseline: ModelBaseline = {
  recordedAt: "2026-11-14T08:00:00.000Z",
  models: { "glm-5.3": glm, "glm-5.3-flash": flash },
};
const WATCHED = ["glm-5.3", "glm-5.3-flash"];
const alerts = (data: unknown[], recorded = baseline) => modelAlerts({ object: "list", data }, WATCHED, recorded);

afterEach(() => vi.useRealTimers());

it("says nothing when both models are listed and unchanged, whatever the key order or per-request fields", () => {
  expect(alerts([{ created: 999, endpoints: ["/v1/chat/completions"], context_window: 1048576, object: "model", id: "glm-5.3" }, flash, { id: "other" }])).toEqual([]);
});

it("alerts when a model disappears, is marked deprecated, or a listed property changes", () => {
  expect(alerts([glm])).toEqual([expect.stringMatching(/^glm-5\.3-flash is no longer in Privatemode's model list/)]);
  expect(alerts([{ ...glm, deprecated: true, deprecationDate: "2026-12-01" }, flash])).toEqual([
    "glm-5.3 is marked deprecated in Privatemode's model list (deprecated, deprecationDate).",
    expect.stringMatching(/^glm-5\.3 changed .*since the baseline of 2026-11-14T08:00:00.000Z \(deprecated, deprecationDate\)/),
  ]);
  expect(alerts([{ ...glm, deprecated: false }, flash])).toEqual([expect.stringMatching(/^glm-5\.3 changed .*\(deprecated\)/)]);
  expect(alerts([{ ...glm, context_window: 2 }, { ...flash, description: "Deprecated: use glm-6" }])).toEqual([
    expect.stringMatching(/^glm-5\.3 changed .*\(context_window\)/),
    expect.stringMatching(/^glm-5\.3-flash is marked deprecated .*\(description\)/),
    expect.stringMatching(/^glm-5\.3-flash changed .*\(description\)/),
  ]);
  // A property that was listed and is gone is a change too.
  const { endpoints: _gone, ...fewer } = glm;
  expect(alerts([fewer, flash])).toEqual([expect.stringMatching(/\(endpoints\)/)]);
});

it("an unrecorded baseline is reported, never treated as unchanged", () => {
  expect(alerts([glm, flash], { recordedAt: null, models: {} })).toEqual([
    expect.stringMatching(/^no baseline is recorded for glm-5\.3,/),
    expect.stringMatching(/^no baseline is recorded for glm-5\.3-flash,/),
  ]);
});

it("logs each finding under the alert prefix, and one plain line when nothing changed", async () => {
  const lines: string[] = [];
  await runModelCheck(async () => ({ data: [glm] }), WATCHED, () => baseline, (line) => lines.push(line));
  expect(lines).toEqual([expect.stringMatching(/^CometRow model alert: glm-5\.3-flash is no longer .*model-deprecation-runbook\.md\.$/)]);
  lines.length = 0;
  await runModelCheck(async () => ({ data: [glm, flash] }), WATCHED, () => baseline, (line) => lines.push(line));
  expect(lines).toEqual(["CometRow model check: glm-5.3, glm-5.3-flash listed and unchanged since the baseline of 2026-11-14T08:00:00.000Z."]);
});

it("a check that could not run is logged as an alert: refused, unreachable, unexpected shape or unreadable baseline", async () => {
  const failures: [() => Promise<unknown>, () => ModelBaseline, RegExp][] = [
    [async () => Promise.reject(Error("HTTP 401")), () => baseline, /check failed \(HTTP 401\)/],
    [async () => Promise.reject(new TypeError("fetch failed")), () => baseline, /check failed \(fetch failed\)/],
    [async () => ({ error: "encrypted?" }), () => baseline, /check failed \(unexpected model list shape\)/],
    [async () => ({ data: [glm, flash] }), () => { throw Error("ENOENT"); }, /check failed \(ENOENT\)/],
  ];
  for (const [fetchList, recorded, expected] of failures) {
    const lines: string[] = [];
    await runModelCheck(fetchList, WATCHED, recorded, (line) => lines.push(line));
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatch(/^CometRow model alert: the daily model list check failed/);
    expect(lines[0]).toMatch(expected);
    expect(lines[0]).toContain("The models were not checked.");
  }
});

it("runs at start and every 24 hours for the report's models, only for a Privatemode report", async () => {
  vi.useFakeTimers();
  const fetchList = vi.fn(async () => ({ data: [glm, flash] }));
  const lines: string[] = [];
  const stop = scheduleModelCheck(privatemodeReport(), "TEST_KEY_NOT_REAL", (line) => lines.push(line), fetchList, () => baseline);
  await vi.advanceTimersByTimeAsync(0);
  expect(fetchList).toHaveBeenCalledTimes(1);
  expect(lines).toEqual([expect.stringMatching(/^CometRow model check: glm-5\.3-flash, glm-5\.3 listed and unchanged/)]);
  await vi.advanceTimersByTimeAsync(86_400_000);
  expect(fetchList).toHaveBeenCalledTimes(2);
  stop();
  await vi.advanceTimersByTimeAsync(86_400_000);
  expect(fetchList).toHaveBeenCalledTimes(2);
  expect(lines.join()).not.toContain("TEST_KEY_NOT_REAL");

  scheduleModelCheck({ ...privatemodeReport(), provider: "tinfoil" }, "TEST_KEY_NOT_REAL", (line) => lines.push(line), fetchList, () => baseline)();
  expect(fetchList).toHaveBeenCalledTimes(2);
});
