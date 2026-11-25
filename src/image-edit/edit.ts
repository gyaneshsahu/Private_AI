// One edit from start to finish (docs/image-editing-20261125.md): what is sent for each tool, and
// how the answer becomes the next version. With a provider that takes no mask, a painted area is
// handled here: only a box around it is sent, and the answer is pasted back through the area.
import type { EditSize, EditTool } from "../../shared/image-edit";
import { decode, maskPng, overlayBounds, paste, planCrop, toVersion } from "./pixels";
import { requestEdit, type EditFailure } from "./request";
import { fitSide } from "./geometry";
import { IMAGE_EDIT } from "../../shared/image-edit";
import { versionsOf, type CreatedImage, type ImageVersion } from "./versions";

export async function applyEdit(o: {
  image: CreatedImage;
  tool: EditTool;
  /** The user's words (describe, area); ignored for erase and resize. */
  prompt: string;
  size?: EditSize;
  /** The painted area, in the picture's own pixels (area, erase). */
  overlay?: HTMLCanvasElement;
  /** status.imageEditing.masks */
  masks: boolean;
  csrf: string;
  /** What the new version is called in the strip. */
  label: string;
  signal?: AbortSignal;
}): Promise<ImageVersion> {
  const { list, at } = versionsOf(o.image);
  const picture = await decode(list[at]);
  const source = o.image.source === "upload" ? "upload" : "created";
  const typed = o.tool === "describe" || o.tool === "area" ? o.prompt.trim() : "";
  const ask = (image: ImageVersion, extra: { mask?: string } = {}) =>
    requestEdit({ image: image.data, type: image.type, prompt: typed, tool: o.tool, source, ...(o.tool === "resize" ? { size: o.size } : {}), ...extra }, o.csrf, o.signal);
  if (o.tool === "describe" || o.tool === "resize") return toVersion(await decode(await ask(toVersion(picture, ""))), o.label);
  if (!o.overlay) throw "needSelection" satisfies EditFailure;
  if (o.masks) {
    if (!overlayBounds(o.overlay)) throw "needSelection" satisfies EditFailure;
    const mask = maskPng(o.overlay, fitSide(picture, IMAGE_EDIT.side));
    return toVersion(await decode(await ask(toVersion(picture, ""), { mask })), o.label);
  }
  const plan = planCrop(picture, o.overlay, o.tool === "erase");
  if (!plan) throw "needSelection" satisfies EditFailure;
  return paste(picture, await decode(await ask(plan.crop)), o.overlay, plan.box, o.label);
}
