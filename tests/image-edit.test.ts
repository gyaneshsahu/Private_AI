// Image editing (docs/image-editing-20261125.md) with the provider mocked: the switch, the route
// (an edit is one image of the day, taken at the start and given back on failure; refusals; masks
// honoured or refused; uploads only where switched on; nothing kept) and the Black Forest Labs
// editor against a fake API. No network.
import { createServer } from "node:http";
import { afterEach, expect, it } from "vitest";
import { createApp } from "../server/app";
import { mockImageProvider } from "../server/image-creation";
import { bflImageEditor, mockImageEditor, type ImageEditInput, type ImageEditor } from "../server/image-edit";
import { SqliteUsageRecords } from "../server/usage-records";
import { FIXED_EDIT_PROMPT, imageEditRequest } from "../shared/image-edit";

const servers: { close(): void }[] = [];
afterEach(() => servers.splice(0).forEach((s) => s.close()));
const PNG = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mN4+P/LfwAJYQPrk2v6YwAAAABJRU5ErkJggg==";

async function start(o: { editor?: ImageEditor; uploads?: boolean; dailyImages?: number; editing?: boolean } = {}) {
  const records = new SqliteUsageRecords(":memory:");
  const server = createServer();
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw Error("port");
  const origin = `http://127.0.0.1:${address.port}`;
  const app = createApp({
    origin,
    dev: true,
    imageCreation: { provider: mockImageProvider(), dailyImages: o.dailyImages ?? 3 },
    ...(o.editing === false ? {} : { imageEditing: { editor: o.editor ?? mockImageEditor(), uploads: o.uploads ?? false } }),
    metering: { plan: "alpha", records },
  });
  server.on("request", app);
  servers.push(server);
  const first = await fetch(`${origin}/api/status`);
  const cookie = first.headers.get("set-cookie")!.split(";")[0];
  const status = (await first.json()) as { csrf: string; imageCreation?: { limit: number; used?: number }; imageEditing?: { masks: boolean; uploads: boolean } };
  const post = (path: string, body: unknown, csrf = status.csrf) =>
    fetch(origin + path, { method: "POST", headers: { "content-type": "application/json", cookie, "x-privateai-csrf": csrf }, body: JSON.stringify(body) });
  const edit = (change: Record<string, unknown> = {}) =>
    post("/api/images/edit", { image: PNG, type: "image/png", prompt: "Make the sky orange", tool: "describe", source: "created", ...change });
  const used = async () => ((await (await fetch(`${origin}/api/status`, { headers: { cookie } })).json()) as typeof status).imageCreation?.used;
  return { status, post, edit, used, records };
}

it("the switch: off by default, and the status says what the browser needs", async () => {
  const off = await start({ editing: false });
  expect(off.status.imageEditing).toBeUndefined();
  expect((await off.edit()).status).toBe(404);
  expect((await start()).status.imageEditing).toEqual({ masks: false, uploads: false });
  expect((await start({ editor: mockImageEditor("mock-image", true), uploads: true })).status.imageEditing).toEqual({ masks: true, uploads: true });
});

