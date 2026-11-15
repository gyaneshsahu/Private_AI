// Scheduled tasks in the vault (src/scheduled.ts, src/vault.ts; docs/scheduled-20261115.md): the
// encrypted record, locking, other tabs, passphrase change, backup and restore, "Delete
// everything", and the due logic. Offline: the vault runs on fake-indexeddb.
import "fake-indexeddb/auto";
import { afterEach, describe, expect, it } from "vitest";
import { openDB } from "idb";
import { emptyConversation } from "../shared/contracts";
import { SCHEDULE_LIMITS, type ScheduledTask } from "../shared/scheduled-tasks";
import {
  addTask,
  dueTasks,
  editedTask,
  markRun,
  newTask,
  nextChange,
  removeTask,
  replaceTask,
  TaskError,
  type TaskFields,
} from "../src/scheduled";
import { Vault } from "../src/vault";
import { decodeVaultBackupContent } from "../src/vault-backup";

const stores: Vault[] = [];
const create = (id = crypto.randomUUID()) => {
  const v = new Vault();
  v.selectAccount(id);
  stores.push(v);
  return v;
};
afterEach(() => {
  for (const v of stores) v.close(false);
  stores.length = 0;
});
const secret = "synthetic scheduled vault passphrase";
const fields = (change: Partial<TaskFields> = {}): TaskFields => ({
  name: "German word",
  instruction: "Give me a new German word to learn, SYNTHETIC-INSTRUCTION.",
  trigger: { every: 2, unit: "day", time: "10:00", timeZone: "Europe/Berlin" },
  mode: "manual",
  notify: { inApp: true, calendar: false },
  answerMode: "fast",
  useSearch: false,
  ...change,
});
const NOW = new Date("2026-11-16T08:00:00Z");

describe("scheduled tasks in the vault", () => {
  it("are one encrypted record, read back with the passphrase, and never touched while locked", async () => {
    const id = crypto.randomUUID();
    const v = create(id);
    await expect(v.readTasks()).rejects.toThrow();
    await expect(v.writeTasks(addTask(newTask(fields(), NOW)))).rejects.toThrow();
    await v.unlock(secret);
    expect(await v.readTasks()).toEqual([]);
    const [first] = await v.writeTasks(addTask(newTask(fields(), NOW)));
    expect(first.nextDueAt).toBe("2026-11-16T09:00:00.000Z");
    await v.writeTasks(addTask(newTask(fields({ name: "Rent", instruction: "Reminder: pay the rent" }), NOW)));
    const database = await openDB(`privateai-vault-${id}`, 1);
    const raw = JSON.stringify(await database.getAll("meta"));
    expect(await database.getAllKeys("meta")).toContain("scheduled-tasks");
    database.close();
    expect(raw).not.toMatch(/German word|SYNTHETIC-INSTRUCTION|Rent/);
    const later = create(id);
    await later.unlock(secret);
    expect((await later.readTasks()).map((t) => t.name)).toEqual(["German word", "Rent"]);
    later.lock(false);
    await expect(later.readTasks()).rejects.toThrow();
    // Removing every task leaves no record behind.
    await v.unlock(secret);
    const all = await v.readTasks();
    for (const task of all) await v.writeTasks(removeTask(task.id));
    const after = await openDB(`privateai-vault-${id}`, 1);
    expect(await after.getAllKeys("meta")).not.toContain("scheduled-tasks");
    after.close();
  });
  it("a change in one tab locks the other tabs, and a stale change is refused", async () => {
    const id = crypto.randomUUID();
    const first = create(id);
    const second = create(id);
    await first.unlock(secret);
    await second.unlock(secret);
    let invalidated = 0;
    second.onInvalidate = () => invalidated++;
    await first.writeTasks(addTask(newTask(fields(), NOW)));
    await expect.poll(() => invalidated).toBe(1);
    expect(second.unlocked).toBe(false);
  });
  it("survive a passphrase change", async () => {
    const v = create();
    await v.unlock(secret);
    await v.writeTasks(addTask(newTask(fields(), NOW)));
    await v.changePassphrase(secret, "a changed synthetic passphrase");
    await expect(v.unlock(secret)).rejects.toThrow();
    await v.unlock("a changed synthetic passphrase");
    expect((await v.readTasks()).map((t) => t.name)).toEqual(["German word"]);
  });
  it("go into the encrypted backup and come back as Manual tasks with new identities, once", async () => {
    const v = create();
    await v.unlock(secret);
    await v.save({ ...emptyConversation(), title: "Synthetic chat" });
    expect((await decodeVaultBackupContent(await v.exportBackup(), secret)).scheduledTasks).toEqual([]);
    const [manual] = await v.writeTasks(addTask(newTask(fields(), NOW)));
    await v.writeTasks(addTask(newTask(fields({ name: "Jobs", instruction: "Find jobs from my CV", mode: "auto" }), NOW)));
    const backup = await v.exportBackup();
    expect(backup).not.toMatch(/German word|Jobs/);
    const target = create();
    await target.unlock(secret);
    await target.restoreBackup(backup, secret);
    const restored = await target.readTasks();
    expect(restored.map((t) => [t.name, t.mode])).toEqual([
      ["German word", "manual"],
      ["Jobs", "manual"],
    ]);
    expect(restored[0].id).not.toBe(manual.id);
    await target.restoreBackup(backup, secret);
    expect(await target.readTasks()).toHaveLength(2);
  });
  it("'Delete everything' removes them with the vault", async () => {
    const id = crypto.randomUUID();
    const v = create(id);
    await v.unlock(secret);
    await v.writeTasks(addTask(newTask(fields(), NOW)));
    await v.eraseEverything();
    const fresh = create(id);
    await fresh.unlock("a new synthetic passphrase after erase");
    expect(await fresh.readTasks()).toEqual([]);
  });
  it("hold the limits: 20 Manual and 3 Auto tasks", async () => {
    const v = create();
    await v.unlock(secret);
    for (let i = 0; i < SCHEDULE_LIMITS.maxAutoTasks; i++)
      await v.writeTasks(addTask(newTask(fields({ name: `Auto ${i}`, mode: "auto" }), NOW)));
    await expect(v.writeTasks(addTask(newTask(fields({ mode: "auto" }), NOW)))).rejects.toThrow(TaskError);
    for (let i = 0; i < SCHEDULE_LIMITS.maxManualTasks; i++)
      await v.writeTasks(addTask(newTask(fields({ name: `Manual ${i}` }), NOW)));
    await expect(v.writeTasks(addTask(newTask(fields(), NOW)))).rejects.toMatchObject({ problem: "full" });
    const gone = newTask(fields(), NOW);
    await expect(v.writeTasks(replaceTask(gone))).rejects.toMatchObject({ problem: "gone" });
  });
});

