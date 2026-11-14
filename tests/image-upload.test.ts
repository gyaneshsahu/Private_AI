// Image questions on the device (docs/images-20261114.md): suggested boxes from OCR words and the
// real masking rules, the byte cap and downscale arithmetic, the request (picture present once,
// absent in follow-ups, declared to the relay), nothing in saved data, the notice and the consent
// rule. Offline: the SDK is a test double, the canvas is a fake that records what was drawn.
// Real pixels (metadata gone, boxes burned in) are checked in tests/image-redaction-ui.test.ts.
import "fake-indexeddb/auto";
import { afterEach, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";

const sdk = vi.hoisted(() => ({ chat: vi.fn() }));
vi.mock("privatemode-ai", () => ({
  PrivatemodeAI: class {
    chat = { completions: { create: (body: unknown, options: unknown) => ({ asResponse: () => sdk.chat(body, options) }) } };
    verify = async () => undefined;
    refreshSecret = async () => undefined;
    close = () => undefined;
  },
}));

import { emptyConversation, type Conversation } from "../shared/contracts";
import { IMAGE_MAX_EDGE, imageDataUrlLength } from "../shared/images";
import { composeContext, IMAGE_GONE_NOTE, newMessage } from "../src/conversation";
import {
  clampBox,
  ENCODE_STEPS,
  encodeForSending,
  IMAGE_DATA_URL_PREFIX,
  imageConsentStep,
  sendSize,
  stripJpegMetadata,
  suggestRedactions,
  toAttachedImage,
  type OcrWord,
} from "../src/image-upload";
import { streamReply } from "../src/inference";
import { listImageMetadata, type CreateCanvas } from "../src/photo-capture";
import { discardPrivatemodeSession } from "../src/providers/privatemode-client";
import { containsImageData, savedConversationSchema } from "../src/saved-conversation";
import { imageText } from "../src/text/images";
import { Vault } from "../src/vault";
import { fakeManifest, privatemodeReport } from "./fixtures/privatemode-report";

afterEach(() => {
  discardPrivatemodeSession();
  sdk.chat.mockReset();
  vi.unstubAllGlobals();
});

// One line of fake OCR output: words 10 px high, laid out left to right.
function line(number: number, text: string, y = number * 40): OcrWord[] {
  let x = 20;
  return text.split(" ").map((word) => {
    const box = { text: word, line: number, x0: x, y0: y, x1: x + word.length * 10, y1: y + 20 };
    x = box.x1 + 10;
    return box;
  });
}
const SIZE = { width: 800, height: 600 };

it("proposes a box for each identifier the masking rules find in the recognised words, and none for ordinary words", () => {
  const words = [
    ...line(1, "Rechnung Nr. 12 vom Montag"),
    ...line(2, "Kontakt: erika.mustermann@example.org oder +49 170 1234567"),
    ...line(3, "IBAN: DE89 3704 0044 0532 0130 00 bitte überweisen"),
  ];
  const boxes = suggestRedactions(words, SIZE);
  expect(boxes.map((b) => b.kind).sort()).toEqual(["EMAIL", "IBAN", "PHONE"]);
  const covers = (box: { x: number; y: number; width: number; height: number }, word: OcrWord) =>
    box.x <= word.x0 && box.y <= word.y0 && box.x + box.width >= word.x1 && box.y + box.height >= word.y1;
  const covered = (text: string) => boxes.some((b) => covers(b, words.find((w) => w.text === text)!));
  // Every word of each identifier is under a box, with a little room around it.
  for (const text of ["erika.mustermann@example.org", "+49", "170", "1234567", "DE89", "3704", "0044", "0532", "0130", "00"])
    expect(covered(text), text).toBe(true);
  // Ordinary words stay visible.
  for (const text of ["Rechnung", "Montag", "Kontakt:", "oder", "IBAN:", "bitte", "überweisen"])
    expect(covered(text), text).toBe(false);
  const email = boxes.find((b) => b.kind === "EMAIL")!;
  expect(email).toMatchObject({ x: 107, y: 77, height: 26 }); // 3 px of padding on a 20 px word
  // Whole pixels, inside the picture.
  for (const b of boxes) {
    expect([b.x, b.y, b.width, b.height].every(Number.isInteger)).toBe(true);
    expect(b.x >= 0 && b.y >= 0 && b.x + b.width <= SIZE.width && b.y + b.height <= SIZE.height).toBe(true);
  }
});

it("covers an identifier that wraps onto the next line with one box per line, and finds nothing in a picture without identifiers", () => {
  const words = [...line(1, "Bankverbindung IBAN DE89 3704 0044"), ...line(2, "0532 0130 00")];
  const boxes = suggestRedactions(words, SIZE);
  expect(boxes).toHaveLength(2);
  expect(boxes.every((b) => b.kind === "IBAN")).toBe(true);
  expect(new Set(boxes.map((b) => b.y)).size).toBe(2);
  expect(suggestRedactions(line(1, "Ein Foto vom Garten im Sommer"), SIZE)).toEqual([]);
  expect(suggestRedactions([], SIZE)).toEqual([]);
});

it("an unread or misread number is not proposed: suggestions are only as good as the OCR", () => {
  // The OCR read the letter O for a zero inside the IBAN: the check digits fail, no IBAN box.
  const boxes = suggestRedactions(line(1, "IBAN: DE89 37O4 OO44 O532 O13O OO"), SIZE);
  expect(boxes.some((b) => b.kind === "IBAN")).toBe(false);
});

it("sizes the picture: longest edge at most 1,568 pixels, never enlarged, proportions kept", () => {
  expect(IMAGE_MAX_EDGE).toBe(1568);
  expect(sendSize({ width: 4000, height: 3000 })).toEqual({ width: 1568, height: 1176 });
  expect(sendSize({ width: 3000, height: 4000 })).toEqual({ width: 1176, height: 1568 });
  expect(sendSize({ width: 800, height: 600 })).toEqual({ width: 800, height: 600 });
  expect(sendSize({ width: 1568, height: 1568 })).toEqual({ width: 1568, height: 1568 });
});

it("rounds a box outward and keeps it inside the picture, also when it was dragged from right to left", () => {
  expect(clampBox({ x: 10.6, y: 20.2, width: 30.1, height: 5.5 }, SIZE)).toEqual({ x: 10, y: 20, width: 31, height: 6 });
  expect(clampBox({ x: 100, y: 100, width: -40, height: -30 }, SIZE)).toEqual({ x: 60, y: 70, width: 40, height: 30 });
  expect(clampBox({ x: -5, y: 590, width: 900, height: 50 }, SIZE)).toEqual({ x: 0, y: 590, width: 800, height: 10 });
  // Scaled down for a smaller encode: still outward.
  expect(clampBox({ x: 101, y: 101, width: 99, height: 99 }, { width: 400, height: 300 }, 0.5)).toEqual({ x: 50, y: 50, width: 50, height: 50 });
});

// A canvas that records what is drawn and "encodes" to a size that follows pixels and quality.
function fakeCanvases(bytesPerPixel: number) {
  const made: { width: number; height: number; calls: unknown[][]; quality?: number }[] = [];
  const createCanvas: CreateCanvas = (width, height) => {
    const record: (typeof made)[number] = { width, height, calls: [] };
    made.push(record);
    let fillStyle = "";
    return {
      width,
      height,
      getContext: () =>
        ({
          set fillStyle(value: string) {
            fillStyle = value;
          },
          get fillStyle() {
            return fillStyle;
          },
          setTransform: () => undefined,
          translate: () => undefined,
          rotate: () => undefined,
          fillRect: (...args: number[]) => record.calls.push(["fillRect", fillStyle, ...args]),
          drawImage: (_image: unknown, ...args: number[]) => record.calls.push(["drawImage", ...args]),
        }) as never,
      toBlob(callback, type, quality) {
        record.quality = quality;
        callback(new Blob([new Uint8Array(Math.round(record.width * record.height * bytesPerPixel * quality!))], { type }));
      },
    };
  };
  return { made, createCanvas };
}

it("burns the boxes in after the picture is drawn, and lowers quality, then size, until the JPEG fits the byte cap", async () => {
  const size = { width: 1568, height: 1176 };
  const box = { x: 100, y: 200, width: 300, height: 40 };
  // Fits at once: full size, best quality.
  const easy = fakeCanvases(0.05);
  const first = await encodeForSending({} as CanvasImageSource, size, [box], 280_000, easy.createCanvas);
  expect(first).toMatchObject({ width: 1568, height: 1176 });
  expect(easy.made).toHaveLength(1);
  expect(easy.made[0].calls).toEqual([
    ["fillRect", "#fff", 0, 0, 1568, 1176],
    ["drawImage", 0, 0, 1568, 1176],
    // The black box comes last, so it replaces the pixels under it.
    ["fillRect", "#000", 100, 200, 300, 40],
  ]);
  // A detailed photo: 0.4 bytes per pixel at quality 1 is 626,949 bytes at the first step.
  const hard = fakeCanvases(0.4);
  const fitted = await encodeForSending({} as CanvasImageSource, size, [box], 280_000, hard.createCanvas);
  expect(fitted.blob.size).toBeLessThanOrEqual(280_000);
  expect(fitted.blob.type).toBe("image/jpeg");
  // Quality 0.85, 0.7, 0.55 at full size, then 80% of the size: 1254 x 940 at 0.85 is 400,777; at 0.7 is 330,052; at 0.55 is 259,327.
  expect(hard.made.map((c) => [c.width, c.quality])).toEqual([
    [1568, 0.85], [1568, 0.7], [1568, 0.55], [1254, 0.85], [1254, 0.7], [1254, 0.55],
  ]);
  expect(fitted).toMatchObject({ width: 1254, height: 940 });
  // The box is scaled with the picture, outward: 100 x 0.7997 = 79.97 -> 79, right edge 319.9 -> 320.
  expect(hard.made.at(-1)!.calls.at(-1)).toEqual(["fillRect", "#000", 79, 159, 241, 33]);
  // Never over the cap: a picture that cannot fit is refused, in the interface language.
  await expect(
    encodeForSending({} as CanvasImageSource, size, [], 1000, fakeCanvases(0.4).createCanvas),
  ).rejects.toThrow(imageText.en.tooLarge);
  expect(ENCODE_STEPS).toHaveLength(18);
  expect(ENCODE_STEPS.at(-1)).toEqual({ scale: 0.3, quality: 0.55 });
});

it("the data URL of a JPEG at the cap has exactly the length the relay's bound is computed from", async () => {
  // Start of image, then straight to the image data: nothing to strip.
  const jpeg = Buffer.alloc(280_000, 200);
  jpeg.set([0xff, 0xd8, 0xff, 0xda]);
  const attached = await toAttachedImage({ blob: new Blob([jpeg], { type: "image/jpeg" }), width: 10, height: 10 });
  expect(attached.dataUrl.startsWith(IMAGE_DATA_URL_PREFIX)).toBe(true);
  expect(attached.dataUrl.length).toBe(imageDataUrlLength(280_000));
  expect(attached.bytes).toBe(280_000);
  expect(Buffer.from(attached.dataUrl.slice(IMAGE_DATA_URL_PREFIX.length), "base64")).toEqual(jpeg);
});

it("keeps only what a decoder needs in the JPEG: EXIF, colour profile, other application segments and comments are dropped, and anything left over refuses the picture", async () => {
  const segment = (marker: number, body: string) => {
    const data = Buffer.from(body, "latin1");
    return Buffer.concat([Buffer.from([0xff, marker, (data.length + 2) >> 8, (data.length + 2) & 255]), data]);
  };
  const soi = Buffer.from([0xff, 0xd8]);
  const jfif = segment(0xe0, "JFIF\0header");
  const tables = segment(0xdb, "quantisation tables");
  const scan = Buffer.concat([segment(0xda, "scan header"), Buffer.from("compressed image data \xff\x00 more", "latin1"), Buffer.from([0xff, 0xd9])]);
  const tagged = Buffer.concat([soi, jfif, segment(0xe1, "Exif\0\0GPS 52.52N 13.405E"), segment(0xe2, "ICC_PROFILE"), tables, segment(0xed, "Photoshop IPTC author"), segment(0xfe, "a comment"), scan]);
  expect(listImageMetadata(tagged)).toEqual(["APP1", "APP2", "APP13", "COM"]);
  const stripped = Buffer.from(stripJpegMetadata(tagged));
  expect(stripped).toEqual(Buffer.concat([soi, jfif, tables, scan]));
  expect(listImageMetadata(stripped)).toEqual([]);
  // Through the real path: what is attached is the stripped file.
  const attached = await toAttachedImage({ blob: new Blob([tagged], { type: "image/jpeg" }), width: 1, height: 1 });
  expect(Buffer.from(attached.dataUrl.slice(IMAGE_DATA_URL_PREFIX.length), "base64")).toEqual(stripped);
  expect(attached.bytes).toBe(stripped.length);
  // Not a JPEG at all: refused, nothing attached.
  expect(() => stripJpegMetadata(Buffer.from("not a picture"))).toThrow(imageText.en.prepareFailed);
});

const PICTURE = IMAGE_DATA_URL_PREFIX + Buffer.from("synthetic jpeg bytes").toString("base64");
const reply = () =>
  new Response('data: {"choices":[{"index":0,"delta":{"content":"A red square."}}]}\n\ndata: {"choices":[{"index":0,"delta":{},"finish_reason":"stop"}]}\n\ndata: [DONE]\n\n', {
    headers: { "content-type": "text/event-stream" },
  });
function browser() {
  vi.stubGlobal("location", { origin: "https://app.example.test", host: "app.example.test" });
  vi.stubGlobal("fetch", vi.fn(async () => new Response(fakeManifest)));
}
const report = () => privatemodeReport({ vision: { model: "glm-5.3-flash", allowanceCost: 3 } });
const ask = (conversation: Conversation, mode: "fast" | "thinking", image?: string, choice: "primary" | "backup" = "primary") =>
  streamReply(conversation, report(), "c".repeat(64), new AbortController().signal, () => {}, () => {}, undefined, undefined, choice, mode, "s".repeat(40), image);
function asked(text: string, image = true, base: Conversation = emptyConversation()): Conversation {
  return { ...base, messages: [...base.messages, { ...newMessage("user", text), ...(image ? { image: true as const } : {}) }] };
}

it("sends the picture once, as one image part beside the masked question, to the Fast model, declared as an image request", async () => {
  browser();
  sdk.chat.mockImplementation(async () => reply());
  const conversation = asked("What does this show? My IBAN is DE89 3704 0044 0532 0130 00.");
  await ask(conversation, "fast", PICTURE);
  const [body, options] = sdk.chat.mock.calls[0];
  expect(body.model).toBe("glm-5.3-flash");
  expect(new Headers(options.headers).get("x-privateai-kind")).toBe("image");
  expect(new Headers(options.headers).get("x-privateai-mode")).toBe("fast");
  const user = body.messages.filter((m: { role: string }) => m.role === "user");
  expect(user).toHaveLength(1);
  expect(user[0].content).toEqual([
    // Typed text is masked as always; the "picture is gone" note is not sent with the picture itself.
    { type: "text", text: "What does this show? My IBAN is {{IBAN-1}}." },
    { type: "image_url", image_url: { url: PICTURE } },
  ]);
  // Exactly once in the whole body.
  expect(JSON.stringify(body).split(PICTURE)).toHaveLength(2);
  expect(body.messages[0].content).toContain("Black boxes in it are parts the user covered on purpose");
});

it("a follow-up does not resend the picture: the model is told it is gone, and the request is an ordinary text request", async () => {
  browser();
  sdk.chat.mockImplementation(async () => reply());
  let conversation = asked("What does this show?");
  conversation = { ...conversation, messages: [...conversation.messages, newMessage("assistant", "A red square.")] };
  conversation = asked("And what colour is it?", false, conversation);
  await ask(conversation, "fast");
  const [body, options] = sdk.chat.mock.calls[0];
  expect(new Headers(options.headers).has("x-privateai-kind")).toBe(false);
  expect(JSON.stringify(body)).not.toContain("image_url");
  expect(JSON.stringify(body)).not.toContain("base64");
  const user = body.messages.filter((m: { role: string }) => m.role === "user");
  expect(user[0].content).toBe(IMAGE_GONE_NOTE + "What does this show?");
  expect(user[1].content).toBe("And what colour is it?");
  // The same from composeContext, which every review and count in the app uses.
  expect(composeContext(conversation, 100_000).map((m) => m.content).join("\n")).not.toContain("data:image");
});

it("a picture never goes to the Thinking model, the backup model or with anything that is not a JPEG data URL", async () => {
  browser();
  sdk.chat.mockImplementation(async () => reply());
  const conversation = asked("What does this show?");
  await expect(ask(conversation, "thinking", PICTURE)).rejects.toThrow("vision model");
  await expect(ask(conversation, "fast", PICTURE, "backup")).rejects.toThrow("vision model");
  await expect(ask(conversation, "fast", "https://example.org/picture.jpg")).rejects.toThrow("JPEG");
  await expect(ask(conversation, "fast", "data:image/png;base64,AAAA")).rejects.toThrow("JPEG");
  // Without `vision` in the report there is no picture at all.
  await expect(
    streamReply(conversation, privatemodeReport(), "c".repeat(64), new AbortController().signal, () => {}, () => {}, undefined, undefined, "primary", "fast", "s".repeat(40), PICTURE),
  ).rejects.toThrow("vision model");
  expect(sdk.chat).not.toHaveBeenCalled();
});

it("a saved conversation holds the question, the answer and a flag, and no picture data", async () => {
  let conversation = asked("What does this show?");
  conversation = { ...conversation, messages: [...conversation.messages, newMessage("assistant", "A red square.")] };
  const vault = new Vault();
  vault.selectAccount(crypto.randomUUID());
  await vault.unlock("synthetic picture question password");
  await vault.save(conversation);
  const [saved] = await vault.list();
  expect(saved.messages.map((m) => [m.role, m.text, m.image])).toEqual([
    ["user", "What does this show?", true],
    ["assistant", "A red square.", undefined],
  ]);
  expect(JSON.stringify(saved)).not.toMatch(/data:image|base64|image_url/);
  // The saved format has no place for a picture: unknown fields are dropped, the flag is only `true`.
  const smuggled = { ...conversation, messages: [{ ...conversation.messages[0], imageData: PICTURE, picture: { url: PICTURE } }] };
  expect(JSON.stringify(savedConversationSchema.parse(smuggled))).not.toContain("base64");
  expect(() => savedConversationSchema.parse({ ...conversation, messages: [{ ...conversation.messages[0], image: PICTURE }] })).toThrow();
  // And the vault refuses a conversation that carries a picture anyway, in any field.
  expect(containsImageData(conversation)).toBe(false);
  expect(containsImageData(smuggled)).toBe(true);
  await expect(vault.save(smuggled, null)).rejects.toThrow("pictures are never stored");
  await expect(
    vault.save({ ...emptyConversation(), attachments: [{ id: "a", name: "x", selected: true, sources: [{ id: "s", title: "t", text: PICTURE }] }] }),
  ).rejects.toThrow("pictures are never stored");
  expect(await vault.list()).toHaveLength(1);
  vault.close();
});

it("the picture code stores nothing but the flag that the notice was shown", () => {
  for (const file of ["src/image-upload.ts", "src/ImageQuestion.tsx"]) {
    const source = readFileSync(file, "utf8");
    expect(source).not.toMatch(/indexedDB|sessionStorage|createObjectURL|from "\.\/(vault|saved-conversation)|fetch\(|XMLHttpRequest|sendBeacon/);
    for (const write of source.match(/localStorage\.setItem\([^)]*\)/g) ?? []) expect(write).toBe('localStorage.setItem(IMAGE_NOTE_KEY, "1")');
  }
});

it("the first-upload notice says what is not covered and does not claim full masking, in English and German", () => {
  const en = [imageText.en.note1, imageText.en.note2, imageText.en.note3, imageText.en.note4].join(" ");
  const de = [imageText.de.note1, imageText.de.note2, imageText.de.note3, imageText.de.note4].join(" ");
  for (const part of ["protected Fast model", "suggestions can miss things", "Faces, handwriting", "not covered unless you cover them", "does not store the picture", "After the answer it is gone"])
    expect(en).toContain(part);
  for (const part of ["geschützte Modell", "Vorschläge können etwas übersehen", "Gesichter, Handschrift", "nicht abgedeckt, wenn Sie es nicht selbst abdecken", "speichert das Bild nicht", "Nach der Antwort ist es weg"])
    expect(de).toContain(part);
  // No promise that everything personal is found or removed.
  for (const text of [...Object.values(imageText.en), ...Object.values(imageText.de)].filter((v) => typeof v === "string"))
    expect(text).not.toMatch(/\b(all|every|any) (personal|private|sensitive)|anonym|fully (masked|redacted)|guarantee|alle (persönlichen|privaten)|vollständig (maskiert|geschwärzt)|garantier/i);
  // Every result of a suggestion run repeats the limit.
  expect(imageText.en.suggested(2)).toContain("Suggestions can miss things");
  expect(imageText.en.suggestedNone).toContain("does not mean");
  expect(imageText.de.suggested(2)).toContain("Vorschläge können etwas übersehen");
  expect(imageText.en.facesFound(1)).toContain("faces can be missed");
  expect(Object.keys(imageText.de)).toEqual(Object.keys(imageText.en));
  expect(imageText.en.notKept).toBe("[Picture: not kept]");
});

it("the health rule: while the consent step is on, every picture is asked about until the user has agreed", () => {
  expect(imageConsentStep(true, undefined)).toBe("ask");
  expect(imageConsentStep(true, "declined")).toBe("ask");
  expect(imageConsentStep(true, "accepted")).toBe("none");
  // The step is off (production today): the picture flow adds nothing and removes nothing.
  expect(imageConsentStep(false, undefined)).toBe("none");
  expect(imageConsentStep(false, "declined")).toBe("none");
});
