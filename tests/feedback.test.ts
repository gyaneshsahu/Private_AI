// Feedback from testers (docs/feedback-20261125.md), the server side with the in-memory store: the
// switch, sending (with and without a rating and a screenshot), the daily bound, what is refused,
// the owner's list without picture bytes, the screenshot on request, delete, and that only an
// owner can read or delete.
import { createServer } from "node:http";
import { afterEach, expect, it } from "vitest";
import { createApp } from "../server/app";
import { MemoryFeedbackStore, type FeedbackSettings } from "../server/feedback";
import { FEEDBACK, feedbackRequest, type FeedbackEntry } from "../shared/feedback";

const servers: { close(): void }[] = [];
afterEach(() => servers.splice(0).forEach((s) => s.close()));
const PNG = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mN4+P/LfwAJYQPrk2v6YwAAAABJRU5ErkJggg==";
const context = { lang: "en", width: 1280, height: 900 };

async function start(feedback?: FeedbackSettings) {
  const server = createServer();
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw Error("port");
  const origin = `http://127.0.0.1:${address.port}`;
  server.on("request", createApp({ origin, dev: true, ...(feedback ? { feedback } : {}) }));
  servers.push(server);
  const first = await fetch(`${origin}/api/status`);
  const cookie = first.headers.get("set-cookie")!.split(";")[0];
  const status = (await first.json()) as { csrf: string; feedback?: true; feedbackOwner?: true; ownerDashboard?: true };
  const call = (method: string, path: string, body?: unknown, csrf = status.csrf) =>
    fetch(origin + path, {
      method,
      headers: { cookie, "x-privateai-csrf": csrf, ...(body === undefined ? {} : { "content-type": "application/json" }) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  return { status, call };
}
const OWNER = "local@development.test"; // the development server's stand-in address

it("the switch: off by default; on, everyone signed in can send and only an owner can read", async () => {
  const off = await start();
  expect(off.status.feedback).toBeUndefined();
  expect((await off.call("POST", "/api/feedback", { category: "idea", text: "x", context })).status).toBe(404);
  expect((await off.call("GET", "/api/owner/feedback")).status).toBe(404);
  const tester = await start({ store: new MemoryFeedbackStore(), ownerEmails: ["owner@example.test"] });
  expect(tester.status).toMatchObject({ feedback: true });
  expect(tester.status.feedbackOwner).toBeUndefined();
  expect(tester.status.ownerDashboard).toBeUndefined();
  expect((await tester.call("POST", "/api/feedback", { category: "idea", text: "A dark mode toggle in the menu", context })).status).toBe(201);
  // Not an owner: the list, a screenshot and delete all answer "not found".
  for (const [method, path] of [["GET", "/api/owner/feedback"], ["GET", "/api/owner/feedback/00000000-0000-4000-8000-000000000000/screenshot"], ["DELETE", "/api/owner/feedback/00000000-0000-4000-8000-000000000000"]] as const)
    expect((await tester.call(method, path)).status, path).toBe(404);
  expect((await start({ store: new MemoryFeedbackStore(), ownerEmails: [OWNER] })).status).toMatchObject({ feedback: true, feedbackOwner: true, ownerDashboard: true });
});

it("send, list without picture bytes, open the screenshot, delete", async () => {
  const s = await start({ store: new MemoryFeedbackStore(), ownerEmails: [OWNER] });
  expect((await s.call("POST", "/api/feedback", { category: "problem", text: "  The send button did nothing.  ", rating: 2, screenshot: { type: "image/png", data: PNG }, context })).status).toBe(201);
  expect((await s.call("POST", "/api/feedback", { category: "wording", text: "\"Trial scope\" is unclear.", context: { lang: "de", width: 375, height: 812 } })).status).toBe(201);
  const reply = await s.call("GET", "/api/owner/feedback");
  expect(reply.headers.get("cache-control")).toBe("no-store");
  const { entries } = (await reply.json()) as { entries: FeedbackEntry[] };
  expect(entries).toHaveLength(2);
  const first = entries.find((e) => e.category === "problem")!;
  expect(first).toMatchObject({ from: OWNER, text: "The send button did nothing.", rating: 2, hasScreenshot: true, lang: "en", width: 1280, height: 900 });
  expect(entries.find((e) => e.category === "wording")).toMatchObject({ hasScreenshot: false, lang: "de", width: 375 });
  expect(entries.find((e) => e.category === "wording")).not.toHaveProperty("rating");
  expect(JSON.stringify(entries)).not.toContain(PNG);
  // The screenshot comes only when asked for, as a picture and nothing else.
  const shot = await s.call("GET", `/api/owner/feedback/${first.id}/screenshot`);
  expect(shot.status).toBe(200);
  expect(shot.headers.get("content-type")).toBe("image/png");
  expect(shot.headers.get("x-content-type-options")).toBe("nosniff");
  expect(Buffer.from(await shot.arrayBuffer()).toString("base64")).toBe(PNG);
  // Delete: gone from the list, its screenshot too; deleting twice says so.
  expect((await s.call("DELETE", `/api/owner/feedback/${first.id}`)).status).toBe(204);
  expect((await s.call("DELETE", `/api/owner/feedback/${first.id}`)).status).toBe(404);
  expect((await s.call("GET", `/api/owner/feedback/${first.id}/screenshot`)).status).toBe(404);
  expect(((await (await s.call("GET", "/api/owner/feedback")).json()) as { entries: unknown[] }).entries).toHaveLength(1);
  expect((await s.call("DELETE", "/api/owner/feedback/not-an-id")).status).toBe(404);
});

it("what is refused: bad bodies, a wrong token, more than the day allows", async () => {
  const s = await start({ store: new MemoryFeedbackStore(), ownerEmails: [OWNER] });
  const ok = { category: "idea", text: "x", context };
  for (const bad of [
    {},
    { ...ok, text: "   " },
    { ...ok, text: "x".repeat(FEEDBACK.textMax + 1) },
    { ...ok, category: "praise" },
    { ...ok, rating: 0 },
    { ...ok, rating: 6 },
    { ...ok, screenshot: { type: "image/gif", data: PNG } },
    { ...ok, screenshot: { type: "image/png", data: "data:image/png;base64,AAAA" } },
    { ...ok, context: { lang: "fr", width: 100, height: 100 } },
    { ...ok, context: { ...context, userAgent: "x" } },
    { ...ok, email: "someone@example.test" },
  ])
    expect((await s.call("POST", "/api/feedback", bad)).status, JSON.stringify(bad).slice(0, 80)).toBe(400);
  expect((await s.call("POST", "/api/feedback", ok, "wrong")).status).toBe(403);
  for (let i = 0; i < FEEDBACK.perDay; i++) expect((await s.call("POST", "/api/feedback", ok)).status).toBe(201);
  const over = await s.call("POST", "/api/feedback", ok);
  expect(over.status).toBe(429);
  expect(await over.json()).toEqual({ error: "limit", limit: FEEDBACK.perDay });
  expect(feedbackRequest.safeParse({ ...ok, screenshot: { type: "image/png", data: "A".repeat(FEEDBACK.screenshotChars + 1) } }).success).toBe(false);
});
