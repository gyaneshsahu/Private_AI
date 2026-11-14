// Image questions, on the device (docs/images-20261114.md): scale the picture down, burn the black
// boxes into its pixels, encode a fresh JPEG under the byte cap, and propose boxes from on-device
// OCR and the masking rules. Nothing here touches the network. The chosen file's bytes are never
// copied: only drawn pixels are encoded, so EXIF, GPS and other metadata cannot survive.
import { IMAGE_MAX_EDGE } from "../shared/images";
import { findIdentifiers, INVISIBLE, type IdentifierKind } from "./identifier-masking";
import {
  listImageMetadata,
  outputSize,
  sniffImageType,
  type CreateCanvas,
  type Rect,
  type Size,
} from "./photo-capture";
import { imageText } from "./text/images";
import { textFor } from "./text/core";

/** A black box in the pixel space of the picture as edited (`sendSize`). `kind` marks a suggestion. */
export type RedactionBox = Rect & { kind?: IdentifierKind | "FACE" };
/** One recognised word with its place in the picture and the line it stands on. */
export interface OcrWord {
  text: string;
  line: number;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}
/** The picture as it is sent once, with the next message. Memory only: never saved. */
export interface AttachedImage {
  dataUrl: string;
  width: number;
  height: number;
  bytes: number;
}

export const IMAGE_DATA_URL_PREFIX = "data:image/jpeg;base64,";
/** Remembers only that the first-upload notice was shown. */
export const IMAGE_NOTE_KEY = "cometrow.images.note-seen";

/** The size the picture is edited at: its longest edge at most IMAGE_MAX_EDGE, never enlarged. */
export const sendSize = (source: Size): Size =>
  outputSize(source, { maxEdge: IMAGE_MAX_EDGE, maxPixels: IMAGE_MAX_EDGE * IMAGE_MAX_EDGE });

/** Whole pixels inside the picture; the box grows outward, so rounding never uncovers anything. */
export function clampBox<B extends Rect>(box: B, size: Size, scale = 1): B {
  const x0 = Math.max(0, Math.floor(Math.min(box.x, box.x + box.width) * scale));
  const y0 = Math.max(0, Math.floor(Math.min(box.y, box.y + box.height) * scale));
  const x1 = Math.min(size.width, Math.ceil(Math.max(box.x, box.x + box.width) * scale));
  const y1 = Math.min(size.height, Math.ceil(Math.max(box.y, box.y + box.height) * scale));
  return { ...box, x: x0, y: y0, width: Math.max(0, x1 - x0), height: Math.max(0, y1 - y0) };
}

/**
 * Proposes black boxes for a document or screenshot: the masking rules that protect typed text
 * (emails, phone numbers, IBANs and so on) run on the recognised words, and every word a match
 * touches is covered whole, one box per line. Only as good as the OCR: a misread or unread
 * number is missed, and handwriting, faces and anything that is not text are never proposed.
 */
export function suggestRedactions(words: readonly OcrWord[], size: Size): RedactionBox[] {
  let text = "";
  const spans: { word: OcrWord; start: number; end: number }[] = [];
  let previous: OcrWord | undefined;
  for (const word of words) {
    const clean = word.text.replace(INVISIBLE, "").trim();
    if (!clean) continue;
    if (previous) text += previous.line === word.line ? " " : "\n";
    spans.push({ word, start: text.length, end: text.length + clean.length });
    text += clean;
    previous = word;
  }
  const boxes: RedactionBox[] = [];
  for (const hit of findIdentifiers(text)) {
    const lines = new Map<number, OcrWord[]>();
    for (const span of spans)
      if (span.start < hit.end && span.end > hit.start)
        lines.set(span.word.line, [...(lines.get(span.word.line) ?? []), span.word]);
    for (const covered of lines.values()) {
      const x0 = Math.min(...covered.map((w) => w.x0));
      const y0 = Math.min(...covered.map((w) => w.y0));
      const x1 = Math.max(...covered.map((w) => w.x1));
      const y1 = Math.max(...covered.map((w) => w.y1));
      // Letters reach past the reported box (descenders, slant): cover a little more.
      const pad = Math.max(2, Math.round((y1 - y0) * 0.15));
      const box = clampBox(
        { x: x0 - pad, y: y0 - pad, width: x1 - x0 + 2 * pad, height: y1 - y0 + 2 * pad, kind: hit.kind },
        size,
      );
      if (box.width && box.height) boxes.push(box);
    }
  }
  return boxes;
}

/**
 * Reads the words of a picture with the on-device OCR (src/extraction.worker.ts). The first run
 * downloads the German and English reading data (about 21 MB) from our own server, so this runs
 * only when the user asks for suggestions. The picture goes to the worker, nowhere else.
 */