it("an edit sends one picture and its words, returns the new picture, and counts as one image of the day", async () => {
  const seen: ImageEditInput[] = [];
  const mock = mockImageEditor();
  const s = await start({ editor: { ...mock, edit: (input, signal) => (seen.push(input), mock.edit(input, signal)) }, dailyImages: 3 });
  const ok = await s.edit();
  expect(ok.status).toBe(200);
  expect(ok.headers.get("cache-control")).toBe("no-store");
  const body = (await ok.json()) as { type: string; data: string; model: string };
  expect(body).toMatchObject({ type: "image/png", model: "mock-image" });
  expect(Buffer.from(body.data, "base64").subarray(1, 4).toString()).toBe("PNG");
  expect(seen[0]).toMatchObject({ type: "image/png", prompt: "Make the sky orange" });
  expect(Buffer.from(seen[0].image).toString("base64")).toBe(PNG);
  expect(seen[0].mask).toBeUndefined();
  expect(await s.used()).toBe(1);
  // Creating and editing share the day's images: one created image is the second of three.
  expect((await s.post("/api/images/create", { prompt: "A calm lake" })).status).toBe(200);
  // Resize and erase carry fixed instructions and their size; the user's text is not needed.
  expect((await s.edit({ tool: "resize", size: "portrait", prompt: "" })).status).toBe(200);
  expect(seen[1]).toMatchObject({ prompt: FIXED_EDIT_PROMPT.resize, width: 832, height: 1248 });
  // The day is used up: refused at the start, nothing reaches the provider.
  const over = await s.edit();
  expect(over.status).toBe(429);
  expect(await over.json()).toEqual({ error: "limit", limit: 3 });
  expect(seen).toHaveLength(2);
  // One usage record per edit, under the image feature, with nothing of the picture or the words.
  const records = await s.records.since("local-development", 0);
  expect(records.filter((r) => r.feature === "image-create" && r.outcome === "complete")).toHaveLength(3);
  expect(JSON.stringify(records)).not.toMatch(/sky|orange|iVBOR/);
});

it("refusals and failures cost nothing: our own rules, the provider's refusal, its capacity", async () => {
  const s = await start({ dailyImages: 1 });
  const person = await s.edit({ prompt: "Turn it into a photo of Angela Merkel" });
  expect(person.status).toBe(422);
  expect(await person.json()).toEqual({ error: "refused", reason: "realPerson" });
  const provider = await s.edit({ prompt: "MOCK_PROVIDER_REFUSED" });
  expect(provider.status).toBe(422);
  expect(await provider.json()).toEqual({ error: "refused", reason: "provider" });
  expect((await s.edit({ prompt: "MOCK_PROVIDER_CAPACITY" })).status).toBe(503);
  expect(await s.used()).toBe(0);
  expect((await s.edit()).status).toBe(200);
});

it("a mask is honoured or refused, never ignored; uploads need their switch; bad bodies are refused", async () => {
  const seen: ImageEditInput[] = [];
  const masking = mockImageEditor("mock-image", true);
  const withMasks = await start({ editor: { ...masking, edit: (input, signal) => (seen.push(input), masking.edit(input, signal)) } });
  expect((await withMasks.edit({ tool: "erase", prompt: "", mask: PNG })).status).toBe(200);
  expect(seen[0]).toMatchObject({ erase: true, prompt: FIXED_EDIT_PROMPT.erase });
  expect(Buffer.from(seen[0].mask!).toString("base64")).toBe(PNG);
  const noMasks = await start();
  expect((await noMasks.edit({ tool: "area", mask: PNG })).status).toBe(400);
  expect(await noMasks.used()).toBe(0);
  // The user's own photo: only where uploads are switched on.
  const upload = await noMasks.edit({ source: "upload" });
  expect(upload.status).toBe(403);
  expect((await (await start({ uploads: true })).edit({ source: "upload" })).status).toBe(200);
  for (const bad of [{ prompt: "" }, { tool: "resize" }, { size: "square" }, { image: "data:image/png;base64,AAAA" }, { type: "image/gif" }, { extra: 1 }, { tool: "paint" }])
    expect((await noMasks.edit(bad)).status, JSON.stringify(bad)).toBe(400);
  // Without the session's token nothing is edited.
  expect((await noMasks.post("/api/images/edit", { image: PNG, type: "image/png", prompt: "x", tool: "describe", source: "created" }, "wrong")).status).toBe(403);
});

it("the request shape: describe and area need words, only resize has a size", () => {
  const base = { image: PNG, type: "image/png", source: "created" };
  expect(imageEditRequest.safeParse({ ...base, tool: "area", prompt: "a red door" }).success).toBe(true);
  expect(imageEditRequest.safeParse({ ...base, tool: "erase", prompt: "" }).success).toBe(true);
  expect(imageEditRequest.safeParse({ ...base, tool: "area", prompt: " " }).success).toBe(false);
  expect(imageEditRequest.safeParse({ ...base, tool: "resize", prompt: "", size: "landscape" }).success).toBe(true);
});

