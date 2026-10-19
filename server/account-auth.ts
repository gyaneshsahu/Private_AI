import { betterAuth } from "better-auth";
import {
  APIError,
  createAuthMiddleware,
  getSessionFromCtx,
  addOAuthServerContext,
  getOAuthState,
} from "better-auth/api";
import { emailOTP, genericOAuth } from "better-auth/plugins";
import { google, apple } from "better-auth/social-providers";
import { passkey } from "@better-auth/passkey";
import { toNodeHandler, fromNodeHeaders } from "better-auth/node";
import express from "express";
import type { Pool } from "pg";
import { createHmac } from "node:crypto";
import { finishSignInRecovery } from "./account-recovery";
import { accountRecoveryOpen } from "./account-restore";
import { requestAccountClosure } from "./account-closure";
import { z } from "zod";
import {
  accountRequestStart,
  recordSessionAccess,
  removalSchema,
  removeCredential,
  revokeAccountSession,
  withCredentialEnrollment,
} from "./account-access";

export interface SyntheticAccountConfig {
  origin: string;
  secret: string;
  database: Pool;
  deliverCode: (message: { email: string; otp: string }) => Promise<void>;
  /** Dummy provider IDs only; test harness must intercept all external fetches. */
  socialFixtures?: boolean;
  /** Advertise navigation only when composed with the synthetic workspace. */
  workspaceEnabled?: boolean;
}