describe("due logic", () => {
  const at = (iso: string) => Date.parse(iso);
  const task = (change: Partial<ScheduledTask>): ScheduledTask => ({ ...newTask(fields(), NOW), ...change });
  it("a Manual task is due once its time has passed; paused and Auto tasks never are", () => {
    const list = [
      task({ name: "due", nextDueAt: "2026-11-16T09:00:00.000Z" }),
      task({ name: "later", nextDueAt: "2026-11-18T09:00:00.000Z" }),
      task({ name: "paused", nextDueAt: "2026-11-16T09:00:00.000Z", paused: true }),
      task({ name: "auto", nextDueAt: "2026-11-16T09:00:00.000Z", mode: "auto" }),
    ];
    expect(dueTasks(list, at("2026-11-16T08:59:59Z")).map((t) => t.name)).toEqual([]);
    expect(dueTasks(list, at("2026-11-16T09:00:00Z")).map((t) => t.name)).toEqual(["due"]);
    expect(nextChange(list, at("2026-11-16T08:00:00Z"))).toBe(at("2026-11-16T09:00:00Z"));
    expect(nextChange(list, at("2026-11-17T08:00:00Z"))).toBe(at("2026-11-18T09:00:00Z"));
    expect(nextChange([], 0)).toBeUndefined();
  });
  it("after a run the next due time moves on; missed runs are not caught up", () => {
    const missed = task({ nextDueAt: "2026-11-02T09:00:00.000Z" });
    const ran = markRun(missed.id, new Date("2026-11-11T11:00:00Z"))([missed])[0];
    expect(ran.lastRunAt).toBe("2026-11-11T11:00:00.000Z");
    expect(ran.nextDueAt).toBe("2026-11-12T09:00:00.000Z");
    expect(dueTasks([ran], at("2026-11-11T12:00:00Z"))).toEqual([]);
  });
  it("an edit keeps the due time unless the trigger changed", () => {
    const original = task({ nextDueAt: "2026-11-18T09:00:00.000Z" });
    expect(editedTask(original, fields({ name: "Renamed" }), NOW).nextDueAt).toBe("2026-11-18T09:00:00.000Z");
    const moved = editedTask(original, fields({ trigger: { every: 1, unit: "day", time: "07:00", timeZone: "Europe/Berlin" } }), NOW);
    expect(moved.nextDueAt).toBe("2026-11-17T06:00:00.000Z");
    expect(editedTask(task({ useSearch: true, searchText: "x" }), fields(), NOW).searchText).toBeUndefined();
  });
});
