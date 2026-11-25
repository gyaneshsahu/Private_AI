// Uploaded photos with people are not edited for now (owner, 25 November 2026). Two checks, both
// before anything reaches the image provider:
// 1. The browser's own face finder (Shape Detection API), where it exists: free and on the device.
//    A face found means "people". No face found proves little (a back, a hand, a small figure).
// 2. One question to CometRow's own picture model (the same confidential model as "Ask about a
//    picture"), which answers YES or NO. It counts as one picture question.
// Without the second check the answer is "unknown", and an unknown picture is not edited.
type FaceFinder = new () => { detect(image: CanvasImageSource): Promise<unknown[]> };

export const PEOPLE_QUESTION =
  "Does this picture show a real person: a face, a body, or a part of a body such as a hand? Drawings, statues, toys and signs do not count. Answer with one word: YES or NO.";

export type PeopleVerdict = "clear" | "people" | "unknown";

/** Reads the model's one-word answer; anything else is "unknown". */
export function verdictOf(answer: string): PeopleVerdict {
  const word = answer.trim().toLowerCase().replace(/^[^a-z]+/, "");
  return /^(yes|ja)\b/.test(word) ? "people" : /^(no|nein)\b/.test(word) ? "clear" : "unknown";
}

/** A small JPEG data URL of the picture for the question, within the picture-question size. */
export function questionPicture(bitmap: ImageBitmap, maxBytes: number): string | undefined {
  const scale = Math.min(1, 640 / Math.max(bitmap.width, bitmap.height));
  const canvas = Object.assign(document.createElement("canvas"), { width: Math.round(bitmap.width * scale), height: Math.round(bitmap.height * scale) });
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  for (const quality of [0.7, 0.5, 0.35]) {
    const url = canvas.toDataURL("image/jpeg", quality);
    if ((url.length * 3) / 4 <= maxBytes) return url;
  }
  return undefined;
}

export async function checkForPeople(bitmap: ImageBitmap, ask?: (question: string, jpegDataUrl: string) => Promise<string>, maxBytes = 280_000): Promise<PeopleVerdict> {
  const Finder = (globalThis as { FaceDetector?: FaceFinder }).FaceDetector;
  if (Finder)
    try {
      if ((await new Finder().detect(bitmap)).length) return "people";
    } catch {
      /* the finder failed: the second check decides */
    }
  if (!ask) return "unknown";
  const picture = questionPicture(bitmap, maxBytes);
  if (!picture) return "unknown";
  try {
    return verdictOf(await ask(PEOPLE_QUESTION, picture));
  } catch {
    return "unknown";
  }
}
