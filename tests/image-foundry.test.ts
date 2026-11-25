// Microsoft Foundry FLUX.2 [pro] (docs/image-provider-eu-20261125.md) against a fake API: the
// address, the key and the body for creating and for editing; every answer shape the adapter
// reads; refusals and capacity; where the key may go; and the adapter behind the app's routes,
// where an edit of a painted area arrives without a mask. No network.
import { createServer } from "node:http";
import { afterEach, expect, it } from "vitest";
import { createApp } from "../server/app";
import { foundryImages, sniffImageType } from "../server/image-foundry";

const servers: { close(): void }[] = [];
afterEach(() => servers.splice(0).forEach((s) => s.close()));
const ENDPOINT = "https://synthetic-resource.api.cognitive.microsoft.com";
const ADDRESS = `${ENDPOINT}/providers/blackforestlabs/v1/flux-2-pro?api-version=preview`;
const JPEG = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]);
const PNG = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 13, 10, 26, 10]);
const signal = () => new AbortController().signal;

type Call = { url: string; method: string; auth?: string; body?: Record<string, unknown> };
function fake(answer: (call: Call, n: number) => Response) {
  const calls: Call[] = [];
  const http: typeof fetch = async (input, init) => {
    const headers = new Headers(init?.headers);
    const call: Call = { url: String(input), method: init?.method ?? "GET", auth: headers.get("authorization") ?? undefined, body: typeof init?.body === "string" ? JSON.parse(init.body) : undefined };
    calls.push(call);
    return answer(call, calls.length);
  };
  return { calls, http };
}
const client = (http: typeof fetch) => foundryImages({ endpoint: ENDPOINT, apiKey: "SYNTHETIC_KEY", model: "flux-2-pro", fetch: http, pollMs: 1 });

it("creating: one address, the key as a bearer token, the description and size in the body", async () => {
  const { calls, http } = fake(() => Response.json({ data: [{ b64_json: Buffer.from(JPEG).toString("base64") }] }));
  const images = client(http);
  expect(images).toMatchObject({ name: "foundry", model: "flux-2-pro", masks: false });
  expect(await images.generate("A calm lake", signal())).toEqual({ bytes: Buffer.from(JPEG), type: "image/jpeg", model: "flux-2-pro" });
  expect(calls).toHaveLength(1);
  expect(calls[0]).toMatchObject({ url: ADDRESS, method: "POST", auth: "Bearer SYNTHETIC_KEY" });
  expect(calls[0].body).toEqual({ model: "FLUX.2-pro", output_format: "jpeg", safety_tolerance: 2, prompt: "A calm lake", width: 1024, height: 1024 });
});

it("editing: the same address with the picture as base64; a size only for resize; never a mask", async () => {
  const { calls, http } = fake(() => Response.json({ data: [{ b64_json: Buffer.from(PNG).toString("base64") }] }));
  const images = client(http);
  const picture = Uint8Array.from([1, 2, 3]);
  expect((await images.edit({ image: picture, type: "image/jpeg", prompt: "Make it night" }, signal())).type).toBe("image/png");
  expect(calls[0].body).toEqual({ model: "FLUX.2-pro", output_format: "jpeg", safety_tolerance: 2, prompt: "Make it night", input_image: "AQID" });
  await images.edit({ image: picture, type: "image/jpeg", prompt: "Extend", width: 832, height: 1248 }, signal());
  expect(calls[1].body).toMatchObject({ input_image: "AQID", width: 832, height: 1248 });
  // A mask given by mistake is not sent on: this provider has no field for one.
  await images.edit({ image: picture, type: "image/jpeg", prompt: "x", mask: Uint8Array.from([9]) }, signal());
  expect(JSON.stringify(calls[2].body)).not.toMatch(/mask/);
});

it("reads every answer shape, and gives the key only to the resource's own host", async () => {
  const b64 = Buffer.from(JPEG).toString("base64");
  for (const answer of [{ data: [{ b64_json: b64 }] }, { b64_json: b64 }, { image: b64 }, { image: `data:image/jpeg;base64,${b64}` }]) {
    const { http } = fake(() => Response.json(answer));
    expect((await client(http).generate("x", signal())).type, JSON.stringify(answer).slice(0, 30)).toBe("image/jpeg");
  }
  // A download address on another host: fetched without the key.
  for (const answer of [{ data: [{ url: "https://delivery.example/a.jpg" }] }, { url: "https://delivery.example/a.jpg" }, { result: { sample: "https://delivery.example/a.jpg" } }]) {
    const { calls, http } = fake((call) => (call.method === "POST" ? Response.json(answer) : new Response(JPEG)));
    expect((await client(http).generate("x", signal())).bytes).toEqual(JPEG);
    expect(calls[1]).toMatchObject({ url: "https://delivery.example/a.jpg" });
    expect(calls[1].auth).toBeUndefined();
  }
  // A download address on the resource itself: with the key.
  const own = fake((call) => (call.method === "POST" ? Response.json({ url: `${ENDPOINT}/result/1` }) : new Response(JPEG)));
  await client(own.http).generate("x", signal());
  expect(own.calls[1].auth).toBe("Bearer SYNTHETIC_KEY");
  // The asynchronous shape: asked until ready, only at the resource's own host.
  const polled = fake((call, n) =>
    call.method === "POST"
      ? Response.json({ polling_url: `${ENDPOINT}/providers/blackforestlabs/v1/get_result?id=1` })
      : call.url.includes("get_result")
        ? Response.json(n < 4 ? { status: "Pending" } : { status: "Ready", result: { sample: "https://delivery.example/b.jpg" } })
        : new Response(JPEG),
  );
  expect((await client(polled.http).generate("x", signal())).type).toBe("image/jpeg");
  expect(polled.calls.filter((c) => c.url.includes("get_result")).every((c) => c.auth === "Bearer SYNTHETIC_KEY")).toBe(true);
  const elsewhere = fake(() => Response.json({ polling_url: "https://evil.example/poll" }));
  await expect(client(elsewhere.http).generate("x", signal())).rejects.toThrow("no result");
  expect(elsewhere.calls).toHaveLength(1);
  // An answer that is not a picture, a plain http address, or nothing at all: refused.
  for (const bad of [{ data: [{ b64_json: Buffer.from("GIF89a").toString("base64") }] }, { url: "http://delivery.example/a.jpg" }, {}]) {
    const { http } = fake(() => Response.json(bad));
    await expect(client(http).generate("x", signal())).rejects.toThrow(/image provider/);
  }
});

