// Secure mode, the server side (docs/secure-store-20261116.md, .local/modes-contract.md). The same
// item and blob routes as the hardened sync (server/vault-sync.ts contentRoutes), without devices,
// wrappers, proofs or pairing: the signed-in session is the only gate, and the account's key is
// handed to it by GET /api/secure/key. The server CAN unwrap that key (server/custody.ts); in this
// version no route decrypts content. It never logs keys or content: fixed counts only. Mounted only
// while `inference.secureStore` is on, behind the app's origin, session and CSRF checks.
import express from "express";
import { count } from "./counters";
import { newAccountKey, unwrapAccountKey, wrapAccountKey, type CustodyMaster } from "./custody";
import { MemorySyncStore, bodyErrors, contentRoutes, type ContentCtx, type SetupInput, type SyncStore } from "./vault-sync";
import type { BlobStore } from "./vault-sync-blobs";

export interface CustodyRow {
  wrappedKey: Buffer;
  masterKeyId: string;
  createdAt: number;
}
/** Items as in sync, plus the account's wrapped key. The custody row is the account row: no row, no items. */
export interface SecureStore extends Pick<SyncStore, "items" | "putItem" | "usage"> {
  custody(accountId: string): Promise<CustodyRow | undefined>;
  /** Stores the row unless one exists, and returns the stored one: two first sign-ins at once get the same key. */
  createCustody(accountId: string, row: CustodyRow): Promise<CustodyRow>;
  /** Deletes every item of the account. The key and the change counter stay: device cursors never go back. */
  clearItems(accountId: string): Promise<void>;
}
export interface SecureSettings {
  quotaBytes: number;
  filesQuotaBytes: number;
  master: CustodyMaster;
  store: SecureStore;
  blobs: BlobStore;
  /** Per project file; the same 10 MB as today's upload limit. */
  maxFileBytes?: number;
  /** Tests only: smaller page and write limits. */
  pageBytes?: number;
  writeBurst?: number;
  writesPerSecond?: number;
}
export const SECURE_MAX_FILE_BYTES = 10 * 1024 * 1024;

/** Offline and development store; production uses PostgresSecureStore (server/vault-sync-postgres.ts). */
export class MemorySecureStore implements SecureStore {
  private inner = new MemorySyncStore();
  private rows = new Map<string, CustodyRow>();
  async custody(accountId: string) {
    return this.rows.get(accountId);
  }
  async createCustody(accountId: string, row: CustodyRow) {
    if (!this.rows.has(accountId)) {
      this.rows.set(accountId, row);
      // The memory sync store wants a setup; Secure has no proofs, devices or wrappers.
      const none = Buffer.alloc(0);
      const input: SetupInput = { authHash: none, recoveryHash: none, recoveryWrapper: none, deviceWrapper: null, device: { deviceId: "", publicKey: none, labelCiphertext: none, tokenHash: none, createdAt: 0, lastSeenAt: 0 } };
      await this.inner.setup(accountId, input);
    }
    return this.rows.get(accountId)!;
  }
  items: SecureStore["items"] = (...a) => this.inner.items(...a);
  putItem: SecureStore["putItem"] = (...a) => this.inner.putItem(...a);
  usage: SecureStore["usage"] = (...a) => this.inner.usage(...a);
  clearItems: SecureStore["clearItems"] = (...a) => this.inner.clearItems(...a);
}

export function secureRoutes(settings: SecureSettings, accountOf: (res: express.Response) => string | undefined, clock: () => number = Date.now) {
  const router = express.Router();
  const base = "/api/secure";
  const maxFileBytes = settings.maxFileBytes ?? SECURE_MAX_FILE_BYTES;
  const fail = (res: express.Response, status: number, code: string) => void res.status(status).json({ error: code, code });
  const guard =
    (work: (req: express.Request, res: express.Response, ctx: ContentCtx) => Promise<void>): express.RequestHandler =>
    async (req, res) => {
      res.setHeader("Cache-Control", "no-store");
      const account = accountOf(res);
      if (!account) return fail(res, 401, "signed-out");
      try {
        await work(req, res, { account, now: clock() });
      } catch {
        if (!res.headersSent) fail(res, 503, "unavailable");
      }
    };
  // The account's key, created at first use. A row that does not open under this master key (a wrong
  // or changed PRIVATEAI_CUSTODY_KEY) answers 503: it is never replaced, or the stored data would be lost.
  router.get(
    `${base}/key`,
    guard(async (_req, res, { account, now }) => {
      const row =
        (await settings.store.custody(account)) ??
        (await settings.store.createCustody(account, { wrappedKey: wrapAccountKey(settings.master, account, newAccountKey()), masterKeyId: settings.master.id, createdAt: now }));
      const key = unwrapAccountKey(settings.master, account, row.masterKeyId, row.wrappedKey);
      count("secure.key");
      res.json({ key: key.toString("base64"), accountId: account});
    }),
  );
  // The part of sync's /state the engine needs: quotas and the change cursor. No devices exist here.
  router.get(
    `${base}/state`,
    guard(async (_req, res, { account }) => {
      const [usage, files] = await Promise.all([settings.store.usage(account), settings.blobs.usage(account)]);
      res.json({
        enabled: true,
        quota: { usedBytes: usage.usedBytes, limitBytes: settings.quotaBytes },
        files: { count: files.count, usedBytes: files.usedBytes, limitBytes: settings.filesQuotaBytes, maxFileBytes },
        cursor: String(usage.cursor),
      });
    }),
  );
  // "Delete all chats" (docs/data-controls-20261116.md): every item and file of the account, at once.
  // The key and the change counter stay. Hard delete, no tombstones (the server cannot make them),
  // so another device keeps its local copy until it signs out (closeSecure erases it then).
  router.delete(
    `${base}/items`,
    guard(async (_req, res, { account }) => {
      await settings.store.clearItems(account);
      await settings.blobs.deleteAll(account);
      count("secure.erase");
      res.status(204).end();
    }),
  );
  contentRoutes(router, {
    base,
    counts: "secure",
    store: settings.store,
    quotaBytes: settings.quotaBytes,
    blobs: { quotaBytes: settings.filesQuotaBytes, maxFileBytes, store: settings.blobs },
    pageBytes: settings.pageBytes,
    writeBurst: settings.writeBurst,
    writesPerSecond: settings.writesPerSecond,
    guard,
  });
  router.use(bodyErrors);
  return router;
}
