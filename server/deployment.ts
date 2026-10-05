import { createHash, timingSafeEqual } from "node:crypto";
import type { RequestHandler } from "express";

export function deploymentAccess(
  origin: string,
  accessKey?: string,
  individualAccess = false,
): RequestHandler {
  const url = new URL(origin);
  if (url.origin !== origin || url.username || url.password)
    throw new Error("Configure an exact application origin without a path.");
  const local = url.protocol === "http:" && url.hostname === "127.0.0.1";
  if (
    !local &&
    (url.protocol !== "https:" ||
      (!individualAccess &&
        (!accessKey || !/^[A-Za-z0-9_-]{32,128}$/.test(accessKey))))
  )
    throw new Error(
      "Hosted evaluation requires HTTPS and a strong deployment access key.",
    );
  const expected = createHash("sha256")
    .update(`evaluator:${accessKey ?? ""}`)
    .digest();
  return (req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    // A host health probe has no session, configuration or provider information.
    if (!local && req.method === "GET" && req.originalUrl === "/healthz") {
      res.type("text/plain").send("ok");
      return;
    }
    if (local) {
      next();
      return;
    }
    if (
      req.headers.host !== url.host ||
      req.headers["x-forwarded-proto"] !== "https"
    ) {
      res.status(403).json({ error: "HTTPS application origin required." });
      return;
    }
    res.setHeader("Strict-Transport-Security", "max-age=31536000");
    if (individualAccess) {
      next();
      return;
    }
    const authorization = req.headers.authorization ?? "";
    const encoded = /^Basic ([A-Za-z0-9+/]+={0,2})$/.exec(authorization)?.[1];
    const supplied =
      encoded && encoded.length <= 512
        ? Buffer.from(encoded, "base64")
        : Buffer.alloc(0);
    const digest = createHash("sha256").update(supplied).digest();
    if (!timingSafeEqual(expected, digest)) {
      res.setHeader(
        "WWW-Authenticate",
        'Basic realm="PrivateAI development", charset="UTF-8"',
      );
      res.status(401).json({ error: "Restricted development deployment." });
      return;
    }
    next();
  };
}
