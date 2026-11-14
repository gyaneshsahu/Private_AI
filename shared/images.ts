// Image questions: limits shared by the browser and the relay (docs/images-20261114.md).

/** The header by which the browser declares an image request; the relay charges and bounds by it. */
export const IMAGE_KIND_HEADER = "x-privateai-kind";
/** Longest edge of the image that is sent, in pixels. Larger images are scaled down on the device. */
export const IMAGE_MAX_EDGE = 1568;
/** The text of a `data:image/jpeg;base64,` URL for a JPEG of this many bytes. */
export const imageDataUrlLength = (bytes: number) => 23 + Math.ceil(bytes / 3) * 4;
/**
 * Extra encrypted body bytes the relay allows a declared image request, on top of the text bound:
 *   data URL length (base64 is 4/3 of the JPEG)
 *   x 2 = worst case for the encryption encoding (not measured live)
 *   + 1,024 = the JSON around the image part
 * For 280,000 bytes: (23 + 373,336) x 2 + 1,024 = 747,742.
 */
export const imageBodyAllowance = (maxBytes: number) => imageDataUrlLength(maxBytes) * 2 + 1024;
/** The Render bridge refuses request bodies over this (server/render-bridge.ts). */
export const BRIDGE_BODY_LIMIT = 1024 * 1024;
/** Encrypted body bound for a declared image request: never above the bridge's limit. */
export const imageRequestLimit = (textLimit: number, maxBytes: number) =>
  Math.min(BRIDGE_BODY_LIMIT, textLimit + imageBodyAllowance(maxBytes));
