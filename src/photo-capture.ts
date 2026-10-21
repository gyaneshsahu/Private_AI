/**
 * Photo-to-text preparation: pure geometry for rotation, crop and downscale,
 * plus an on-device re-encode that hands the existing local OCR a plain PNG.
 * Nothing here touches the network; metadata is dropped by drawing pixels
 * into a fresh canvas instead of copying the chosen file's bytes.
 */
export const PHOTO_MAX_EDGE = 4000;
/** Matches the extraction worker's screenshot OCR bound. */
export const PHOTO_MAX_PIXELS = 12_000_000;
/** Matches the document import size bound in documents.ts. */
export const PHOTO_MAX_BYTES = 10 * 1024 * 1024;
/** Sources above these bounds are refused before any canvas is allocated. */
export const PHOTO_MAX_SOURCE_EDGE = 12000;
export const PHOTO_MAX_SOURCE_PIXELS = 60_000_000;
export const PHOTO_MIN_CROP = 16;
export const PHOTO_ACCEPT = "image/png,image/jpeg";
export const PHOTO_DECODE_ERROR =
  "This image could not be decoded. Choose a PNG or JPEG photo of printed text.";
export const PHOTO_ENCODE_ERROR =
  "The photo could not be encoded. Try again or choose another photo.";
export const PHOTO_CANVAS_ERROR =
  "Canvas drawing is unavailable in this browser, so photos cannot be prepared.";

export type Rotation = 0 | 90 | 180 | 270;
export type Size = { width: number; height: number };
export type Point = { x: number; y: number };
export type Rect = { x: number; y: number; width: number; height: number };
/** Percent of the rotated image removed from each edge. */
export type CropInset = {
  left: number;
  top: number;
  right: number;
  bottom: number;
};
export const NO_CROP: CropInset = { left: 0, top: 0, right: 0, bottom: 0 };
export type PhotoEdits = { rotation: Rotation; inset: CropInset };
export type PhotoSource = {
  image: CanvasImageSource;
  width: number;
  height: number;
  /** Closes bitmaps or empties capture canvases; safe to call once. */
  release(): void;
};
export interface PhotoContextLike {
  fillStyle: string | CanvasGradient | CanvasPattern;
  fillRect(x: number, y: number, width: number, height: number): void;
  setTransform(
    a: number,
    b: number,
    c: number,
    d: number,
    e: number,
    f: number,
  ): void;
  translate(x: number, y: number): void;
  rotate(angle: number): void;
  drawImage(
    image: CanvasImageSource,
    dx: number,
    dy: number,
    dw: number,
    dh: number,
  ): void;
}
export interface PhotoCanvasLike {
  width: number;
  height: number;
  getContext(contextId: "2d"): PhotoContextLike | null;
  toBlob(callback: BlobCallback, type?: string): void;
}
export type CreateCanvas = (width: number, height: number) => PhotoCanvasLike;

export function turnRotation(
  rotation: Rotation,
  direction: "left" | "right",
): Rotation {
  return ((rotation + (direction === "right" ? 90 : 270)) % 360) as Rotation;
}

export function rotatedSize(size: Size, rotation: Rotation): Size {
  return rotation % 180
    ? { width: size.height, height: size.width }
    : { width: size.width, height: size.height };
}

/**
 * Translate-then-rotate so that drawing the source at (0,0) lands inside the
 * rotated bounding box with its top-left at the origin.
 */
export function rotationTransform(
  size: Size,
  rotation: Rotation,
): { translateX: number; translateY: number; angle: number } {
  switch (rotation) {
    case 90:
      return { translateX: size.height, translateY: 0, angle: Math.PI / 2 };
    case 180:
      return { translateX: size.width, translateY: size.height, angle: Math.PI };
    case 270:
      return { translateX: 0, translateY: size.width, angle: (3 * Math.PI) / 2 };
    default:
      return { translateX: 0, translateY: 0, angle: 0 };
  }
}

