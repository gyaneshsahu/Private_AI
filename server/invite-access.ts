import express from "express";
import session from "express-session";
import memoryStore from "memorystore";
import { randomBytes } from "node:crypto";
import type { InviteRegistry } from "./invite-registry";
import { sendAccessPage } from "./access-page";
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
    sendAccessPage(res);
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
        res.setHeader("Retry-After", "60");
        sendAccessPage(res, 429, "limited");
        return;
      }
      const { id, password, token } = req.body ?? {};
      if (
        typeof id !== "string" ||
        !/^[a-f0-9-]{36}$/.test(id) ||
        typeof password !== "string" ||
        password.length > 256
      ) {
        sendAccessPage(res, 401, "invalid");
        return;
      }
      const valid =
        req.path === "/auth/register"
          ? typeof token === "string" &&
            (await registry.register(id, token, password))
          : await registry.login(id, password);
      if (!valid) {
        sendAccessPage(res, 401, "invalid");
        return;
      }
      req.session.regenerate((error) => {
        if (error) {
          sendAccessPage(res, 503, "unavailable");
          return;
        }
        req.session.accountId = id;
        req.session.until = Date.now() + 3600000;
        req.session.save((error) => {
          if (error) sendAccessPage(res, 503, "unavailable");
          else res.redirect(303, "/");
        });
      });
    },
  );
  router.post("/auth/logout", (req, res) => {
    req.session.destroy((error) => {
      if (error) {
        res
          .status(503)
          .json({ error: "Sign out could not complete. Try again." });
        return;
      }
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
    const accessSession = req.sessionID;
    const timer = setInterval(() => {
      try {
        if (Date.now() >= expiry || !registry.active(id)) {
          res.destroy();
          return;
        }
        store.get(accessSession, (error, current) => {
          if (
            error ||
            !current ||
            current.accountId !== id ||
            (current.until ?? 0) <= Date.now()
          )
            res.destroy();
        });
      } catch {
        res.destroy();
      }
    }, 1000);
    timer.unref();
    res.on("close", () => clearInterval(timer));
    res.on("finish", () => clearInterval(timer));
    next();
  });
  return router;
}
