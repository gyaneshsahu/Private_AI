import { describe, it, expect, afterEach } from "vitest";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { backupHealth, inspectBackupHealth } from "../scripts/backup-health";
const now = Date.parse("2026-10-08T12:00:00Z");
const valid = {
  outcome: "VERIFIED",
  lastAttempt: "2026-10-08T11:01:00Z",
  lastSuccess: "2026-10-08T11:00:00Z",
};
describe("content-free backup monitoring", () => {
  it("accepts a recent authenticated backup with independent custody", () =>
    expect(backupHealth(valid, true, now)).toEqual({
      healthy: true,
      reasons: [],
    }));
  it("alerts on failed attempts even with a recent successful archive", () =>
    expect(
      backupHealth({ ...valid, outcome: "FAILED" }, true, now).reasons,
    ).toContain("LAST_BACKUP_FAILED"));
  it("detects stale, missing and future-dated receipts", () => {
    expect(
      backupHealth({ ...valid, lastSuccess: "2026-10-07T12:00:00Z" }, true, now)
        .reasons,
    ).toContain("BACKUP_STALE");
    expect(backupHealth(null, true, now).healthy).toBe(false);
    expect(
      backupHealth({ ...valid, lastSuccess: "2026-10-09T12:00:00Z" }, true, now)
        .reasons,
    ).toContain("INVALID_RECEIPT_TIME");
  });
  it("does not expose untrusted receipt text and refuses unverified custody", () => {
    expect(
      JSON.stringify(backupHealth({ outcome: "PRIVATE_CANARY" }, false, now)),
    ).not.toContain("PRIVATE_CANARY");
    expect(backupHealth(valid, false, now).reasons).toContain(
      "RECOVERY_COPY_UNVERIFIED",
    );
    expect(
      backupHealth({ ...valid, outcome: "RETENTION_FAILED" }, true, now)
        .healthy,
    ).toBe(false);
  });
});

const directories: string[] = [];
afterEach(async () => {
  await Promise.all(
    directories.splice(0).map((p) => rm(p, { recursive: true, force: true })),
  );
});
async function archiveFixture() {
  const root = await mkdtemp(join(tmpdir(), "privateai-health-"));
  directories.push(root);
  const content = Buffer.from(
    "SYNTHETIC CIPHERTEXT FIXTURE, NOT AN AGE VERIFICATION",
  );
  const archive = {
    name: "registry-20261008T105900Z-" + "a".repeat(32) + ".age",
    bytes: content.length,
    sha256: createHash("sha256").update(content).digest("hex"),
    snapshotStartedAt: "2026-10-08T10:59:00Z",
  };
  const receipt = { ...valid, archive };
  await writeFile(
    join(root, "config.json"),
    JSON.stringify({ recoveryCopyVerified: true }),
  );
  await writeFile(join(root, "status.json"), JSON.stringify(receipt));
  await writeFile(join(root, archive.name), content);
  return { root, receipt, content };
}
describe("archive-bound operational health", () => {
  it("detects deleted and same-size corrupted ciphertext despite a successful receipt", async () => {
    const { root, receipt, content } = await archiveFixture();
    expect(await inspectBackupHealth(root, now)).toEqual({
      healthy: true,
      reasons: [],
    });
    content[0] ^= 1;
    await writeFile(join(root, receipt.archive.name), content);
    expect((await inspectBackupHealth(root, now)).reasons).toContain(
      "ARCHIVE_MISSING_OR_CHANGED",
    );
    await rm(join(root, receipt.archive.name));
    expect((await inspectBackupHealth(root, now)).healthy).toBe(false);
  });
  it("rejects legacy, traversal, partial and oversized bindings without echoing content", async () => {
    const { root, receipt } = await archiveFixture();
    for (const archive of [
      undefined,
      { ...receipt.archive, name: "../PRIVATE_CANARY.age" },
      { ...receipt.archive, name: receipt.archive.name + ".partial" },
      { ...receipt.archive, bytes: 16777217 },
    ]) {
      await writeFile(
        join(root, "status.json"),
        JSON.stringify({ ...receipt, archive }),
      );
      const health = await inspectBackupHealth(root, now);
      expect(health.reasons).toContain("ARCHIVE_BINDING_MISSING_OR_INVALID");
      expect(JSON.stringify(health)).not.toContain("PRIVATE_CANARY");
    }
  });
  it("measures recovery point age from snapshot start and rejects inconsistent times", async () => {
    const { root, receipt } = await archiveFixture();
    for (const [snapshotStartedAt, code] of [
      ["2026-10-07T12:00:00Z", "SNAPSHOT_STALE"],
      ["2026-10-08T11:00:30Z", "INVALID_SNAPSHOT_TIME"],
    ]) {
      await writeFile(
        join(root, "status.json"),
        JSON.stringify({
          ...receipt,
          archive: { ...receipt.archive, snapshotStartedAt },
        }),
      );
      expect((await inspectBackupHealth(root, now)).reasons).toContain(code);
    }
  });
  it("retains last-failure and custody alerts even when the ciphertext matches", async () => {
    const { root, receipt } = await archiveFixture();
    await writeFile(
      join(root, "status.json"),
      JSON.stringify({ ...receipt, outcome: "FAILED" }),
    );
    await writeFile(
      join(root, "config.json"),
      JSON.stringify({ recoveryCopyVerified: false }),
    );
    expect((await inspectBackupHealth(root, now)).reasons).toEqual([
      "LAST_BACKUP_FAILED",
      "RECOVERY_COPY_UNVERIFIED",
    ]);
  });
});
