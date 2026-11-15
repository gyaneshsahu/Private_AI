// Live probe for synced project files on S3-compatible object storage (docs/vault-sync-20261115.md,
// section 14.6). For the lead, once the owner has created the bucket and set the two keys in the
// environment. Puts, reads back and deletes ONE random 1 KB object; prints the result, never a key.
// Usage: node --import tsx scripts/blob-s3-probe.ts https://fsn1.your-objectstorage.com fsn1 <bucket>
import { randomBytes } from "node:crypto";
import { S3Objects } from "../server/vault-sync-blobs";

const [endpoint, region, bucket] = process.argv.slice(2);
const accessKeyId = process.env.PRIVATEAI_BLOB_S3_ACCESS_KEY_ID?.trim();
const secretAccessKey = process.env.PRIVATEAI_BLOB_S3_SECRET_ACCESS_KEY?.trim();
if (!endpoint?.startsWith("https://") || !region || !bucket || !accessKeyId || !secretAccessKey) {
  console.error("Usage: blob-s3-probe.ts <https endpoint> <region> <bucket>, with PRIVATEAI_BLOB_S3_ACCESS_KEY_ID and PRIVATEAI_BLOB_S3_SECRET_ACCESS_KEY set.");
  process.exit(1);
}
const s3 = new S3Objects({ endpoint, region, bucket, accessKeyId, secretAccessKey });
const key = randomBytes(16).toString("hex");
const data = randomBytes(1024);
try {
  await s3.put(key, data);
  const back = await s3.get(key);
  if (!back?.equals(data)) throw Error("The object read back differs.");
  await s3.delete(key);
  if (await s3.get(key)) throw Error("The object is still there after the delete.");
  console.log("Object storage probe: put, get and delete of one object worked.");
} catch (error) {
  console.error(`Object storage probe failed: ${(error as Error).message}`);
  process.exitCode = 1;
}
