// Image creation (docs/image-creation-20261117.md) with the provider mocked: our refusals, the route
// (limit, refusal, capacity, nothing kept, only the description sent, a ledger record per image), and
// the Black Forest Labs adapter against a fake API. No network.
import { createServer } from "node:http";
import { afterEach, expect, it } from "vitest";
import { createApp } from "../server/app";
import { bflImageProvider, mockImageProvider, refuseImagePrompt, type ImageProvider } from "../server/image-creation";
import { SqliteUsageRecords } from "../server/usage-records";
import { emptyConversation } from "../shared/contracts";
import { newMessage } from "../src/conversation";
import { containsImageData, savedConversationSchema } from "../src/saved-conversation";

const servers: { close(): void }[] = [];
afterEach(() => servers.splice(0).forEach((s) => s.close()));

async function start(provider: ImageProvider, dailyImages = 2) {
  const records = new SqliteUsageRecords(":memory:");
  const server = createServer();
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw Error("port");
  const origin = `http://127.0.0.1:${address.port}`;
  const app = createApp({ origin, dev: true, imageCreation: { provider, dailyImages }, metering: { plan: "alpha", records } });
  server.on("request", app);
  servers.push(server);
  const first = await fetch(`${origin}/api/status`);
  const cookie = first.headers.get("set-cookie")!.split(";")[0];
  const status = (await first.json()) as { csrf: string; imageCreation?: { limit: number; used?: number } };
  const create = (prompt: unknown) =>
    fetch(`${origin}/api/images/create`, {
      method: "POST",
      headers: { "content-type": "application/json", cookie, "x-privateai-csrf": status.csrf },
      body: JSON.stringify({ prompt }),
    });
  return { origin, status, create, records, cookie };
}

it("refuses real, named people and harm involving minors before any provider call", () => {
  for (const prompt of ["A realistic photo of Angela Merkel at the beach", "portrait of Taylor Swift", "Foto von Olaf Scholz im Park", "Elon Musk riding a horse"])
    expect(refuseImagePrompt(prompt), prompt).toBe("realPerson");
  for (const prompt of ["a naked child", "Kinder nackt", "teen in lingerie", "violent scene with a toddler"])
    expect(refuseImagePrompt(prompt), prompt).toBe("minors");
  for (const prompt of ["A calm lake at sunrise, watercolour", "children playing football in a park", "a photo of a red bicycle", "a cat named Zebracanary in a lighthouse"])
    expect(refuseImagePrompt(prompt), prompt).toBeUndefined();
});

it("the route: only the description is sent, the image comes back, the day's limit holds, nothing is kept, one ledger record per image", async () => {
  const seen: string[] = [];
  const mock = mockImageProvider();
  const provider: ImageProvider = { ...mock, generate: (prompt, signal) => (seen.push(prompt), mock.generate(prompt, signal)) };
  const s = await start(provider, 2);
  expect(s.status.imageCreation).toEqual({ limit: 2, used: 0 });
  const ok = await s.create("A calm lake at sunrise");
  expect(ok.status).toBe(200);
  expect(ok.headers.get("cache-control")).toBe("no-store");
  const body = (await ok.json()) as { type: string; data: string; model: string };
  expect(body.type).toBe("image/png");
  expect(Buffer.from(body.data, "base64").subarray(1, 4).toString()).toBe("PNG");
  expect(seen).toEqual(["A calm lake at sunrise"]);
  // A refusal costs nothing and reaches no provider.
  const refused = await s.create("photo of Angela Merkel");
  expect(refused.status).toBe(422);
  expect(await refused.json()).toEqual({ error: "refused", reason: "realPerson" });
  // The provider's own refusal and its capacity limit give the count back.
  expect((await s.create("MOCK_PROVIDER_REFUSES")).status).toBe(422);
  expect((await s.create("MOCK_PROVIDER_CAPACITY")).status).toBe(503);
  expect((await s.create("A second picture")).status).toBe(200);
  const third = await s.create("A third picture");
  expect(third.status).toBe(429);
  expect(await third.json()).toEqual({ error: "limit", limit: 2 });
  expect(seen).toEqual(["A calm lake at sunrise", "MOCK_PROVIDER_REFUSES", "MOCK_PROVIDER_CAPACITY", "A second picture"]);
  // Invalid bodies: no prompt, too long, extra fields.
  expect((await s.create("")).status).toBe(400);
  expect((await s.create("x".repeat(1001))).status).toBe(400);
  // The ledger: one record per attempt that reached the provider, "complete" for the two images.
  const records = await s.records.since("local-development", 0);
  expect(records.filter((r) => r.feature === "image-create" && r.outcome === "complete").map((r) => r.model)).toEqual(["mock-image", "mock-image"]);
  // Nothing about the description is in the records.
  expect(JSON.stringify(records)).not.toMatch(/lake|picture/);
});

