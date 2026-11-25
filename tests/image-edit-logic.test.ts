// Image editing (docs/image-editing-20261125.md), the parts that need no browser: versions of one
// image, the arithmetic of the painted area, which chat messages edit the last image (English and
// German), the people check's verdict, and what a saved chat may hold.
import { expect, it } from "vitest";
import { emptyConversation } from "../shared/contracts";
import { IMAGE_EDIT } from "../shared/image-edit";
import { CHAT_IMAGE_BUDGET, chatImageCharacters } from "../src/CreateImage";
import { newMessage } from "../src/conversation";
import { looksLikeImageEdit } from "../src/image-edit/follow-up";
import { cropBox, fitSide, paintedBounds, zoomStep } from "../src/image-edit/geometry";
import { PEOPLE_QUESTION, verdictOf } from "../src/image-edit/people";
import { addVersion, lastImage, removeVersion, showVersion, versionsFull, versionsOf, withVersions, type CreatedImage } from "../src/image-edit/versions";
import { savedConversationSchema } from "../src/saved-conversation";
import { imageEditText } from "../src/text/image-edit";

const v = (name: string) => ({ type: "image/jpeg" as const, data: Buffer.from(name).toString("base64"), prompt: name });
const first: CreatedImage = { ...v("lake"), model: "flux-2-klein" };

it("every edit is a new version at the end; earlier versions stay and any can be shown", () => {
  expect(versionsOf(first)).toEqual({ list: [v("lake")], at: 0 });
  const two = addVersion(first, v("orange sky"));
  expect(two).toMatchObject({ prompt: "orange sky", model: "flux-2-klein", at: 1 });
  expect(two.versions).toEqual([v("lake")]); // the shown picture is stored once, not twice
  const three = addVersion(two, v("night"));
  expect(versionsOf(three).list.map((x) => x.prompt)).toEqual(["lake", "orange sky", "night"]);
  // Showing the first again loses nothing, and an edit made from it still goes to the end.
  const back = showVersion(three, 0);
  expect(back).toMatchObject({ prompt: "lake", at: 0 });
  expect(versionsOf(back).list.map((x) => x.prompt)).toEqual(["lake", "orange sky", "night"]);
  const four = addVersion(back, v("with a boat"));
  expect(versionsOf(four)).toMatchObject({ at: 3 });
  expect(versionsOf(four).list.map((x) => x.prompt)).toEqual(["lake", "orange sky", "night", "with a boat"]);
});

it("deleting a version keeps the rest in order; the last one cannot be deleted", () => {
  const three = addVersion(addVersion(first, v("b")), v("c"));
  const withoutShown = removeVersion(three, 2);
  expect(versionsOf(withoutShown)).toEqual({ list: [v("lake"), v("b")], at: 1 });
  const withoutFirst = removeVersion(three, 0);
  expect(versionsOf(withoutFirst)).toEqual({ list: [v("b"), v("c")], at: 1 });
  const one = removeVersion(removeVersion(three, 0), 0);
  expect(one.versions).toBeUndefined();
  expect(one.at).toBeUndefined();
  expect(removeVersion(one, 0)).toBe(one);
  expect(withVersions(three, [v("only")], 0)).toEqual({ ...v("only"), model: "flux-2-klein" });
});

it("an image keeps a fixed number of versions, and a chat counts all of them toward its room", () => {
  let image = first;
  for (let i = 1; i < IMAGE_EDIT.versions; i++) image = addVersion(image, v(`edit ${i}`));
  expect(versionsFull(image)).toBe(true);
  expect(versionsFull(first)).toBe(false);
  const message = { ...newMessage("assistant", "[Created image]"), createdImage: image };
  const total = versionsOf(image).list.reduce((n, x) => n + x.data.length, 0);
  expect(chatImageCharacters([message])).toBe(total);
  expect(total).toBeLessThan(CHAT_IMAGE_BUDGET);
  // A saved chat accepts the versions, and refuses one too many or a data URL among them.
  const chat = { ...emptyConversation(), messages: [message] };
  expect(savedConversationSchema.safeParse(chat).success).toBe(true);
  const tooMany = { ...chat, messages: [{ ...message, createdImage: { ...image, versions: [...image.versions!, v("extra")] } }] };
  expect(savedConversationSchema.safeParse(tooMany).success).toBe(false);
  const dataUrl = { ...chat, messages: [{ ...message, createdImage: { ...first, versions: [{ ...v("x"), data: "data:image/png;base64,AAAA" }], at: 1 } }] };
  expect(savedConversationSchema.safeParse(dataUrl).success).toBe(false);
  const upload = { ...chat, messages: [{ ...message, createdImage: { ...first, model: "upload", source: "upload" as const } }] };
  expect(savedConversationSchema.safeParse(upload).success).toBe(true);
});

it("a follow-up request edits the chat's most recent image", () => {
  const a = { ...newMessage("assistant", "one"), createdImage: first };
  const b = { ...newMessage("assistant", "two"), createdImage: { ...first, prompt: "second" } };
  expect(lastImage([a, newMessage("user", "hi"), b, newMessage("user", "x")])).toEqual({ id: b.id, image: b.createdImage });
  expect(lastImage([newMessage("user", "hi")])).toBeUndefined();
});

