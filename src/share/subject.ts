// What is being shared (docs/sharing-20261125.md): one answer, a whole chat or one image. From it
// come the text for the device's share menu and the clipboard, the file for Download, and the
// snapshot for an encrypted link. Built on the device from what is on screen; nothing is fetched.
import type { Conversation, Message } from "../../shared/contracts";
import type { ShareSnapshot } from "../../shared/share-links";
import { conversationTitle } from "../conversation-library";
import { conversationText } from "../conversation-text";
import type { Lang } from "../text/core";

export type ShareSubject =
  | { kind: "answer"; title: string; question?: string; answer: string }
  | { kind: "chat"; title: string; conversation: Conversation; lang: Lang }
  | { kind: "image"; title: string; image: { type: "image/jpeg" | "image/png" | "image/webp"; data: string } };

/** The answer with the question it answers, when that is the message just before it. */
export function answerSubject(conversation: Conversation, message: Message): ShareSubject {
  const at = conversation.messages.findIndex((m) => m.id === message.id);
  const before = at > 0 ? conversation.messages[at - 1] : undefined;
  return { kind: "answer", title: conversationTitle(conversation), question: before?.role === "user" ? before.text : undefined, answer: message.text };
}
export const chatSubject = (conversation: Conversation, lang: Lang): ShareSubject => ({ kind: "chat", title: conversationTitle(conversation), conversation, lang });
export const imageSubject = (image: { type: "image/jpeg" | "image/png" | "image/webp"; data: string; prompt: string }, fallback: string): ShareSubject => ({
  kind: "image",
  title: image.prompt || fallback,
  image: { type: image.type, data: image.data },
});

/** Plain text for the share menu and the clipboard; an image has only its title. */
export function subjectText(subject: ShareSubject): string {
  if (subject.kind === "answer") return subject.answer;
  if (subject.kind === "chat") return conversationText(subject.conversation, subject.lang);
  return subject.title;
}

const extension = (type: string) => (type === "image/png" ? "png" : type === "image/webp" ? "webp" : "jpg");
const fileBase = (title: string) => (title.trim() || "cometrow").replace(/[\\/:*?"<>|\s]+/g, "-").slice(0, 60);

/** The file for Download and for a share menu that takes files. */
export function subjectFile(subject: ShareSubject): File {
  if (subject.kind === "image") {
    const bytes = Uint8Array.from(atob(subject.image.data), (c) => c.charCodeAt(0));
    return new File([bytes], `cometrow-image.${extension(subject.image.type)}`, { type: subject.image.type });
  }
  return new File([subjectText(subject)], `${fileBase(subject.title)}.txt`, { type: "text/plain;charset=utf-8" });
}

/** The snapshot an encrypted link holds: the turns as plain text, or the image. Never attachments, sources or settings. */
export function subjectSnapshot(subject: ShareSubject, now = new Date()): ShareSnapshot {
  const base = { v: 1 as const, title: subject.title.slice(0, 300), sharedAt: now.toISOString() };
  if (subject.kind === "image") return { ...base, kind: "image", image: subject.image };
  if (subject.kind === "answer")
    return {
      ...base,
      kind: "answer",
      turns: [...(subject.question ? [{ role: "user" as const, text: subject.question }] : []), { role: "assistant" as const, text: subject.answer }],
    };
  return {
    ...base,
    kind: "chat",
    // A created image's turn says "[Created image: …]"; the picture itself is shared from the image, not with the chat.
    turns: subject.conversation.messages.filter((m) => m.text.trim()).slice(0, 400).map((m) => ({ role: m.role, text: m.text.slice(0, 200_000) })),
  };
}
