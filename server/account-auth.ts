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

export interface SyntheticAccountConfig {
  origin: string;
  secret: string;
  database: Pool;
  deliverCode: (message: { email: string; otp: string }) => Promise<void>;
  /** Dummy provider IDs only; test harness must intercept all external fetches. */
  socialFixtures?: boolean;
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
      }),
    ],
  });
  const router = express.Router();
  router.use((req, res, next) => {
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
    next();
  });
  router.get("/api/account/options", (_req, res) => {
    res.json({
      synthetic: true,
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
  router.all("/api/auth/*splat", toNodeHandler(auth));
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
