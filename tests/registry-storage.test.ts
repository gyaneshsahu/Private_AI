import { expect, it } from "vitest";
import {
  mkdtempSync,
  readFileSync,
  writeFileSync,
  existsSync,
  unlinkSync,
  rmdirSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { DatabaseSync } from "node:sqlite";
import { spawnSync } from "node:child_process";
import { openInviteRegistry } from "../server/registry-storage";

it("rejects damaged account credentials and counters without repairing or leaking the source", () => {
  const directory = mkdtempSync(join(tmpdir(), "privateai-damaged-rows-"));
  const file = join(directory, "registry.sqlite");
  const corruptions = [
    "UPDATE invites SET requests=-1",
    "UPDATE invites SET window=-1",
    "UPDATE invites SET expires=1.5",
    "UPDATE invites SET revoked=2",
    "UPDATE invites SET credential_version=-1",
    "UPDATE invites SET salt='PRIVATE_CANARY',password='broken'",
    "UPDATE invites SET invite='invalid hash'",
    "UPDATE invites SET revoked=1",
    "UPDATE invites SET credential_version=1",
  ];
  try {
    for (const sql of corruptions) {
      const registry = openInviteRegistry(file, false);
      registry.issue(Date.now() + 600000);
      registry.close();
      const db = new DatabaseSync(file);
      db.exec(sql);
      db.close();
      const before = readFileSync(file);
      expect(() => openInviteRegistry(file, true)).toThrow(
        "Hosted invitation storage",
      );
      expect(readFileSync(file)).toEqual(before);
      unlinkSync(file);
    }
    const registry = openInviteRegistry(file, false);
    registry.issue(Date.now() + 600000);
    registry.close();
    const db = new DatabaseSync(file);
    db.exec("UPDATE invites SET salt='PRIVATE_CANARY',password='broken'");
    db.close();
    const before = readFileSync(file);
    const env = {
      ...process.env,
      PORT: "4198",
      PRIVATEAI_ORIGIN: "https://privateai.example",
      PRIVATEAI_INVITES_FILE: file,
      PRIVATEAI_QUALIFICATION_FILE: join(directory, "absent.json"),
    };
    for (const key of [
      "TINFOIL_API_KEY",
      "BRAVE_SEARCH_API_KEY",
      "PRIVATEAI_ACCESS_KEY",
    ])
      delete env[key as keyof typeof env];
    const run = spawnSync(
      process.execPath,
      ["--import", "tsx", "server/index.ts"],
      { env, encoding: "utf8", timeout: 10000, windowsHide: true },
    );
    expect(run.error).toBeUndefined();
    expect(run.status).not.toBe(0);
    expect(run.stdout).not.toContain("listening on port");
    expect(run.stderr).toContain("Hosted invitation storage");
    expect(run.stderr).not.toContain("PRIVATE_CANARY");
    expect(readFileSync(file)).toEqual(before);
  } finally {
    if (existsSync(file)) unlinkSync(file);
    rmdirSync(directory);
  }
});

it("rejects missing or malformed pause metadata and missing credential versions without repairing the source", () => {
  const directory = mkdtempSync(join(tmpdir(), "privateai-storage-state-"));
  const corruptions = [
    "DROP TABLE access_settings",
    "DELETE FROM access_settings",
    "UPDATE access_settings SET paused=2",
    "ALTER TABLE invites DROP COLUMN credential_version",
    "DROP TABLE access_settings; CREATE TABLE access_settings(id INTEGER,paused INTEGER); INSERT INTO access_settings VALUES(1,0),(2,1)",
  ];
  try {
    for (const [index, sql] of corruptions.entries()) {
      const file = join(directory, `registry-${index}.sqlite`);
      const registry = openInviteRegistry(file, false);
      registry.pause(true);
      registry.close();
      const writer = new DatabaseSync(file);
      writer.exec(sql);
      writer.close();
      const before = readFileSync(file);
      expect(() => openInviteRegistry(file, true)).toThrow(
        "Hosted invitation storage",
      );
      expect(readFileSync(file)).toEqual(before);
      unlinkSync(file);
    }
  } finally {
    for (let index = 0; index < corruptions.length; index++) {
      const file = join(directory, `registry-${index}.sqlite`);
      if (existsSync(file)) unlinkSync(file);
    }
    rmdirSync(directory);
  }
});

it("refuses absent, relative, empty and unrelated hosted databases without initializing them", () => {
  const directory = mkdtempSync(join(tmpdir(), "privateai-storage-"));
  const file = join(directory, "registry.sqlite");
  try {
    expect(() => openInviteRegistry("relative.sqlite", true)).toThrow(
      "Hosted invitation storage",
    );
    expect(() => openInviteRegistry(file, true)).toThrow(
      "Hosted invitation storage",
    );
    expect(existsSync(file)).toBe(false);
    expect(() => openInviteRegistry(directory, true)).toThrow(
      "Hosted invitation storage",
    );
    writeFileSync(file, "");
    expect(() => openInviteRegistry(file, true)).toThrow(
      "Hosted invitation storage",
    );
    expect(readFileSync(file).length).toBe(0);
    const unrelated = new DatabaseSync(file);
    unrelated.exec("CREATE TABLE unrelated(value TEXT)");
    unrelated.close();
    const before = readFileSync(file);
    expect(() => openInviteRegistry(file, true)).toThrow(
      "Hosted invitation storage",
    );
    expect(readFileSync(file)).toEqual(before);
    writeFileSync(file, "corrupt synthetic registry");
    expect(() => openInviteRegistry(file, true)).toThrow(
      "Hosted invitation storage",
    );
    expect(readFileSync(file, "utf8")).toBe("corrupt synthetic registry");
  } finally {
    if (existsSync(file)) unlinkSync(file);
    rmdirSync(directory);
  }
});

it("reopens initialized storage preserving identity, credentials, revocation and request limits", async () => {
  const directory = mkdtempSync(join(tmpdir(), "privateai-storage-"));
  const file = join(directory, "registry.sqlite");
  let registry = openInviteRegistry(file, false);
  try {
    const alice = registry.issue(Date.now() + 600000),
      bob = registry.issue(Date.now() + 600000);
    await registry.register(alice.id, alice.token, "synthetic old password");
    await registry.changePassword(
      alice.id,
      0,
      "synthetic old password",
      "synthetic new password",
    );
    registry.revoke(bob.id);
    for (let i = 0; i < 200; i++) registry.allowRequest(alice.id);
    registry.close();
    registry = openInviteRegistry(file, true);
    expect(await registry.login(alice.id, "synthetic new password")).toBe(true);
    expect(await registry.login(alice.id, "synthetic old password")).toBe(
      false,
    );
    expect(registry.credentialVersion(alice.id)).toBe(1);
    expect(registry.active(bob.id)).toBe(false);
    expect(registry.allowRequest(alice.id)).toBe(false);
    registry.pause(true);
    registry.close();
    registry = openInviteRegistry(file, true);
    expect(registry.paused).toBe(true);
    expect(await registry.login(alice.id, "synthetic new password")).toBe(
      false,
    );
  } finally {
    registry.close();
    unlinkSync(file);
    rmdirSync(directory);
  }
});
