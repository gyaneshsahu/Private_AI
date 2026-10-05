import { lstatSync } from "node:fs";
import { isAbsolute } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { InviteRegistry } from "./invite-registry";

export function openInviteRegistry(path: string, hosted: boolean) {
  if (!hosted) return new InviteRegistry(path);
  let probe: DatabaseSync | undefined;
  try {
    if (!isAbsolute(path)) throw Error();
    const file = lstatSync(path);
    if (!file.isFile() || file.isSymbolicLink()) throw Error();
    // Read-only validation prevents a missing mount from silently becoming a new registry.
    probe = new DatabaseSync(path, { readOnly: true });
    probe
      .prepare(
        "SELECT id,invite,expires,revoked,salt,password,window,requests FROM invites LIMIT 0",
      )
      .all();
    const check = probe.prepare("PRAGMA quick_check").all();
    if (check.length !== 1 || check[0].quick_check !== "ok") throw Error();
    probe.close();
    probe = undefined;
    return new InviteRegistry(path);
  } catch {
    throw new Error(
      "Hosted invitation storage is unavailable or uninitialized. Check the persistent mount and initialize the registry through the operator CLI before enabling individual access.",
    );
  } finally {
    probe?.close();
  }
}
