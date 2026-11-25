// Microsoft Foundry FLUX.2 [pro], EU Data Zone (docs/image-provider-eu-20261125.md): the image
// provider with a no-training statement, for creating and for editing. Off unless the config
// names it (imageCreation.provider "foundry"). Never called by a test: every test uses a fake API.
//
// What Microsoft documents (read 25 November 2026) and what it does not:
// - One address for both: POST <resource>/providers/blackforestlabs/v1/flux-2-pro?api-version=preview,
//   the key as "Authorization: Bearer". A JSON body with the same fields as Black Forest Labs'
//   own API; an edit adds the picture as base64 in `input_image`.
// - No mask field. `masks` is false: the browser crops a painted area, sends the crop and pastes
//   the answer back through the area (src/image-edit/edit.ts), so only that area changes.
// - The answer's shape is described only as "a URL or base64-encoded image data". This adapter
//   therefore reads every shape these APIs use: `data[0].b64_json`, `data[0].url`, a bare
//   `image`/`b64_json`/`url`, `result.sample`, or a `polling_url` to ask until the result is ready.
//   The first live request shows which one it is; the others can then be removed.
import { ImageCapacity, ImageRefused, type CreatedImage, type ImageProvider, type ImageType } from "./image-creation";
import type { ImageEditInput, ImageEditor } from "./image-edit";

const TYPES: readonly string[] = ["image/jpeg", "image/png", "image/webp"];
/** JPEG, PNG or WebP from the first bytes; the provider's own header is not trusted for what we hand to browsers. */
export function sniffImageType(bytes: Uint8Array): ImageType | undefined {
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return "image/jpeg";
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "image/png";
  if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[8] === 0x57 && bytes[9] === 0x45) return "image/webp";
  return undefined;
}

type Answer = {
  data?: { b64_json?: string; url?: string }[];
  image?: string;
  b64_json?: string;
  url?: string;
  result?: { sample?: string };
  polling_url?: string;
  status?: string;
  error?: { code?: string; message?: string };
};

export function foundryImages(o: {
  /** The resource's address, e.g. https://<name>.api.cognitive.microsoft.com (no path). */
  endpoint: string;
  apiKey: string;
  /** The name in our price list. Only FLUX.2 [pro] is offered in the EU Data Zone. */
  model: "flux-2-pro";
  fetch?: typeof fetch;
  pollMs?: number;
  timeoutMs?: number;
}): ImageProvider & ImageEditor {
  const http = o.fetch ?? fetch;
  const endpoint = new URL(o.endpoint);
  if (endpoint.protocol !== "https:" || endpoint.pathname !== "/" || endpoint.search || endpoint.username) throw Error("Foundry endpoint must be an https address without a path.");
  const address = `${endpoint.origin}/providers/blackforestlabs/v1/flux-2-pro?api-version=preview`;
  const pollMs = o.pollMs ?? 500;
  const timeoutMs = o.timeoutMs ?? 60_000;
  const auth = { authorization: `Bearer ${o.apiKey}` };

  /** Bytes from base64 or from an https address. The key goes only to the resource's own host. */
  async function picture(found: { base64?: string; url?: string }, signal: AbortSignal): Promise<CreatedImage> {
    let bytes: Uint8Array;
    if (found.base64) bytes = Buffer.from(found.base64.replace(/^data:image\/[a-z+]+;base64,/, ""), "base64");
    else {
      if (!found.url || !/^https:\/\//.test(found.url)) throw Error("image provider: no result");
      const sameHost = new URL(found.url).host === endpoint.host;
      const download = await http(found.url, { headers: sameHost ? auth : {}, signal });
      if (!download.ok) throw Error(`image provider: download ${download.status}`);
      bytes = new Uint8Array(await download.arrayBuffer());
    }
    const type = sniffImageType(bytes);
    if (!type || !TYPES.includes(type)) throw Error("image provider: unexpected type");
    return { bytes, type, model: o.model };
  }
  const found = (answer: Answer) => {
    const first = answer.data?.[0];
    const base64 = first?.b64_json ?? answer.b64_json ?? answer.image;
    const url = first?.url ?? answer.url ?? answer.result?.sample;
    return base64 || url ? { base64, url } : undefined;
  };
  const refused = (status: number, answer: Answer) =>
    answer.status === "Content Moderated" ||
    answer.status === "Request Moderated" ||
    /content_?(filter|policy)|moderat|responsible/i.test(`${answer.error?.code ?? ""} ${answer.error?.message ?? ""}`) ||
    (status === 400 && /safety|moderat/i.test(JSON.stringify(answer)));

  async function run(body: Record<string, unknown>, signal: AbortSignal): Promise<CreatedImage> {
    const submit = await http(address, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json", ...auth },
      body: JSON.stringify({ model: "FLUX.2-pro", output_format: "jpeg", safety_tolerance: 2, ...body }),
      signal,
    });
    // 402: the subscription's spending stop. 429: its rate limit or quota.
    if (submit.status === 402 || submit.status === 429) throw new ImageCapacity(`provider ${submit.status}`);
    const answer = ((await submit.json().catch(() => ({}))) ?? {}) as Answer;
    if (refused(submit.status, answer)) throw new ImageRefused("moderated");
    if (!submit.ok) throw Error(`image provider: ${submit.status}`);
    const ready = found(answer);
    if (ready) return picture(ready, signal);
    // The asynchronous shape: ask the given address until the picture is ready.
    const pollingUrl = answer.polling_url;
    if (!pollingUrl || !/^https:\/\//.test(pollingUrl) || new URL(pollingUrl).host !== endpoint.host) throw Error("image provider: no result");
    const started = Date.now();
    for (;;) {
      if (Date.now() - started > timeoutMs) throw Error("image provider: timed out");
      await new Promise((resolve) => setTimeout(resolve, pollMs));
      if (signal.aborted) throw signal.reason;
      const poll = await http(pollingUrl, { headers: { accept: "application/json", ...auth }, signal });
      if (!poll.ok) throw Error(`image provider: poll ${poll.status}`);
      const state = (await poll.json()) as Answer;
      if (refused(200, state)) throw new ImageRefused("moderated");
      const done = found(state);
      if (done) return picture(done, signal);
      if (state.status === "Error" || state.status === "Failed" || state.status === "Task not found") throw Error(`image provider: ${state.status}`);
    }
  }

  return {
    name: "foundry",
    model: o.model,
    masks: false,
    generate: (prompt, signal) => run({ prompt, width: 1024, height: 1024 }, signal),
    edit(input: ImageEditInput, signal) {
      return run(
        { prompt: input.prompt, input_image: Buffer.from(input.image).toString("base64"), ...(input.width && input.height ? { width: input.width, height: input.height } : {}) },
        signal,
      );
    },
  };
}
