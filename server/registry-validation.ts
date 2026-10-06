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
  const check = db.prepare("PRAGMA quick_check").all();
  if (check.length !== 1 || check[0].quick_check !== "ok")
    throw Error("Invalid registry integrity");
}
