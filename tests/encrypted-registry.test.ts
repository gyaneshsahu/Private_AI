import { it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { existsSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { InviteRegistry } from "../server/invite-registry";
import {
  encryptRegistry,
  verifyEncryptedRegistry,
  restoreEncryptedRegistry,
} from "../server/encrypted-registry";

const binary = process.env.PRIVATEAI_TEST_AGE;
it.skipIf(!binary)(
  "encrypts a committed WAL snapshot in memory, rejects tampering and restores revoked paused access",
  async () => {
    const parent = [tmpdir(), dirname(process.cwd())].find((candidate) => {
      for (let p = resolve(candidate); ; p = dirname(p)) {
        if (existsSync(join(p, ".git"))) return false;
        if (dirname(p) === p) return true;
      }
    });
    if (!parent) throw Error("Temporary directory outside Git required");
    const root = await mkdtemp(join(parent, "privateai-age-test-"));
    const source = join(root, "source.sqlite"),
      destination = join(root, "restore");
    await mkdir(destination);
    const db = new DatabaseSync(source);
    db.exec("PRAGMA journal_mode=WAL");
    db.close();
    const registry = new InviteRegistry(source);
    const keygen = join(
      dirname(binary!),
      process.platform === "win32" ? "age-keygen.exe" : "age-keygen",
    );
    const generate = () =>
      execFileSync(keygen, [], {
        encoding: "utf8",
        stdio: ["pipe", "pipe", "pipe"],
      }).match(/AGE-SECRET-KEY-1[0-9A-Z]+/)![0];
    const identity = generate();
    const recipient = execFileSync(keygen, ["-y"], {
      input: identity + "\n",
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
    try {
      const invitation = registry.issue(Date.now() + 600000);
      expect(
        await registry.register(
          invitation.id,
          invitation.token,
          "SYNTHETIC backup password",
        ),
      ).toBe(true);
      expect(registry.allowRequest(invitation.id)).toBe(true);
      const cipher = await encryptRegistry(source, recipient, binary!);
      expect(cipher.includes(Buffer.from("SQLite format"))).toBe(false);
      expect(cipher.includes(Buffer.from(invitation.id))).toBe(false);
      const encrypted = join(root, "registry.age");
      await writeFile(encrypted, cipher);
      expect(
        await verifyEncryptedRegistry(encrypted, identity, binary!),
      ).toEqual({ verified: true, accounts: 1 });
      await expect(
        verifyEncryptedRegistry(encrypted, generate(), binary!),
      ).rejects.toThrow("authentication");
      const damaged = Buffer.from(cipher);
      damaged[damaged.length - 1] ^= 1;
      const corrupt = join(root, "damaged.age");
      await writeFile(corrupt, damaged);
      await expect(
        restoreEncryptedRegistry(corrupt, identity, binary!, destination),
      ).rejects.toThrow("authentication");
      const restored = await restoreEncryptedRegistry(
        encrypted,
        identity,
        binary!,
        destination,
      );
      expect(restored.paused).toBe(true);
      const copy = new InviteRegistry(
        join(restored.directory, "invites.sqlite"),
      );
      try {
        expect(copy.paused).toBe(true);
        expect(copy.list().every((row) => row.status === "revoked")).toBe(true);
        copy.pause(false);
        expect(
          await copy.login(invitation.id, "SYNTHETIC backup password"),
        ).toBe(false);
        expect(copy.allowRequest(invitation.id)).toBe(false);
      } finally {
        copy.close();
      }
      expect(
        await registry.login(invitation.id, "SYNTHETIC backup password"),
      ).toBe(true);
      expect(await readFile(encrypted)).toEqual(cipher);
      await expect(
        restoreEncryptedRegistry(encrypted, identity, binary!, process.cwd()),
      ).rejects.toThrow("outside Git");
    } finally {
      registry.close();
      if (
        dirname(resolve(root)) !== resolve(parent) ||
        !root.includes("privateai-age-test-")
      )
        throw Error("Unsafe cleanup");
      await rm(root, { recursive: true, force: true });
    }
  },
  30000,
);
