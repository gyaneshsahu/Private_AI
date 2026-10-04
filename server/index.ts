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
const app = createApp({
  origin: `http://127.0.0.1:${port}`,
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
app.listen(port, "127.0.0.1", () => {
  console.log(
    `PrivateAI listening on loopback port ${port}. No request content logging enabled.`,
  );
});
