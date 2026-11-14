// The pure decisions of the composer, dropped files and following the answer
// (docs/chat-feature-gaps-20261114.md, packages A, B and F). A stray Enter would cost allowance.
import { expect, it } from "vitest";
import { isSendKey, limitState, MESSAGE_LIMIT, sendBlocked } from "../src/composer-keys";
import { carriesFiles, filesFrom } from "../src/file-drop";
import { nextFollowing } from "../src/follow-scroll";
import { composerText } from "../src/text/composer";
import { connectionText } from "../src/text/connection";

const key = (over: Partial<Parameters<typeof isSendKey>[0]> = {}) => ({
  key: "Enter",
  shiftKey: false,
  ctrlKey: false,
  altKey: false,
  metaKey: false,
  isComposing: false,
  keyCode: 13,
  repeat: false,
  ...over,
});

it("plain Enter sends with a keyboard; nothing else does", () => {
  expect(isSendKey(key(), false)).toBe(true);
  expect(isSendKey(key({ shiftKey: true }), false)).toBe(false);
  expect(isSendKey(key({ ctrlKey: true }), false)).toBe(false);
  expect(isSendKey(key({ altKey: true }), false)).toBe(false);
  expect(isSendKey(key({ metaKey: true }), false)).toBe(false);
  // An input method is composing text (Japanese, Chinese, Korean, dead keys).
  expect(isSendKey(key({ isComposing: true }), false)).toBe(false);
  expect(isSendKey(key({ keyCode: 229 }), false)).toBe(false);
  // A held key repeats: it must not send again and again.
  expect(isSendKey(key({ repeat: true }), false)).toBe(false);
  expect(isSendKey(key({ key: "a", keyCode: 65 }), false)).toBe(false);
  // Touch device: Enter stays a new line.
  expect(isSendKey(key(), true)).toBe(false);
});

it("Enter and the Send button share one rule for when a send is allowed", () => {
  const ok = { busy: false, text: "Hello", ready: true };
  expect(sendBlocked(ok)).toBe(false);
  expect(sendBlocked({ ...ok, text: "" })).toBe(true);
  expect(sendBlocked({ ...ok, text: " \n\t " })).toBe(true);
  expect(sendBlocked({ ...ok, busy: true })).toBe(true);
  expect(sendBlocked({ ...ok, ready: false })).toBe(true);
  // The search-first choice or the health question is on screen.
  expect(sendBlocked({ ...ok, waiting: true })).toBe(true);
});

it("shows the cut notice at the limit and a counter only close to it", () => {
  expect(limitState(0)).toEqual({ cut: false, remaining: MESSAGE_LIMIT, counter: false });
  expect(limitState(MESSAGE_LIMIT - 1001).counter).toBe(false);
  expect(limitState(MESSAGE_LIMIT - 1000)).toEqual({ cut: false, remaining: 1000, counter: true });
  expect(limitState(MESSAGE_LIMIT)).toEqual({ cut: true, remaining: 0, counter: true });
  expect(limitState(MESSAGE_LIMIT + 5).remaining).toBe(0);
  expect(composerText.en.limitCut("20,000")).toBe(
    "The message was cut at 20,000 characters. Attach long text as a file instead.",
  );
  expect(composerText.de.limitCut("20.000")).toContain("bei 20.000 Zeichen abgeschnitten");
});

it("routes only real files from a drop or paste; text stays text", () => {
  const file = new File(["SYNTHETIC"], "note.txt", { type: "text/plain" });
  const image = new File(["x"], "shot.png", { type: "image/png" });
  expect(filesFrom({ types: ["Files"], files: [file, image] as unknown as FileList })).toEqual([
    file,
    image,
  ]);
  // Pasted or dragged text, also when a browser lists stale files beside it.
  expect(filesFrom({ types: ["text/plain"], files: [file] as unknown as FileList })).toEqual([]);
  expect(carriesFiles({ types: ["text/plain", "text/html"], files: [] as unknown as FileList })).toBe(false);
  expect(carriesFiles(null)).toBe(false);
  expect(filesFrom(undefined)).toEqual([]);
});

it("follows until the user moves up, and again at the end", () => {
  // Our own scrolling moves down and arrives at the end.
  expect(nextFollowing(true, 100, 400, 0)).toBe(true);
  // A smooth scroll on its way down, still far from the end.
  expect(nextFollowing(true, 100, 200, 300)).toBe(true);
  // Any move up away from the end stops following, even a small one.
  expect(nextFollowing(true, 400, 380, 20)).toBe(false);
  expect(nextFollowing(true, 400, 100, 300)).toBe(false);
  // Moving down, but not near the end yet: still not following.
  expect(nextFollowing(false, 100, 200, 200)).toBe(false);
  // Back near the end by moving down, or exactly at it: following again.
  expect(nextFollowing(false, 200, 380, 20)).toBe(true);
  expect(nextFollowing(false, 380, 400, 0)).toBe(true);
  // The page got shorter and the browser clamped the position to the end.
  expect(nextFollowing(true, 400, 350, 0)).toBe(true);
});

it("has every label in English and German, and they differ", () => {
  for (const block of [composerText, connectionText]) {
    expect(Object.keys(block.de)).toEqual(Object.keys(block.en));
    for (const name of Object.keys(block.en) as (keyof typeof block.en)[]) {
      const [en, de] = [block.en[name], block.de[name]].map((value) =>
        typeof value === "function" ? (value as (text: string) => string)("1") : value,
      );
      expect(de, name).not.toBe(en);
    }
  }
  expect(connectionText.en.offline).not.toMatch(/server|service/i);
  expect(connectionText.de.offline).not.toMatch(/server|dienst/i);
});
