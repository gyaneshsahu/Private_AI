// Vault sync Stage 3 (docs/vault-sync-20261115.md, "Stage 3: project files"): the blob crypto, the
// AWS Signature Version 4 signer against the published AWS test vectors, the S3 store against a
// local fake that checks every signature, and the blob routes (validation, size, quota, revoked
// device, reset, counts only). Offline: no object storage account exists.
import { afterEach, describe, expect, it, vi } from "vitest";
import { createServer } from "node:http";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import express from "express";
import { MemorySyncStore, syncRoutes, type SyncSettings } from "../server/vault-sync";
import { MemoryBlobStore, S3Objects, signV4 } from "../server/vault-sync-blobs";
import { takeCounts } from "../server/counters";
import { operatorSql } from "../scripts/account-operator";
import * as k from "../src/sync/crypto";

const closers: (() => Promise<unknown>)[] = [];
afterEach(async () => {
  for (const close of closers.splice(0)) await close();
  vi.restoreAllMocks();
});
async function listen(handler: Parameters<typeof createServer>[1]) {
  const server = createServer(handler);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw Error("port");
  closers.push(() => new Promise((resolve) => server.close(resolve)));
  return `http://127.0.0.1:${address.port}`;
}
const sha = (data: string | Buffer) => createHash("sha256").update(data).digest("hex");

describe("blob crypto", () => {
  it("binds each blob to the account, the blob id and the version", async () => {
    const ak = k.newAccountKey();
    const fileId = randomUUID();
    const blobId = await k.blobIdFor(ak, fileId);
    expect(blobId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(blobId).not.toBe(fileId);
    expect(await k.blobIdFor(ak, fileId)).toBe(blobId);
    expect(await k.blobIdFor(k.newAccountKey(), fileId)).not.toBe(blobId);
    // Not the item id of anything: another HKDF label.
    expect(await k.itemIdFor(ak, "conversation", fileId)).not.toBe(blobId);
    const plain = new TextEncoder().encode("CANARY-BLOB ".repeat(100));
    const sealed = await k.encryptBlob(ak, "alice", blobId, plain);
    expect(sealed.length).toBe(plain.length + 28);
    expect(Buffer.from(sealed).toString("latin1")).not.toContain("CANARY-BLOB");
    expect(await k.decryptBlob(ak, "alice", blobId, sealed)).toEqual(plain);
    await expect(k.decryptBlob(ak, "bob", blobId, sealed)).rejects.toThrow(); // wrong account
    await expect(k.decryptBlob(ak, "alice", randomUUID(), sealed)).rejects.toThrow(); // moved to another blob id
    await expect(k.decryptBlob(k.newAccountKey(), "alice", blobId, sealed)).rejects.toThrow(); // wrong key
    const flipped = sealed.slice();
    flipped[40] ^= 1;
    await expect(k.decryptBlob(ak, "alice", blobId, flipped)).rejects.toThrow();
    // The version is part of the AAD: a blob sealed as another version does not open.
    const v2 = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: sealed.slice(0, 12), additionalData: new TextEncoder().encode(k.fileAad("alice", blobId, 2)) },
      await k.fileKey(ak, blobId),
      plain,
    );
    await expect(k.decryptBlob(ak, "alice", blobId, new Uint8Array([...sealed.slice(0, 12), ...new Uint8Array(v2)]))).rejects.toThrow();
    expect(await k.contentHash(plain)).toBe(createHash("sha256").update(plain).digest("base64"));
  });
});

