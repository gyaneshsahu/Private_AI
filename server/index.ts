import { readFile } from "node:fs/promises";
import { createServer as createHttpsServer } from "node:https";
import { resolve } from "node:path";
import express from "express";
import { createApp } from "./app";
import { openInviteRegistry } from "./registry-storage";
import { privatemodeKeyExpiryWarning } from "./providers/privatemode-relay";
const port = Number(process.env.PORT ?? "4173");
if (!Number.isInteger(port) || port < 1024 || port > 65535)
  throw new Error("Invalid PORT");
let qualification: unknown;
try {
  qualification = JSON.parse(
    await readFile(
      process.env.PRIVATEAI_QUALIFICATION_FILE ?? ".local/qualification.json",
      "utf8",
    ),
  );
} catch {
  /* Missing or malformed evidence keeps live inference disabled. */
}
// The report's provider picks the key; the other provider's key is never read (manual switch).
const provider = (qualification as { provider?: unknown } | undefined)?.provider;
const privatemode = provider === "privatemode";
const apiKey = privatemode ? process.env.PRIVATEMODE_API_KEY : process.env.TINFOIL_API_KEY;
// The approved Privatemode manifest (scripts/privatemode-manifest.ts writes it); its SHA-256
// must be in the report's releaseDigests or the relay refuses to serve it.
let providerManifest: Uint8Array | undefined;
if (privatemode)
  providerManifest = await readFile(
    process.env.PRIVATEAI_PROVIDER_MANIFEST_FILE ?? ".local/privatemode-manifest.json",
  ).catch(() => undefined);
const expiry = privatemodeKeyExpiryWarning(
  privatemode ? (qualification as Parameters<typeof privatemodeKeyExpiryWarning>[0]) : undefined,
);
if (expiry) console.warn(expiry);
const dev = process.argv.includes("--dev");
// Local TLS on loopback only: the Privatemode SDK always calls its base URL over HTTPS.
const localTLS = process.env.PRIVATEAI_LOCAL_TLS === "1";
const origin =
  process.env.PRIVATEAI_ORIGIN ?? (localTLS ? `https://localhost:${port}` : `http://127.0.0.1:${port}`);
const loopback = ["127.0.0.1", "localhost"].includes(new URL(origin).hostname);
if (localTLS && !loopback) throw new Error("Local TLS is for a loopback origin only.");
const hosted = origin.startsWith("https:") && !loopback;
if (hosted && dev) throw new Error("Development middleware cannot be hosted.");
const app = createApp({
  origin,
  accessKey: process.env.PRIVATEAI_ACCESS_KEY,
  // Local review of the draft health-consent step only; the production composition never sets it.
  healthConsentDraft: process.env.PRIVATEAI_HEALTH_CONSENT_DRAFT === "1",
  providerDisclosureDraft: (["tinfoil", "privatemode"] as const).find(
    (p) => p === process.env.PRIVATEAI_PROVIDER_DISCLOSURE_DRAFT,
  ),
  invites: process.env.PRIVATEAI_INVITES_FILE
    ? openInviteRegistry(process.env.PRIVATEAI_INVITES_FILE, hosted)
    : undefined,
  dev,
  qualification,
  apiKey,
  providerManifest,
  cacheSaltSecret: process.env.PRIVATEAI_CACHE_SALT_SECRET,
  searchKey: process.env.BRAVE_SEARCH_API_KEY,
});
if (dev) {
  const { createServer } = await import("vite");
  const vite = await createServer({
    server: { middlewareMode: true },
    appType: "spa",
  });
  app.use(vite.middlewares);
} else {
  app.use(express.static(resolve("dist"), { index: false }));
  app.get("/", (_req, res) => {
    res.sendFile(resolve("dist/index.html"));
  });
}
const tls = localTLS ? await (await import("./local-tls")).localTLS() : undefined;
const listener = tls ? createHttpsServer({ key: tls.key, cert: tls.cert }, app) : app;
const server = listener.listen(port, hosted ? "0.0.0.0" : "127.0.0.1", () => {
  console.log(
    `CometRow ${hosted ? "restricted hosted evaluation" : "loopback"} listening on port ${port} (${origin}). No request content logging enabled.`,
  );
});

// A rolling replacement invalidates in-memory sessions and research approvals.
for (const signal of ["SIGTERM", "SIGINT"] as const) {
  process.once(signal, () => {
    server.close(() => void (tls?.dispose() ?? Promise.resolve()).finally(() => process.exit(0)));
    setTimeout(() => process.exit(1), 10000).unref();
  });
}
