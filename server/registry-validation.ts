import type { DatabaseSync } from "node:sqlite";

/** Read-only validation: runtime startup must not repair missing security state. */
export function validateInviteRegistry(db: DatabaseSync) {
  db.prepare(
    "SELECT id,invite,expires,revoked,salt,password,window,requests,credential_version FROM invites LIMIT 0",
  ).all();
  const settings = db.prepare("SELECT id,paused FROM access_settings").all();
  if (
    settings.length !== 1 ||
    settings[0].id !== 1 ||
    (settings[0].paused !== 0 && settings[0].paused !== 1)
  )
    throw Error("Invalid registry security state");
  const invalid = db
    .prepare(
      `SELECT 1 FROM invites WHERE
    typeof(id) != 'text' OR length(id) NOT BETWEEN 1 AND 100 OR
    typeof(expires) != 'integer' OR expires NOT BETWEEN 1 AND 9007199254740991 OR
    typeof(revoked) != 'integer' OR revoked NOT IN (0,1) OR
    typeof(window) != 'integer' OR window NOT BETWEEN 0 AND 9007199254740991 OR
    typeof(requests) != 'integer' OR requests NOT BETWEEN 0 AND 9007199254740991 OR
    typeof(credential_version) != 'integer' OR credential_version NOT BETWEEN 0 AND 9007199254740991 OR
    (invite IS NOT NULL AND (typeof(invite) != 'text' OR length(invite) != 64 OR invite GLOB '*[^0-9a-f]*')) OR
    (revoked = 1 AND invite IS NOT NULL) OR
    NOT ((salt IS NULL AND password IS NULL AND credential_version = 0) OR
      (typeof(salt) = 'text' AND length(salt) = 32 AND salt NOT GLOB '*[^0-9a-f]*' AND
       typeof(password) = 'text' AND length(password) = 128 AND password NOT GLOB '*[^0-9a-f]*' AND invite IS NULL))
    LIMIT 1`,
    )
    .get();
  if (invalid) throw Error("Invalid registry account state");
  const check = db.prepare("PRAGMA quick_check").all();
  if (check.length !== 1 || check[0].quick_check !== "ok")
    throw Error("Invalid registry integrity");
}
