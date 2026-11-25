// Image editing (docs/image-editing-20261125.md): what the browser and the server agree on.
import { z } from "zod";

export const IMAGE_EDIT = {
  /** The picture sent for an edit, as base64: about 1.5 MB of bytes. The browser scales to `side` first. */
  imageChars: 2_000_000,
  /** The painted area as a PNG, base64. */
  maskChars: 400_000,
  promptMax: 1000,
  /** Longest side, in pixels, of a picture sent for an edit or kept as a version. */
  side: 1024,
  /** Versions one image keeps (the original and its edits). */
  versions: 12,
} as const;

/** Resize targets; each side is a multiple of 16, as the image models need. */
export const EDIT_SIZES = {
  square: { width: 1024, height: 1024 },
  portrait: { width: 832, height: 1248 },
  landscape: { width: 1248, height: 832 },
} as const;
export type EditSize = keyof typeof EDIT_SIZES;

export const EDIT_TOOLS = ["describe", "area", "erase", "resize"] as const;
export type EditTool = (typeof EDIT_TOOLS)[number];

/** The instruction the image model gets for the tools that have no typed text. English: the models follow it best. */
export const FIXED_EDIT_PROMPT = {
  erase: "Remove what is in the marked area and fill it with the surrounding background, so nothing shows that it was there.",
  resize: "Extend the picture to fill the new frame. Keep everything that is already in the picture unchanged.",
} as const;

const base64 = z.string().regex(/^[A-Za-z0-9+/]+=*$/);
export const imageEditRequest = z
  .object({
    image: base64.min(1).max(IMAGE_EDIT.imageChars),
    type: z.enum(["image/jpeg", "image/png", "image/webp"]),
    /** The user's words; empty for erase and resize. */
    prompt: z.string().trim().max(IMAGE_EDIT.promptMax),
    tool: z.enum(EDIT_TOOLS),
    /** White where the picture may change. Sent only when the provider takes masks (status.imageEditing.masks). */
    mask: base64.min(1).max(IMAGE_EDIT.maskChars).optional(),
    size: z.enum(["square", "portrait", "landscape"]).optional(),
    /** "upload": the user's own photo, allowed only where uploads are switched on. */
    source: z.enum(["created", "upload"]),
  })
  .strict()
  .refine((r) => (r.tool === "describe" || r.tool === "area" ? r.prompt.length > 0 : true), "An edit needs its description.")
  .refine((r) => (r.tool === "resize") === (r.size !== undefined), "Resize needs a size, and only resize has one.");
export type ImageEditRequest = z.infer<typeof imageEditRequest>;