it("Black Forest Labs editor: the edit is the creation address with the picture added; masks only with the fill switch", async () => {
  const calls: { url: string; key?: string; body?: Record<string, unknown> }[] = [];
  const jpeg = Uint8Array.from([255, 216, 255]);
  const fake: typeof fetch = async (input, init) => {
    const url = String(input);
    const headers = new Headers(init?.headers);
    calls.push({ url, key: headers.get("x-key") ?? undefined, body: typeof init?.body === "string" ? JSON.parse(init.body) : undefined });
    if (init?.method === "POST") return Response.json({ id: "t1", polling_url: "https://api.eu.bfl.ai/v1/get_result?id=t1" });
    if (url.startsWith("https://api.eu.bfl.ai/v1/get_result")) return Response.json({ status: "Ready", result: { sample: "https://delivery.example/s.jpeg" } });
    if (url === "https://delivery.example/s.jpeg") return new Response(jpeg, { headers: { "content-type": "image/jpeg" } });
    return new Response("no", { status: 404 });
  };
  const signal = new AbortController().signal;
  const picture = Uint8Array.from([1, 2, 3]);
  const mask = Uint8Array.from([9, 9]);
  const plain = bflImageEditor({ apiKey: "SYNTHETIC_KEY", model: "flux-2-klein", fetch: fake, pollMs: 1 });
  expect(plain.masks).toBe(false);
  expect(await plain.edit({ image: picture, type: "image/jpeg", prompt: "Make it night", width: 832, height: 1248 }, signal)).toEqual({ bytes: jpeg, type: "image/jpeg", model: "flux-2-klein" });
  expect(calls[0].url).toBe("https://api.eu.bfl.ai/v1/flux-2-klein-4b");
  expect(calls[0].key).toBe("SYNTHETIC_KEY");
  expect(calls[0].body).toMatchObject({ prompt: "Make it night", input_image: "AQID", width: 832, height: 1248 });
  expect(calls.find((c) => c.url.includes("delivery"))?.key).toBeUndefined();
  // With the fill switch: a described area goes to Fill, an erase to Erase, both with the mask.
  calls.length = 0;
  const fill = bflImageEditor({ apiKey: "k", model: "flux-2-pro", fetch: fake, pollMs: 1, fill: true });
  expect(fill.masks).toBe(true);
  await fill.edit({ image: picture, type: "image/jpeg", prompt: "a red door", mask }, signal);
  await fill.edit({ image: picture, type: "image/jpeg", prompt: "ignored", mask, erase: true }, signal);
  await fill.edit({ image: picture, type: "image/jpeg", prompt: "Make it night" }, signal);
  const posts = calls.filter((c) => c.body);
  expect(posts.map((c) => c.url)).toEqual(["https://api.eu.bfl.ai/v1/flux-pro-1.0-fill", "https://api.eu.bfl.ai/v1/flux-tools/erase-v1", "https://api.eu.bfl.ai/v1/flux-2-pro"]);
  expect(posts[0].body).toMatchObject({ image: "AQID", mask: "CQk=", prompt: "a red door" });
  expect(posts[1].body).toEqual({ image: "AQID", mask: "CQk=" });
  // Moderation is a refusal, an empty account is capacity.
  const moderated = bflImageEditor({
    apiKey: "k",
    model: "flux-2-pro",
    pollMs: 1,
    fetch: async (input, init) => (init?.method === "POST" ? Response.json({ polling_url: "https://api.eu.bfl.ai/v1/get_result?id=x" }) : Response.json({ status: "Content Moderated" })),
  });
  await expect(moderated.edit({ image: picture, type: "image/jpeg", prompt: "x" }, signal)).rejects.toThrow("moderated");
  const capped = bflImageEditor({ apiKey: "k", model: "flux-2-pro", fetch: async () => new Response("", { status: 402 }) });
  await expect(capped.edit({ image: picture, type: "image/jpeg", prompt: "x" }, signal)).rejects.toThrow("provider 402");
});
