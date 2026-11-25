// Encrypted share links (docs/sharing-20261125.md): off unless configured. The server stores only
// ciphertext it cannot read (the key is in the link after "#"), with the owner's account, an expiry
// and nothing else. Anyone with the link can fetch the ciphertext; only the owner can list or
// delete links. Expired links are gone: refused at once and removed at the next sweep.
import { randomBytes } from "node:crypto";
import express, { Router, type Response } from "express";
import type { Pool } from "pg";
import { SHARE, shareCreateRequest, type ShareListing } from "../shared/share-links";

export type ShareRow = { id: string; accountId: string; cipher: string; createdAt: number; expiresAt: number };

export interface ShareStore {
  /** False when the account already has SHARE.perAccount live links. */
  create(row: ShareRow, now: number): Promise<boolean>;
  /** The ciphertext of a live link; undefined for an unknown or expired one. */
  read(id: string, now: number): Promise<{ cipher: string; expiresAt: number } | undefined>;
  list(accountId: string, now: number): Promise<ShareListing[]>;
  /** True when a link of this account was deleted. */
  remove(accountId: string, id: string): Promise<boolean>;
  /** Deletes every expired link. */
  sweep(now: number): Promise<void>;
}

const listing = (row: ShareRow): ShareListing => ({
  id: row.id,
  createdAt: new Date(row.createdAt).toISOString(),
  expiresAt: new Date(row.expiresAt).toISOString(),
  bytes: Math.floor((row.cipher.length * 3) / 4),
});

/** For the development server and tests: in this process's memory, gone at restart. */
export class MemoryShareStore implements ShareStore {
  private rows = new Map<string, ShareRow>();
  async create(row: ShareRow, now: number) {
    const live = [...this.rows.values()].filter((r) => r.accountId === row.accountId && r.expiresAt > now).length;
    if (live >= SHARE.perAccount) return false;
    this.rows.set(row.id, row);
    return true;
  }
  async read(id: string, now: number) {
    const row = this.rows.get(id);
    return row && row.expiresAt > now ? { cipher: row.cipher, expiresAt: row.expiresAt } : undefined;
  }
  async list(accountId: string, now: number) {
    return [...this.rows.values()]
      .filter((r) => r.accountId === accountId && r.expiresAt > now)
      .sort((a, b) => b.createdAt - a.createdAt)
      .map(listing);
  }
  async remove(accountId: string, id: string) {
    const row = this.rows.get(id);
    return !!row && row.accountId === accountId && this.rows.delete(id);
  }
  async sweep(now: number) {
    for (const [id, row] of this.rows) if (row.expiresAt <= now) this.rows.delete(id);
  }
}

/** Migration 0027. Times are epoch milliseconds, as in the usage tables. */
export class PostgresShareStore implements ShareStore {
  constructor(private database: Pool) {}
  async create(row: ShareRow, now: number) {
    // The count and the insert in one statement. Requests that arrive in the same instant can each
    // pass the count, so a burst may overshoot by that many; the limit is a bound on growth, not a lock.
    const result = await this.database.query(
      `INSERT INTO share_links(id, account_id, cipher, created_at, expires_at)
       SELECT $1, $2, $3, $4, $5
       WHERE (SELECT count(*) FROM share_links WHERE account_id = $2 AND expires_at > $6) < $7`,
      [row.id, row.accountId, row.cipher, row.createdAt, row.expiresAt, now, SHARE.perAccount],
    );
    return result.rowCount === 1;
  }
  async read(id: string, now: number) {
    const { rows } = await this.database.query("SELECT cipher, expires_at FROM share_links WHERE id = $1 AND expires_at > $2", [id, now]);
    return rows[0] ? { cipher: rows[0].cipher as string, expiresAt: Number(rows[0].expires_at) } : undefined;
  }
  async list(accountId: string, now: number) {
    const { rows } = await this.database.query(
      "SELECT id, created_at, expires_at, length(cipher) AS chars FROM share_links WHERE account_id = $1 AND expires_at > $2 ORDER BY created_at DESC",
      [accountId, now],
    );
    return rows.map((r) => ({
      id: r.id as string,
      createdAt: new Date(Number(r.created_at)).toISOString(),
      expiresAt: new Date(Number(r.expires_at)).toISOString(),
      bytes: Math.floor((Number(r.chars) * 3) / 4),
    }));
  }
  async remove(accountId: string, id: string) {
    return (await this.database.query("DELETE FROM share_links WHERE id = $1 AND account_id = $2", [id, accountId])).rowCount === 1;
  }
  async sweep(now: number) {
    await this.database.query("DELETE FROM share_links WHERE expires_at <= $1", [now]);
  }
}

const DAY = 86_400_000;

/**
 * Public: the ciphertext of a live link, for anyone who has the link. Mounted before every
 * session gate, beside the legal pages. It answers nothing but the ciphertext and its expiry.
 */
export function sharePublicRoutes(store: ShareStore, clock: () => number = Date.now) {
  const router = Router();
  router.get("/s/:id/data", async (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    // The key is in the link's fragment; a referrer must never carry the link anywhere.
    res.setHeader("Referrer-Policy", "no-referrer");
    const found = SHARE.id.test(req.params.id) ? await store.read(req.params.id, clock()).catch(() => undefined) : undefined;
    if (!found) return void res.status(404).json({ error: "gone" });
    res.json({ cipher: found.cipher, expiresAt: new Date(found.expiresAt).toISOString() });
  });
  return router;
}

/** Signed in: create a link, list one's own links, delete one. Mounted before the 8 KB body parser. */
export function shareRoutes(o: { store: ShareStore; account(res: Response): string | undefined; clock?: () => number }) {
  const clock = o.clock ?? Date.now;
  const router = Router();
  const signedIn = (res: Response) => {
    res.setHeader("Cache-Control", "no-store");
    const who = o.account(res);
    if (!who) res.status(401).json({ error: "signin" });
    return who;
  };
  router.post("/api/share", express.json({ limit: "5mb" }), async (req, res) => {
    const who = signedIn(res);
    if (!who) return;
    const parsed = shareCreateRequest.safeParse(req.body);
    if (!parsed.success) return void res.status(400).json({ error: "invalid" });
    const now = clock();
    try {
      await o.store.sweep(now);
      const row: ShareRow = {
        id: randomBytes(16).toString("base64url"),
        accountId: who,
        cipher: parsed.data.cipher,
        createdAt: now,
        expiresAt: now + SHARE.days[parsed.data.expires] * DAY,
      };
      if (!(await o.store.create(row, now))) return void res.status(409).json({ error: "too-many", limit: SHARE.perAccount });
      res.status(201).json({ id: row.id, expiresAt: new Date(row.expiresAt).toISOString() });
    } catch {
      res.status(503).json({ error: "unavailable" });
    }
  });
  router.get("/api/share", async (_req, res) => {
    const who = signedIn(res);
    if (!who) return;
    try {
      res.json({ links: await o.store.list(who, clock()) });
    } catch {
      res.status(503).json({ error: "unavailable" });
    }
  });
  router.delete("/api/share/:id", async (req, res) => {
    const who = signedIn(res);
    if (!who) return;
    try {
      if (!SHARE.id.test(req.params.id) || !(await o.store.remove(who, req.params.id))) return void res.status(404).json({ error: "gone" });
      res.status(204).end();
    } catch {
      res.status(503).json({ error: "unavailable" });
    }
  });
  return router;
}
