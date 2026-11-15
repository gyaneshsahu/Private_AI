// Stage 3 of vault sync: project files as encrypted blobs (docs/vault-sync-20261115.md, "Stage 3:
// project files"). Every blob is AES-256-GCM ciphertext made in the browser under a key the server
// never has; the server keeps the blob id (random-looking, derived from the account key), its size
// and its time. It never logs blob bytes: the routes count fixed names only.
import { createHash, createHmac } from "node:crypto";

export type BlobPut = "ok" | "quota" | "no-account";
/** Encrypted blobs per account, with the account's blob quota. The index always lives where quota and erase can see it. */
export interface BlobStore {
  /** Stores or replaces one blob; "quota" when the account's blobs would exceed `quotaBytes`. */
  put(accountId: string, blobId: string, data: Buffer, quotaBytes: number, now: number): Promise<BlobPut>;
  get(accountId: string, blobId: string): Promise<Buffer | undefined>;
  delete(accountId: string, blobId: string): Promise<boolean>;
  usage(accountId: string): Promise<{ count: number; usedBytes: number }>;
  /** Every blob of the account (sync reset; an account erase cascades in PostgreSQL). */
  deleteAll(accountId: string): Promise<void>;
}
/** Bytes only, by an opaque key (S3-compatible object storage). Keys are 32 hex characters. */
export interface ObjectStorage {
  put(key: string, data: Buffer): Promise<void>;
  get(key: string): Promise<Buffer | undefined>;
  delete(key: string): Promise<void>;
}

/** Tests and the development server (PRIVATEAI_VAULT_SYNC=1): gone at restart. */
export class MemoryBlobStore implements BlobStore {
  private accounts = new Map<string, Map<string, Buffer>>();
  async put(accountId: string, blobId: string, data: Buffer, quotaBytes: number): Promise<BlobPut> {
    const blobs = this.accounts.get(accountId) ?? new Map<string, Buffer>();
    const used = [...blobs].reduce((n, [id, b]) => n + (id === blobId ? 0 : b.length), 0);
    if (used + data.length > quotaBytes) return "quota";
    blobs.set(blobId, Buffer.from(data));
    this.accounts.set(accountId, blobs);
    return "ok";
  }
  async get(accountId: string, blobId: string) {
    return this.accounts.get(accountId)?.get(blobId);
  }
  async delete(accountId: string, blobId: string) {
    return this.accounts.get(accountId)?.delete(blobId) ?? false;
  }
  async usage(accountId: string) {
    const blobs = [...(this.accounts.get(accountId)?.values() ?? [])];
    return { count: blobs.length, usedBytes: blobs.reduce((n, b) => n + b.length, 0) };
  }
  async deleteAll(accountId: string) {
    this.accounts.delete(accountId);
  }
}

// AWS Signature Version 4 (header form), node:crypto only. Checked against the published AWS test
// vectors in tests/vault-sync-blobs.test.ts.
const sha256Hex = (data: string | Buffer) => createHash("sha256").update(data).digest("hex");
const hmac = (key: string | Buffer, data: string) => createHmac("sha256", key).update(data).digest();
export interface SigV4Request {
  method: string;
  /** Already URI-encoded path; object keys here are hex, so S3's single encoding and the generic suite agree. */
  path: string;
  /** Raw query, for example "b=2&a=1"; sorted here. */
  query?: string;
  /** Every header to sign, the host included. */
  headers: Record<string, string>;
  payloadHash: string;
}
export interface SigV4Credentials {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  service: string;
}
/** The Authorization header value; `amzDate` like 20150830T123600Z. */
export function signV4(request: SigV4Request, credentials: SigV4Credentials, amzDate: string): string {
  const headers = Object.entries(request.headers)
    .map(([name, value]) => [name.toLowerCase(), value.trim().replace(/\s+/g, " ")] as const)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  const signed = headers.map(([name]) => name).join(";");
  const query = (request.query ?? "")
    .split("&")
    .filter(Boolean)
    .map((pair) => (pair.includes("=") ? pair : `${pair}=`))
    .sort()
    .join("&");
  const canonical = [request.method, request.path, query, headers.map(([n, v]) => `${n}:${v}\n`).join(""), signed, request.payloadHash].join("\n");
  const day = amzDate.slice(0, 8);
  const scope = `${day}/${credentials.region}/${credentials.service}/aws4_request`;
  const toSign = ["AWS4-HMAC-SHA256", amzDate, scope, sha256Hex(canonical)].join("\n");
  const key = hmac(hmac(hmac(hmac(`AWS4${credentials.secretAccessKey}`, day), credentials.region), credentials.service), "aws4_request");
  const signature = createHmac("sha256", key).update(toSign).digest("hex");
  return `AWS4-HMAC-SHA256 Credential=${credentials.accessKeyId}/${scope}, SignedHeaders=${signed}, Signature=${signature}`;
}

export interface S3Settings {
  /** https://fsn1.your-objectstorage.com for Hetzner Falkenstein; path-style requests. */
  endpoint: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
}
/** S3-compatible object storage (Hetzner Object Storage, EU): PUT, GET and DELETE of one object, path-style. */
export class S3Objects implements ObjectStorage {
  constructor(
    private settings: S3Settings,
    private fetcher: typeof fetch = fetch,
    private clock: () => Date = () => new Date(),
  ) {}
  private async send(method: "PUT" | "GET" | "DELETE", key: string, body?: Buffer) {
    if (!/^[0-9a-f]{32}$/.test(key)) throw Error("Object key must be 32 hex characters.");
    const url = new URL(`${this.settings.endpoint.replace(/\/+$/, "")}/${this.settings.bucket}/${key}`);
    const amzDate = this.clock().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
    const payloadHash = sha256Hex(body ?? Buffer.alloc(0));
    const signedHeaders = { host: url.host, "x-amz-content-sha256": payloadHash, "x-amz-date": amzDate };
    const authorization = signV4({ method, path: url.pathname, headers: signedHeaders, payloadHash }, { ...this.settings, service: "s3" }, amzDate);
    // fetch sets Host from the URL itself (the same value that was signed).
    const { host: _host, ...sent } = signedHeaders;
    return this.fetcher(url, {
      method,
      headers: { ...sent, authorization, ...(body ? { "content-type": "application/octet-stream" } : {}) },
      ...(body ? { body: new Uint8Array(body) } : {}),
      signal: AbortSignal.timeout(60_000),
    });
  }
  // Errors name the status only: never the key, the bucket or any byte.
  async put(key: string, data: Buffer) {
    const r = await this.send("PUT", key, data);
    if (!r.ok) throw Error(`Object storage refused the upload (${r.status}).`);
  }
  async get(key: string) {
    const r = await this.send("GET", key);
    if (r.status === 404) return undefined;
    if (!r.ok) throw Error(`Object storage refused the download (${r.status}).`);
    return Buffer.from(await r.arrayBuffer());
  }
  async delete(key: string) {
    const r = await this.send("DELETE", key);
    if (!r.ok && r.status !== 404) throw Error(`Object storage refused the delete (${r.status}).`);
  }
}
