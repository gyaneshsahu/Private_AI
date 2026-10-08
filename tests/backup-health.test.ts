import { describe, it, expect } from "vitest";
import { backupHealth } from "../scripts/backup-health";
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
