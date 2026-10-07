import {
  encryptRegistry,
  verifyEncryptedRegistry,
  restoreEncryptedRegistry,
} from "../server/encrypted-registry";

try {
  const [action, target] = process.argv.slice(2);
  const binary = process.env.PRIVATEAI_AGE_BINARY ?? "";
  if (action === "export" && target) {
    const cipher = await encryptRegistry(
      process.env.PRIVATEAI_INVITES_FILE ?? "",
      target,
      binary,
    );
    process.stdout.write(cipher);
  } else if (action === "verify" && target) {
    console.log(
      JSON.stringify(
        await verifyEncryptedRegistry(
          target,
          process.env.PRIVATEAI_BACKUP_IDENTITY ?? "",
          binary,
        ),
      ),
    );
  } else if (action === "restore" && target) {
    console.log(
      JSON.stringify(
        await restoreEncryptedRegistry(
          target,
          process.env.PRIVATEAI_BACKUP_IDENTITY ?? "",
          binary,
          process.env.PRIVATEAI_RESTORE_DIRECTORY ?? "",
        ),
      ),
    );
  } else throw Error();
} catch {
  console.error(
    "Encrypted backup/restore failed. Check configuration, runtime and access; no secret diagnostic was logged.",
  );
  process.exitCode = 1;
}