it("a full account or a rate limit is capacity; the provider's own refusal is a refusal; other errors stay errors", async () => {
  for (const status of [402, 429]) {
    const { http } = fake(() => new Response("{}", { status }));
    await expect(client(http).generate("x", signal())).rejects.toThrow(`provider ${status}`);
  }
  for (const answer of [
    Response.json({ error: { code: "content_filter", message: "blocked" } }, { status: 400 }),
    Response.json({ error: { code: "ResponsibleAIPolicyViolation", message: "x" } }, { status: 400 }),
    Response.json({ status: "Content Moderated" }),
  ]) {
    const { http } = fake(() => answer.clone());
    await expect(client(http).generate("x", signal())).rejects.toThrow("moderated");
  }
  const failing = fake(() => new Response("{}", { status: 500 }));
  await expect(client(failing.http).generate("x", signal())).rejects.toThrow("image provider: 500");
  const moderatedLater = fake((call) => (call.method === "POST" ? Response.json({ polling_url: `${ENDPOINT}/poll` }) : Response.json({ status: "Request Moderated" })));
  await expect(client(moderatedLater.http).generate("x", signal())).rejects.toThrow("moderated");
});

it("the endpoint must be a plain https address of the resource", () => {
  for (const bad of ["http://synthetic.api.cognitive.microsoft.com", `${ENDPOINT}/providers/x`, `${ENDPOINT}/?api-version=1`, "https://user:pw@synthetic.example"])
    expect(() => foundryImages({ endpoint: bad, apiKey: "k", model: "flux-2-pro" }), bad).toThrow(/Foundry endpoint/);
  expect(() => foundryImages({ endpoint: `${ENDPOINT}/`, apiKey: "k", model: "flux-2-pro" })).not.toThrow();
  expect(sniffImageType(JPEG)).toBe("image/jpeg");
  expect(sniffImageType(PNG)).toBe("image/png");
  expect(sniffImageType(Uint8Array.from([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]))).toBe("image/webp");
  expect(sniffImageType(Uint8Array.from([0x47, 0x49, 0x46]))).toBeUndefined();
});

it("behind the app: creating and editing through the same routes, an edit counted as an image, no mask taken", async () => {
  const { calls, http } = fake(() => Response.json({ data: [{ b64_json: Buffer.from(JPEG).toString("base64") }] }));
  const images = client(http);
  const server = createServer();
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const origin = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  server.on("request", createApp({ origin, dev: true, imageCreation: { provider: images, dailyImages: 2 }, imageEditing: { editor: images, uploads: false } }));
  servers.push(server);
  const first = await fetch(`${origin}/api/status`);
  const cookie = first.headers.get("set-cookie")!.split(";")[0];
  const status = (await first.json()) as { csrf: string; imageEditing?: { masks: boolean } };
  expect(status.imageEditing).toEqual({ masks: false, uploads: false });
  const post = (path: string, body: unknown) => fetch(origin + path, { method: "POST", headers: { "content-type": "application/json", cookie, "x-privateai-csrf": status.csrf }, body: JSON.stringify(body) });
  const created = await post("/api/images/create", { prompt: "A calm lake" });
  expect(created.status).toBe(200);
  expect(await created.json()).toMatchObject({ type: "image/jpeg", model: "flux-2-pro" });
  const picture = Buffer.from(JPEG).toString("base64");
  // A painted area arrives as a crop without a mask (the browser pastes it back): accepted.
  expect((await post("/api/images/edit", { image: picture, type: "image/jpeg", prompt: "a red door", tool: "area", source: "created" })).status).toBe(200);
  expect(calls[1].body).toMatchObject({ prompt: "a red door", input_image: picture });
  // With a mask the request is refused before the provider: it would have been ignored there.
  expect((await post("/api/images/edit", { image: picture, type: "image/jpeg", prompt: "a red door", tool: "area", mask: picture, source: "created" })).status).toBe(400);
  // Two of two images used: the day is over, for creating and editing alike.
  expect((await post("/api/images/create", { prompt: "Another" })).status).toBe(429);
  expect(calls).toHaveLength(2);
});
