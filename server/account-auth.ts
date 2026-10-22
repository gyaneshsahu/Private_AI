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
import {
  createMutualTlsIngress,
  type AuthenticatedIngress,
} from "./authenticated-ingress";
import type { Pool } from "pg";
import { createHmac } from "node:crypto";
import { TLSSocket } from "node:tls";
import { AsyncLocalStorage } from "node:async_hooks";
import { submitSignInCode, type SignInCodeSender } from "./account-email";
import {
  productionSocialProviders,
  type ProductionSocialCredentials,
} from "./account-social";
import { finishSignInRecovery } from "./account-recovery";
import { accountRecoveryOpen } from "./account-restore";
import { requestAccountClosure } from "./account-closure";
import { z } from "zod";
import {
  accountAuthBasePath,
  accountCallbackPaths,
  productionAccountTarget,
} from "../shared/account-design";
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
  emailEnabled?: boolean;
}

/** Unmounted integration for synthetic tests only. No environment activation. */
/** Sign-in codes one address may receive per hour, across all client addresses. */
const DELIVERIES_PER_ADDRESS_PER_HOUR = 5;

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

  return createAccountAuth({ ...config, synthetic: true });
}

export interface ProductionAccountCandidateConfig {
  secret: string;
  database: Pool;
  /** Supplied by a separately reviewed email adapter; tests use a no-network sink. */
  deliverCode: SignInCodeSender;
  workspaceEnabled?: boolean;
  emailEnabled?: boolean;
  /** Inactive wiring only: no environment activation or fallback credentials. */
  social?: ProductionSocialCredentials;
  /** Restricted hosted enrollment; exact verified emails, no domain wildcards. */
  allowedEmails?: string[];
  /** Inactive authenticated proxy alternative; never enables Express trust proxy. */
  ingress?: {
    peerCertificateSha256: readonly string[];
    admission?: "client-ip" | "shared";
  };
}

/** Unmounted preparation. TLS or explicit authenticated ingress; no environment activation. */
export function createProductionAccountCandidate(
  config: ProductionAccountCandidateConfig,
) {
  const allowedEmails =
    config.allowedEmails === undefined
      ? undefined
      : z
          .array(z.email().max(254))
          .min(1)
          .max(10)
          .parse(config.allowedEmails)
          .map((email) => email.toLowerCase());
  if (config.secret.length < 32)
    throw Error(
      "A separately provisioned production authentication secret is required.",
    );
  return createAccountAuth({
    secret: config.secret,
    database: config.database,
    deliverCode: (message) => submitSignInCode(message, config.deliverCode),
    origin: productionAccountTarget.origin,
    synthetic: false,
    workspaceEnabled: config.workspaceEnabled === true,
    emailEnabled: config.emailEnabled !== false,
    productionSocial: config.social,
    allowedEmails,
    ingress: config.ingress
      ? createMutualTlsIngress({
          origin: productionAccountTarget.origin,
          peerCertificateSha256: config.ingress.peerCertificateSha256,
          admission: config.ingress.admission,
        })
      : undefined,
  });
}

