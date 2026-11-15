// The Auto-mode client (src/background-tasks-client.ts) against the contract fake: every route,
// the CSRF header, refusals with their status, and replies of the wrong shape refused.
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ackBackgroundResult,
  BackgroundTasksError,
  createBackgroundTask,
  deleteBackgroundTask,
  listBackgroundResults,
  listBackgroundTasks,
  updateBackgroundTask,
} from "../src/background-tasks-client";
import { newTask } from "../src/scheduled";
import { createBackgroundTasksFake, FAKE_STATUS, fakeFetch } from "./fixtures/background-tasks-fake";

afterEach(() => vi.unstubAllGlobals());
const consent = { version: FAKE_STATUS.consentVersion, acceptedAt: "2026-11-15T10:00:00.000Z", sensitive: false };
const auto = (name = "Jobs") =>
  newTask({
    name,
    instruction: "Find new job offers for a nurse in Leipzig.",
    trigger: { every: 1, unit: "day", time: "08:00", timeZone: "Europe/Berlin" },
    mode: "auto",
    notify: { inApp: true, calendar: false },
    answerMode: "fast",
    useSearch: true,
    searchText: "Pflegefachkraft Stellen Leipzig",
  });

describe("background tasks client", () => {
  it("creates, lists, changes and deletes a background task with the CSRF header", async () => {
    const fake = createBackgroundTasksFake();
    vi.stubGlobal("fetch", fakeFetch(fake));
    const task = auto();
    const created = await createBackgroundTask("SYNTHETIC", task, consent);
    expect(created.id).toBe(task.id);
    expect(fake.consents).toEqual([consent]);
    expect((await listBackgroundTasks("SYNTHETIC")).tasks.map((t) => t.id)).toEqual([task.id]);
    expect((await updateBackgroundTask("SYNTHETIC", task.id, { paused: true })).paused).toBe(true);
    await deleteBackgroundTask("SYNTHETIC", task.id);
    expect(fake.tasks.size).toBe(0);
    expect(fake.requests.every((r) => r.csrf === "SYNTHETIC")).toBe(true);
    expect(fake.requests.map((r) => `${r.method} ${r.path}`)).toEqual([
      "POST /api/background-tasks",
      "GET /api/background-tasks",
      `PATCH /api/background-tasks/${task.id}`,
      `DELETE /api/background-tasks/${task.id}`,
    ]);
  });
  it("passes refusals on with their status: no consent (400), a fourth task (409)", async () => {
    const fake = createBackgroundTasksFake();
    vi.stubGlobal("fetch", fakeFetch(fake));
    await expect(createBackgroundTask("SYNTHETIC", auto(), { ...consent, version: "" })).rejects.toMatchObject({ status: 400 });
    for (const name of ["a", "b", "c"]) await createBackgroundTask("SYNTHETIC", auto(name), consent);
    const refused = await createBackgroundTask("SYNTHETIC", auto("d"), consent).catch((e) => e);
    expect(refused).toBeInstanceOf(BackgroundTasksError);
    expect(refused.status).toBe(409);
    expect(refused.message).toContain("3 background tasks");
  });
  it("sends one masked document with the extra consent, and removes it with null", async () => {
    const fake = createBackgroundTasksFake();
    vi.stubGlobal("fetch", fakeFetch(fake));
    const task = auto();
    await expect(createBackgroundTask("SYNTHETIC", task, consent, { text: "CV of {{EMAIL-1}}" })).rejects.toMatchObject({ status: 400 });
    await createBackgroundTask("SYNTHETIC", task, { ...consent, sensitive: true }, { text: "CV of {{EMAIL-1}}" });
    expect(fake.attachments.get(task.id)).toBe("CV of {{EMAIL-1}}");
    expect((fake.requests.at(-1)!.body as { attachment: unknown }).attachment).toEqual({ text: "CV of {{EMAIL-1}}" });
    await updateBackgroundTask("SYNTHETIC", task.id, { attachment: null });
    expect(fake.attachments.has(task.id)).toBe(false);
  });
  it("fetches results and acknowledges them, after which the server has none", async () => {
    const fake = createBackgroundTasksFake();
    vi.stubGlobal("fetch", fakeFetch(fake));
    fake.results.push({ id: "r1", taskId: "t1", ranAt: "2026-11-16T07:00:00.000Z", status: "done", text: "Three offers." });
    const [result] = await listBackgroundResults("SYNTHETIC");
    expect(result.text).toBe("Three offers.");
    await ackBackgroundResult("SYNTHETIC", result.id);
    expect(fake.acked).toEqual(["r1"]);
    expect(await listBackgroundResults("SYNTHETIC")).toEqual([]);
  });
  it("refuses a reply of the wrong shape", async () => {
    vi.stubGlobal("fetch", async () => new Response(JSON.stringify({ results: [{ id: 1 }] }), { status: 200 }));
    await expect(listBackgroundResults("SYNTHETIC")).rejects.toThrow();
    vi.stubGlobal("fetch", async () => new Response(JSON.stringify({ task: { name: "x" } }), { status: 200 }));
    await expect(updateBackgroundTask("SYNTHETIC", "x", { paused: true })).rejects.toThrow();
  });
});