/** Where a source pixel lands after rotation; mirrors the canvas transform. */
export function mapSourcePoint(
  point: Point,
  size: Size,
  rotation: Rotation,
): Point {
  const { translateX, translateY, angle } = rotationTransform(size, rotation);
  const cos = Math.round(Math.cos(angle));
  const sin = Math.round(Math.sin(angle));
  return {
    x: translateX + point.x * cos - point.y * sin,
    y: translateY + point.x * sin + point.y * cos,
  };
}

function clampPercent(value: number): number {
  return Number.isFinite(value) ? Math.min(95, Math.max(0, value)) : 0;
}

export function clampInset(inset: CropInset): CropInset {
  return {
    left: clampPercent(inset.left),
    top: clampPercent(inset.top),
    right: clampPercent(inset.right),
    bottom: clampPercent(inset.bottom),
  };
}

/**
 * Integer crop rectangle inside the rotated image. Insets are clamped to the
 * image and the crop never shrinks below PHOTO_MIN_CROP when the image allows.
 */
export function cropRect(size: Size, inset: CropInset): Rect {
  const safe = clampInset(inset);
  const axis = (length: number, start: number, end: number) => {
    const min = Math.min(PHOTO_MIN_CROP, length);
    let from = Math.round((length * start) / 100);
    let to = Math.round(length - (length * end) / 100);
    if (to - from < min) {
      to = Math.min(length, from + min);
      from = Math.max(0, to - min);
    }
    return [from, to - from] as const;
  };
  const [x, width] = axis(size.width, safe.left, safe.right);
  const [y, height] = axis(size.height, safe.top, safe.bottom);
  return { x, y, width, height };
}

export type PhotoLimits = { maxEdge: number; maxPixels: number };
const OUTPUT_LIMITS: PhotoLimits = {
  maxEdge: PHOTO_MAX_EDGE,
  maxPixels: PHOTO_MAX_PIXELS,
};

/** Uniform scale at most 1 that satisfies both the edge and pixel bounds. */
export function boundedScale(size: Size, limits = OUTPUT_LIMITS): number {
  const edge = limits.maxEdge / Math.max(size.width, size.height);
  const area = Math.sqrt(limits.maxPixels / (size.width * size.height));
  return Math.min(1, edge, area);
}

export function outputSize(size: Size, limits = OUTPUT_LIMITS): Size {
  const scale = boundedScale(size, limits);
  return {
    width: Math.max(1, Math.floor(size.width * scale)),
    height: Math.max(1, Math.floor(size.height * scale)),
  };
}

/** Fit a rotated image into a preview box without upscaling. */
export function previewLayout(
  rotated: Size,
  box: Size,
): { scale: number; size: Size } {
  const scale = Math.min(
    1,
    box.width / rotated.width,
    box.height / rotated.height,
  );
  return {
    scale,
    size: {
      width: Math.max(1, Math.round(rotated.width * scale)),
      height: Math.max(1, Math.round(rotated.height * scale)),
    },
  };
}

/** Sequence numbers only: no capture time or device detail in the name. */
export function photoFileName(sequence: number): string {
  return `photo-${sequence}.png`;
}

export function sniffImageType(
  bytes: Uint8Array,
): "image/png" | "image/jpeg" | undefined {
  const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (bytes.length >= 8 && png.every((value, index) => bytes[index] === value))
    return "image/png";
  if (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  )
    return "image/jpeg";
  return undefined;
}

/** Reason a chosen file is refused before decoding, or undefined to proceed. */
export function validatePhotoFile(
  file: { type: string; size: number },
  header: Uint8Array,
): string | undefined {
  if (file.size === 0) return "The chosen file is empty.";
  if (file.size > PHOTO_MAX_BYTES) return "Choose a photo of at most 10 MB.";
  const sniffed = sniffImageType(header);
  if (!sniffed)
    return "Choose a PNG or JPEG photo. Other image formats are not supported.";
  if (file.type && file.type !== sniffed)
    return "This file's contents do not match its PNG or JPEG type.";
  return undefined;
}

const PNG_METADATA_CHUNKS = ["tEXt", "zTXt", "iTXt", "eXIf", "tIME"];

