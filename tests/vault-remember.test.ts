// "Remember this device" and the new-device check (docs/vault-sync-screens-20261115.md, Stage 0).
import "fake-indexeddb/auto";
import { afterEach, expect, it } from "vitest";
import { Vault } from "../src/vault";
import { emptyConversation } from "../shared/contracts";
import { BackupError, planBackupParts } from "../src/vault-backup";

const stores: Vault[] = [];
afterEach(() => {
  for (const v of stores.splice(0)) v.close(false);
});
function create(account = crypto.randomUUID()) {
  const v = new Vault();
  stores.push(v);
  v.selectAccount(account);
  return v;
}

it("a new device has no vault until the first unlock creates one", async () => {
  const v = create();
  expect(await v.exists()).toBe(false);
  await v.unlock("synthetic new device passphrase");
  expect(await v.exists()).toBe(true);
});

it("a remembered device opens without the passphrase, keeps it after a passphrase change, and forgets on request", async () => {
  const account = crypto.randomUUID();
  const v = create(account);
  await v.unlock("synthetic remember passphrase", true);
  await v.save({ ...emptyConversation(), title: "Synthetic remembered" });
  expect(await v.isRemembered()).toBe(true);
  v.lock(false);
  const other = create(account);
  expect(await other.unlockRemembered()).toBe(true);
  expect((await other.list()).map((c) => c.title)).toEqual(["Synthetic remembered"]);
  await other.changePassphrase("synthetic remember passphrase", "synthetic changed passphrase");
  expect(await other.unlockRemembered()).toBe(true);
  expect(await other.list()).toHaveLength(1);
  await other.rememberDevice(false);
  other.lock(false);
  expect(await other.unlockRemembered()).toBe(false);
  expect(other.unlocked).toBe(false);
});

it("unlocking without the choice leaves it; unlocking with it unticked forgets", async () => {
  const v = create();
  await v.unlock("synthetic remember passphrase", true);
  v.lock(false);
  await v.unlock("synthetic remember passphrase");
  expect(await v.isRemembered()).toBe(true);
  v.lock(false);
  await v.unlock("synthetic remember passphrase", false);
  expect(await v.isRemembered()).toBe(false);
});

it("erasing the device's data while locked removes the vault and the remembered key", async () => {
  const account = crypto.randomUUID();
  const v = create(account);
  await v.unlock("synthetic forgotten passphrase", true);
  v.lock(false);
  await v.eraseEverything();
  const fresh = create(account);
  expect(await fresh.exists()).toBe(false);
  expect(await fresh.unlockRemembered()).toBe(false);
});

it("plans backup parts by count and size, and names what does not fit", () => {
  const chat = (text: string) => ({ ...emptyConversation(), title: text });
  const shared = { projects: [], memories: [], scheduledTasks: [] };
  const many = Array.from({ length: 250 }, (_, i) => chat(`c${i}`));
  expect(planBackupParts(many, shared).map((p) => p.length)).toEqual([100, 100, 50]);
  expect(planBackupParts([], shared)).toEqual([[]]);
  const big = Array.from({ length: 3 }, () => chat("x".repeat(400)));
  expect(planBackupParts(big, shared, {}, 1000).map((p) => p.length)).toEqual([1, 1, 1]);
  expect(() => planBackupParts([chat("x".repeat(2000))], shared, {}, 1000)).toThrow(BackupError);
  let caught: unknown;
  try {
    planBackupParts([], shared, { [crypto.randomUUID()]: [] }, 50);
  } catch (error) {
    caught = error;
  }
  expect((caught as BackupError).code).toBe("filesTooLarge");
});