it("is absent from the status when the switch is off", async () => {
  const server = createServer();
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address() as { port: number };
  const origin = `http://127.0.0.1:${address.port}`;
  server.on("request", createApp({ origin, dev: true }));
  servers.push(server);
  const status = (await (await fetch(`${origin}/api/status`)).json()) as Record<string, unknown>;
  expect(status.imageCreation).toBeUndefined();
});

it("Black Forest Labs adapter: EU endpoint, the key in a header, submit, poll, download; moderation and capacity", async () => {
  const calls: { url: string; key?: string; body?: string }[] = [];
  const png = Uint8Array.from([137, 80, 78, 71]);
  let poll = 0;
  const fake: typeof fetch = async (input, init) => {
    const url = String(input);
    const headers = new Headers(init?.headers);
    calls.push({ url, key: headers.get("x-key") ?? undefined, body: typeof init?.body === "string" ? init.body : undefined });
    if (url === "https://api.eu.bfl.ai/v1/flux-2-klein") return Response.json({ id: "t1", polling_url: "https://api.eu.bfl.ai/v1/get_result?id=t1" });
    if (url.startsWith("https://api.eu.bfl.ai/v1/get_result")) return Response.json(++poll < 2 ? { status: "Pending" } : { status: "Ready", result: { sample: "https://delivery.example/s.jpeg" } });
    if (url === "https://delivery.example/s.jpeg") return new Response(png, { headers: { "content-type": "image/jpeg" } });
    return new Response("no", { status: 404 });
  };
  const provider = bflImageProvider({ apiKey: "SYNTHETIC_KEY", model: "flux-2-klein", fetch: fake, pollMs: 1 });
  const image = await provider.generate("A calm lake", new AbortController().signal);
  expect(image).toEqual({ bytes: png, type: "image/jpeg", model: "flux-2-klein" });
  expect(calls[0].key).toBe("SYNTHETIC_KEY");
  expect(JSON.parse(calls[0].body!)).toMatchObject({ prompt: "A calm lake" });
  expect(calls.find((c) => c.url.includes("delivery"))?.key).toBeUndefined(); // the key never goes to the download host
  const moderated = bflImageProvider({
    apiKey: "k",
    model: "flux-2-klein",
    pollMs: 1,
    fetch: async (input) =>
      String(input).includes("get_result") ? Response.json({ status: "Content Moderated" }) : Response.json({ polling_url: "https://api.eu.bfl.ai/v1/get_result?id=x" }),
  });
  await expect(moderated.generate("x", new AbortController().signal)).rejects.toThrow("moderated");
  const capped = bflImageProvider({ apiKey: "k", model: "flux-2-klein", fetch: async () => new Response("", { status: 402 }) });
  await expect(capped.generate("x", new AbortController().signal)).rejects.toThrow("provider 402");
});

it("a created image is saved with the conversation as base64 (the vault still refuses picture data URLs)", () => {
  const image = { type: "image/png" as const, data: "iVBORw0KGgo=", model: "mock-image", prompt: "A calm lake" };
  const saved = { ...emptyConversation(), messages: [{ ...newMessage("assistant", "[Created image: A calm lake]"), status: "complete" as const, createdImage: image }] };
  expect(savedConversationSchema.parse(JSON.parse(JSON.stringify(saved))).messages[0].createdImage).toEqual(image);
  expect(containsImageData(saved)).toBe(false);
  const dataUrl = { ...saved, messages: [{ ...saved.messages[0], createdImage: { ...image, data: "data:image/png;base64,iVBORw0KGgo=" } }] };
  expect(savedConversationSchema.safeParse(dataUrl).success).toBe(false);
});