export function recogniseWords(image: Blob, onProgress: (percent: number) => void): Promise<OcrWord[]> {
  const worker = new Worker(new URL("./extraction.worker.ts", import.meta.url), { type: "module" });
  return new Promise<OcrWord[]>((resolve, reject) => {
    const deadline = setTimeout(() => reject(new Error("OCR timed out")), 180_000);
    worker.onerror = () => reject(new Error("OCR failed"));
    worker.onmessage = ({ data }: MessageEvent<{ percent?: number; words?: OcrWord[]; error?: true }>) => {
      if (typeof data.percent === "number") return onProgress(data.percent);
      clearTimeout(deadline);
      if (!Array.isArray(data.words)) return reject(new Error("OCR failed"));
      resolve(
        data.words.filter(
          (w) => typeof w.text === "string" && [w.line, w.x0, w.y0, w.x1, w.y1].every(Number.isFinite),
        ),
      );
    };
    worker.postMessage({ ocrWords: image });
  }).finally(() => worker.terminate());
}

/**
 * Scale and JPEG quality tried in this order until the encoded picture fits the byte cap:
 * first lower quality at full size (text stays sharp), then a smaller picture.
 */
export const ENCODE_STEPS: readonly { scale: number; quality: number }[] = [1, 0.8, 0.64, 0.5, 0.4, 0.3].flatMap(
  (scale) => [0.85, 0.7, 0.55].map((quality) => ({ scale, quality })),
);

function defaultCanvas(width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

/**
 * Draws the picture at `size` (times the step's scale), fills every box with opaque black, and
 * encodes a fresh JPEG of at most `maxBytes`. The boxes are part of the pixels that are encoded:
 * what was under them is not in the output.
 */
export async function encodeForSending(
  image: CanvasImageSource,
  size: Size,
  boxes: readonly Rect[],
  maxBytes: number,
  createCanvas: CreateCanvas = defaultCanvas,
): Promise<{ blob: Blob; width: number; height: number }> {
  for (const { scale, quality } of ENCODE_STEPS) {
    const width = Math.max(1, Math.floor(size.width * scale));
    const height = Math.max(1, Math.floor(size.height * scale));
    const canvas = createCanvas(width, height);
    const context = canvas.getContext("2d");
    if (!context) throw new Error(textFor(imageText).prepareFailed);
    context.setTransform(1, 0, 0, 1, 0, 0);
    // JPEG has no transparency: a see-through picture gets a white ground, not a black one.
    context.fillStyle = "#fff";
    context.fillRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);
    context.fillStyle = "#000";
    for (const box of boxes) {
      const b = clampBox(box, { width, height }, width / size.width);
      context.fillRect(b.x, b.y, b.width, b.height);
    }
    const blob = await new Promise<Blob | null>((resolve) => {
      try {
        canvas.toBlob(resolve, "image/jpeg", quality);
      } catch {
        resolve(null);
      }
    });
    // Release the pixels now: the next step allocates its own canvas.
    canvas.width = canvas.height = 0;
    if (!blob?.size || blob.type !== "image/jpeg") throw new Error(textFor(imageText).prepareFailed);
    if (blob.size <= maxBytes) return { blob, width, height };
  }
  throw new Error(textFor(imageText).tooLarge);
}

/**
 * Drops every application segment except the plain JFIF header, and every comment, from a JPEG.
 * A canvas encoder copies nothing from the chosen file, but it may add segments of its own
 * (Chromium writes its colour profile as APP2). What is sent holds only what a decoder needs.
 * Fails closed: if anything of that kind is still found afterwards, nothing is sent.
 */
export function stripJpegMetadata(bytes: Uint8Array): Uint8Array {
  const kept: Uint8Array[] = [bytes.subarray(0, 2)];
  let offset = 2;
  while (offset + 4 <= bytes.length && bytes[offset] === 0xff && bytes[offset + 1] !== 0xda) {
    const marker = bytes[offset + 1];
    const end = offset + 2 + ((bytes[offset + 2] << 8) | bytes[offset + 3]);
    if (!((marker >= 0xe1 && marker <= 0xef) || marker === 0xfe)) kept.push(bytes.subarray(offset, end));
    offset = end;
  }
  // From the image data on, the bytes stay as they are.
  kept.push(bytes.subarray(offset));
  const out = new Uint8Array(kept.reduce((n, part) => n + part.length, 0));
  let at = 0;
  for (const part of kept) {
    out.set(part, at);
    at += part.length;
  }
  if (sniffImageType(out) !== "image/jpeg" || listImageMetadata(out).length)
    throw new Error(textFor(imageText).prepareFailed);
  return out;
}

/** The JPEG, without any metadata segment, as the data URL that goes into the encrypted message. */
export async function toAttachedImage(encoded: { blob: Blob; width: number; height: number }): Promise<AttachedImage> {
  const bytes = stripJpegMetadata(new Uint8Array(await encoded.blob.arrayBuffer()));
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return {
    dataUrl: IMAGE_DATA_URL_PREFIX + btoa(binary),
    width: encoded.width,
    height: encoded.height,
    bytes: bytes.length,
  };
}

/**
 * The health-consent rule for a picture. The app cannot know what a picture shows, so while the
 * consent step is on and the user has not agreed, every picture is asked about ("ask"). A user who
 * agreed is not asked again. With the consent step off nothing changes.
 */
export const imageConsentStep = (consentOn: boolean, choice: "accepted" | "declined" | undefined) =>
  consentOn && choice !== "accepted" ? "ask" : "none";
