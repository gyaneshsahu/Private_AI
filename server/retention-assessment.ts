import { lstatSync } from "node:fs";
import { isAbsolute } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { validateInviteRegistry } from "./registry-validation";

/** Aggregate proposal only. No row identifiers, credentials, writes or deletion. */
export function assessRegistryRetention(path: string, now = Date.now()) {
  let db: DatabaseSync | undefined;
  try {
    if (!isAbsolute(path) || !Number.isSafeInteger(now) || now < 7 * 86400000)
      throw Error();
    const file = lstatSync(path);
    if (!file.isFile() || file.isSymbolicLink() || file.size > 16 * 1024 * 1024)
      throw Error();
    db = new DatabaseSync(path, { readOnly: true });
    validateInviteRegistry(db);
    const counts = db
      .prepare(
        `SELECT
      count(*) AS total,
      coalesce(sum(expires <= ?),0) AS expiredAtLeastSevenDays,
      coalesce(sum(expires > ? AND expires <= ?),0) AS expiredUnderSevenDays,
      coalesce(sum(expires > ? AND revoked = 1),0) AS revokedUnexpiredAgeUnknown,
      coalesce(sum(expires > ? AND revoked = 0),0) AS active
      FROM invites`,
      )
      .get(now - 7 * 86400000, now - 7 * 86400000, now, now, now)!;
    return {
      kind: "READ_ONLY_RETENTION_PROPOSAL",
      checkedAt: new Date(now).toISOString(),
      counts,
      policyApproved: false,
      deletedRows: 0,
      incidentHoldReviewRequired: true,
      limitation:
        "Revocation timestamps are not stored. Never infer revocation age from expiry, file time or backup time. Counts do not authorize deletion; physical erasure and backup expiry require separate verification.",
    };
  } catch {
    throw Error(
      "Retention assessment unavailable: use an existing valid local registry. Source was not intentionally modified.",
    );
  } finally {
    db?.close();
  }
}
