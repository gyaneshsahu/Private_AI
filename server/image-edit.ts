// Image editing (docs/image-editing-20261125.md): off unless configured. One picture and the edit's
// words go to the image provider; the server keeps neither, and the result goes straight back to
// the browser, which keeps it as a new version in the chat. An edit counts as one image of the day,
// taken at the start and given back when the provider fails. Providers sit behind `ImageEditor`.
import { randomUUID } from "node:crypto";
import express, { Router, type Response } from "express";
import { EDIT_SIZES, FIXED_EDIT_PROMPT, imageEditRequest } from "../shared/image-edit";
import { ImageCapacity, ImageRefused, refuseImagePrompt, type CreatedImage, type ImageType } from "./image-creation";

export interface ImageEditInput {
  image: Uint8Array;
  type: ImageType;
  prompt: string;
  /** PNG, white where the picture may change. Only given to an editor with `masks`. */
  mask?: Uint8Array;
  /** The marked area is to be removed, not redrawn from a description. */
  erase?: boolean;
  width?: number;
  height?: number;
}
export interface ImageEditor {
  name: string;
  model: string;
  /** True when `edit` honours `mask`. False: the browser crops the area, edits the crop and pastes it back. */
  masks: boolean;
  edit(input: ImageEditInput, signal: AbortSignal): Promise<CreatedImage>;
}

/** An editor for tests and local tours: a small solid-colour PNG, no network. It records nothing. */
export function mockImageEditor(model = "mock-image", masks = false): ImageEditor {
  // 1x1 PNG, red: visibly not the mock creator's light blue.
  const png = Uint8Array.from(
    Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==", "base64"),
  );
  return {
    name: "mock",
    model,
    masks,
    async edit(input, signal) {
      if (signal.aborted) throw signal.reason;
      if (/MOCK_PROVIDER_CAPACITY/.test(input.prompt)) throw new ImageCapacity("capacity");
      if (/MOCK_PROVIDER_REFUSED/.test(input.prompt)) throw new ImageRefused("moderated");
      return { bytes: png, type: "image/png", model };
    },
  };
}

/**
 * Black Forest Labs (https://docs.bfl.ai, read 25 November 2026). An edit is the creation address
 * with `input_image` added. FLUX.2 has no mask field; masks exist only on two other addresses
 * (`flux-pro-1.0-fill` with a description, `flux-tools/erase-v1` without). Whether the EU endpoint
 * serves those two is not documented, so they are used only with `fill: true`; otherwise `masks`
 * is false and the browser does the crop-and-paste workaround.
 */
