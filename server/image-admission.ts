// Image questions at the relay (docs/images-20261114.md). The chat body is encrypted, so the relay
// cannot see whether it holds an image. The browser declares it with `x-privateai-kind: image`,
// and that one declaration buys the larger body bound AND costs the image price and one of the
// day's images. An undeclared request keeps the text bound, so a modified browser cannot send an
// image-sized body at the text price.
import type { IncomingHttpHeaders } from "node:http";
import type { AnswerMode, Qualification } from "../shared/contracts";
import { IMAGE_KIND_HEADER, imageRequestLimit } from "../shared/images";

const DAY = 86_400_000;

export interface ImageSettings {
  /** Largest JPEG the browser sends, in bytes; it sizes the larger body bound. */
  maxBytes: number;
  /** Image questions per account in any 24 hours. */
  dailyImages: number;
}

export type ImageDeclaration =
  | { image: false }
  | { image: true; cost: number; limit: number }
  | { refused: "off" | "kind" };

/** What the request declares. `textLimit` is the body bound of an ordinary message. */
export function declaredImage(
  headers: IncomingHttpHeaders,
  q: Qualification,
  settings: ImageSettings | undefined,
  textLimit: number,
): ImageDeclaration {
  const kind = headers[IMAGE_KIND_HEADER];
  if (kind === undefined) return { image: false };
  if (kind !== "image") return { refused: "kind" };
  if (!settings || !q.vision) return { refused: "off" };
  return {
    image: true,
    cost: q.vision.allowanceCost,
    limit: imageRequestLimit(textLimit, settings.maxBytes),
  };
}

/** An image question runs only on the report's vision model, in the Fast mode when the report has modes. */
export const imageModelAdmitted = (q: Qualification, mode: AnswerMode | undefined, model: string) =>
  model === q.vision?.model && mode === (q.modes ? "fast" : undefined);

/**
 * Image questions per account in any 24 hours.
 * shortcut: in this process's memory, like the voice count, so a restart forgets it; move to the
 * ledger with the other single-server limits.
 */
export function imageDayCount(perDay: number) {
  const starts = new Map<string, number[]>();
  return {
    /** Counts one image for `who`; false when the day's images are used up. */
    take(who: string, now = Date.now()) {
      const recent = (starts.get(who) ?? []).filter((t) => now - t < DAY);
      if (recent.length >= perDay) return false;
      if (starts.size > 5000)
        for (const [key, times] of starts) if (times.every((t) => now - t >= DAY)) starts.delete(key);
      starts.set(who, [...recent, now]);
      return true;
    },
    /** Takes the latest count back: the provider refused the request before any answer. */
    giveBack(who: string) {
      starts.get(who)?.pop();
    },
  };
}
