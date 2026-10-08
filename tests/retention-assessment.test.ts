import { expect, it } from "vitest";
import {
  mkdtempSync,
  readFileSync,
  unlinkSync,
  rmdirSync,
  existsSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { DatabaseSync } from "node:sqlite";
import { spawnSync } from "node:child_process";
import { InviteRegistry } from "../server/invite-registry";
import { assessRegistryRetention } from "../server/retention-assessment";

it("reports only aggregate age buckets, preserves the database, and refuses missing sources and apply mode", () => {
  const root = mkdtempSync(join(tmpdir(), "privateai-retention-")),
    path = join(root, "registry.sqlite"),
    now = Date.now();
  try {
    const registry = new InviteRegistry(path);
    const ids = Array.from(
      { length: 4 },
      () => registry.issue(now + 600000).id,
    );
    registry.revoke(ids[2]);
    registry.close();
    const db = new DatabaseSync(path);
    db.prepare("UPDATE invites SET expires=? WHERE id=?").run(
      now - 7 * 86400000,
      ids[0],
    );
    db.prepare("UPDATE invites SET expires=? WHERE id=?").run(now - 1, ids[1]);
    db.close();
    const before = readFileSync(path),
      report = assessRegistryRetention(path, now);
    expect(report.counts).toEqual({
      total: 4,
      expiredAtLeastSevenDays: 1,
      expiredUnderSevenDays: 1,
      revokedUnexpiredAgeUnknown: 1,
      active: 1,
    });
    expect(report.deletedRows).toBe(0);
    expect(report.policyApproved).toBe(false);
    expect(ids.every((id) => !JSON.stringify(report).includes(id))).toBe(true);
    expect(readFileSync(path)).toEqual(before);
    expect(() =>
      assessRegistryRetention(join(root, "missing.sqlite"), now),
    ).toThrow();
    expect(existsSync(join(root, "missing.sqlite"))).toBe(false);
    const cli = spawnSync(
      process.execPath,
      ["--import", "tsx", "scripts/retention-assessment.ts", "--apply"],
      {
        env: { ...process.env, PRIVATEAI_INVITES_FILE: path },
        encoding: "utf8",
        windowsHide: true,
      },
    );
    expect(cli.status).toBe(1);
    expect(cli.stdout).toBe("");
    expect(readFileSync(path)).toEqual(before);
  } finally {
    if (existsSync(path)) unlinkSync(path);
    rmdirSync(root);
  }
});
