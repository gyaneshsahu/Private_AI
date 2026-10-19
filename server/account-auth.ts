import { betterAuth } from "better-auth";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { emailOTP } from "better-auth/plugins";
import { passkey } from "@better-auth/passkey";
import { toNodeHandler } from "better-auth/node";
import express from "express";
import type { Pool } from "pg";
import { createHmac } from "node:crypto";

export interface SyntheticAccountConfig {
  origin: string;
  secret: string;
  database: Pool;
  deliverCode: (message: { email: string; otp: string }) => Promise<void>;
}

/** Unmounted integration for synthetic tests only. No environment activation. */
export function createSyntheticAccountAuth(config: SyntheticAccountConfig) {
  const origin = new URL(config.origin);
  if (
    origin.protocol !== "http:" ||
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
    res.set({
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
    });
    if (
      req.headers.host !== origin.host ||
      (req.method !== "GET" && req.headers.origin !== config.origin) ||
      (req.headers.origin && req.headers.origin !== config.origin) ||
      req.headers["sec-fetch-site"] === "cross-site"
    ) {
      res.status(403).json({ error: "Same-origin synthetic access required." });
      return;
    }
    // Only the socket determines the rate-limit address, never a client header.
    req.headers["x-privateai-client-ip"] =
      req.socket.remoteAddress ?? "127.0.0.1";
    next();
  });
  router.all("/api/auth/*splat", toNodeHandler(auth));
  return { auth, router };
}
