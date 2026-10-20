import { createServer, type IncomingHttpHeaders } from "node:http";
import { request } from "node:https";

/** Render's edge is a platform trust boundary, not an authenticated mTLS peer. */
export function createRenderBridge(config: {
  port: number;
  ca: Buffer;
  key: Buffer;
  cert: Buffer;
  servername: string;
}) {
  if (!Number.isInteger(config.port) || config.port < 1 || config.port > 65535)
    throw Error("Invalid bridge upstream.");
  const origin = "https://app.cometrow.com";
  const server = createServer({ maxHeaderSize: 16 * 1024 }, (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Referrer-Policy", "no-referrer");
    const single = (name: string) => {
      const values: string[] = [];
      for (let i = 0; i < req.rawHeaders.length; i += 2)
        if (req.rawHeaders[i].toLowerCase() === name)
          values.push(req.rawHeaders[i + 1]);
      return values.length === 1 ? values[0] : undefined;
    };
    // Health checks expose only readiness, never account data or redirects.
    const health = req.method === "GET" && req.url === "/healthz";
    const requestOrigin = single("origin");
    const hasOrigin = req.rawHeaders.some(
      (value, i) => i % 2 === 0 && value.toLowerCase() === "origin",
    );
    if (
      !req.url?.startsWith("/") ||
      req.url.startsWith("//") ||
      !["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"].includes(
        req.method ?? "",
      ) ||
      (!health &&
        (single("host") !== "app.cometrow.com" ||
          (hasOrigin && requestOrigin !== origin) ||
          (!["GET", "HEAD"].includes(req.method!) && requestOrigin !== origin)))
    ) {
      res.writeHead(403).end("Request not admitted.");
      req.resume();
      return;
    }
    const headers: IncomingHttpHeaders = {
      host: "app.cometrow.com",
      "x-privateai-edge-proto": "https",
      "x-privateai-edge-admission": "shared",
    };
    // Positive list avoids both forwarded identity spoofing and hop-by-hop headers.
    if (!health)
      for (const name of [
        "cookie",
        "origin",
        "content-type",
        "accept",
        "accept-language",
        "sec-fetch-site",
        "sec-fetch-mode",
        "sec-fetch-dest",
      ])
        if (req.headers[name] !== undefined) headers[name] = req.headers[name];
    let bytes = 0;
    let oversized = false;
    let chunks: Buffer[] = [];
    req.on("error", () => res.destroy());
    req.on("data", (chunk: Buffer) => {
      bytes += chunk.length;
      if (bytes > 1024 * 1024) {
        if (!oversized) res.writeHead(413).end("Request too large.");
        oversized = true;
        chunks = [];
      } else if (!oversized) chunks.push(chunk);
    });
    req.on("end", () => {
      if (oversized || res.destroyed) return;
      const upstream = request(
        {
          hostname: "127.0.0.1",
          port: config.port,
          servername: config.servername,
          ca: config.ca,
          key: config.key,
          cert: config.cert,
          rejectUnauthorized: true,
          agent: false,
          method: health ? "GET" : req.method,
          path: health ? "/readyz" : req.url,
          headers,
          timeout: 15_000,
        },
        (answer) => {
          if (health) {
            answer.resume();
            res.writeHead(answer.statusCode === 200 ? 200 : 503).end();
            return;
          }
          for (const [name, value] of Object.entries(answer.headers))
            if (
              value !== undefined &&
              ![
                "connection",
                "keep-alive",
                "transfer-encoding",
                "upgrade",
                "proxy-authenticate",
                "proxy-authorization",
                "trailer",
                "cache-control",
              ].includes(name)
            )
              res.setHeader(name, value);
          res.writeHead(answer.statusCode ?? 502);
          answer.on("error", () => res.destroy());
          answer.pipe(res);
        },
      );
      const fail = () => {
        if (!res.headersSent) res.writeHead(502).end("Service unavailable.");
        else res.destroy();
      };
      upstream.on("error", fail);
      upstream.on("timeout", () => upstream.destroy(Error("Upstream timeout")));
      req.on("aborted", () => upstream.destroy());
      res.on("close", () => upstream.destroy());
      upstream.end(health ? undefined : Buffer.concat(chunks));
    });
  });
  server.on("upgrade", (_req, socket) => socket.destroy());
  server.on("connect", (_req, socket) => socket.destroy());
  server.maxConnections = 64;
  server.headersTimeout = 10_000;
  server.requestTimeout = 30_000;
  server.keepAliveTimeout = 5000;
  return server;
}
