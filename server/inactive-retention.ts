import type { DatabaseSync } from "node:sqlite";
import { validateInviteRegistry } from "./registry-validation";

const week = 7 * 86400000;
function timestamp(value: number) {
  if (!Number.isSafeInteger(value) || value < week)
    throw Error("Invalid retention time");
}
function transaction<T>(db: DatabaseSync, action: () => T): T {
  db.exec("BEGIN IMMEDIATE");
  try {
    const result = action();
    db.exec("COMMIT");
    return result;
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

// INACTIVE: no application, operator CLI or scheduled task imports this module.
// Activation requires a reviewed migration, revocation integration and founder approval.
export function prepareRetentionSchema(db: DatabaseSync) {
  validateInviteRegistry(db);
  db.exec(`CREATE TABLE IF NOT EXISTS account_retention (
    account_id TEXT PRIMARY KEY,
    revoked_at INTEGER CHECK(revoked_at IS NULL OR (typeof(revoked_at)='integer' AND revoked_at BETWEEN 0 AND 9007199254740991)),
    hold_until INTEGER CHECK(hold_until IS NULL OR (typeof(hold_until)='integer' AND hold_until BETWEEN 0 AND 9007199254740991))
  )`);
}

export function revokeWithRetention(db: DatabaseSync, id: string, now: number) {
  timestamp(now);
  return transaction(db, () => {
    const changed = db
      .prepare(
        "UPDATE invites SET revoked=1,invite=NULL WHERE id=? AND revoked=0",
      )
      .run(id).changes;
    if (changed)
      db.prepare(
        "INSERT INTO account_retention(account_id,revoked_at) VALUES(?,?) ON CONFLICT(account_id) DO UPDATE SET revoked_at=excluded.revoked_at",
      ).run(id, now);
    // Repeated revocation cannot restart the clock. Legacy revoked rows keep unknown age.
    return changed === 1;
  });
}

export function setRetentionHold(
  db: DatabaseSync,
  id: string,
  until: number,
  now: number,
) {
  timestamp(now);
  timestamp(until);
  if (until <= now) throw Error("Hold requires a future expiry");
  const changed = db
    .prepare(
      "INSERT INTO account_retention(account_id,hold_until) SELECT id,? FROM invites WHERE id=? ON CONFLICT(account_id) DO UPDATE SET hold_until=excluded.hold_until",
    )
    .run(until, id);
  return changed.changes === 1;
}

export function purgeEligibleAccounts(db: DatabaseSync, now: number) {
  timestamp(now);
  // Reduces SQLite page remnants; it is not a guarantee about WAL, disk or backup erasure.
  db.exec("PRAGMA secure_delete=ON");
  return transaction(db, () => {
    validateInviteRegistry(db);
    if (
      db.prepare("SELECT paused FROM access_settings WHERE id=1").get()
        ?.paused !== 1
    )
      throw Error("Retention purge requires paused access");
    const removed = db
      .prepare(
        `DELETE FROM invites WHERE
      (expires<=? OR (revoked=1 AND id IN (SELECT account_id FROM account_retention WHERE revoked_at<=?)))
      AND NOT EXISTS (SELECT 1 FROM account_retention r WHERE r.account_id=invites.id AND r.hold_until>?)`,
      )
      .run(now - week, now - week, now).changes;
    db.exec(
      "DELETE FROM account_retention WHERE account_id NOT IN (SELECT id FROM invites)",
    );
    return {
      deletedRows: Number(removed),
      backupExpiryDays: 7,
      physicalErasureVerified: false,
    };
  });
}
