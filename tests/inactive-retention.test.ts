import { expect, it } from "vitest";
import { DatabaseSync } from "node:sqlite";
import { mkdtempSync, unlinkSync, rmdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { InviteRegistry } from "../server/invite-registry";
import {
  prepareRetentionSchema,
  revokeWithRetention,
  setRetentionHold,
  purgeEligibleAccounts,
} from "../server/inactive-retention";

it("inactive retention respects exact seven-day boundaries, holds, unknown revocation age and paused access", () => {
  const root = mkdtempSync(join(tmpdir(), "privateai-inactive-retention-")),
    path = join(root, "registry.sqlite"),
    now = Date.now(),
    week = 7 * 86400000;
  const registry = new InviteRegistry(path, () => now);
  const ids = Array.from(
    { length: 6 },
    () => registry.issue(now + 20 * 86400000).id,
  );
  registry.revoke(ids[4]);
  registry.close();
  const db = new DatabaseSync(path);
  try {
    expect(
      db
        .prepare(
          "SELECT name FROM sqlite_master WHERE name='account_retention'",
        )
        .get(),
    ).toBeUndefined();
    prepareRetentionSchema(db);
    db.prepare("UPDATE invites SET expires=? WHERE id=?").run(
      now - week,
      ids[0],
    );
    db.prepare("UPDATE invites SET expires=? WHERE id=?").run(
      now - week + 1,
      ids[1],
    );
    expect(revokeWithRetention(db, ids[2], now - week)).toBe(true);
    expect(revokeWithRetention(db, ids[2], now)).toBe(false);
    expect(revokeWithRetention(db, ids[3], now - week)).toBe(true);
    expect(setRetentionHold(db, ids[3], now + 1000, now)).toBe(true);
    expect(revokeWithRetention(db, ids[4], now - week)).toBe(false);
    expect(() => purgeEligibleAccounts(db, now)).toThrow("paused");
    expect(db.prepare("SELECT count(*) AS n FROM invites").get()?.n).toBe(6);
    db.exec("UPDATE access_settings SET paused=1");
    expect(purgeEligibleAccounts(db, now).deletedRows).toBe(2);
    expect(
      db.prepare("SELECT id FROM invites WHERE id=?").get(ids[4]),
    ).toBeDefined();
    expect(
      db.prepare("SELECT id FROM invites WHERE id=?").get(ids[5]),
    ).toBeDefined();
    expect(purgeEligibleAccounts(db, now + 1000).deletedRows).toBe(2);
    expect(
      db.prepare("SELECT count(*) AS n FROM account_retention").get()?.n,
    ).toBe(0);
    expect(() => setRetentionHold(db, ids[5], now - 1, now)).toThrow();
  } finally {
    db.close();
    unlinkSync(path);
    rmdirSync(root);
  }
});
