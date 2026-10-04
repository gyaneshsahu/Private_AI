import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import express from "express";
import { createApp } from "./app";
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
const dev = process.argv.includes("--dev");
const origin = process.env.PRIVATEAI_ORIGIN ?? `http://127.0.0.1:${port}`;
const hosted = origin.startsWith("https:");
if (hosted && dev) throw new Error("Development middleware cannot be hosted.");
const app = createApp({
  origin,
  accessKey: process.env.PRIVATEAI_ACCESS_KEY,
  dev,
  qualification,
  apiKey: process.env.TINFOIL_API_KEY,
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
const server = app.listen(port, hosted ? "0.0.0.0" : "127.0.0.1", () => {
  console.log(
    `PrivateAI ${hosted ? "restricted hosted evaluation" : "loopback"} listening on port ${port}. No request content logging enabled.`,
  );
});

// A rolling replacement invalidates in-memory sessions and research approvals.
for (const signal of ["SIGTERM", "SIGINT"] as const) {
  process.once(signal, () => {
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 10000).unref();
  });
}