/** Unmounted integration for synthetic tests only. No environment activation. */
export function createSyntheticAccountAuth(config: SyntheticAccountConfig) {
  const origin = new URL(config.origin);
  if (
    !["http:", "https:"].includes(origin.protocol) ||
    origin.hostname !== "localhost" ||
    origin.origin !== config.origin ||
    config.secret.length < 32
  )
    throw Error(
      "Synthetic authentication requires a loopback origin and test secret.",
    );

  const auth = betterAuth({
    appName: "PrivateAI synthetic account lab",
    baseURL: config.origin,
    basePath: "/api/auth",
    secret: config.secret,
    database: config.database,
    trustedOrigins: [config.origin],
    telemetry: { enabled: false },
    logger: { disabled: true },
    emailAndPassword: { enabled: false },
    socialProviders: {},
    databaseHooks: {
      user: {
        create: {
          before: async (data) => ({
            data: { ...data, name: "", image: null },
          }),
        },
      },
      session: {
        create: {
          before: async (data) => ({
            data: { ...data, ipAddress: null, userAgent: null },
          }),
          after: async (data, ctx) => {
            await recordSessionAccess(
              config.database,
              data,
              ctx?.path === "/sign-in/email-otp",
            );
          },
        },
        update: {
          before: async (data) => ({
            data: { ...data, ipAddress: null, userAgent: null },
          }),
        },
      },
      account: {
        create: {
          before: async (data) => ({
            data: { ...data, ...discardedProviderTokens },
          }),
        },
        update: {
          before: async (data) => ({
            data: { ...data, ...discardedProviderTokens },
          }),
        },
      },
    },
    user: {
      validateUserInfo: async ({ user, source }, ctx) => {
        if (
          typeof user.email !== "string" ||
          user.emailVerified !== true ||
          !/^[^\s@]+@[^\s@]+\.test$/i.test(user.email)
        )
          return {
            error: "synthetic_identity_required",
            errorDescription: "Verified synthetic identity required.",
          };
        if (source.action === "link-account") {
          const state = await getOAuthState();
          const session = await getSessionFromCtx(ctx);
          if (
            !session ||
            session.user.id !== user.id ||
            state?.serverContext?.linkSessionId !== session.session.id ||
            !isFresh(session.session.createdAt)
          )
            return {
              error: "reauthentication_required",
              errorDescription: "Sign in again before linking an account.",
            };
        }
      },
    },
    account: {
      accountLinking: {
        enabled: true,
        disableImplicitLinking: true,
        trustedProviders: [],
      },
      storeAccountCookie: false,
      storeStateStrategy: "database",
      encryptOAuthTokens: true,
    },
    session: {
      expiresIn: 3600,
      updateAge: 300,
      freshAge: 300,
      cookieCache: { enabled: false },
    },
    advanced: {
      database: { generateId: "uuid" },
      cookiePrefix: "privateai-account-lab",
      defaultCookieAttributes: { httpOnly: true, sameSite: "lax" },
      ipAddress: { ipAddressHeaders: ["x-privateai-client-ip"] },
    },
    rateLimit: { enabled: true, storage: "database", window: 60, max: 60 },
    hooks: {
      before: createAuthMiddleware(async (ctx) => {
        if (typeof ctx.body?.email === "string") {
          const closed = await config.database.query(
            `SELECT 1 FROM "user" u JOIN account_closure c ON c."userId"=u.id WHERE lower(u.email)=lower($1)`,
            [ctx.body.email.trim()],
          );
          if (closed.rowCount)
            throw new APIError("FORBIDDEN", {
              message: "Sign-in is unavailable for this account.",
            });
        }
        if (
          [
            "/passkey/delete-passkey",
            "/unlink-account",
            "/list-sessions",
            "/revoke-session",
          ].includes(ctx.path)
        )
          throw new APIError("FORBIDDEN", {
            message: "Use account access management.",
          });
        for (const field of [
          "callbackURL",
          "errorCallbackURL",
          "newUserCallbackURL",
        ] as const) {
          const value = ctx.body?.[field];
          if (value === undefined) continue;
          let valid = false;
          try {
            const target = new URL(value, config.origin);
            valid =
              typeof value === "string" &&
              target.origin === config.origin &&
              !target.username &&
              !target.password;
          } catch {
            /* Invalid redirect targets fail closed. */
          }
          if (!valid)
            throw new APIError("FORBIDDEN", {
              message: "Same-origin callback required.",
            });
        }
        if (
          ["/sign-in/social", "/link-social"].includes(ctx.path) &&
          ctx.body?.idToken
        )
          throw new APIError("BAD_REQUEST", {
            message: "Use the authorization-code flow.",
          });
        if (ctx.path === "/link-social") {
          const session = await getSessionFromCtx(ctx);
          if (!session || !isFresh(session.session.createdAt))
            throw new APIError("FORBIDDEN", {
              message: "Sign in again before linking an account.",
            });
          await addOAuthServerContext({ linkSessionId: session.session.id });
        }
        if (
          typeof ctx.body?.email === "string" &&
          !/^[^\s@]+@[^\s@]+\.test$/i.test(ctx.body.email)
        )
          throw new APIError("BAD_REQUEST", {
            message: "Use a synthetic .test address.",
          });
      }),
    },
    plugins: [
      ...(config.socialFixtures
        ? [
            genericOAuth({
              config: (["google", "apple"] as const).map((providerId) => {
                const clientId = `privateai-synthetic-${providerId}`;
                const profileReader = (
                  providerId === "google" ? google : apple
                )({ clientId, clientSecret: "synthetic-only" });
                return {
                  providerId,
                  clientId,
                  clientSecret: "synthetic-only",
                  discoveryUrl:
                    providerId === "google"
                      ? "https://accounts.google.com/.well-known/openid-configuration"
                      : "https://appleid.apple.com/.well-known/openid-configuration",
                  requireIdTokenVerification: true,
                  pkce: true,
                  scopes: ["openid", "email"],
                  responseType: "code",
                  responseMode:
                    providerId === "apple"
                      ? ("form_post" as const)
                      : ("query" as const),
                  disableProviderLogout: true,
                  // Generic OIDC verifies the token before this profile-only adapter runs.
                  getUserInfo: async (tokens) => {
                    if (!tokens.idToken) return null;
                    const profile = await profileReader.getUserInfo(tokens);
                    return profile
                      ? {
                          sub: profile.data.sub,
                          email: profile.user.email,
                          emailVerified: profile.user.emailVerified,
                          name: "",
                        }
                      : null;
                  },
                };
              }),
            }),
          ]
        : []),
      emailOTP({
        otpLength: 8,
        expiresIn: 300,
        allowedAttempts: 3,
        storeOTP: {
          hash: async (otp) =>
            createHmac("sha256", config.secret)
              .update("privateai-email-otp\0")
              .update(otp)
              .digest("hex"),
        },
        resendStrategy: "rotate",
        rateLimit: { window: 60, max: 3 },
        async sendVerificationOTP({ email, otp, type }) {
          if (type !== "sign-in" || !/^[^\s@]+@[^\s@]+\.test$/i.test(email))
            throw Error("Synthetic sign-in delivery only.");
          await config.deliverCode({ email, otp });
        },
      }),
      passkey({
        rpID: origin.hostname,
        rpName: "PrivateAI synthetic account lab",
        origin: config.origin,
        authenticatorSelection: {
          residentKey: "required",
          userVerification: "required",
        },
        registration: {
          requireSession: true,
          afterVerification: async ({ verification }) => {
            if (verification.registrationInfo?.userVerified !== true)
              throw new APIError("FORBIDDEN", {
                message: "Passkey user verification required.",
              });
          },
        },
        authentication: {
          afterVerification: async ({ verification }) => {
            if (verification.authenticationInfo.userVerified !== true)
              throw new APIError("FORBIDDEN", {
                message: "Passkey user verification required.",
              });
          },
        },
      }),
    ],
  });
  const router = express.Router();
  router.use(async (req, res, next) => {
    if (
      !req.path.startsWith("/api/auth/") &&
      !req.path.startsWith("/api/account/")
    ) {
      next();
      return;
    }
    res.set({
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
    });
    const callback =
      config.socialFixtures &&
      ((req.method === "GET" &&
        ["/api/auth/callback/google", "/api/auth/callback/apple"].includes(
          req.path,
        ) &&
        !req.headers.origin) ||
        (req.method === "POST" &&
          req.path === "/api/auth/callback/apple" &&
          req.headers.origin === "https://appleid.apple.com"));
    if (
      req.headers.host !== origin.host ||
      (!callback &&
        ((req.method !== "GET" && req.headers.origin !== config.origin) ||
          (req.headers.origin && req.headers.origin !== config.origin) ||
          req.headers["sec-fetch-site"] === "cross-site"))
    ) {
      res.status(403).json({ error: "Same-origin synthetic access required." });
      return;
    }
    // Only the socket determines the rate-limit address, never a client header.
    req.headers["x-privateai-client-ip"] =
      req.socket.remoteAddress ?? "127.0.0.1";
    try {
      if (!(await accountRecoveryOpen(config.database))) {
        res.status(503).json({
          error: "Account access is paused for recovery verification.",
        });
        return;
      }
    } catch {
      res
        .status(503)
        .json({ error: "Account access verification is unavailable." });
      return;
    }
    try {
      const start = await config.database.query(
        "SELECT clock_timestamp()::text AS started",
      );
      accountRequestStart.run(start.rows[0].started, next);
    } catch {
      res
        .status(503)
        .json({ error: "Account access verification is unavailable." });
    }
  });
  router.get("/api/account/options", (_req, res) => {
    res.json({
      synthetic: true,
      workspaceEnabled: config.workspaceEnabled === true,
      socialProviders: config.socialFixtures ? ["google", "apple"] : [],
    });
  });
  router.post("/api/account/recovery/complete", async (req, res) => {
    try {
      const current = await auth.api.getSession({
        headers: fromNodeHeaders(req.headers),
      });
      if (!current) {
        res.status(401).json({ error: "Sign in again to recover access." });
        return;
      }
      const outcome = await finishSignInRecovery(
        config.database,
        current.user.id,
        current.session.id,
      );
      if (outcome === "reauthenticate") {
        res
          .status(403)
          .json({ error: "Sign in again before completing recovery." });
        return;
      }
      res.json({
        outcome,
        notification: "queued",
        credentialsReset: false,
        vaultRecovered: false,
      });
    } catch {
      res.status(503).json({
        error:
          "Recovery completion could not be confirmed. Sign-in may still work; retry this step after the service recovers.",
      });
    }
  });
  router.get("/api/account/security-notices", async (req, res) => {
    try {
      const current = await auth.api.getSession({
        headers: fromNodeHeaders(req.headers),
      });
      if (!current) {
        res.status(401).json({ error: "Sign in to view notices." });
        return;
      }
      const notices = await config.database.query(
        `SELECT id,kind,"createdAt","deliveryState"
        FROM account_security_event WHERE "userId"=$1 ORDER BY "createdAt" DESC,id LIMIT 10`,
        [current.user.id],
      );
      res.json({ notices: notices.rows });
    } catch {
      res.status(503).json({ error: "Security-notice status is unavailable." });
    }
  });
  router.get("/api/account/access", async (req, res) => {
    try {
      const current = await auth.api.getSession({
        headers: fromNodeHeaders(req.headers),
      });
      if (!current) {
        res.status(401).json({ error: "Sign in to manage access." });
        return;
      }
      const sessions = await config.database.query(
        `SELECT id,"createdAt","updatedAt","expiresAt",id=$2 AS current FROM session
         WHERE "userId"=$1 AND "expiresAt">clock_timestamp() ORDER BY "createdAt" DESC,id`,
        [current.user.id, current.session.id],
      );
      const passkeys = await config.database.query(
        'SELECT id,name,"createdAt" FROM passkey WHERE "userId"=$1 ORDER BY "createdAt",id',
        [current.user.id],
      );
      const providers = await config.database.query(
        `SELECT id,"providerId" FROM account WHERE "userId"=$1 AND "providerId" IN ('google','apple') ORDER BY "providerId",id`,
        [current.user.id],
      );
      res.json({
        sessions: sessions.rows,
        passkeys: passkeys.rows,
        providers: providers.rows,
      });
    } catch {
      res.status(503).json({ error: "Account access list is unavailable." });
    }
  });
  router.post(
    "/api/account/access/revoke",
    express.json({ limit: "2kb" }),
    async (req, res) => {
      const parsed = z
        .object({ id: z.string().uuid() })
        .strict()
        .safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: "Session identifier required." });
        return;
      }
      try {
        const current = await auth.api.getSession({
          headers: fromNodeHeaders(req.headers),
        });
        if (!current) {
          res.status(401).json({ error: "Sign in again." });
          return;
        }
        await revokeAccountSession(
          config.database,
          current.user.id,
          current.session.id,
          parsed.data.id,
        );
        res.json({ revoked: true });
      } catch {
        res.status(503).json({
          error:
            "Revocation could not be confirmed. Refresh account access before retrying.",
        });
      }
    },
  );
  router.post(
    "/api/account/access/remove",
    express.json({ limit: "2kb" }),
    async (req, res) => {
      const parsed = removalSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: "Sign-in method required." });
        return;
      }
      try {
        const current = await auth.api.getSession({
          headers: fromNodeHeaders(req.headers),
        });
        if (!current) {
          res.status(401).json({ error: "Sign in again with an email code." });
          return;
        }
        const outcome = await removeCredential(
          config.database,
          current.user.id,
          current.session.id,
          parsed.data,
        );
        res
          .status(
            outcome === "removed"
              ? 200
              : outcome === "reauthenticate"
                ? 403
                : outcome === "busy"
                  ? 409
                  : 404,
          )
          .json({ outcome });
      } catch {
        res.status(503).json({
          error:
            "Removal could not be confirmed. Refresh account access before retrying.",
        });
      }
    },
  );
  const handler = toNodeHandler(auth);
  router.post(
    "/api/account/close",
    express.json({ limit: "2kb" }),
    async (req, res) => {
      if (
        !z
          .object({ confirmation: z.literal("DELETE TEST ACCOUNT") })
          .strict()
          .safeParse(req.body).success
      ) {
        res
          .status(400)
          .json({ error: "Exact deletion confirmation required." });
        return;
      }
      try {
        const current = await auth.api.getSession({
          headers: fromNodeHeaders(req.headers),
        });
        if (!current) {
          res
            .status(401)
            .json({
              error: "Sign in with an email code before closing this account.",
            });
          return;
        }
        const outcome = await requestAccountClosure(
          config.database,
          current.user.id,
          current.session.id,
        );
        res
          .status(outcome === "closed" ? 200 : outcome === "busy" ? 409 : 403)
          .json({ outcome });
      } catch {
        res
          .status(503)
          .json({
            error:
              "Closure could not be confirmed. Check account access before retrying.",
          });
      }
    },
  );
  let enrollments = 0;
  router.all("/api/auth/*splat", async (req, res) => {
    // These routes can add a method after verifying a challenge or provider callback.
    const enrolling =
      req.path === "/api/auth/passkey/verify-registration" ||
      ["/api/auth/callback/google", "/api/auth/callback/apple"].includes(
        req.path,
      );
    if (!enrolling) {
      await handler(req, res);
      return;
    }
    if (enrollments >= 2) {
      res
        .status(503)
        .json({ error: "Sign-in method setup is busy. Try again later." });
      return;
    }
    enrollments++;
    try {
      const headers = fromNodeHeaders(req.headers);
      const initial = await auth.api.getSession({ headers });
      if (!initial) {
        await handler(req, res);
        return;
      }
      const ran = await withCredentialEnrollment(
        config.database,
        initial.user.id,
        async () => {
          const current = await auth.api.getSession({ headers });
          if (!current || current.session.id !== initial.session.id) {
            res
              .status(403)
              .json({ error: "Sign in again before adding a method." });
            return;
          }
          await handler(req, res);
        },
      );
      if (!ran)
        res.status(409).json({
          error:
            "Another sign-in method change is in progress. Refresh before retrying.",
        });
    } catch {
      if (!res.headersSent)
        res.status(503).json({
          error:
            "Sign-in method setup could not be confirmed. Refresh account access.",
        });
    } finally {
      enrollments--;
    }
  });
  return { auth, router };
}

function isFresh(createdAt: Date): boolean {
  const age = Date.now() - createdAt.getTime();
  return age >= 0 && age < 300_000;
}

// Identity-only sign-in needs no durable grant to call provider APIs or refresh tokens.
const discardedProviderTokens = {
  accessToken: null,
  refreshToken: null,
  idToken: null,
  accessTokenExpiresAt: null,
  refreshTokenExpiresAt: null,
  scope: null,
};
