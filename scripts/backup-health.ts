import { lstat, open, readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { z } from "zod";

const receiptSchema = z.object({
  outcome: z.enum(["VERIFIED", "FAILED", "RETENTION_FAILED"]),
  lastAttempt: z.string().datetime(),
  lastSuccess: z.string().datetime().nullable(),
});
const archiveSchema = z.object({
  name: z.string().regex(/^registry-\d{8}T\d{6}Z-[a-f0-9]{32}\.age$/),
  bytes: z
    .number()
    .int()
    .positive()
    .max(16 * 1024 * 1024),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
  snapshotStartedAt: z.string().datetime(),
});
export function backupHealth(
  receipt: unknown,
  recoveryVerified: boolean,
  now = Date.now(),
) {
  const parsed = receiptSchema.safeParse(receipt);
  const reasons: string[] = [];
  if (!parsed.success) reasons.push("MISSING_OR_INVALID_RECEIPT");
  else {
    const r = parsed.data,
      success = r.lastSuccess ? Date.parse(r.lastSuccess) : null;
    if (
      Date.parse(r.lastAttempt) > now + 300000 ||
      (success !== null &&
        (success > now + 300000 || success > Date.parse(r.lastAttempt)))
    )
      reasons.push("INVALID_RECEIPT_TIME");
    if (r.outcome !== "VERIFIED") reasons.push("LAST_BACKUP_FAILED");
    if (success === null || now - success >= 86400000)
      reasons.push("BACKUP_STALE");
  }
  if (!recoveryVerified) reasons.push("RECOVERY_COPY_UNVERIFIED");
  return { healthy: reasons.length === 0, reasons };
}
async function json(file: string) {
  const stat = await lstat(file);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 16384)
    throw Error();
  return JSON.parse(await readFile(file, "utf8"));
}

// Checks the ciphertext, not credentials or decrypted account data. The receipt
// records earlier authenticated verification; a checksum is not a new decryption.
export async function inspectBackupHealth(root: string, now = Date.now()) {
  try {
    const directory = await lstat(root);
    if (!directory.isDirectory() || directory.isSymbolicLink()) throw Error();
    const receipt = await json(resolve(root, "status.json"));
    const config = await json(resolve(root, "config.json"));
    const result = backupHealth(
      receipt,
      config.recoveryCopyVerified === true,
      now,
    );
    const parsed = archiveSchema.safeParse(receipt.archive);
    if (!parsed.success)
      result.reasons.push("ARCHIVE_BINDING_MISSING_OR_INVALID");
    else {
      const archive = parsed.data;
      const started = Date.parse(archive.snapshotStartedAt);
      if (
        started > now + 300000 ||
        !receipt.lastSuccess ||
        started > Date.parse(receipt.lastSuccess)
      )
        result.reasons.push("INVALID_SNAPSHOT_TIME");
      if (now - started >= 86400000) result.reasons.push("SNAPSHOT_STALE");
      try {
        const path = resolve(root, archive.name);
        const stat = await lstat(path);
        if (
          !stat.isFile() ||
          stat.isSymbolicLink() ||
          stat.size !== archive.bytes
        )
          throw Error();
        const file = await open(path, "r");
        try {
          const opened = await file.stat();
          if (
            opened.size !== archive.bytes ||
            opened.ino !== stat.ino ||
            opened.dev !== stat.dev
          )
            throw Error();
          // A fixed-size read also bounds memory if the file grows during inspection.
          const bytes = Buffer.alloc(archive.bytes + 1);
          let offset = 0;
          while (offset < bytes.length) {
            const read = await file.read(
              bytes,
              offset,
              bytes.length - offset,
              null,
            );
            if (!read.bytesRead) break;
            offset += read.bytesRead;
          }
          if (
            offset !== archive.bytes ||
            createHash("sha256")
              .update(bytes.subarray(0, offset))
              .digest("hex") !== archive.sha256
          )
            throw Error();
        } finally {
          await file.close();
        }
      } catch {
        result.reasons.push("ARCHIVE_MISSING_OR_CHANGED");
      }
    }
    return { healthy: result.reasons.length === 0, reasons: result.reasons };
  } catch {
    return { healthy: false, reasons: ["MISSING_OR_INVALID_RECEIPT"] };
  }
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  try {
    const root = "C:\\PrivateAI-backups";
    const result = await inspectBackupHealth(root);
    console.log(JSON.stringify(result));
    process.exitCode = result.healthy ? 0 : 1;
  } catch {
    console.log(
      JSON.stringify({
        healthy: false,
        reasons: ["MISSING_OR_INVALID_RECEIPT"],
      }),
    );
    process.exitCode = 1;
  }
}
