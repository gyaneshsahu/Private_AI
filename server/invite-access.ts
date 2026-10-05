import express from "express";
import session from "express-session";
import memoryStore from "memorystore";
import { randomBytes } from "node:crypto";
import type { InviteRegistry } from "./invite-registry";
declare module "express-session" {
  interface SessionData {
    accountId: string;
    until: number;
  }
}
export function inviteAccess(origin: string, registry: InviteRegistry) {
  const router = express.Router();
  const url = new URL(origin),
    secure = url.protocol === "https:";
  const Store = memoryStore(session);
  const store = new Store({ checkPeriod: 60000, max: 200 });
  router.use((req, res, next) => {
    res.set({
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
    });
    if (
      req.headers.host !== url.host ||
      (secure && req.headers["x-forwarded-proto"] !== "https") ||
      (req.headers.origin && req.headers.origin !== origin) ||
      req.headers["sec-fetch-site"] === "cross-site" ||
      (req.method === "POST" && req.headers.origin !== origin)
    ) {
      res.status(403).send("Same-origin access required.");
      return;
    }
    if (secure) res.setHeader("Strict-Transport-Security", "max-age=31536000");
    next();
  });
  router.use(
    session({
      secret: randomBytes(32).toString("hex"),
      name: "privateai-access",
      store,
      proxy: secure,
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        secure,
        sameSite: "strict",
        maxAge: 3600000,
        path: "/",
      },
    }),
  );
  router.get("/auth", (_req, res) => {
    res.setHeader("Referrer-Policy", "same-origin");
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'none'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'",
    );
    res
      .type("html")
      .send(
        `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>PrivateAI access</title><main><h1>PrivateAI trial access</h1><p>Use your individual access ID. Access is not anonymous. PrivateAI and its host receive identity and network metadata.</p><h2>Sign in</h2><form method="post" action="/auth/login"><label>Access ID <input name="id" autocomplete="username" required maxlength="36"></label><label>Password <input name="password" type="password" autocomplete="current-password" required maxlength="256"></label><button>Sign in</button></form><h2>Accept invitation</h2><form method="post" action="/auth/register"><label>Access ID <input name="id" autocomplete="username" required maxlength="36"></label><label>Invitation code <input name="token" type="password" autocomplete="off" required maxlength="100"></label><label>Choose password (at least 12 characters) <input name="password" type="password" autocomplete="new-password" required minlength="12" maxlength="256"></label><button>Accept invitation</button></form><p>Keep your access ID. Your local vault has a separate passphrase. No password recovery service is provided in this trial.</p></main></html>`,
      );
  });
  let attempts = 0,
    attemptWindow = 0;
  router.post(
    ["/auth/login", "/auth/register"],
    express.urlencoded({ extended: false, limit: "2kb" }),
    async (req, res) => {
      if (Date.now() - attemptWindow > 60000) {
        attemptWindow = Date.now();
        attempts = 0;
      }
      if (++attempts > 30) {
        res.status(429).send("Too many sign-in attempts. Try later.");
        return;
      }
      const { id, password, token } = req.body ?? {};
      if (
        typeof id !== "string" ||
        !/^[a-f0-9-]{36}$/.test(id) ||
        typeof password !== "string" ||
        password.length > 256
      ) {
        res.status(401).send("Access could not be verified.");
        return;
      }
      const valid =
        req.path === "/auth/register"
          ? typeof token === "string" &&
            (await registry.register(id, token, password))
          : await registry.login(id, password);
      if (!valid) {
        res.status(401).send("Access could not be verified.");
        return;
      }
      req.session.regenerate((error) => {
        if (error) {
          res.status(503).end();
          return;
        }
        req.session.accountId = id;
        req.session.until = Date.now() + 3600000;
        req.session.save((error) => {
          if (error) res.status(503).end();
          else res.redirect(303, "/");
        });
      });
    },
  );
  router.post("/auth/logout", (req, res) => {
    req.session.destroy(() => {
      res.clearCookie("privateai-access", {
        path: "/",
        secure,
        httpOnly: true,
        sameSite: "strict",
      });
      res.status(204).end();
    });
  });
  let total = 0,
    window = 0;
  router.use((req, res, next) => {
    const id = req.session.accountId;
    const expiry = req.session.until ?? 0;
    if (!id || expiry <= Date.now() || !registry.active(id)) {
      if (req.path === "/" && req.method === "GET") res.redirect(303, "/auth");
      else
        res.status(401).json({
          error: "Individual access expired or revoked. Sign in again.",
        });
      return;
    }
    if (Date.now() - window > 3600000) {
      window = Date.now();
      total = 0;
    }
    if (
      req.method === "POST" &&
      (++total > 2000 || !registry.allowRequest(id))
    ) {
      res.status(429).json({ error: "Trial request limit reached." });
      return;
    }
    res.locals.accountId = id;
    res.locals.accessSession = req.sessionID;
    const timer = setInterval(() => {
      if (Date.now() >= expiry || !registry.active(id)) res.destroy();
    }, 1000);
    timer.unref();
    res.on("close", () => clearInterval(timer));
    res.on("finish", () => clearInterval(timer));
    next();
  });
  return router;
}
