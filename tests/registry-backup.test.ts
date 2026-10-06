import { expect, it } from "vitest";
import {
  mkdtemp,
  mkdir,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import { join, resolve, dirname } from "node:path";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { DatabaseSync } from "node:sqlite";
import { execFileSync } from "node:child_process";
import { InviteRegistry } from "../server/invite-registry";
import {
  backupRegistry,
  stageRegistryRecovery,
} from "../server/registry-backup";

const createdRoots = new Set<string>();
function outsideGit(path: string) {
  for (let current = resolve(path); ; current = dirname(current)) {
    if (existsSync(join(current, ".git"))) return false;
    if (dirname(current) === current) return true;
  }
}
async function temporary() {
  // Some developers keep a dotfiles Git repository at home, including OS Temp.
  const parent = [tmpdir(), dirname(process.cwd())].find(outsideGit);
  if (!parent)
    throw Error(
      "A temporary directory outside Git is needed for backup tests.",
    );
  const root = await mkdtemp(join(parent, "privateai-backup-test-"));
  createdRoots.add(resolve(root));
  return root;
}
async function cleanup(root: string) {
  if (!createdRoots.has(resolve(root))) throw Error("Unsafe test cleanup");
  await rm(root, { recursive: true, force: true });
  createdRoots.delete(resolve(root));
}

it("backs up committed WAL state and stages recovery paused without overwriting or rolling back the live registry", async () => {
  const root = await temporary(),
    source = join(root, "live.sqlite"),
    output = join(root, "private-backups");
  await mkdir(output);
  const setup = new DatabaseSync(source);
  setup.exec("PRAGMA journal_mode=WAL");
  setup.close();
  const live = new InviteRegistry(source);
  const password = "SYNTHETIC backup password";
  try {
    const alice = live.issue(Date.now() + 600000),
      bob = live.issue(Date.now() + 600000);
    expect(
      await live.register(alice.id, alice.token, "SYNTHETIC initial password"),
    ).toBe(true);
    expect(
      await live.changePassword(
        alice.id,
        0,
        "SYNTHETIC initial password",
        password,
      ),
    ).toBe(true);
    for (let i = 0; i < 7; i++) expect(live.allowRequest(alice.id)).toBe(true);
    live.revoke(bob.id);
    const snapshot = await backupRegistry(source, output);
    const file = join(snapshot.directory, "invites.sqlite");
    const initial = await readFile(file);
    const copied = new InviteRegistry(file);
    try {
      expect(await copied.login(alice.id, password)).toBe(true);
      expect(await copied.login(alice.id, "SYNTHETIC initial password")).toBe(
        false,
      );
      expect(copied.credentialVersion(alice.id)).toBe(1);
      expect(copied.active(bob.id)).toBe(false);
      for (let i = 7; i < 200; i++)
        expect(copied.allowRequest(alice.id)).toBe(true);
      expect(copied.allowRequest(alice.id)).toBe(false);
    } finally {
      copied.close();
    }
    // Use another untouched snapshot to demonstrate post-backup revocation rollback safely.
    const beforeRevocation = await backupRegistry(source, output);
    live.revoke(alice.id);
    const currentRows = live.list();
    const recovery = await stageRegistryRecovery(
      join(beforeRevocation.directory, "invites.sqlite"),
      output,
    );
    expect(recovery.paused).toBe(true);
    expect(recovery.operatorReconciliationRequired).toBe(true);
    const staged = new InviteRegistry(
      join(recovery.directory, "invites.sqlite"),
    );
    try {
      expect(staged.paused).toBe(true);
      expect(staged.active(alice.id)).toBe(false);
      expect(await staged.login(alice.id, password)).toBe(false);
      expect(staged.allowRequest(alice.id)).toBe(false);
      expect(await staged.register(bob.id, bob.token, password)).toBe(false);
      expect(staged.list().find((r) => r.id === alice.id)?.status).toBe(
        "registered",
      );
      // Explicit operator reconciliation in the synthetic rehearsal precedes resumption.
      staged.revoke(alice.id);
      staged.pause(false);
      expect(await staged.login(alice.id, password)).toBe(false);
    } finally {
      staged.close();
    }
    expect(live.list()).toEqual(currentRows);
    expect(live.paused).toBe(false);
    expect(live.active(alice.id)).toBe(false);
    const receipt = await readFile(
      join(recovery.directory, "receipt.json"),
      "utf8",
    );
    expect(receipt).not.toContain(password);
    expect(receipt).not.toContain(alice.token);
    expect(receipt).not.toContain(alice.id);
    expect(initial.length).toBeGreaterThan(0);
    expect(
      new Set([
        snapshot.directory,
        beforeRevocation.directory,
        recovery.directory,
      ]).size,
    ).toBe(3);
  } finally {
    live.close();
    await cleanup(root);
  }
});

it("refuses missing/corrupt sources and Git destinations without creating a misleading completed backup", async () => {
  const root = await temporary(),
    source = join(root, "source.sqlite"),
    output = join(root, "output");
  await mkdir(output);
  try {
    await expect(backupRegistry(source, output)).rejects.toThrow(
      "snapshot failed",
    );
    await writeFile(source, "SYNTHETIC CORRUPT DATABASE");
    const before = await readFile(source);
    await expect(backupRegistry(source, output)).rejects.toThrow(
      "snapshot failed",
    );
    expect(await readFile(source)).toEqual(before);
    expect(await readdir(output)).toEqual([]);
    const valid = join(root, "valid.sqlite");
    const registry = new InviteRegistry(valid);
    registry.close();
    const incomplete = new DatabaseSync(valid);
    incomplete.exec("DELETE FROM access_settings");
    incomplete.close();
    const incompleteBefore = await readFile(valid);
    await expect(backupRegistry(valid, output)).rejects.toThrow(
      "SOURCE_VALIDATION",
    );
    await expect(stageRegistryRecovery(valid, output)).rejects.toThrow(
      "SOURCE_VALIDATION",
    );
    expect(await readFile(valid)).toEqual(incompleteBefore);
    expect(await readdir(output)).toEqual([]);
    await mkdir(join(output, ".git"));
    await expect(backupRegistry(valid, output)).rejects.toThrow(
      "snapshot failed",
    );
    expect(await readdir(output)).toEqual([".git"]);
    await expect(stageRegistryRecovery(valid, "relative-path")).rejects.toThrow(
      "snapshot failed",
    );
  } finally {
    await cleanup(root);
  }
});

it("packaged operator commands emit only metadata and stage a paused copy", async () => {
  const root = await temporary(),
    source = join(root, "source.sqlite"),
    output = join(root, "output");
  await mkdir(output);
  const registry = new InviteRegistry(source);
  const invitation = registry.issue(Date.now() + 600000);
  registry.close();
  try {
    const run = (action: string, file: string) =>
      execFileSync(
        process.execPath,
        ["--import", "tsx", "scripts/invites.ts", action, output],
        {
          encoding: "utf8",
          env: { ...process.env, PRIVATEAI_INVITES_FILE: file },
        },
      );
    const raw = run("backup", source);
    expect(raw).not.toContain(invitation.token);
    expect(raw).not.toContain(invitation.id);
    const snapshot = JSON.parse(raw),
      recovery = JSON.parse(
        run("stage-recovery", join(snapshot.directory, "invites.sqlite")),
      );
    expect(recovery.kind).toBe("PAUSED_RECOVERY_COPY");
    expect(recovery.paused).toBe(true);
    const staged = new InviteRegistry(
      join(recovery.directory, "invites.sqlite"),
    );
    try {
      expect(staged.active(invitation.id)).toBe(false);
    } finally {
      staged.close();
    }
  } finally {
    await cleanup(root);
  }
});
