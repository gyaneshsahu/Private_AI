import express from "express";
import session from "express-session";
import memoryStore from "memorystore";
import { randomBytes } from "node:crypto";
import type { InviteRegistry } from "./invite-registry";
import { sendAccessPage, sendPasswordPage } from "./access-page";
declare module "express-session" {
  interface SessionData {
    accountId: string;
    until: number;
    accessEpoch: string;
    credentialVersion: number;
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
      (req.method === "POST" && req.headers.origin !== origin)
    ) {
      res.status(403).send("Same-origin access required.");
      return;
    }
    if (secure) res.setHeader("Strict-Transport-Security", "max-age=31536000");
    if (req.headers["sec-fetch-site"] === "cross-site") {
      const publicNavigation =
        req.method === "GET" &&
        req.headers["sec-fetch-mode"] === "navigate" &&
        req.headers["sec-fetch-dest"] === "document";
      if (publicNavigation && req.path === "/auth") {
        sendAccessPage(res);
      } else if (publicNavigation && req.path === "/") {
        res.redirect(303, "/auth");
      } else {
        res.status(403).send("Same-origin access required.");
      }
      return;
    }
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
    attemptWindow = 0,
    verifying = 0;
  const validSession = (req: express.Request) =>
    !!req.session.accountId &&
    (req.session.until ?? 0) > Date.now() &&
    registry.active(req.session.accountId) &&
    req.session.credentialVersion ===
      registry.credentialVersion(req.session.accountId);
  router.post(
    ["/auth/login", "/auth/register", "/auth/password"],
    (_req, res, next) => {
      const page =
        _req.path === "/auth/password" ? sendPasswordPage : sendAccessPage;
      if (_req.path === "/auth/password" && !validSession(_req)) {
        sendAccessPage(res, 401, "invalid");
        return;
      }
      if (Date.now() - attemptWindow > 60000) {
        attemptWindow = Date.now();
        attempts = 0;
      }
      if (++attempts > 30) {
        res.setHeader("Retry-After", "60");
        page(res, 429, "limited");
        return;
      }
      next();
    },
    express.urlencoded({ extended: false, limit: "2kb" }),
    async (req, res) => {
      const changing = req.path === "/auth/password";
      const page = changing ? sendPasswordPage : sendAccessPage;
      const { password, token, replacement, confirmation } = req.body ?? {};
      const id = changing ? req.session.accountId : req.body?.id;
      if (
        typeof id !== "string" ||
        !/^[a-f0-9-]{36}$/.test(id) ||
        typeof password !== "string" ||
        password.length > 256
      ) {
        page(res, 401, "invalid");
        return;
      }
      if (verifying >= 2) {
        res.setHeader("Retry-After", "5");
        page(res, 503, "busy");
        return;
      }
      let valid = false;
      let version: number | undefined;
      verifying++;
      try {
        version = registry.credentialVersion(id);
        valid = changing
          ? typeof req.session.credentialVersion === "number" &&
            typeof replacement === "string" &&
            confirmation === replacement &&
            (await registry.changePassword(
              id,
              req.session.credentialVersion,
              password,
              replacement,
            ))
          : req.path === "/auth/register"
            ? typeof token === "string" &&
              (await registry.register(id, token, password))
            : await registry.login(id, password);
      } catch {
        page(res, 503, "unavailable");
        return;
      } finally {
        verifying--;
      }
      if (!valid) {
        page(res, 401, "invalid");
        return;
      }
      if (changing) {
        // The persisted version already invalidates every old session, even if destruction fails.
        req.session.destroy(() => {
          res.clearCookie("privateai-access", {
            path: "/",
            secure,
            httpOnly: true,
            sameSite: "strict",
          });
          res.redirect(303, "/auth");
        });
        return;
      }
      const authenticatedVersion =
        req.path === "/auth/register"
          ? registry.credentialVersion(id)
          : version;
      req.session.regenerate((error) => {
        if (error) {
          sendAccessPage(res, 503, "unavailable");
          return;
        }
        req.session.accountId = id;
        req.session.credentialVersion = authenticatedVersion!;
        req.session.accessEpoch = randomBytes(16).toString("hex");
        req.session.until = Date.now() + 3600000;
        req.session.save((error) => {
          if (error) sendAccessPage(res, 503, "unavailable");
          else res.redirect(303, "/");
        });
      });
    },
  );
  router.use(
    ["/auth/login", "/auth/register", "/auth/password"],
    (
      error: unknown,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) => {
      const status =
        typeof error === "object" && error !== null && "status" in error
          ? error.status
          : undefined;
      (_req.path === "/auth/password" ? sendPasswordPage : sendAccessPage)(
        res,
        status === 413 ? 413 : status === 400 ? 400 : 503,
        status === 413 || status === 400 ? "invalid" : "unavailable",
      );
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
    if (!id || !validSession(req)) {
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
    res.locals.accessEpoch = req.session.accessEpoch;
    const accessSession = req.sessionID;
    const timer = setInterval(() => {
      try {
        if (!validSession(req)) {
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
  router.get("/auth/password", (_req, res) => sendPasswordPage(res));
  return router;
}