describe("AWS Signature Version 4", () => {
  // The published AWS SigV4 test suite (aws-sig-v4-test-suite, as shipped in botocore's tests).
  const suite = { accessKeyId: "AKIDEXAMPLE", secretAccessKey: "wJalrXUtnFEMI/K7MDENG+bPxRfiCYEXAMPLEKEY", region: "us-east-1", service: "service" };
  const date = "20150830T123600Z";
  const host = "example.amazonaws.com";
  const credential = "AWS4-HMAC-SHA256 Credential=AKIDEXAMPLE/20150830/us-east-1/service/aws4_request";
  it.each([
    ["get-vanilla", "GET", "/", "", {}, "", "host;x-amz-date", "5fa00fa31553b73ebf1942676e86291e8372ff2a2260956d9b8aae1d763fbf31"],
    ["post-vanilla", "POST", "/", "", {}, "", "host;x-amz-date", "5da7c1a2acd57cee7505fc6676e4e544621c30862966e37dddb68e92efbe5d6b"],
    ["get-vanilla-query-order-key-case", "GET", "/", "Param2=value2&Param1=value1", {}, "", "host;x-amz-date", "b97d918cfa904a5beff61c982a1b6f458b799221646efd99d3219ec94cdf2500"],
    ["post-header-key-sort", "POST", "/", "", { "My-Header1": "value1" }, "", "host;my-header1;x-amz-date", "c5410059b04c1ee005303aed430f6e6645f61f4dc9e1461ec8f8916fdf18852c"],
    [
      "post-x-www-form-urlencoded",
      "POST",
      "/",
      "",
      { "Content-Type": "application/x-www-form-urlencoded" },
      "Param1=value1",
      "content-type;host;x-amz-date",
      "ff11897932ad3f4e8b18135d722051e5ac45fc38421b1da7b9d196a0fe09473a",
    ],
  ] as const)("%s", (_name, method, path, query, extra, body, signed, signature) => {
    const authorization = signV4({ method, path, query, headers: { Host: host, "X-Amz-Date": date, ...extra }, payloadHash: sha(body) }, suite, date);
    expect(authorization).toBe(`${credential}, SignedHeaders=${signed}, Signature=${signature}`);
  });
  it("matches the S3 GET Object example of the AWS documentation (signed x-amz-content-sha256)", () => {
    const empty = sha("");
    const authorization = signV4(
      {
        method: "GET",
        path: "/test.txt",
        headers: { host: "examplebucket.s3.amazonaws.com", range: "bytes=0-9", "x-amz-content-sha256": empty, "x-amz-date": "20130524T000000Z" },
        payloadHash: empty,
      },
      { accessKeyId: "AKIAIOSFODNN7EXAMPLE", secretAccessKey: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY", region: "us-east-1", service: "s3" },
      "20130524T000000Z",
    );
    expect(authorization).toBe(
      "AWS4-HMAC-SHA256 Credential=AKIAIOSFODNN7EXAMPLE/20130524/us-east-1/s3/aws4_request, SignedHeaders=host;range;x-amz-content-sha256;x-amz-date, Signature=f0e8bdb87c964420e857bd35b5d6ed310bd44f0170aba48dd91039c6036bdb41",
    );
  });
});

/** A local S3 stand-in: path-style only, recomputes every signature with the secret and refuses a mismatch. */
async function fakeS3(secretAccessKey: string) {
  const objects = new Map<string, Buffer>();
  const seen: { method: string; path: string; headers: Record<string, string | string[] | undefined> }[] = [];
  const origin = await listen((req, res) => {
    const chunks: Buffer[] = [];
    req.on("data", (c: Buffer) => chunks.push(c));
    req.on("end", () => {
      const body = Buffer.concat(chunks);
      seen.push({ method: req.method!, path: req.url!, headers: req.headers });
      const amzDate = String(req.headers["x-amz-date"]);
      const payloadHash = String(req.headers["x-amz-content-sha256"]);
      const expected = signV4(
        { method: req.method!, path: req.url!, headers: { host: String(req.headers.host), "x-amz-content-sha256": payloadHash, "x-amz-date": amzDate }, payloadHash },
        { accessKeyId: "SYNTHETIC-ACCESS-KEY", secretAccessKey, region: "fsn1", service: "s3" },
        amzDate,
      );
      if (req.headers.authorization !== expected || payloadHash !== sha(body)) return void res.writeHead(403).end("<Error><Code>SignatureDoesNotMatch</Code></Error>");
      const match = /^\/cometrow-files\/([0-9a-f]{32})$/.exec(req.url!);
      if (!match) return void res.writeHead(400).end();
      const key = match[1];
      if (req.method === "PUT") {
        objects.set(key, body);
        return void res.writeHead(200).end();
      }
      if (req.method === "GET") return void (objects.has(key) ? res.writeHead(200).end(objects.get(key)) : res.writeHead(404).end());
      if (req.method === "DELETE") {
        objects.delete(key);
        return void res.writeHead(204).end();
      }
      res.writeHead(405).end();
    });
  });
  return { origin, objects, seen };
}

describe("S3-compatible object storage", () => {
  it("puts, gets and deletes one object path-style with a valid signature, and fails closed on a wrong key", async () => {
    const fake = await fakeS3("synthetic-secret");
    const settings = { endpoint: `${fake.origin}/`, region: "fsn1", bucket: "cometrow-files", accessKeyId: "SYNTHETIC-ACCESS-KEY", secretAccessKey: "synthetic-secret" };
    const s3 = new S3Objects(settings, fetch, () => new Date("2026-11-15T10:00:00.000Z"));
    const key = randomBytes(16).toString("hex");
    const data = randomBytes(5000);
    await s3.put(key, data);
    expect(fake.objects.get(key)).toEqual(data);
    expect(await s3.get(key)).toEqual(data);
    expect(fake.seen[0]).toMatchObject({ method: "PUT", path: `/cometrow-files/${key}` });
    expect(fake.seen[0].headers).toMatchObject({ "x-amz-date": "20261115T100000Z", "x-amz-content-sha256": sha(data) });
    expect(String(fake.seen[0].headers.authorization)).toContain("Credential=SYNTHETIC-ACCESS-KEY/20261115/fsn1/s3/aws4_request");
    await s3.delete(key);
    expect(fake.objects.has(key)).toBe(false);
    expect(await s3.get(key)).toBeUndefined();
    await s3.delete(key); // already gone: fine
    // Keys are hex only, so no path tricks reach the bucket.
    await expect(s3.put("../other-bucket/x", data)).rejects.toThrow("32 hex");
    // A wrong secret: refused, and the error names the status only.
    const wrong = new S3Objects({ ...settings, secretAccessKey: "wrong" });
    const error = await wrong.put(key, data).catch((e: Error) => e);
    expect(String(error)).toContain("403");
    expect(String(error)).not.toContain(key);
    await expect(wrong.get(key)).rejects.toThrow("403");
  });
});

/** The routes alone, with the account from a test header. */
async function routes(blobs: { quotaBytes: number; maxFileBytes: number } | null = { quotaBytes: 3000, maxFileBytes: 1000 }, writeBurst?: number) {
  const store = new MemorySyncStore();
  const blobStore = new MemoryBlobStore();
  const app = express();
  app.use((req, res, next) => {
    res.locals.accountId = req.headers["x-test-account"];
    next();
  });
  const settings: SyncSettings = { quotaBytes: 10_000, maxDevices: 3, ...(writeBurst ? { writeBurst, writesPerSecond: 0.001 } : {}), ...(blobs ? { blobs: { ...blobs, store: blobStore } } : {}) };
  app.use(syncRoutes(store, settings, (res) => res.locals.accountId));
  const origin = await listen(app);
  const b64 = (n: number, fill?: number) => (fill === undefined ? randomBytes(n) : Buffer.alloc(n, fill)).toString("base64");
  const key = () => Buffer.concat([Buffer.from([4]), randomBytes(64)]).toString("base64");
  const call = (account: string, method: string, path: string, body?: unknown, device?: { deviceId: string; token: string }) =>
    fetch(`${origin}/api/sync${path}`, {
      method,
      headers: {
        "x-test-account": account,
        ...(Buffer.isBuffer(body) ? { "content-type": "application/octet-stream" } : { "content-type": "application/json" }),
        ...(device ? { "x-sync-device": `${device.deviceId}.${device.token}` } : {}),
      },
      ...(body === undefined ? {} : { body: Buffer.isBuffer(body) ? new Uint8Array(body) : JSON.stringify(body) }),
    });
  const setup = async (account: string) => {
    const d = { deviceId: randomUUID(), token: randomBytes(32).toString("base64url") };
    const r = await call(account, "POST", "/setup", { deviceId: d.deviceId, devicePublicKey: key(), deviceWrapper: b64(126), recoveryWrapper: b64(61), labelCiphertext: b64(40), accountProof: b64(32, 7), recoveryProof: b64(32, 9) }, d);
    expect(r.status).toBe(204);
    return d;
  };
  return { call, setup, blobStore };
}

describe("blob routes", () => {
  it("validates, limits size and quota, keeps accounts apart, refuses a revoked device, deletes on reset, and logs nothing", async () => {
    const logs = [vi.spyOn(console, "log"), vi.spyOn(console, "info"), vi.spyOn(console, "warn"), vi.spyOn(console, "error")];
    takeCounts();
    const s = await routes();
    const alice = await s.setup("alice");
    const bob = await s.setup("bob");
    const blob = randomUUID();
    const bytes = Buffer.concat([Buffer.from("CANARY-CIPHERTEXT"), randomBytes(983)]); // 1000 bytes
    // Validation: blob id, device token, minimum size.
    expect((await s.call("alice", "PUT", "/blobs/not-a-uuid", bytes, alice)).status).toBe(400);
    expect((await s.call("alice", "PUT", `/blobs/${blob}`, bytes)).status).toBe(401);
    expect((await s.call("alice", "PUT", `/blobs/${blob}`, bytes, bob)).status).toBe(401); // Bob's device on Alice's session
    expect((await s.call("alice", "PUT", `/blobs/${blob}`, randomBytes(27), alice)).status).toBe(400);
    // Size: at most maxFileBytes of plaintext plus the 28 bytes of nonce and tag.
    const tooLarge = await s.call("alice", "PUT", `/blobs/${blob}`, randomBytes(1029), alice);
    expect(tooLarge.status).toBe(413);
    expect(await tooLarge.json()).toMatchObject({ code: "too-large" });
    expect((await s.call("alice", "PUT", `/blobs/${blob}`, randomBytes(1028), alice)).status).toBe(204);
    expect((await s.call("alice", "PUT", `/blobs/${blob}`, bytes, alice)).status).toBe(204); // replaced, counted once
    expect((await s.call("alice", "PUT", `/blobs/${randomUUID()}`, randomBytes(1000), alice)).status).toBe(204);
    const full = await s.call("alice", "PUT", `/blobs/${randomUUID()}`, randomBytes(1001), alice);
    expect(full.status).toBe(413);
    expect(await full.json()).toMatchObject({ code: "quota" });
    // The quota line: count, used, limit and the per-file limit, apart from the items' quota.
    const state = await (await s.call("alice", "GET", "/state", undefined, alice)).json();
    expect(state.files).toEqual({ count: 2, usedBytes: 2000, limitBytes: 3000, maxFileBytes: 1000 });
    expect(state.quota.usedBytes).toBe(0);
    // Download: the exact bytes; another account sees nothing.
    const got = await s.call("alice", "GET", `/blobs/${blob}`, undefined, alice);
    expect(got.status).toBe(200);
    expect(got.headers.get("content-type")).toBe("application/octet-stream");
    expect(got.headers.get("cache-control")).toBe("no-store");
    expect(Buffer.from(await got.arrayBuffer())).toEqual(bytes);
    expect((await s.call("bob", "GET", `/blobs/${blob}`, undefined, bob)).status).toBe(404);
    expect((await s.call("alice", "GET", `/blobs/${randomUUID()}`, undefined, alice)).status).toBe(404);
    // Delete, then it is gone.
    expect((await s.call("alice", "DELETE", `/blobs/${blob}`, undefined, alice)).status).toBe(204);
    expect((await s.call("alice", "DELETE", `/blobs/${blob}`, undefined, alice)).status).toBe(404);
    expect((await s.call("alice", "GET", `/blobs/${blob}`, undefined, alice)).status).toBe(404);
    // A revoked device can no longer read or write blobs.
    expect((await s.call("alice", "POST", `/devices/${alice.deviceId}/revoke`, { accountProof: Buffer.alloc(32, 7).toString("base64") }, alice)).status).toBe(204);
    expect((await s.call("alice", "PUT", `/blobs/${randomUUID()}`, bytes, alice)).status).toBe(403);
    expect((await s.call("alice", "GET", `/blobs/${blob}`, undefined, alice)).status).toBe(403);
    // Reset deletes the account's blobs; Bob's stay.
    expect((await s.call("bob", "PUT", `/blobs/${randomUUID()}`, bytes, bob)).status).toBe(204);
    // The session alone resets nothing (review C1); every device lost: the recovery proof.
    expect((await s.call("alice", "POST", "/reset", { confirm: "DELETE SYNCED DATA" })).status).toBe(403);
    expect(await s.blobStore.usage("alice")).toMatchObject({ count: 1 });
    expect((await s.call("alice", "POST", "/reset", { confirm: "DELETE SYNCED DATA", recoveryProof: Buffer.alloc(32, 9).toString("base64") })).status).toBe(204);
    expect(await s.blobStore.usage("alice")).toEqual({ count: 0, usedBytes: 0 });
    expect(await s.blobStore.usage("bob")).toEqual({ count: 1, usedBytes: 1000 });
    // Content-free counts only; nothing written to the console.
    expect(takeCounts()).toMatchObject({ "sync.blob.put": 4, "sync.blob.get": 1, "sync.blob.delete": 1, "sync.reset": 1 });
    for (const log of logs) expect(log).not.toHaveBeenCalled();
  });

  it("counts blob writes against the account's write limit (review M8)", async () => {
    const s = await routes(undefined, 3);
    const alice = await s.setup("alice");
    const blob = randomUUID();
    expect((await s.call("alice", "PUT", `/blobs/${blob}`, randomBytes(100), alice)).status).toBe(204);
    expect((await s.call("alice", "DELETE", `/blobs/${blob}`, undefined, alice)).status).toBe(204);
    expect((await s.call("alice", "PUT", `/blobs/${randomUUID()}`, randomBytes(100), alice)).status).toBe(204);
    const limited = await s.call("alice", "PUT", `/blobs/${randomUUID()}`, randomBytes(100), alice);
    expect(limited.status).toBe(429);
    expect((await s.call("alice", "DELETE", `/blobs/${randomUUID()}`, undefined, alice)).status).toBe(429);
  });

  it("mounts no blob route without inference.vaultSync.blobs, and the operator erase deletes the blob rows", async () => {
    const s = await routes(null);
    const d = await s.setup("alice");
    expect((await s.call("alice", "PUT", `/blobs/${randomUUID()}`, randomBytes(100), d)).status).toBe(404);
    const state = await (await s.call("alice", "GET", "/state", undefined, d)).json();
    expect(state).not.toHaveProperty("files");
    const sql = operatorSql("erase", "someone@example.test");
    expect(sql.indexOf('DELETE FROM "sync_blobs"')).toBeGreaterThan(0);
    expect(sql.indexOf('DELETE FROM "sync_blobs"')).toBeLessThan(sql.indexOf('DELETE FROM "sync_accounts"'));
  });
});
