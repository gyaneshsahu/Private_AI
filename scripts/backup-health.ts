import { lstat, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { z } from "zod";

const receiptSchema = z.object({
  outcome: z.enum(["VERIFIED", "FAILED", "RETENTION_FAILED"]),
  lastAttempt: z.string().datetime(),
  lastSuccess: z.string().datetime().nullable(),
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
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  try {
    const root = "C:\\PrivateAI-backups";
    const result = backupHealth(
      await json(resolve(root, "status.json")),
      (await json(resolve(root, "config.json"))).recoveryCopyVerified === true,
    );
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
