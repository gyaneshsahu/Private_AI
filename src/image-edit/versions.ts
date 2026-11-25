// Versions of one image (docs/image-editing-20261125.md). A saved image holds the version it
// shows in its own fields and every other version in `versions`, so the shown picture is stored
// once. These helpers turn that into one ordered list and back. Nothing here touches the network.
import type { Message } from "../../shared/contracts";
import { IMAGE_EDIT } from "../../shared/image-edit";

export type CreatedImage = NonNullable<Message["createdImage"]>;
export type ImageVersion = { type: CreatedImage["type"]; data: string; prompt: string };

/** Every version, oldest first, and which one is shown. */
export function versionsOf(image: CreatedImage): { list: ImageVersion[]; at: number } {
  const others = image.versions ?? [];
  const at = Math.min(Math.max(image.at ?? others.length, 0), others.length);
  const shown: ImageVersion = { type: image.type, data: image.data, prompt: image.prompt };
  return { list: [...others.slice(0, at), shown, ...others.slice(at)], at };
}

/** The saved image for this list with `at` shown. Everything else about the image stays. */
export function withVersions(image: CreatedImage, list: readonly ImageVersion[], at: number): CreatedImage {
  const shown = list[at];
  const others = list.filter((_, index) => index !== at);
  const { versions: _versions, at: _at, ...rest } = image;
  return { ...rest, ...shown, ...(others.length ? { versions: others, at } : {}) };
}

/** Shows another version; nothing is added or lost. */
export const showVersion = (image: CreatedImage, at: number) => withVersions(image, versionsOf(image).list, at);

/** A new version goes to the end and is shown, whichever version it was made from. */
export function addVersion(image: CreatedImage, version: ImageVersion): CreatedImage {
  const { list } = versionsOf(image);
  return withVersions(image, [...list, version], list.length);
}

/** Removes one version; the last remaining one cannot be removed. The shown one moves to its neighbour. */
export function removeVersion(image: CreatedImage, index: number): CreatedImage {
  const { list, at } = versionsOf(image);
  if (list.length < 2 || !list[index]) return image;
  const left = list.filter((_, i) => i !== index);
  return withVersions(image, left, Math.min(index < at ? at - 1 : at, left.length - 1));
}

export const versionsFull = (image: CreatedImage) => versionsOf(image).list.length >= IMAGE_EDIT.versions;

/** The most recent image of a chat and its message: a follow-up request edits this one. */
export function lastImage(messages: readonly Message[]): { id: string; image: CreatedImage } | undefined {
  for (let i = messages.length - 1; i >= 0; i--) {
    const image = messages[i].createdImage;
    if (image) return { id: messages[i].id, image };
  }
  return undefined;
}
