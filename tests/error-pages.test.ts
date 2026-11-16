// SS-10 and SS-11: branded 404/500 pages for page requests, and the final API error handler.
import express from "express";
import { z } from "zod";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { finalErrorHandler } from "../server/app";
import { errorPage, notFoundPage } from "../server/error-page";

let base = "";
let close: () => void;
beforeAll(async () => {
  const app = express();
  app.get("/", (_req, res) => void res.send("app"));
  app.get("/boom", () => {
    throw Error("SECRET_STACK_CANARY");
  });
  app.get("/refused", (_req, _res, next) => next(Object.assign(Error("no"), { status: 403 })));
  app.use("/api", express.json({ limit: "1kb" }));
  app.post("/api/echo", (req, res) => void res.json(req.body));
  app.post("/api/strict", (req) => {
    z.object({ id: z.string() }).strict().parse(req.body);
  });
  app.get("/api/boom", () => {
    throw Error("SECRET_STACK_CANARY");
  });
  app.use(notFoundPage);
  // A route added later (tests do this) is still reachable for non-page requests.
  app.get("/later", (_req, res) => void res.send("later"));
  app.use(errorPage);
  const server = app.listen(0);
  await new Promise((done) => server.once("listening", done));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  close = () => server.close();
});
afterAll(() => close());

const page = { accept: "text/html,application/xhtml+xml,*/*;q=0.8" };

describe("error pages", () => {
  it("serves a branded English 404 page for an unknown page path", async () => {
    const r = await fetch(`${base}/nope`, { headers: page });
    expect(r.status).toBe(404);
    expect(r.headers.get("content-type")).toContain("text/html");
    const csp = r.headers.get("content-security-policy")!;
    expect(csp).toMatch(/default-src 'none'; style-src 'sha256-[^']+'/);
    expect(csp).not.toContain("script-src");
    const html = await r.text();
    expect(html).toContain('<html lang="en">');
    expect(html).toContain("This page does not exist.");
    expect(html).toContain('href="/"');
    expect(html).toContain('href="/favicon.svg"');
    expect(html).not.toContain("<script");
    expect(html).not.toContain("/nope");
  });
  it("picks German from Accept-Language", async () => {
    const r = await fetch(`${base}/nope`, { headers: { ...page, "accept-language": "de-DE,de;q=0.9,en;q=0.5" } });
    const html = await r.text();
    expect(html).toContain('<html lang="de">');
    expect(html).toContain("Diese Seite gibt es nicht.");
    expect(html).toContain("Zu CometRow");
  });
  it("leaves API, asset and non-page requests alone", async () => {
    expect(await (await fetch(`${base}/api/missing`, { headers: page })).text()).not.toContain("CometRow");
    expect((await fetch(`${base}/assets/missing-abcdefgh.js`, { headers: page })).status).toBe(404);
    expect(await (await fetch(`${base}/assets/missing-abcdefgh.js`, { headers: page })).text()).not.toContain("CometRow");
    expect(await (await fetch(`${base}/later`)).text()).toBe("later");
    expect(await (await fetch(`${base}/`, { headers: page })).text()).toBe("app");
  });
  it("serves the 500 page for a page error, without details", async () => {
    const r = await fetch(`${base}/boom`, { headers: page });
    expect(r.status).toBe(500);
    const html = await r.text();
    expect(html).toContain("Something went wrong.");
    expect(html).not.toContain("SECRET_STACK_CANARY");
    expect((await fetch(`${base}/refused`, { headers: page })).status).toBe(404);
  });
});

describe("final API error handler", () => {
  it("keeps 400 for a body that does not parse", async () => {
    const r = await fetch(`${base}/api/echo`, { method: "POST", headers: { "content-type": "application/json" }, body: "{" });
    expect(r.status).toBe(400);
    expect(await r.json()).toEqual({ error: "Invalid request." });
  });
  it("keeps 400 for a body that fails a schema check", async () => {
    const r = await fetch(`${base}/api/strict`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: 1 }) });
    expect(r.status).toBe(400);
  });
  it("answers 413 for a body over the limit", async () => {
    const r = await fetch(`${base}/api/echo`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ a: "x".repeat(2000) }) });
    expect(r.status).toBe(413);
  });
  it("answers 503 without details for our own errors", async () => {
    const r = await fetch(`${base}/api/boom`);
    expect(r.status).toBe(503);
    const text = await r.text();
    expect(text).not.toContain("SECRET_STACK_CANARY");
    expect(JSON.parse(text).error).toMatch(/temporarily unavailable/);
  });
  it("passes on when the answer has already started", () => {
    let passed: unknown;
    finalErrorHandler(Error("late"), {} as express.Request, { headersSent: true } as express.Response, (e) => (passed = e));
    expect(passed).toBeInstanceOf(Error);
  });
});
