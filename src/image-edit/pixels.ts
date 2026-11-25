// Canvas work for the editor, all on the device (docs/image-editing-20261125.md): decoding a
// version, scaling it for sending, the painted area as a mask, and pasting an edited crop back
// through that area so every pixel outside it stays exactly as it was.
import { IMAGE_EDIT } from "../../shared/image-edit";
import { cropBox, fitSide, paintedBounds, type Box, type Size } from "./geometry";
import type { ImageVersion } from "./versions";

const canvasOf = ({ width, height }: Size) => Object.assign(document.createElement("canvas"), { width, height });
const context = (canvas: HTMLCanvasElement) => canvas.getContext("2d", { willReadFrequently: true })!;
const bytesOf = (base64: string) => Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));

export async function decode(version: { type: string; data: string }): Promise<ImageBitmap> {
  return createImageBitmap(new Blob([bytesOf(version.data)], { type: version.type }));
}

function base64Of(canvas: HTMLCanvasElement, type: "image/jpeg" | "image/png", quality?: number): string {
  return canvas.toDataURL(type, quality).split(",")[1];
}

/** A drawable as a JPEG version no longer than IMAGE_EDIT.side: what is sent, and what is kept. */
export function toVersion(source: CanvasImageSource & Size, prompt: string, box?: Box): ImageVersion {
  const from = box ?? { x: 0, y: 0, width: source.width, height: source.height };
  const size = fitSide(from, IMAGE_EDIT.side);
  const canvas = canvasOf(size);
  context(canvas).drawImage(source, from.x, from.y, from.width, from.height, 0, 0, size.width, size.height);
  return { type: "image/jpeg", data: base64Of(canvas, "image/jpeg", 0.88), prompt };
}

/** The painted overlay as the provider's mask: white where painted, black elsewhere, the sent picture's size. */
export function maskPng(overlay: HTMLCanvasElement, size: Size): string {
  const canvas = canvasOf(size);
  const c = context(canvas);
  c.fillStyle = "#000";
  c.fillRect(0, 0, size.width, size.height);
  // The overlay's strokes are translucent colour: draw them, then force every painted pixel to white.
  const strokes = canvasOf(size);
  context(strokes).drawImage(overlay, 0, 0, size.width, size.height);
  const data = context(strokes).getImageData(0, 0, size.width, size.height);
  for (let i = 0; i < data.data.length; i += 4) {
    const painted = data.data[i + 3] > 0;
    data.data[i] = data.data[i + 1] = data.data[i + 2] = painted ? 255 : 0;
    data.data[i + 3] = 255;
  }
  c.putImageData(data, 0, 0);
  return base64Of(canvas, "image/png");
}

export function overlayBounds(overlay: HTMLCanvasElement): Box | undefined {
  return paintedBounds(context(overlay).getImageData(0, 0, overlay.width, overlay.height).data, overlay);
}

/**
 * The workaround for a provider without masks. `plan` cuts the box around the painted area out of
 * the picture (for an erase, with the area filled in flat magenta so the instruction can name it);
 * `paste` puts the edited crop back, through the painted area with a soft edge.
 */
export function planCrop(picture: ImageBitmap, overlay: HTMLCanvasElement, erase: boolean): { box: Box; crop: ImageVersion } | undefined {
  const bounds = overlayBounds(overlay);
  if (!bounds) return undefined;
  const box = cropBox(bounds, picture);
  const canvas = canvasOf(box);
  const c = context(canvas);
  c.drawImage(picture, box.x, box.y, box.width, box.height, 0, 0, box.width, box.height);
  if (erase) {
    const marked = canvasOf(box);
    const m = context(marked);
    m.drawImage(overlay, box.x, box.y, box.width, box.height, 0, 0, box.width, box.height);
    m.globalCompositeOperation = "source-in";
    m.fillStyle = "#ff00ff";
    m.fillRect(0, 0, box.width, box.height);
    c.drawImage(marked, 0, 0);
  }
  return { box, crop: toVersion(canvas, "") };
}

export function paste(picture: ImageBitmap, edited: ImageBitmap, overlay: HTMLCanvasElement, box: Box, prompt: string): ImageVersion {
  // The edited crop, kept only where the user painted (blurred a little so the seam does not show).
  const patch = canvasOf(picture);
  const p = context(patch);
  p.filter = `blur(${Math.max(2, Math.round(Math.min(box.width, box.height) / 60))}px)`;
  p.drawImage(overlay, 0, 0, picture.width, picture.height);
  p.filter = "none";
  p.globalCompositeOperation = "source-in";
  p.drawImage(edited, box.x, box.y, box.width, box.height);
  const canvas = canvasOf(picture);
  const c = context(canvas);
  c.drawImage(picture, 0, 0);
  c.drawImage(patch, 0, 0);
  return toVersion(canvas, prompt);
}

/** A chosen file as the first version: decoded and drawn again, which drops its metadata (place, device, time). */
export async function fileToVersion(file: Blob, prompt: string): Promise<{ version: ImageVersion; bitmap: ImageBitmap }> {
  const bitmap = await createImageBitmap(file);
  return { version: toVersion(bitmap, prompt), bitmap };
}