/** Metadata-bearing PNG chunks and JPEG segments present in encoded bytes. */
export function listImageMetadata(bytes: Uint8Array): string[] {
  const found: string[] = [];
  const type = sniffImageType(bytes);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (type === "image/png") {
    let offset = 8;
    while (offset + 8 <= bytes.length) {
      const length = view.getUint32(offset);
      const name = String.fromCharCode(...bytes.subarray(offset + 4, offset + 8));
      if (PNG_METADATA_CHUNKS.includes(name)) found.push(name);
      if (name === "IEND") break;
      offset += 12 + length;
    }
  } else if (type === "image/jpeg") {
    let offset = 2;
    while (offset + 4 <= bytes.length && bytes[offset] === 0xff) {
      const marker = bytes[offset + 1];
      if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
        offset += 2;
        continue;
      }
      if (marker === 0xda || marker === 0xd9) break;
      if (marker >= 0xe1 && marker <= 0xef) found.push(`APP${marker - 0xe0}`);
      if (marker === 0xfe) found.push("COM");
      offset += 2 + view.getUint16(offset + 2);
    }
  }
  return found;
}

/** Validate, sniff and decode a chosen file into a releasable source. */
export async function decodePhoto(
  file: File,
  decode: (blob: Blob) => Promise<ImageBitmap> = (blob) =>
    createImageBitmap(blob),
): Promise<PhotoSource> {
  const header = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const refusal = validatePhotoFile(file, header);
  if (refusal) throw new Error(refusal);
  let bitmap: ImageBitmap;
  try {
    bitmap = await decode(file);
  } catch {
    throw new Error(PHOTO_DECODE_ERROR);
  }
  if (!bitmap.width || !bitmap.height) {
    bitmap.close();
    throw new Error(PHOTO_DECODE_ERROR);
  }
  if (
    Math.max(bitmap.width, bitmap.height) > PHOTO_MAX_SOURCE_EDGE ||
    bitmap.width * bitmap.height > PHOTO_MAX_SOURCE_PIXELS
  ) {
    bitmap.close();
    throw new Error(
      "Photo exceeds 60 megapixels or 12,000 pixels per side. Resize it before importing.",
    );
  }
  return {
    image: bitmap,
    width: bitmap.width,
    height: bitmap.height,
    release: () => bitmap.close(),
  };
}

function defaultCanvas(width: number, height: number): PhotoCanvasLike {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

/**
 * Draw the rotated, cropped source into a bounded canvas and encode it as a
 * fresh PNG. Only drawn pixels reach the output, so EXIF, text chunks and
 * other source metadata cannot survive.
 */
export async function renderPhoto(
  source: PhotoSource,
  edits: PhotoEdits,
  options: { name: string; createCanvas?: CreateCanvas },
): Promise<{ file: File; size: Size }> {
  const rotated = rotatedSize(source, edits.rotation);
  const crop = cropRect(rotated, edits.inset);
  const size = outputSize(crop);
  const scale = boundedScale(crop);
  const canvas = (options.createCanvas ?? defaultCanvas)(size.width, size.height);
  const context = canvas.getContext("2d");
  if (!context) throw new Error(PHOTO_CANVAS_ERROR);
  context.setTransform(1, 0, 0, 1, 0, 0);
  context.fillStyle = "#fff";
  context.fillRect(0, 0, size.width, size.height);
  context.setTransform(scale, 0, 0, scale, -crop.x * scale, -crop.y * scale);
  const turn = rotationTransform(source, edits.rotation);
  context.translate(turn.translateX, turn.translateY);
  context.rotate(turn.angle);
  context.drawImage(source.image, 0, 0, source.width, source.height);
  const blob = await new Promise<Blob | null>((resolve) => {
    try {
      canvas.toBlob(resolve, "image/png");
    } catch {
      resolve(null);
    }
  });
  if (!blob || !blob.size) throw new Error(PHOTO_ENCODE_ERROR);
  return {
    file: new File([blob], options.name, { type: "image/png" }),
    size,
  };
}
