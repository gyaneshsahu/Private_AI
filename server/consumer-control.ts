import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { Pool } from "pg";
import type { RequestHandler } from "express";
import { fromNodeHeaders } from "better-auth/node";
import type { createSyntheticAccountAuth } from "./account-auth";
import { disclosureSchema, type Disclosure } from "../shared/contracts";
import { pageUrl, type ResearchApprovals } from "./research";
import { accountRecoveryOpen } from "./account-restore";

const liveSession = `SELECT s.id FROM "session" s JOIN "user" u ON u.id=s."userId"
  WHERE s.id=$1 AND s."expiresAt">clock_timestamp() AND u."emailVerified"=true`;

/** Inactive account adapter. No public routes or production configuration activate it. */
export function consumerControl(config: {
  database: Pool;
  auth: ReturnType<typeof createSyntheticAccountAuth>["auth"];
  secret: string;
}) {
  if (config.secret.length < 32)
    throw Error("Control secret must contain at least 32 characters.");
  const fingerprint = (purpose: string, value: unknown) =>
    createHmac("sha256", config.secret)
      .update(purpose + "\0" + JSON.stringify(value))
      .digest("hex");
  const session: RequestHandler = async (req, res, next) => {
    try {
      if (!(await accountRecoveryOpen(config.database))) {
        res.status(503).json({
          error: "Account access is paused for recovery verification.",
        });
        return;
      }
      const current = await config.auth.api.getSession({
        headers: fromNodeHeaders(req.headers),
      });
      if (!current || !current.user.emailVerified) {
        res
          .status(401)
          .json({ error: "Sign in to continue.", consumerWorkspace: true });
        return;
      }
      const id = current.session.id;
      const csrf = fingerprint("privateai-consumer-csrf-v1", id);
      if (req.method !== "GET") {
        const supplied = req.headers["x-privateai-csrf"];
        if (
          typeof supplied !== "string" ||
          !/^[a-f0-9]{64}$/.test(supplied) ||
          !timingSafeEqual(Buffer.from(supplied), Buffer.from(csrf))
        ) {
          res.status(403).json({ error: "Request authorization failed." });
          return;
        }
      }
      // Recheck against the database even if an auth-library cache is introduced later.
      const valid =
        req.method === "POST"
          ? await config.database.query(
              `INSERT INTO consumer_request_count(session_id,count)
            SELECT id,1 FROM (${liveSession}) live
            ON CONFLICT(session_id) DO UPDATE SET count=consumer_request_count.count+1
            WHERE consumer_request_count.count<200 RETURNING session_id`,
              [id],
            )
          : await config.database.query(liveSession, [id]);
      if (!valid.rowCount) {
        res.status(req.method === "POST" ? 429 : 401).json({
          error:
            "Session unavailable or request limit reached. Sign in again if expired.",
        });
        return;
      }
      res.locals.session = id;
      res.locals.csrf = csrf;
      res.locals.accountId = current.user.id;
      res.locals.accountEmail = current.user.email;
      res.locals.accessEpoch = fingerprint("privateai-consumer-epoch-v1", id);
      next();
    } catch {
      res.status(503).json({
        error: "Account verification is unavailable. No request was forwarded.",
      });
    }
  };
  const commitment = (session: string, id: string, request: Disclosure) =>
    fingerprint("privateai-research-consent-v1", [
      session,
      id,
      request.kind,
      request.value,
    ]);
  const approvals: ResearchApprovals = {
    async issue(session, input) {
      const request = disclosureSchema.parse(input);
      if (request.kind === "page") pageUrl(request.value);
      const client = await config.database.connect();
      try {
        await client.query("BEGIN");
        // Serialize the per-session pending limit and consent creation with revocation.
        if (
          !(await client.query(liveSession + " FOR UPDATE OF s", [session]))
            .rowCount
        )
          throw Error("Sign in again.");
        await client.query(
          "DELETE FROM research_consent WHERE session_id=$1 AND expires_at<=clock_timestamp()",
          [session],
        );
        const pending = await client.query(
          "SELECT count(*)::int n FROM research_consent WHERE session_id=$1",
          [session],
        );
        if (pending.rows[0].n >= 20) throw Error("Too many pending approvals.");
        const id = randomBytes(24).toString("hex");
        await client.query(
          `INSERT INTO research_consent(id,session_id,commitment,expires_at)
          SELECT $2,id,$3,LEAST("expiresAt",clock_timestamp()+interval '5 minutes') FROM "session" WHERE id=$1`,
          [session, id, commitment(session, id, request)],
        );
        await client.query("COMMIT");
        return {
          id,
          request,
          recipient:
            request.kind === "search"
              ? "Brave Search API"
              : new URL(request.value).hostname,
        };
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    },
    async consume(session, id, input) {
      const request = disclosureSchema.parse(input);
      if (request.kind === "page") pageUrl(request.value);
      const client = await config.database.connect();
      try {
        await client.query("BEGIN");
        if (
          !(await client.query(liveSession + " FOR UPDATE OF s", [session]))
            .rowCount
        )
          throw Error("Sign in again.");
        const result = await client.query(
          `DELETE FROM research_consent
          WHERE id=$2 AND session_id=$1 AND commitment=$3 AND expires_at>clock_timestamp() RETURNING id`,
          [session, id, commitment(session, id, request)],
        );
        if (!result.rowCount)
          throw Error("Approval missing, changed, expired or already used.");
        await client.query("COMMIT");
        return request;
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    },
    async revoke(session, id) {
      await config.database.query(
        "DELETE FROM research_consent WHERE session_id=$1 AND id=$2",
        [session, id],
      );
    },
  };
  return { session, approvals };
}