function createAccountAuth(
  config: SyntheticAccountConfig & {
    synthetic: boolean;
    productionSocial?: ProductionSocialCredentials;
    allowedEmails?: string[];
    ingress?: AuthenticatedIngress;
  },
) {
  const social =
    !config.synthetic && config.productionSocial
      ? productionSocialProviders(config.productionSocial)
      : undefined;
  const enabledSocial: readonly ("google" | "apple")[] =
    social?.providers ?? (config.socialFixtures ? ["google", "apple"] : []);
  const allowedPaths = new Set(productionAuthPaths);
  if (enabledSocial.length) {
    allowedPaths.add("/sign-in/social");
    allowedPaths.add("/link-social");
    for (const provider of enabledSocial)
      allowedPaths.add(`/callback/${provider}`);
  }
  const deliveryAttempt = new AsyncLocalStorage<{ failed: boolean }>();
  /** Keyed hash of the lowercased address for the sign-in delivery log; the table never holds addresses. */
  const deliveryIdentifier = (email: string) =>
    createHmac("sha256", config.secret)
      .update("privateai-signin-delivery\0")
      .update(email.toLowerCase())
      .digest("hex");
  const origin = new URL(config.origin);
  const acceptsEmail = (value: string) =>
    z.email().max(254).safeParse(value).success &&
    (!config.allowedEmails ||
      config.allowedEmails.includes(value.toLowerCase())) &&
    (!config.synthetic || /^[^\s@]+@[^\s@]+\.test$/i.test(value));
  const appName = config.synthetic
    ? "PrivateAI synthetic account lab"
    : "PrivateAI";

  const auth = betterAuth({
    appName,
    baseURL: config.origin,
    basePath: accountAuthBasePath,
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
          !acceptsEmail(user.email)
        )
          return {
            error: "verified_identity_required",
            errorDescription:
              "A verified permitted email identity is required.",
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
      cookiePrefix: config.synthetic
        ? "privateai-account-lab"
        : "privateai-account",
      useSecureCookies: origin.protocol === "https:",
      defaultCookieAttributes: { httpOnly: true, sameSite: "lax" },
      ipAddress: { ipAddressHeaders: ["x-privateai-client-ip"] },
    },
    rateLimit: { enabled: true, storage: "database", window: 60, max: 60 },
    hooks: {
      before: createAuthMiddleware(async (ctx) => {
        if (!config.synthetic && !deliveryAttempt.getStore())
          throw new APIError("FORBIDDEN", {
            message: "Use the account HTTP boundary.",
          });
        if (
          !config.synthetic &&
          !allowedPaths.has(ctx.path) &&
          !(
            ctx.path === "/callback/:id" &&
            enabledSocial.some((provider) => provider === ctx.params?.id)
          )
        )
          throw new APIError("FORBIDDEN", {
            message: "Account operation is not enabled.",
          });
        if (
          !config.synthetic &&
          ctx.path === "/email-otp/send-verification-otp" &&
          ctx.body?.type !== "sign-in"
        )
          throw new APIError("BAD_REQUEST", { message: "Sign-in codes only." });
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
          !config.synthetic &&
          ["/sign-in/social", "/link-social"].includes(ctx.path)
        ) {
          if (
            !enabledSocial.includes(ctx.body?.provider) ||
            ["scopes", "additionalParams", "additionalData", "loginHint"].some(
              (field) => ctx.body?.[field] !== undefined,
            )
          )
            throw new APIError("BAD_REQUEST", {
              message: "Use the configured identity-only sign-in flow.",
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
          !acceptsEmail(ctx.body.email)
        )
          throw new APIError("BAD_REQUEST", {
            message: config.synthetic
              ? "Use a synthetic .test address."
              : "A valid email address is required.",
          });
        // Per-recipient cap, independent of the per-IP rate limit, checked here
        // before Better Auth rotates the stored code: a refused request leaves
        // the last delivered code valid, and an attacker rotating client
        // addresses cannot flood one inbox.
        if (
          ctx.path === "/email-otp/send-verification-otp" &&
          typeof ctx.body?.email === "string"
        ) {
          const recent = await config.database.query(
            "SELECT count(*)::int AS n FROM signin_delivery WHERE identifier=$1 AND sent_at > clock_timestamp() - interval '1 hour'",
            [deliveryIdentifier(ctx.body.email)],
          );
          if (Number(recent.rows[0]?.n ?? 0) >= DELIVERIES_PER_ADDRESS_PER_HOUR)
            throw new APIError("TOO_MANY_REQUESTS", {
              message:
                "Too many sign-in codes were sent to this address in the last hour. Try again later.",
            });
        }
      }),
      after: createAuthMiddleware(async (ctx) => {
        // Better Auth 1.7.11 catches sender exceptions and otherwise returns success.
        // Surface our bounded submission result through its supported response hook.
        if (ctx.path !== "/email-otp/send-verification-otp") return;
        if (!config.synthetic && deliveryAttempt.getStore()?.failed)
          throw new APIError("SERVICE_UNAVAILABLE", {
            message:
              "Code delivery could not be confirmed. Wait before requesting a new code.",
          });
      }),
    },
    plugins: [
      ...(social ? [social.plugin] : []),
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
          if (type !== "sign-in" || !acceptsEmail(email))
            throw Error("Permitted sign-in delivery only.");
          // Count the delivery attempt (the before hook enforces the cap);
          // the row holds a keyed hash of the address, never the address.
          await config.database.query(
            "INSERT INTO signin_delivery(identifier) VALUES($1)",
            [deliveryIdentifier(email)],
          );
          await config.database.query(
            "DELETE FROM signin_delivery WHERE sent_at < clock_timestamp() - interval '1 day'",
          );
          try {
            await config.deliverCode({ email, otp });
          } catch (error) {
            const attempt = deliveryAttempt.getStore();
            if (attempt) attempt.failed = true;
            throw error;
          }
        },
      }),
      passkey({
        rpID: origin.hostname,
        rpName: appName,
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
  if (config.ingress) {
    const ingress = config.ingress;
    router.use((req, res, next) => {
      // The workspace may already have authenticated this exact request before admission.
      if (ingress.authenticated(req)) next();
      else ingress.middleware(req, res, next);
    });
  }
  router.use(async (req, res, next) => {
    if (!req.path.startsWith("/api/")) {
      next();
      return;
    }
    res.set({
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
    });
    const callback =
      enabledSocial.length > 0 &&
      ((req.method === "GET" &&
        enabledSocial.some(
          (provider) => accountCallbackPaths[provider] === req.path,
        ) &&
        !req.headers.origin) ||
        (req.method === "POST" &&
          enabledSocial.includes("apple") &&
          req.path === accountCallbackPaths.apple &&
          req.headers.origin === "https://appleid.apple.com"));
    if (
      (!config.synthetic &&
        !(req.socket instanceof TLSSocket && req.socket.encrypted)) ||
      req.headers.host !== origin.host ||
      (!callback &&
        ((req.method !== "GET" && req.headers.origin !== config.origin) ||
          (req.headers.origin && req.headers.origin !== config.origin) ||
          req.headers["sec-fetch-site"] === "cross-site"))
    ) {
      res
        .status(403)
        .json({ error: "Secure same-origin account access required." });
      return;
    }
    if (
      !config.synthetic &&
      req.path.startsWith(`${accountAuthBasePath}/`) &&
      !allowedPaths.has(req.path.slice(accountAuthBasePath.length))
    ) {
      res.status(403).json({ error: "Account operation is not enabled." });
      return;
    }
    if (!config.synthetic) {
      // Forwarded origin claims remain untrusted in both prepared TLS modes.
      delete req.headers["x-forwarded-host"];
      delete req.headers["x-forwarded-proto"];
      delete req.headers.forwarded;
    }
    // The authenticated boundary owns proxy addresses; client headers never select them.
    const clientAddress = config.ingress
      ? config.ingress.clientAddress(req)
      : req.socket.remoteAddress;
    if (!clientAddress && !config.ingress?.authenticated(req)) {
      res.status(403).json({ error: "Verified client address required." });
      return;
    }
    // With no verified visitor IP, Better Auth uses its shared per-path bucket.
    // Never disable IP tracking: that would disable this rate limit entirely.
    if (clientAddress) req.headers["x-privateai-client-ip"] = clientAddress;
    else delete req.headers["x-privateai-client-ip"];
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
      deliveryAttempt.run({ failed: false }, () =>
        accountRequestStart.run(start.rows[0].started, next),
      );
    } catch {
      res
        .status(503)
        .json({ error: "Account access verification is unavailable." });
    }
  });
  router.get("/api/account/options", async (_req, res) => {
    try {
      const registered = (await auth.$context).socialProviders.map(
        (provider) => provider.id,
      );
      res.json({
        synthetic: config.synthetic,
        workspaceEnabled: config.workspaceEnabled === true,
        emailEnabled: config.emailEnabled !== false,
        socialProviders: enabledSocial.filter((provider) =>
          registered.includes(provider),
        ),
      });
    } catch {
      res
        .status(503)
        .json({ error: "Sign-in options are unavailable. Try again later." });
    }
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
          .object({
            confirmation: z.literal(
              config.synthetic ? "DELETE TEST ACCOUNT" : "DELETE ACCOUNT",
            ),
          })
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
          res.status(401).json({
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
        res.status(503).json({
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
      Object.values(accountCallbackPaths).some((path) => path === req.path);
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
  return { auth, router, ingress: config.ingress };
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

// Only implemented consumer journeys are exposed by the production candidate.
// Other library endpoints (profile/email/password changes, direct removals) stay closed.
const productionAuthPaths = new Set([
  "/get-session",
  "/sign-out",
  "/email-otp/send-verification-otp",
  "/sign-in/email-otp",
  "/passkey/generate-register-options",
  "/passkey/verify-registration",
  "/passkey/generate-authenticate-options",
  "/passkey/verify-authentication",
]);
