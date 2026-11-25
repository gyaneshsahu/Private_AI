// Plain arithmetic for the editor (docs/image-editing-20261125.md): sizes, the painted area's
// bounds and the box cut out for the crop-and-paste workaround. No canvas, so Node can test it.
export type Size = { width: number; height: number };
export type Box = { x: number; y: number; width: number; height: number };

/** Scales a size down so its longest side is at most `side`; never up. */
export function fitSide(size: Size, side: number): Size {
  const scale = Math.min(1, side / Math.max(size.width, size.height));
  return { width: Math.max(1, Math.round(size.width * scale)), height: Math.max(1, Math.round(size.height * scale)) };
}

/** The smallest box around every painted pixel of an RGBA buffer (alpha above 0), or undefined when nothing is painted. */
export function paintedBounds(rgba: Uint8ClampedArray | Uint8Array, size: Size): Box | undefined {
  let left = size.width, top = size.height, right = -1, bottom = -1;
  for (let y = 0; y < size.height; y++)
    for (let x = 0; x < size.width; x++)
      if (rgba[(y * size.width + x) * 4 + 3] > 0) {
        if (x < left) left = x;
        if (x > right) right = x;
        if (y < top) top = y;
        if (y > bottom) bottom = y;
      }
  return right < 0 ? undefined : { x: left, y: top, width: right - left + 1, height: bottom - top + 1 };
}

/**
 * The box sent for an edit of a painted area when the provider takes no mask: the bounds plus a
 * margin (the model needs surroundings to match), at least `least` pixels a side, kept inside the
 * picture. A box that would cover most of the picture becomes the whole picture.
 */
export function cropBox(bounds: Box, size: Size, margin = 0.35, least = 384): Box {
  const grow = (length: number) => Math.max(least, Math.round(length * (1 + 2 * margin)));
  const width = Math.min(size.width, grow(bounds.width));
  const height = Math.min(size.height, grow(bounds.height));
  if (width * height > 0.8 * size.width * size.height) return { x: 0, y: 0, ...size };
  const x = Math.min(Math.max(0, Math.round(bounds.x + bounds.width / 2 - width / 2)), size.width - width);
  const y = Math.min(Math.max(0, Math.round(bounds.y + bounds.height / 2 - height / 2)), size.height - height);
  return { x, y, width, height };
}

/** Zoom steps: fit is 1; each step is half again, up to 4. */
export const zoomStep = (zoom: number, direction: 1 | -1) =>
  Math.min(4, Math.max(1, Math.round(zoom * (direction > 0 ? 1.5 : 1 / 1.5) * 100) / 100));
