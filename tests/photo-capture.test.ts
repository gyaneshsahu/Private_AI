import { crc32, deflateSync } from "node:zlib";
import { expect, it, vi } from "vitest";
import {
  NO_CROP,
  PHOTO_CANVAS_ERROR,
  PHOTO_DECODE_ERROR,
  PHOTO_ENCODE_ERROR,
  PHOTO_MAX_EDGE,
  PHOTO_MAX_PIXELS,
  boundedScale,
  clampInset,
  cropRect,
  decodePhoto,
  listImageMetadata,
  mapSourcePoint,
  outputSize,
  photoFileName,
  previewLayout,
  renderPhoto,
  rotatedSize,
  sniffImageType,
  turnRotation,
  validatePhotoFile,
  type PhotoCanvasLike,
  type PhotoContextLike,
  type PhotoSource,
  type Rotation,
  type Size,
} from "../src/photo-capture";

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

type Bytes = Uint8Array<ArrayBuffer>;
function concat(parts: Uint8Array[]): Bytes {
  const out = new Uint8Array(parts.reduce((n, part) => n + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}
function chunk(type: string, data: Uint8Array): Bytes {
  const body = concat([new TextEncoder().encode(type), data]);
  const out = new Uint8Array(8 + body.length);
  const view = new DataView(out.buffer);
  view.setUint32(0, data.length);
  out.set(body, 4);
  view.setUint32(4 + body.length, crc32(body));
  return out;
}
/** Minimal valid 8-bit RGB PNG with optional extra chunks after IHDR. */
function png(width: number, height: number, extra: Uint8Array[] = []): Bytes {
  const header = new Uint8Array(13);
  const view = new DataView(header.buffer);
  view.setUint32(0, width);
  view.setUint32(4, height);
  header[8] = 8;
  header[9] = 2;
  const raw = new Uint8Array(height * (1 + width * 3));
  return concat([
    Uint8Array.from(PNG_SIGNATURE),
    chunk("IHDR", header),
    ...extra,
    chunk("IDAT", new Uint8Array(deflateSync(raw))),
    chunk("IEND", new Uint8Array()),
  ]);
}
function textChunk(keyword: string, value: string): Bytes {
  return chunk("tEXt", new TextEncoder().encode(`${keyword}\0${value}`));
}
function jpeg(segments: [number, Uint8Array][]): Bytes {
  return concat([
    Uint8Array.from([0xff, 0xd8]),
    ...segments.map(([marker, data]) =>
      concat([
        Uint8Array.from([0xff, marker, (data.length + 2) >> 8, (data.length + 2) & 0xff]),
        data,
      ]),
    ),
    Uint8Array.from([0xff, 0xda, 0x00, 0x02, 0xff, 0xd9]),
  ]);
}
function stubCanvas(encode: (size: Size) => Bytes | null) {
  const ops: unknown[][] = [];
  const canvases: PhotoCanvasLike[] = [];
  const record =
    (name: string) =>
    (...args: unknown[]) =>
      ops.push([
        name,
        ...args.map((value) => (typeof value === "number" ? value + 0 : value)),
      ]);
  const createCanvas = (width: number, height: number): PhotoCanvasLike => {
    const context: PhotoContextLike = {
      fillStyle: "",
      fillRect: record("fillRect"),
      setTransform: record("setTransform"),
      translate: record("translate"),
      rotate: record("rotate"),
      drawImage: record("drawImage"),
    };
    const canvas: PhotoCanvasLike = {
      width,
      height,
      getContext: () => context,
      toBlob: (callback, type) => {
        const bytes = encode({ width: canvas.width, height: canvas.height });
        callback(bytes ? new Blob([bytes], { type }) : null);
      },
    };
    canvases.push(canvas);
    return canvas;
  };
  return { createCanvas, ops, canvases };
}
const image = {} as CanvasImageSource;
const source = (width: number, height: number): PhotoSource => ({
  image,
  width,
  height,
  release: vi.fn(),
});

it("turns in quarter steps and swaps the bounding box for 90° and 270°", () => {
  expect(turnRotation(0, "right")).toBe(90);
  expect(turnRotation(270, "right")).toBe(0);
  expect(turnRotation(0, "left")).toBe(270);
  expect(turnRotation(90, "left")).toBe(0);
  const size = { width: 1000, height: 200 };
  expect(rotatedSize(size, 90)).toEqual({ width: 200, height: 1000 });
  expect(rotatedSize(size, 180)).toEqual(size);
  expect(rotatedSize(size, 270)).toEqual({ width: 200, height: 1000 });
});

it("maps source corners into the rotated frame so the canvas transform keeps the whole image in view", () => {
  const size = { width: 1000, height: 200 };
  const corners = [
    { x: 0, y: 0 },
    { x: 1000, y: 0 },
    { x: 0, y: 200 },
    { x: 1000, y: 200 },
  ];
  const expected: Record<Rotation, { x: number; y: number }[]> = {
    0: corners,
    90: [
      { x: 200, y: 0 },
      { x: 200, y: 1000 },
      { x: 0, y: 0 },
      { x: 0, y: 1000 },
    ],
    180: [
      { x: 1000, y: 200 },
      { x: 0, y: 200 },
      { x: 1000, y: 0 },
      { x: 0, y: 0 },
    ],
    270: [
      { x: 0, y: 1000 },
      { x: 0, y: 0 },
      { x: 200, y: 1000 },
      { x: 200, y: 0 },
    ],
  };
  for (const rotation of [0, 90, 180, 270] as const) {
    const mapped = corners.map((corner) => mapSourcePoint(corner, size, rotation));
    expect(mapped).toEqual(expected[rotation]);
    const bounds = rotatedSize(size, rotation);
    for (const point of mapped) {
      expect(point.x).toBeGreaterThanOrEqual(0);
      expect(point.y).toBeGreaterThanOrEqual(0);
      expect(point.x).toBeLessThanOrEqual(bounds.width);
      expect(point.y).toBeLessThanOrEqual(bounds.height);
    }
  }
});

it("clamps crop insets to the image and never produces a crop below the minimum", () => {
  const size = { width: 1000, height: 200 };
  expect(cropRect(size, NO_CROP)).toEqual({ x: 0, y: 0, width: 1000, height: 200 });
  expect(cropRect(size, { left: 2, top: 0, right: 2, bottom: 0 })).toEqual({
    x: 20,
    y: 0,
    width: 960,
    height: 200,
  });
  expect(clampInset({ left: -10, top: Number.NaN, right: 150, bottom: 12.5 })).toEqual(
    { left: 0, top: 0, right: 95, bottom: 12.5 },
  );
  expect(cropRect(size, { left: -10, top: Number.NaN, right: 150, bottom: 0 })).toEqual(
    { x: 0, y: 0, width: 50, height: 200 },
  );
  expect(cropRect(size, { left: 95, top: 95, right: 95, bottom: 95 })).toEqual({
    x: 950,
    y: 184,
    width: 16,
    height: 16,
  });
  expect(cropRect({ width: 10, height: 10 }, { left: 95, top: 0, right: 95, bottom: 0 })).toEqual(
    { x: 0, y: 0, width: 10, height: 10 },
  );
});

it("downscales to the 4000 px edge and 12 megapixel OCR bounds without upscaling", () => {
  expect(boundedScale({ width: 1000, height: 200 })).toBe(1);
  expect(outputSize({ width: 1000, height: 200 })).toEqual({ width: 1000, height: 200 });
  expect(outputSize({ width: 8000, height: 6000 })).toEqual({ width: 4000, height: 3000 });
  expect(outputSize({ width: 5000, height: 5000 })).toEqual({ width: 3464, height: 3464 });
  expect(outputSize({ width: 4000, height: 3001 })).toEqual({ width: 3999, height: 3000 });
  expect(outputSize({ width: 9000, height: 20 })).toEqual({ width: 4000, height: 8 });
  for (const size of [
    { width: 8000, height: 6000 },
    { width: 5000, height: 5000 },
    { width: 4000, height: 3001 },
    { width: 12000, height: 12000 },
    { width: 30000, height: 1 },
  ]) {
    const out = outputSize(size);
    expect(Math.max(out.width, out.height)).toBeLessThanOrEqual(PHOTO_MAX_EDGE);
    expect(out.width * out.height).toBeLessThanOrEqual(PHOTO_MAX_PIXELS);
    expect(Math.min(out.width, out.height)).toBeGreaterThanOrEqual(1);
  }
  expect(previewLayout({ width: 200, height: 1000 }, { width: 560, height: 340 })).toEqual({
    scale: 0.34,
    size: { width: 68, height: 340 },
  });
  expect(previewLayout({ width: 100, height: 50 }, { width: 560, height: 340 })).toEqual({
    scale: 1,
    size: { width: 100, height: 50 },
  });
});

it("names photos by sequence without capture time or device detail", () => {
  expect(photoFileName(1)).toBe("photo-1.png");
  expect(photoFileName(12)).toBe("photo-12.png");
});

it("refuses empty, oversized, mistyped and non-image files before decoding", () => {
  const pngHeader = png(1, 1).subarray(0, 16);
  const jpegHeader = jpeg([]).subarray(0, 16);
  expect(sniffImageType(pngHeader)).toBe("image/png");
  expect(sniffImageType(jpegHeader)).toBe("image/jpeg");
  expect(sniffImageType(new TextEncoder().encode("GIF89a"))).toBeUndefined();
  expect(validatePhotoFile({ type: "image/png", size: 0 }, pngHeader)).toContain("empty");
  expect(
    validatePhotoFile({ type: "image/png", size: 10 * 1024 * 1024 + 1 }, pngHeader),
  ).toContain("10 MB");
  expect(validatePhotoFile({ type: "image/png", size: 10 * 1024 * 1024 }, pngHeader)).toBeUndefined();
  expect(validatePhotoFile({ type: "", size: 100 }, jpegHeader)).toBeUndefined();
  expect(validatePhotoFile({ type: "image/jpeg", size: 100 }, pngHeader)).toContain(
    "do not match",
  );
  expect(validatePhotoFile({ type: "image/webp", size: 100 }, new Uint8Array(16))).toContain(
    "PNG or JPEG",
  );
  expect(validatePhotoFile({ type: "image/png", size: 3 }, new Uint8Array([0x89, 0x50]))).toContain(
    "PNG or JPEG",
  );
});

it("lists metadata-bearing PNG chunks and JPEG segments", () => {
  expect(listImageMetadata(png(2, 2))).toEqual([]);
  expect(
    listImageMetadata(
      png(2, 2, [textChunk("Comment", "canary"), chunk("eXIf", new Uint8Array(4))]),
    ),
  ).toEqual(["tEXt", "eXIf"]);
  const exif = new TextEncoder().encode("Exif\0\0synthetic");
  expect(listImageMetadata(jpeg([[0xe0, new Uint8Array(14)]]))).toEqual([]);
  expect(
    listImageMetadata(
      jpeg([
        [0xe0, new Uint8Array(14)],
        [0xe1, exif],
        [0xfe, new TextEncoder().encode("comment")],
      ]),
    ),
  ).toEqual(["APP1", "COM"]);
  expect(listImageMetadata(new TextEncoder().encode("not an image"))).toEqual([]);
});

it("re-encodes only drawn pixels, so source metadata cannot reach the OCR file", async () => {
  const sourceBytes = png(1000, 200, [textChunk("Comment", "SYNTHETIC CANARY")]);
  expect(listImageMetadata(sourceBytes)).toEqual(["tEXt"]);
  const { createCanvas, ops, canvases } = stubCanvas((size) =>
    png(size.width, size.height),
  );
  const photo = source(1000, 200);
  const { file, size } = await renderPhoto(
    photo,
    { rotation: 90, inset: { left: 0, top: 2, right: 0, bottom: 2 } },
    { name: "photo-1.png", createCanvas },
  );
  expect(size).toEqual({ width: 200, height: 960 });
  expect(canvases).toHaveLength(1);
  expect(canvases[0]).toMatchObject({ width: 200, height: 960 });
  expect(ops).toEqual([
    ["setTransform", 1, 0, 0, 1, 0, 0],
    ["fillRect", 0, 0, 200, 960],
    ["setTransform", 1, 0, 0, 1, 0, -20],
    ["translate", 200, 0],
    ["rotate", Math.PI / 2],
    ["drawImage", image, 0, 0, 1000, 200],
  ]);
  expect(file.name).toBe("photo-1.png");
  expect(file.type).toBe("image/png");
  const output = new Uint8Array(await file.arrayBuffer());
  expect(sniffImageType(output)).toBe("image/png");
  expect(listImageMetadata(output)).toEqual([]);
  expect(Buffer.from(output).includes("SYNTHETIC CANARY")).toBe(false);
  expect(photo.release).not.toHaveBeenCalled();
});

it("bounds a large capture to the OCR limits before encoding", async () => {
  const { createCanvas, ops, canvases } = stubCanvas((size) =>
    png(size.width, size.height),
  );
  const { size } = await renderPhoto(
    source(8000, 6000),
    { rotation: 0, inset: NO_CROP },
    { name: "photo-2.png", createCanvas },
  );
  expect(size).toEqual({ width: 4000, height: 3000 });
  expect(canvases[0]).toMatchObject({ width: 4000, height: 3000 });
  expect(ops).toContainEqual(["setTransform", 0.5, 0, 0, 0.5, 0, 0]);
  expect(ops).toContainEqual(["drawImage", image, 0, 0, 8000, 6000]);
});

it("fails clearly when the canvas cannot draw or encode", async () => {
  const { createCanvas } = stubCanvas(() => null);
  await expect(
    renderPhoto(source(10, 10), { rotation: 0, inset: NO_CROP }, { name: "x.png", createCanvas }),
  ).rejects.toThrow(PHOTO_ENCODE_ERROR);
  const blind = (width: number, height: number): PhotoCanvasLike => ({
    width,
    height,
    getContext: () => null,
    toBlob: () => undefined,
  });
  await expect(
    renderPhoto(source(10, 10), { rotation: 0, inset: NO_CROP }, { name: "x.png", createCanvas: blind }),
  ).rejects.toThrow(PHOTO_CANVAS_ERROR);
});

it("rejects malformed and oversized sources while closing decoded bitmaps", async () => {
  const good = new File([png(4, 4)], "good.png", { type: "image/png" });
  await expect(
    decodePhoto(good, async () => {
      throw new Error("decode failed");
    }),
  ).rejects.toThrow(PHOTO_DECODE_ERROR);
  const huge = { width: 13000, height: 10, close: vi.fn() };
  await expect(
    decodePhoto(good, async () => huge as unknown as ImageBitmap),
  ).rejects.toThrow("Resize");
  expect(huge.close).toHaveBeenCalledTimes(1);
  const dense = { width: 8000, height: 8000, close: vi.fn() };
  await expect(
    decodePhoto(good, async () => dense as unknown as ImageBitmap),
  ).rejects.toThrow("60 megapixels");
  expect(dense.close).toHaveBeenCalledTimes(1);
  const empty = { width: 0, height: 0, close: vi.fn() };
  await expect(
    decodePhoto(good, async () => empty as unknown as ImageBitmap),
  ).rejects.toThrow(PHOTO_DECODE_ERROR);
  expect(empty.close).toHaveBeenCalledTimes(1);
  const bitmap = { width: 4, height: 4, close: vi.fn() };
  const decoded = await decodePhoto(good, async () => bitmap as unknown as ImageBitmap);
  expect(decoded).toMatchObject({ width: 4, height: 4 });
  decoded.release();
  expect(bitmap.close).toHaveBeenCalledTimes(1);
  const decode = vi.fn();
  await expect(
    decodePhoto(new File(["not an image"], "x.png", { type: "image/png" }), decode),
  ).rejects.toThrow("PNG or JPEG");
  await expect(
    decodePhoto(new File([png(4, 4)], "x.jpg", { type: "image/jpeg" }), decode),
  ).rejects.toThrow("do not match");
  await expect(
    decodePhoto(new File([], "empty.png", { type: "image/png" }), decode),
  ).rejects.toThrow("empty");
  expect(decode).not.toHaveBeenCalled();
});
