// What the app needs from image editing, in one hook (docs/image-editing-20261125.md), so App.tsx
// holds only the calls: the Edit button of an image, the follow-up request in the chat ("make the
// background white"), the "+" menu's "Edit a picture" for the user's own photo, and the editor.
import { lazy, Suspense, useRef, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import type { AppStatus, Conversation, Message } from "../../shared/contracts";
import { CHAT_IMAGE_BUDGET, chatImageCharacters } from "../CreateImage";
import { newMessage } from "../conversation";
import { useText } from "../i18n";
import { imageEditText } from "../text/image-edit";
import { applyEdit } from "./edit";
import { looksLikeImageEdit } from "./follow-up";
import { checkForPeople } from "./people";
import { fileToVersion } from "./pixels";
import type { EditFailure } from "./request";
import { lastImage, type CreatedImage } from "./versions";

const ImageEditor = lazy(() => import("./ImageEditor").then((m) => ({ default: m.ImageEditor })));
const VERSION_ROOM = 400_000; // as in ImageEditor.tsx, which loads only when opened

export function useImageEditing(o: {
  status: AppStatus | undefined;
  conversation: Conversation;
  setConversation: Dispatch<SetStateAction<Conversation>>;
  /** One more of the day's images was used (the server counts too). */
  countImage(): void;
  fail(text: string): void;
  /** The line beside the composer while something runs; "" when done. */
  setBusy(text: string): void;
  /** One picture question to CometRow's own picture model; absent where picture questions are off. */
  askVision?: (question: string, jpegDataUrl: string) => Promise<string>;
}) {
  const t = useText(imageEditText);
  const [editing, setEditing] = useState<string>();
  const fileInput = useRef<HTMLInputElement>(null);
  const on = o.status?.imageEditing && o.status.imageCreation ? { ...o.status.imageEditing, ...o.status.imageCreation, csrf: o.status.csrf } : undefined;
  const room = () => CHAT_IMAGE_BUDGET - chatImageCharacters(o.conversation.messages);
  const sentence = (key: unknown) => {
    const failure = (typeof key === "string" ? key : "unavailable") as EditFailure;
    return failure === "limit" ? t.limit(on?.limit ?? 0) : failure === "versionsFull" ? t.unavailable : t[failure];
  };
  const put = (id: string, image: CreatedImage) =>
    o.setConversation((current) => ({ ...current, messages: current.messages.map((m) => (m.id === id ? { ...m, createdImage: image } : m)) }));

  /** The Edit button of this message's image; undefined where editing is off. */
  const editFor = (message: Message) => (on && message.createdImage ? () => setEditing(message.id) : undefined);

  /**
   * A message typed right after an image that asks for a change to it: the image is edited and
   * the result is a new image in the chat. True when the message was taken (nothing goes to the chat model).
   */
  function followUp(text: string, taken: () => void): boolean {
    const target = on && o.conversation.messages.at(-1)?.createdImage ? lastImage(o.conversation.messages) : undefined;
    if (!on || !target || !looksLikeImageEdit(text)) return false;
    if (room() < VERSION_ROOM) return o.fail(t.chatFull), true;
    const prompt = text.trim();
    o.setBusy(t.working);
    void applyEdit({ image: target.image, tool: "describe", prompt, masks: on.masks, csrf: on.csrf, label: prompt })
      .then((version) => {
        const at = new Date().toISOString();
        o.setConversation((current) => ({
          ...current,
          messages: [
            ...current.messages,
            { ...newMessage("user", prompt), at },
            {
              ...newMessage("assistant", t.context(prompt)),
              at,
              status: "complete",
              createdImage: { ...version, model: target.image.model, ...(target.image.source ? { source: target.image.source } : {}) },
            },
          ],
        }));
        o.countImage();
        taken();
      })
      .catch((key) => o.fail(sentence(key)))
      .finally(() => o.setBusy(""));
    return true;
  }

  /** The user's own photo: checked for people on the way in, then shown in the chat and opened in the editor. */
  async function upload(file: File) {
    if (!on?.uploads) return;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return o.fail(t.uploadFormat);
    if (room() < VERSION_ROOM) return o.fail(t.chatFull);
    o.setBusy(t.uploadChecking);
    try {
      const { version, bitmap } = await fileToVersion(file, "");
      const verdict = await checkForPeople(bitmap, o.askVision, o.status?.images?.maxBytes);
      if (verdict !== "clear") return o.fail(verdict === "people" ? t.uploadPeople : t.uploadUncheckable);
      const message: Message = {
        ...newMessage("assistant", t.uploadContext),
        at: new Date().toISOString(),
        status: "complete",
        createdImage: { ...version, model: "upload", source: "upload" },
      };
      o.setConversation((current) => ({ ...current, messages: [...current.messages, { ...newMessage("user", t.menuUpload), at: message.at }, message] }));
      setEditing(message.id);
    } catch {
      o.fail(t.uploadFormat);
    } finally {
      o.setBusy("");
    }
  }

  const open = editing ? o.conversation.messages.find((m) => m.id === editing)?.createdImage : undefined;
  const element: ReactNode = on ? (
    <>
      {on.uploads && (
        <input
          ref={fileInput}
          type="file"
          hidden
          accept="image/jpeg,image/png,image/webp"
          aria-label={t.menuUpload}
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) void upload(file);
          }}
        />
      )}
      {open && editing && (
        <Suspense fallback={null}>
          <ImageEditor
            image={open}
            csrf={on.csrf}
            masks={on.masks}
            limit={on.limit}
            used={on.used}
            roomLeft={room()}
            onChange={(image, counted) => {
              put(editing, image);
              if (counted) o.countImage();
            }}
            onClose={() => setEditing(undefined)}
          />
        </Suspense>
      )}
    </>
  ) : null;
  return {
    editFor,
    followUp,
    /** Opens the file chooser for "Edit a picture"; undefined where uploads are off. */
    chooseUpload: on?.uploads ? () => fileInput.current?.click() : undefined,
    element,
  };
}
