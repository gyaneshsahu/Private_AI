// Image creation (docs/image-creation-20261117.md): the dialog that sends ONLY the typed description
// (identifiers removed on this device first) and the card that shows a created image in the chat.
// The server keeps nothing; the image is saved with the conversation in the vault as base64 (not as a
// data URL: the vault refuses those, which keeps picture questions out of saved chats).
import { useEffect, useMemo, useRef, useState } from "react";
import type { Message } from "../shared/contracts";
import { Icon } from "./Icon";
import { useLang, useText } from "./i18n";
import { prepareSearchQuery } from "./identifier-masking";
import { imageCreationText } from "./text/image-creation";

export type CreatedImage = NonNullable<Message["createdImage"]>;
/**
 * Created images live inside the saved chat, and a synced chat is at most 4 MiB on the server
 * (server/vault-sync.ts). This leaves room for the text and a whiteboard (1 MB at most); a 1 MP JPEG
 * is roughly 0.2 to 0.5 MB as base64. shortcut: one chat holds about 4 to 10 images; blobs like
 * project files would lift this (owner decision).
 */
export const CHAT_IMAGE_BUDGET = 2_000_000;
export const chatImageCharacters = (messages: readonly Message[]) =>
  messages.reduce((sum, m) => sum + (m.createdImage?.data.length ?? 0), 0);
type Failure = "refusedRealPerson" | "refusedMinors" | "refusedProvider" | "limit" | "capacity" | "unavailable" | "signin";

/** Calls the server once. Throws a failure key the dialog turns into a sentence. */
export async function requestImage(prompt: string, csrf: string, signal?: AbortSignal): Promise<{ type: CreatedImage["type"]; data: string; model: string }> {
  let response: Response;
  try {
    response = await fetch("/api/images/create", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-PrivateAI-CSRF": csrf },
      body: JSON.stringify({ prompt }),
      signal,
    });
  } catch {
    throw "unavailable" satisfies Failure;
  }
  const body = (await response.json().catch(() => ({}))) as { error?: string; reason?: string; type?: CreatedImage["type"]; data?: string; model?: string };
  if (response.ok && body.data && body.type && body.model) return { type: body.type, data: body.data, model: body.model };
  if (response.status === 401) throw "signin" satisfies Failure;
  if (response.status === 429) throw "limit" satisfies Failure;
  if (response.status === 503) throw "capacity" satisfies Failure;
  if (body.error === "refused")
    throw (body.reason === "realPerson" ? "refusedRealPerson" : body.reason === "minors" ? "refusedMinors" : "refusedProvider") satisfies Failure;
  throw "unavailable" satisfies Failure;
}

export function CreateImageDialog(props: {
  open: boolean;
  initial: string;
  csrf: string;
  limit: number;
  used?: number;
  onClose(): void;
  onCreated(image: CreatedImage): void;
}) {
  const t = useText(imageCreationText);
  const { lang } = useLang();
  const dialog = useRef<HTMLDialogElement>(null);
  const [text, setText] = useState(props.initial);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<Failure>();
  useEffect(() => {
    if (!props.open) return dialog.current?.close();
    setText(props.initial);
    setFailure(undefined);
    if (!dialog.current?.open) dialog.current?.showModal();
  }, [props.open, props.initial]);
  const prepared = useMemo(() => prepareSearchQuery(text, lang), [text, lang]);
  const create = async () => {
    const prompt = prepared.value.trim();
    if (!prompt || busy) return;
    setBusy(true);
    setFailure(undefined);
    try {
      const image = await requestImage(prompt, props.csrf);
      props.onCreated({ ...image, prompt, ...(prepared.note ? { maskedNote: t.masked(prepared.note) } : {}) });
    } catch (key) {
      setFailure(typeof key === "string" ? (key as Failure) : "unavailable");
    } finally {
      setBusy(false);
    }
  };
  const failureText = failure === "limit" ? t.limit(props.limit) : failure ? t[failure] : "";
  return (
    <dialog ref={dialog} className="create-image-dialog" aria-label={t.title} onClose={props.onClose} onCancel={props.onClose}>
      <form
        method="dialog"
        onSubmit={(event) => {
          event.preventDefault();
          void create();
        }}
      >
        <h2>{t.title}</h2>
        <label htmlFor="create-image-text">{t.describe}</label>
        <textarea
          id="create-image-text"
          value={text}
          maxLength={1000}
          rows={3}
          placeholder={t.placeholder}
          onChange={(event) => setText(event.target.value)}
          autoFocus
        />
        {props.used !== undefined && <p className="create-image-left">{t.left(Math.max(0, props.limit - props.used), props.limit)}</p>}
        {failureText && (
          <p className="create-image-failure" role="alert">
            {failureText}
          </p>
        )}
        {busy && (
          <p className="create-image-busy" role="status">
            {t.creating}
          </p>
        )}
        <div className="create-image-actions">
          <button type="button" className="text-button" onClick={props.onClose}>
            {t.cancel}
          </button>
          <button type="submit" className="primary" disabled={busy || !prepared.value.trim()}>
            <Icon name="sparkle" />
            {t.create}
          </button>
        </div>
      </form>
    </dialog>
  );
}

/** A created image in the chat: the picture, Download, Regenerate, and a small info icon to Privacy. */
export function CreatedImageCard(props: { image: CreatedImage; onRegenerate?(prompt: string): void; onPrivacy?(): void }) {
  const t = useText(imageCreationText);
  // Made in an effect, not a memo: StrictMode's second mount would otherwise keep a revoked URL.
  const [url, setUrl] = useState<string>();
  useEffect(() => {
    const bytes = Uint8Array.from(atob(props.image.data), (c) => c.charCodeAt(0));
    const made = URL.createObjectURL(new Blob([bytes], { type: props.image.type }));
    setUrl(made);
    return () => URL.revokeObjectURL(made);
  }, [props.image.data, props.image.type]);
  const extension = props.image.type === "image/png" ? "png" : props.image.type === "image/webp" ? "webp" : "jpg";
  return (
    <figure className="created-image">
      {url && <img src={url} alt={t.alt(props.image.prompt)} />}
      <figcaption>
        <span className="created-image-prompt">{props.image.prompt}</span>
        <span className="created-image-actions">
          <a className="icon-action" href={url} download={`cometrow-image.${extension}`} aria-label={t.download} title={t.download}>
            <Icon name="download" />
          </a>
          {props.onRegenerate && (
            <button type="button" className="icon-action" aria-label={t.regenerate} title={t.regenerate} onClick={() => props.onRegenerate!(props.image.prompt)}>
              <Icon name="retry" />
            </button>
          )}
          {props.onPrivacy && (
            <button type="button" className="icon-action" aria-label={t.privacy} title={t.privacy} onClick={props.onPrivacy}>
              <Icon name="help" />
            </button>
          )}
        </span>
      </figcaption>
      {props.image.maskedNote && <p className="created-image-note">{props.image.maskedNote}</p>}
    </figure>
  );
}
