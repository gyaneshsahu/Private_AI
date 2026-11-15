// Background results into the vault (src/background-results.ts): the masked document's values put
// back into the saved answer from the map kept in the vault (never sent), the map deleted with its
// task, and two tabs never saving one result twice. Offline: fake-indexeddb and the routes' fake.
import "fake-indexeddb/auto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { collectBackgroundResults } from "../src/background-results";
import { createMaskingSession } from "../src/identifier-masking";
import { addTask, holdTasks, newTask, removeTask, replaceTask } from "../src/scheduled";
import { scheduledText } from "../src/text/scheduled";
import { Vault } from "../src/vault";
import { createBackgroundTasksFake, fakeFetch } from "./fixtures/background-tasks-fake";

const vaults: Vault[] = [];
afterEach(() => {
  for (const v of vaults.splice(0)) v.close(false);
  vi.unstubAllGlobals();
  holdTasks([]);
});
const secret = "synthetic background results passphrase";
async function tab(account: string) {
  const v = new Vault();
  v.selectAccount(account);
  vaults.push(v);
  await v.unlock(secret);
  return v;
}
const EMAIL = "anna.example@example.org";
const PHONE = "+49 151 23456789";
const autoTask = () =>
  newTask({
    name: "Synthetic job search",
    instruction: "Find new job offers that fit my CV.",
    trigger: { every: 1, unit: "day", time: "08:00", timeZone: "Europe/Berlin" },
    mode: "auto",
    notify: { inApp: true, calendar: false },
    answerMode: "fast",
    useSearch: false,
  });
const collect = (v: Vault, problems: string[] = []) =>
  collectBackgroundResults(v, "SYNTHETIC", scheduledText.en, (iso) => iso, (line) => problems.push(line));

describe("background results", () => {
  it("put the masked values back from the map in the vault, which never leaves the device and goes with its task", async () => {
    const fake = createBackgroundTasksFake();
    vi.stubGlobal("fetch", fakeFetch(fake));
    const v = await tab(crypto.randomUUID());
    const session = createMaskingSession();
    const masked = session.mask(`Synthetic CV. Email ${EMAIL}, phone ${PHONE}.`);
    expect(masked).toBe("Synthetic CV. Email {{EMAIL-1}}, phone {{PHONE-1}}.");
    const task = autoTask();
    holdTasks(await v.writeTasks(addTask(task), { [task.id]: [...session.kept] }));
    fake.results.push({
      id: crypto.randomUUID(),
      taskId: task.id,
      ranAt: "2026-11-16T07:05:00.000Z",
      status: "done",
      text: "Two offers. Apply from {{ EMAIL-1 }} or call {{PHONE-1}}; {{EMAIL-9}} is unknown.",
    });
    expect(await collect(v)).toBe(1);
    const [saved] = await v.list();
    expect(saved.messages[1].text).toBe(`Two offers. Apply from ${EMAIL} or call ${PHONE}; {{EMAIL-9}} is unknown.`);
    expect(saved.messages[1].sourceSnapshot).toEqual([]);
    // Nothing of the map went to the server.
    expect(JSON.stringify(fake.requests)).not.toContain(EMAIL);
    expect(fake.results).toEqual([]);
    // A replaced document continues the map: old placeholders keep their values.
    const next = createMaskingSession((await v.readTaskMasks())[task.id]);
    expect(next.mask(`New CV: ${EMAIL}, other@example.org`)).toBe("New CV: {{EMAIL-1}}, {{EMAIL-2}}");
    // Switched to Manual, or deleted: the map goes with it.
    await v.writeTasks(replaceTask({ ...task, mode: "manual" }));
    expect(await v.readTaskMasks()).toEqual({});
    await v.writeTasks(replaceTask(task), { [task.id]: [...session.kept] });
    expect(Object.keys(await v.readTaskMasks())).toEqual([task.id]);
    await v.changePassphrase(secret, "a changed synthetic passphrase");
    await v.unlock("a changed synthetic passphrase");
    expect((await v.readTaskMasks())[task.id]).toHaveLength(2);
    await v.writeTasks(removeTask(task.id));
    expect(await v.readTaskMasks()).toEqual({});
  });

  it("are saved once when two tabs fetch them at the same time, with Web Locks and without", async () => {
    for (const locks of [true, false]) {
      const fake = createBackgroundTasksFake();
      vi.stubGlobal("fetch", fakeFetch(fake));
      if (!locks) vi.stubGlobal("navigator", {});
      const account = crypto.randomUUID();
      const first = await tab(account);
      const second = await tab(account);
      const task = autoTask();
      holdTasks(await first.writeTasks(addTask(task)));
      // The change locked the other tab, as every task change does: unlock it again.
      await vi.waitFor(() => expect(second.unlocked).toBe(false));
      await second.unlock(secret);
      const id = crypto.randomUUID();
      fake.results.push({ id, taskId: task.id, ranAt: "2026-11-16T07:05:00.000Z", status: "done", text: "Synthetic offers." });
      // Both tabs read the list before either saves (the race); only one conversation comes out.
      const settled = await Promise.allSettled([collect(first), collect(second)]);
      expect(settled.filter((r) => r.status === "fulfilled").map((r) => (r as PromiseFulfilledResult<number>).value).reduce((a, b) => a + b, 0)).toBe(1);
      const reader = await tab(account);
      expect((await reader.list()).filter((c) => c.id === id)).toHaveLength(1);
      expect(fake.results).toEqual([]);
      // A result saved before whose acknowledgement was lost: saved again by nobody, acknowledged.
      fake.results.push({ id, taskId: task.id, ranAt: "2026-11-16T07:05:00.000Z", status: "done", text: "Synthetic offers." });
      expect(await collect(reader)).toBe(0);
      expect(fake.results).toEqual([]);
      expect((await reader.list()).filter((c) => c.id === id)).toHaveLength(1);
      vi.unstubAllGlobals();
    }
  });
});
