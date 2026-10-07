import { DatabaseSync, backup } from "node:sqlite";
import { existsSync, lstatSync } from "node:fs";
import { chmod, mkdtemp, realpath, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join } from "node:path";
import { validateInviteRegistry } from "./registry-validation";

async function snapshot(
  source: string,
  destinationRoot: string,
  recovery: boolean,
  revokeRestoredAccounts = false,
) {
  let db: DatabaseSync | undefined;
  let stage = "PATH_VALIDATION";
  try {
    if (!isAbsolute(source) || !isAbsolute(destinationRoot)) throw Error();
    const sourceStat = lstatSync(source),
      destinationStat = lstatSync(destinationRoot);
    if (
      !sourceStat.isFile() ||
      sourceStat.isSymbolicLink() ||
      !destinationStat.isDirectory() ||
      destinationStat.isSymbolicLink()
    )
      throw Error();
    const root = await realpath(destinationRoot);
    for (let ancestor = root; ; ancestor = dirname(ancestor)) {
      if (existsSync(join(ancestor, ".git"))) throw Error();
      if (dirname(ancestor) === ancestor) break;
    }
    stage = "SOURCE_VALIDATION";
    db = new DatabaseSync(source, { readOnly: true });
    validateInviteRegistry(db);
    // The SQLite backup API includes committed WAL data without copying live sidecars.
    stage = "DESTINATION_CREATION";
    const directory = await mkdtemp(
      join(root, recovery ? "privateai-recovery-" : "privateai-backup-"),
    );
    await chmod(directory, 0o700);
    const database = join(directory, "invites.sqlite");
    stage = "SQLITE_BACKUP";
    await backup(db, database);
    stage = "COPY_VALIDATION";
    await chmod(database, 0o600);
    const copied = new DatabaseSync(database);
    let paused: boolean;
    try {
      validateInviteRegistry(copied);
      if (recovery)
        copied.exec(
          "BEGIN IMMEDIATE; UPDATE access_settings SET paused=1 WHERE id=1;" +
            (revokeRestoredAccounts
              ? " UPDATE invites SET revoked=1,invite=NULL;"
              : "") +
            " COMMIT;",
        );
      paused =
        copied.prepare("SELECT paused FROM access_settings WHERE id=1").get()!
          .paused === 1;
      if (recovery && !paused) throw Error("Recovery must remain paused");
      validateInviteRegistry(copied);
    } finally {
      copied.close();
    }
    const receipt = {
      kind: recovery ? "PAUSED_RECOVERY_COPY" : "SQLITE_CONSISTENT_BACKUP",
      createdAt: new Date().toISOString(),
      paused,
      operatorReconciliationRequired: recovery,
      ...(revokeRestoredAccounts ? { restoredAccountsRevoked: true } : {}),
    };
    stage = "RECEIPT";
    await writeFile(
      join(directory, "receipt.json"),
      JSON.stringify(receipt, null, 2),
      { flag: "wx", mode: 0o600, flush: true },
    );
    return { ...receipt, directory };
  } catch {
    throw new Error(
      `Registry snapshot failed (${stage}). Use an existing valid registry and a private absolute destination outside Git. Preserve incomplete output directories for operator inspection; only a directory with receipt.json is complete. No live registry was replaced.`,
    );
  } finally {
    db?.close();
  }
}

export const backupRegistry = (source: string, destinationRoot: string) =>
  snapshot(source, destinationRoot, false);
export const stageRegistryRecovery = (
  source: string,
  destinationRoot: string,
) => snapshot(source, destinationRoot, true);

// Use only when current credential/revocation state cannot be reconciled.
// The source stays untouched; every restored identity must be reissued separately.
export const stageRevokedRegistryRecovery = (
  source: string,
  destinationRoot: string,
) => snapshot(source, destinationRoot, true, true);