export function bflImageEditor(o: {
  apiKey: string;
  model: string;
  baseUrl?: string;
  fetch?: typeof fetch;
  pollMs?: number;
  timeoutMs?: number;
  fill?: boolean;
}): ImageEditor {
  const http = o.fetch ?? fetch;
  const base = (o.baseUrl ?? "https://api.eu.bfl.ai").replace(/\/$/, "");
  const pollMs = o.pollMs ?? 500;
  const timeoutMs = o.timeoutMs ?? 60_000;
  // The provider has no "flux-2-klein" address; its 4B model is the one the price list prices.
  const path = o.model === "flux-2-klein" ? "flux-2-klein-4b" : o.model;
  const b64 = (bytes: Uint8Array) => Buffer.from(bytes).toString("base64");
  // shortcut: the submit-and-poll steps repeat server/image-creation.ts, so that file stays untouched
  // while branches are separate; fold the two together after they are merged.
  async function run(address: string, body: unknown, signal: AbortSignal): Promise<CreatedImage> {
    const submit = await http(`${base}/v1/${address}`, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json", "x-key": o.apiKey },
      body: JSON.stringify(body),
      signal,
    });
    if (submit.status === 402 || submit.status === 429) throw new ImageCapacity(`provider ${submit.status}`);
    if (!submit.ok) throw Error(`image provider: ${submit.status}`);
    const { polling_url: pollingUrl } = (await submit.json()) as { polling_url?: string };
    if (!pollingUrl || !/^https:\/\//.test(pollingUrl)) throw Error("image provider: no polling URL");
    const started = Date.now();
    for (;;) {
      if (Date.now() - started > timeoutMs) throw Error("image provider: timed out");
      await new Promise((resolve) => setTimeout(resolve, pollMs));
      if (signal.aborted) throw signal.reason;
      const poll = await http(pollingUrl, { headers: { accept: "application/json", "x-key": o.apiKey }, signal });
      if (!poll.ok) throw Error(`image provider: poll ${poll.status}`);
      const state = (await poll.json()) as { status?: string; result?: { sample?: string } };
      if (state.status === "Ready") {
        const url = state.result?.sample;
        if (!url || !/^https:\/\//.test(url)) throw Error("image provider: no result");
        const image = await http(url, { signal }); // the key never goes to the download host
        if (!image.ok) throw Error(`image provider: download ${image.status}`);
        const type = (image.headers.get("content-type") ?? "image/jpeg").split(";")[0] as ImageType;
        if (!["image/jpeg", "image/png", "image/webp"].includes(type)) throw Error("image provider: unexpected type");
        return { bytes: new Uint8Array(await image.arrayBuffer()), type, model: o.model };
      }
      if (state.status === "Content Moderated" || state.status === "Request Moderated") throw new ImageRefused("moderated");
      if (state.status === "Error" || state.status === "Failed" || state.status === "Task not found") throw Error(`image provider: ${state.status}`);
    }
  }
  return {
    name: "bfl",
    model: o.model,
    masks: o.fill === true,
    edit(input, signal) {
      const common = { output_format: "jpeg", safety_tolerance: 2 };
      if (input.mask && o.fill)
        return input.erase
          ? run("flux-tools/erase-v1", { image: b64(input.image), mask: b64(input.mask) }, signal)
          : run("flux-pro-1.0-fill", { image: b64(input.image), mask: b64(input.mask), prompt: input.prompt, ...common }, signal);
      return run(
        encodeURIComponent(path),
        { prompt: input.prompt, input_image: b64(input.image), ...(input.width && input.height ? { width: input.width, height: input.height } : {}), ...common },
        signal,
      );
    },
  };
}

/**
 * POST /api/images/edit. Mounted before the 8 KB body parser: a picture is up to about 2.5 MB of
 * JSON. `day` is the same count as image creation; `record` writes one usage record per edit.
 */
export function imageEditRoutes(o: {
  editor: ImageEditor;
  /** Editing the user's own photos (not only created images). */
  uploads: boolean;
  dailyImages: number;
  day: { take(who: string): boolean; giveBack(who: string): void };
  account(res: Response): string | undefined;
  record?(res: Response, entry: { requestId: string; outcome: "complete" | "refused"; model: string }): void;
}) {
  const router = Router();
  router.post("/api/images/edit", express.json({ limit: "3mb" }), async (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    const who = o.account(res);
    if (!who) return void res.status(401).json({ error: "signin" });
    const parsed = imageEditRequest.safeParse(req.body);
    if (!parsed.success) return void res.status(400).json({ error: "invalid" });
    const request = parsed.data;
    if (request.source === "upload" && !o.uploads) return void res.status(403).json({ error: "uploads-off" });
    // A mask is honoured or refused, never ignored: an ignored mask would change the whole picture.
    if (request.mask && !o.editor.masks) return void res.status(400).json({ error: "invalid" });
    const refusal = refuseImagePrompt(request.prompt);
    if (refusal) return void res.status(422).json({ error: "refused", reason: refusal });
    // The day's images are checked here, at the start, and nowhere later.
    if (!o.day.take(who)) return void res.status(429).json({ error: "limit", limit: o.dailyImages });
    const abort = new AbortController();
    res.on("close", () => abort.abort());
    const requestId = randomUUID();
    try {
      const size = request.size ? EDIT_SIZES[request.size] : undefined;
      const image = await o.editor.edit(
        {
          image: Buffer.from(request.image, "base64"),
          type: request.type,
          prompt: request.tool === "erase" ? FIXED_EDIT_PROMPT.erase : request.tool === "resize" ? FIXED_EDIT_PROMPT.resize : request.prompt,
          ...(request.mask ? { mask: Buffer.from(request.mask, "base64") } : {}),
          ...(request.tool === "erase" ? { erase: true } : {}),
          ...(size ?? {}),
        },
        abort.signal,
      );
      o.record?.(res, { requestId, outcome: "complete", model: image.model });
      res.json({ type: image.type, data: Buffer.from(image.bytes).toString("base64"), model: image.model });
    } catch (error) {
      o.day.giveBack(who);
      o.record?.(res, { requestId, outcome: "refused", model: o.editor.model });
      if (error instanceof ImageRefused) return void res.status(422).json({ error: "refused", reason: "provider" });
      if (error instanceof ImageCapacity) return void res.status(503).json({ error: "capacity" });
      if (!res.headersSent) res.status(502).json({ error: "unavailable" });
    }
  });
  return router;
}
