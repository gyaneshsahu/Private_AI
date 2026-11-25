// Feedback from testers (docs/feedback-20261125.md): off unless configured. A signed-in tester
// sends a category, a text, perhaps a rating and perhaps a screenshot he attached himself. It is
// stored with his account and shown only to the owner, who can delete each entry. Unlike analytics
// this is content, written for the owner on purpose; nothing is collected that the form does not show.
import { randomUUID } from "node:crypto";
import express, { Router, type Response } from "express";
import type { Pool } from "pg";
import { FEEDBACK, feedbackRequest, type FeedbackEntry, type FeedbackRequest } from "../shared/feedback";

export type FeedbackRow = Omit<FeedbackRequest, "context"> & { id: string; accountId: string; createdAt: number; lang: "en" | "de"; width: number; height: number };

export interface FeedbackStore {
  /** False when the account already sent FEEDBACK.perDay entries since `since`. */
  add(row: FeedbackRow, since: number, email?: string): Promise<boolean>;
  /** The newest entries, without screenshot bytes. */
  list(): Promise<FeedbackEntry[]>;
  screenshot(id: string): Promise<{ type: string; bytes: Buffer } | undefined>;
  remove(id: string): Promise<boolean>;
}

const entry = (row: FeedbackRow, from: string): FeedbackEntry => ({
  id: row.id,
  createdAt: new Date(row.createdAt).toISOString(),
  from,
  category: row.category,
  text: row.text,
  ...(row.rating ? { rating: row.rating } : {}),
  hasScreenshot: !!row.screenshot,
  lang: row.lang,
  width: row.width,
  height: row.height,
});

/** For the development server and tests: in this process's memory. */
export class MemoryFeedbackStore implements FeedbackStore {
  private rows: { row: FeedbackRow; from: string }[] = [];
  async add(row: FeedbackRow, since: number, email?: string) {
    if (this.rows.filter((r) => r.row.accountId === row.accountId && r.row.createdAt >= since).length >= FEEDBACK.perDay) return false;
    this.rows.push({ row, from: email ?? row.accountId.slice(0, 8) });
    return true;
  }
  async list() {
    return [...this.rows].sort((a, b) => b.row.createdAt - a.row.createdAt).slice(0, FEEDBACK.listed).map((r) => entry(r.row, r.from));
  }
  async screenshot(id: string) {
    const shot = this.rows.find((r) => r.row.id === id)?.row.screenshot;
    return shot ? { type: shot.type, bytes: Buffer.from(shot.data, "base64") } : undefined;
  }
  async remove(id: string) {
    const before = this.rows.length;
    this.rows = this.rows.filter((r) => r.row.id !== id);
    return this.rows.length < before;
  }
}

/** Migration 0029. The sender's address is read from the account when the owner opens the list; it is not copied into the entry. */
export class PostgresFeedbackStore implements FeedbackStore {
  constructor(private database: Pool) {}
  async add(row: FeedbackRow, since: number) {
    const result = await this.database.query(
      `INSERT INTO feedback(id, account_id, created_at, category, body, rating, screenshot_type, screenshot, lang, width, height)
       SELECT $1, $2, $3, $4, $5, $6, $7, decode($8, 'base64'), $9, $10, $11
       WHERE (SELECT count(*) FROM feedback WHERE account_id = $2 AND created_at >= $12) < $13`,
      [row.id, row.accountId, row.createdAt, row.category, row.text, row.rating ?? null, row.screenshot?.type ?? null, row.screenshot?.data ?? null, row.lang, row.width, row.height, since, FEEDBACK.perDay],
    );
    return result.rowCount === 1;
  }
  async list() {
    const { rows } = await this.database.query(
      `SELECT f.id, f.account_id, f.created_at, f.category, f.body, f.rating, f.screenshot IS NOT NULL AS shot, f.lang, f.width, f.height, u.email
       FROM feedback f LEFT JOIN "user" u ON u.id = f.account_id ORDER BY f.created_at DESC LIMIT $1`,
      [FEEDBACK.listed],
    );
    return rows.map((r) => ({
      id: r.id as string,
      createdAt: new Date(Number(r.created_at)).toISOString(),
      from: (r.email as string | null) ?? String(r.account_id).slice(0, 8),
      category: r.category,
      text: r.body as string,
      ...(r.rating ? { rating: Number(r.rating) } : {}),
      hasScreenshot: !!r.shot,
      lang: r.lang,
      width: Number(r.width),
      height: Number(r.height),
    }));
  }
  async screenshot(id: string) {
    const { rows } = await this.database.query("SELECT screenshot_type, screenshot FROM feedback WHERE id = $1 AND screenshot IS NOT NULL", [id]);
    return rows[0] ? { type: rows[0].screenshot_type as string, bytes: rows[0].screenshot as Buffer } : undefined;
  }
  async remove(id: string) {
    return (await this.database.query("DELETE FROM feedback WHERE id = $1", [id])).rowCount === 1;
  }
}

