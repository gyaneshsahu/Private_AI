// Sharing (docs/sharing-20261125.md), the browser's part without a browser: the encryption (the
// key opens it, nothing else does, and the key is not in what the server gets), what a snapshot
// holds for an answer, a chat and an image, and the texts in both languages.
import { expect, it } from "vitest";
import { emptyConversation } from "../shared/contracts";
import { shareSnapshot } from "../shared/share-links";
import { newMessage } from "../src/conversation";
import { openSnapshot, sealSnapshot, shareUrl } from "../src/share/crypto";
import { answerSubject, chatSubject, imageSubject, subjectFile, subjectSnapshot, subjectText } from "../src/share/subject";
import { shareText } from "../src/text/share";

const question = newMessage("user", "What should I pack for Hamburg?");
const answer = { ...newMessage("assistant", "A raincoat, **always**."), status: "complete" as const };
const chat = { ...emptyConversation(), title: "Hamburg trip", messages: [question, answer] };

it("only the key from the link opens a snapshot, and the key is not in what the server stores", async () => {
  const snapshot = subjectSnapshot(answerSubject(chat, answer));
  const { cipher, key } = await sealSnapshot(snapshot);
  expect(cipher).toMatch(/^[A-Za-z0-9_-]+$/);
  expect(key).toMatch(/^[A-Za-z0-9_-]{43}$/); // 32 bytes
  expect(cipher).not.toContain(key);
  // Nothing readable in the ciphertext.
  expect(Buffer.from(cipher, "base64url").toString("latin1")).not.toMatch(/raincoat|Hamburg/);
  expect(await openSnapshot(cipher, key)).toEqual(snapshot);
  // Another key, a changed byte or a cut link: refused, never half-opened.
  const other = await sealSnapshot(snapshot);
  await expect(openSnapshot(cipher, other.key)).rejects.toThrow();
  const changed = cipher.slice(0, 30) + (cipher[30] === "A" ? "B" : "A") + cipher.slice(31);
  await expect(openSnapshot(changed, key)).rejects.toThrow();
  await expect(openSnapshot(cipher, key.slice(0, 20))).rejects.toThrow();
  // Two links to the same thing share neither key nor bytes.
  expect(other.key).not.toBe(key);
  expect(other.cipher).not.toBe(cipher);
  // The key sits after "#": the part of an address a browser does not send.
  const url = new URL(shareUrl("https://app.cometrow.com", "a".repeat(22), key));
  expect(url.pathname).toBe(`/s/${"a".repeat(22)}`);
  expect(url.hash).toBe(`#${key}`);
  expect(url.search).toBe("");
});

it("an answer is shared with its question; a chat with every turn; an image as the picture alone", () => {
  const one = subjectSnapshot(answerSubject(chat, answer));
  expect(one).toMatchObject({ v: 1, kind: "answer", title: "Hamburg trip", turns: [{ role: "user", text: question.text }, { role: "assistant", text: answer.text }] });
  expect(shareSnapshot.safeParse(one).success).toBe(true);
  // An answer with no question before it stands alone.
  expect(subjectSnapshot(answerSubject({ ...chat, messages: [answer] }, answer)).turns).toEqual([{ role: "assistant", text: answer.text }]);
  const all = subjectSnapshot(chatSubject(chat, "en"));
  expect(all).toMatchObject({ kind: "chat", turns: [{ role: "user" }, { role: "assistant" }] });
  // Only the words of the turns: no attachments, sources, ids or settings travel with a link.
  expect(Object.keys(all).sort()).toEqual(["kind", "sharedAt", "title", "turns", "v"]);
  expect(Object.keys(all.turns![0]).sort()).toEqual(["role", "text"]);
  const picture = subjectSnapshot(imageSubject({ type: "image/png", data: "AAAA", prompt: "A calm lake" }, "This image"));
  expect(picture).toMatchObject({ kind: "image", title: "A calm lake", image: { type: "image/png", data: "AAAA" } });
  expect(picture.turns).toBeUndefined();
  expect(imageSubject({ type: "image/png", data: "AAAA", prompt: "" }, "This image").title).toBe("This image");
});

it("text for the share menu and the clipboard, and a file for Download", async () => {
  expect(subjectText(answerSubject(chat, answer))).toBe(answer.text);
  expect(subjectText(chatSubject(chat, "en"))).toContain(question.text);
  expect(subjectText(chatSubject(chat, "en"))).toContain(answer.text);
  const text = subjectFile(chatSubject(chat, "en"));
  expect(text.name).toBe("Hamburg-trip.txt");
  expect(text.type).toBe("text/plain;charset=utf-8");
  expect(await text.text()).toContain("raincoat");
  const image = subjectFile(imageSubject({ type: "image/jpeg", data: "/9j/", prompt: "x" }, "y"));
  expect(image.name).toBe("cometrow-image.jpg");
  expect(image.type).toBe("image/jpeg");
  expect(image.size).toBe(3);
});

it("every sharing text exists in both languages, the warning is plain, and the German differs", () => {
  expect(shareText.en.linkIntro).toMatch(/^Anyone with the link can see this\./);
  expect(shareText.de.linkIntro).toMatch(/^Jeder mit dem Link kann dies sehen\./);
  for (const [key, english] of Object.entries(shareText.en)) {
    const german = shareText.de[key as keyof typeof shareText.de];
    if (typeof english === "string") expect(german, key).not.toBe(english);
  }
});
