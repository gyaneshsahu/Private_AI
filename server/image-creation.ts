// Image creation (docs/image-creation-20261118.md): off unless configured. Only the user's typed
// description goes to the image provider, never chat history or photos. The server keeps neither the
// description nor the image: the bytes are passed straight to the browser, which saves them with the
// conversation in the encrypted vault. The provider sits behind an interface; prices and model names
// come from the versioned price list (shared/usage-weights.json).

export type ImageType = "image/jpeg" | "image/png" | "image/webp";
export interface CreatedImage {
  bytes: Uint8Array;
  type: ImageType;
  /** The provider's model name, as in the price list. */
  model: string;
}
/** The provider refused the description (its own moderation). */
export class ImageRefused extends Error {}
/** The provider's spend cap or rate limit. */
export class ImageCapacity extends Error {}

export interface ImageProvider {
  name: string;
  model: string;
  generate(prompt: string, signal: AbortSignal): Promise<CreatedImage>;
}

export const IMAGE_PROMPT_MAX = 1000;

/**
 * Our own refusals before any provider call: anything sexual or harmful involving minors, and pictures
 * of real, named people. Pattern rules, so they also catch what a provider might let through. Limit:
 * a real person described without a name, or a name we do not recognise as one, is left to the
 * provider's moderation.
 */
export function refuseImagePrompt(prompt: string): "minors" | "realPerson" | undefined {
  const p = prompt.toLowerCase();
  const minor = /\b(child|children|kid|kids|minor|minors|teen|teens|teenager|boy|girl|toddler|baby|underage|schoolgirl|schoolboy|kind|kinder|jugendliche[rn]?|mädchen|junge|baby|minderjährig\w*)\b/;
  const harmful = /\b(nude|naked|sex|sexual|sexy|erotic|lingerie|explicit|porn|nsfw|nackt|sexuell|erotisch|gewalt|violent|violence|blood|gore|abuse|missbrauch|torture|folter)\b/;
  if (minor.test(p) && harmful.test(p)) return "minors";
  // A request for a likeness: "photo of Angela Merkel", "a picture showing Elon Musk", "realistic portrait of Taylor Swift".
  const likeness =
    /\b(photo|photograph|picture|image|portrait|selfie|realistic|deepfake|foto|bild|porträt|realistisch)\b[^.]{0,40}?\b(of|showing|with|von|mit|zeigt)\s+(?:[A-ZÄÖÜ][a-zäöüß'-]+\s){1,2}[A-ZÄÖÜ][a-zäöüß'-]+/;
  if (likeness.test(prompt)) return "realPerson";
  const famous =
    /\b(donald trump|joe biden|kamala harris|barack obama|elon musk|taylor swift|angela merkel|olaf scholz|friedrich merz|vladimir putin|xi jinping|king charles|pope|papst|emmanuel macron|volodymyr zelensky|mark zuckerberg|bill gates|jeff bezos|beyonc[eé]|cristiano ronaldo|lionel messi)\b/;
  if (famous.test(p)) return "realPerson";
  return undefined;
}

/** A provider for tests and local tours: a small solid-colour PNG, no network. */
export function mockImageProvider(model = "mock-image"): ImageProvider {
  // 1x1 PNG, light blue.
  const png = Uint8Array.from(
    Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mN4+P/LfwAJYQPrk2v6YwAAAABJRU5ErkJggg==", "base64"),
  );
  return {
    name: "mock",
    model,
    async generate(prompt, signal) {
      if (signal.aborted) throw signal.reason;
      if (/MOCK_PROVIDER_REFUSES/.test(prompt)) throw new ImageRefused("moderated");
      if (/MOCK_PROVIDER_CAPACITY/.test(prompt)) throw new ImageCapacity("capacity");
      return { bytes: png, type: "image/png", model };
    },
  };
}

/**
 * Black Forest Labs FLUX API (https://docs.bfl.ai): submit, then poll the returned URL until the
 * result is ready, then fetch the picture from the signed delivery URL. EU endpoint by default.
 * The picture bytes are passed through unchanged, so provenance metadata the provider adds stays.
 */
export function bflImageProvider(o: {
  apiKey: string;
  model: string; // e.g. "flux-2-klein", "flux-2-pro"
  baseUrl?: string;
  fetch?: typeof fetch;
  pollMs?: number;
  timeoutMs?: number;
}): ImageProvider {
  const http = o.fetch ?? fetch;
  const base = (o.baseUrl ?? "https://api.eu.bfl.ai").replace(/\/$/, "");
  const pollMs = o.pollMs ?? 500;
  const timeoutMs = o.timeoutMs ?? 60_000;
  return {
    name: "bfl",
    model: o.model,
    async generate(prompt, signal) {
      const submit = await http(`${base}/v1/${encodeURIComponent(o.model)}`, {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json", "x-key": o.apiKey },
        body: JSON.stringify({ prompt, width: 1024, height: 1024, output_format: "jpeg", safety_tolerance: 2 }),
        signal,
      });
      if (submit.status === 402 || submit.status === 429) throw new ImageCapacity(`provider ${submit.status}`);
      if (!submit.ok) throw Error(`image provider: ${submit.status}`);
      const { polling_url: pollingUrl } = (await submit.json()) as { id?: string; polling_url?: string };
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
          const image = await http(url, { signal });
          if (!image.ok) throw Error(`image provider: download ${image.status}`);
          const type = (image.headers.get("content-type") ?? "image/jpeg").split(";")[0] as ImageType;
          if (!["image/jpeg", "image/png", "image/webp"].includes(type)) throw Error("image provider: unexpected type");
          return { bytes: new Uint8Array(await image.arrayBuffer()), type, model: o.model };
        }
        if (state.status === "Content Moderated" || state.status === "Request Moderated") throw new ImageRefused("moderated");
        if (state.status === "Error" || state.status === "Task not found") throw Error(`image provider: ${state.status}`);
      }
    },
  };
}