export interface FeedbackSettings {
  store: FeedbackStore;
  /** Lowercased addresses that may read and delete feedback. */
  ownerEmails: readonly string[];
}
export const isFeedbackOwner = (settings: FeedbackSettings | undefined, email: unknown) =>
  !!settings && typeof email === "string" && settings.ownerEmails.includes(email.toLowerCase());

const ID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

/** Mounted before the 8 KB body parser: a feedback entry may carry a screenshot. */
export function feedbackRoutes(o: { settings: FeedbackSettings; account(res: Response): string | undefined; email(res: Response): string | undefined; clock?: () => number }) {
  const clock = o.clock ?? Date.now;
  const router = Router();
  router.post("/api/feedback", express.json({ limit: "1mb" }), async (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    const who = o.account(res);
    if (!who) return void res.status(401).json({ error: "signin" });
    const parsed = feedbackRequest.safeParse(req.body);
    if (!parsed.success) return void res.status(400).json({ error: "invalid" });
    const { context, ...rest } = parsed.data;
    const now = clock();
    try {
      const added = await o.settings.store.add({ ...rest, ...context, id: randomUUID(), accountId: who, createdAt: now }, now - 86_400_000, o.email(res));
      if (!added) return void res.status(429).json({ error: "limit", limit: FEEDBACK.perDay });
      res.status(201).json({ sent: true });
    } catch {
      res.status(503).json({ error: "unavailable" });
    }
  });
  // The owner's side. Anyone else gets "not found".
  const owner = (res: Response) => {
    res.setHeader("Cache-Control", "no-store");
    if (isFeedbackOwner(o.settings, o.email(res))) return true;
    res.status(404).json({ error: "Unsupported operation." });
    return false;
  };
  router.get("/api/owner/feedback", async (_req, res) => {
    if (!owner(res)) return;
    try {
      res.json({ entries: await o.settings.store.list() });
    } catch {
      res.status(503).json({ error: "unavailable" });
    }
  });
  router.get("/api/owner/feedback/:id/screenshot", async (req, res) => {
    if (!owner(res)) return;
    const shot = ID.test(req.params.id) ? await o.settings.store.screenshot(req.params.id).catch(() => undefined) : undefined;
    if (!shot) return void res.status(404).json({ error: "gone" });
    // A picture a tester sent: shown as a picture and nothing else.
    res.setHeader("Content-Type", shot.type === "image/png" ? "image/png" : "image/jpeg");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Content-Disposition", "inline");
    res.end(shot.bytes);
  });
  router.delete("/api/owner/feedback/:id", async (req, res) => {
    if (!owner(res)) return;
    try {
      if (!ID.test(req.params.id) || !(await o.settings.store.remove(req.params.id))) return void res.status(404).json({ error: "gone" });
      res.status(204).end();
    } catch {
      res.status(503).json({ error: "unavailable" });
    }
  });
  return router;
}