it("which messages after an image are edits: English", () => {
  for (const text of [
    "make the background white",
    "Make it darker",
    "please remove the car",
    "now add a red boat on the left",
    "change the sky to sunset",
    "turn it into a watercolour",
    "replace the tree with a lamp post",
    "can you make the door blue",
    "more contrast",
    "without the people in the back",
    "in black and white",
    "the same but at night",
    "crop it tighter",
  ])
    expect(looksLikeImageEdit(text), text).toBe(true);
  for (const text of [
    "",
    "What is in this picture?",
    "why is the sky red",
    "Describe the picture",
    "thanks",
    "make a list of colours used",
    "write a poem about this lake",
    "Explain how watercolour works",
    "How do I make the background white?",
    "make it darker\nand also tell me a story",
    "x".repeat(241),
  ])
    expect(looksLikeImageEdit(text), text).toBe(false);
});

it("which messages after an image are edits: German", () => {
  for (const text of [
    "mach den Hintergrund weiß",
    "Mache es dunkler",
    "bitte entferne das Auto",
    "füge links ein rotes Boot hinzu",
    "ändere den Himmel zu einem Sonnenuntergang",
    "ersetze den Baum durch eine Laterne",
    "ohne die Menschen im Hintergrund",
    "mehr Kontrast",
    "in Schwarzweiß",
    "dasselbe aber bei Nacht",
  ])
    expect(looksLikeImageEdit(text), text).toBe(true);
  for (const text of ["Was ist auf dem Bild?", "Warum ist der Himmel rot", "Beschreibe das Bild", "danke", "mach eine Liste der Farben", "Schreibe ein Gedicht über den See", "Wie mache ich den Hintergrund weiß?"])
    expect(looksLikeImageEdit(text), text).toBe(false);
});

it("the painted area: its bounds, and the box sent when the provider takes no mask", () => {
  const size = { width: 8, height: 6 };
  const rgba = new Uint8ClampedArray(size.width * size.height * 4);
  expect(paintedBounds(rgba, size)).toBeUndefined();
  for (const [x, y] of [[2, 1], [5, 1], [3, 4]]) rgba[(y * size.width + x) * 4 + 3] = 200;
  expect(paintedBounds(rgba, size)).toEqual({ x: 2, y: 1, width: 4, height: 4 });
  const picture = { width: 1024, height: 1024 };
  // A small area gets a box of at least 384 px around it, centred on it and inside the picture.
  expect(cropBox({ x: 500, y: 500, width: 40, height: 40 }, picture)).toEqual({ x: 328, y: 328, width: 384, height: 384 });
  expect(cropBox({ x: 0, y: 0, width: 40, height: 40 }, picture)).toEqual({ x: 0, y: 0, width: 384, height: 384 });
  expect(cropBox({ x: 1000, y: 990, width: 24, height: 34 }, picture)).toEqual({ x: 640, y: 640, width: 384, height: 384 });
  // A larger area keeps a margin of about a third on each side.
  expect(cropBox({ x: 300, y: 300, width: 300, height: 200 }, picture)).toEqual({ x: 195, y: 208, width: 510, height: 384 });
  // An area that is most of the picture: the whole picture is sent.
  expect(cropBox({ x: 50, y: 50, width: 900, height: 900 }, picture)).toEqual({ x: 0, y: 0, ...picture });
  // A picture smaller than the least box is sent whole.
  expect(cropBox({ x: 10, y: 10, width: 20, height: 20 }, { width: 200, height: 100 })).toEqual({ x: 0, y: 0, width: 200, height: 100 });
});

it("sizes for sending and the zoom steps", () => {
  expect(fitSide({ width: 4000, height: 3000 }, 1024)).toEqual({ width: 1024, height: 768 });
  expect(fitSide({ width: 800, height: 600 }, 1024)).toEqual({ width: 800, height: 600 });
  expect(fitSide({ width: 5000, height: 2 }, 1024)).toEqual({ width: 1024, height: 1 });
  expect(zoomStep(1, 1)).toBe(1.5);
  expect(zoomStep(1.5, -1)).toBe(1);
  expect(zoomStep(1, -1)).toBe(1);
  expect(zoomStep(4, 1)).toBe(4);
});

it("the people check reads one word, and anything else is not a pass", () => {
  expect(PEOPLE_QUESTION).toMatch(/YES or NO/);
  for (const answer of ["YES", "Yes.", " yes, a hand", "**Yes**", "Ja"]) expect(verdictOf(answer), answer).toBe("people");
  for (const answer of ["NO", "No.", "no people", "Nein"]) expect(verdictOf(answer), answer).toBe("clear");
  for (const answer of ["", "Maybe", "I cannot tell", "Synthetic answer.", "Nothing suspicious, yes?"]) expect(verdictOf(answer), answer).toBe("unknown");
});

it("every editor text exists in both languages, and the German differs", () => {
  for (const [key, english] of Object.entries(imageEditText.en)) {
    const german = imageEditText.de[key as keyof typeof imageEditText.de];
    if (typeof english === "string" && !["Original", "Version"].includes(english)) expect(german, key).not.toBe(english);
  }
});
