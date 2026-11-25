// The pieces the app places (docs/sharing-20261125.md): the hook that opens the Share dialog, an
// image in the side panel, and the list of one's own links for Settings.
import { lazy, Suspense, useEffect, useState, type ReactNode } from "react";
import type { AppStatus, Conversation, Message } from "../../shared/contracts";
import type { ShareListing } from "../../shared/share-links";
import { Icon } from "../Icon";
import { useLang, useText } from "../i18n";
import { shareText } from "../text/share";
import { deleteLink, listLinks } from "./links";
import { answerSubject, chatSubject, imageSubject, type ShareSubject } from "./subject";
import "./share.css";

const ShareDialog = lazy(() => import("./ShareDialog").then((m) => ({ default: m.ShareDialog })));

/**
 * One Share dialog for the whole app. `blocked`: the chat is incognito or in Secure Max, where
 * no link may be made (the device's share menu, Copy and Download still work: they stay on the device).
 */
export function useShare(o: { status: AppStatus | undefined; conversation: Conversation; blocked: boolean }) {
  const { lang } = useLang();
  const t = useText(shareText);
  const [subject, setSubject] = useState<ShareSubject>();
  const element: ReactNode = subject ? (
    <Suspense fallback={null}>
      <ShareDialog
        subject={subject}
        links={!o.status?.shareLinks ? "off" : o.blocked ? "blocked" : "on"}
        csrf={o.status?.csrf}
        onClose={() => setSubject(undefined)}
      />
    </Suspense>
  ) : null;
  return {
    element,
    answer: (message: Message) => setSubject(answerSubject(o.conversation, message)),
    chat: () => setSubject(chatSubject(o.conversation, lang)),
    image: (image: NonNullable<Message["createdImage"]>) => setSubject(imageSubject(image, t.image)),
  };
}

/** One image in the side panel, the place the canvas and the whiteboard use. "In this chat" leads back to the list. */
export function ImageSidePanel(props: {
  image: NonNullable<Message["createdImage"]>;
  onEdit?(): void;
  onShare(): void;
  onList(): void;
  onClose(): void;
}) {
  const t = useText(shareText);
  const [url, setUrl] = useState("");
  useEffect(() => {
    const bytes = Uint8Array.from(atob(props.image.data), (c) => c.charCodeAt(0));
    const made = URL.createObjectURL(new Blob([bytes], { type: props.image.type }));
    setUrl(made);
    return () => URL.revokeObjectURL(made);
  }, [props.image.data, props.image.type]);
  const extension = props.image.type === "image/png" ? "png" : props.image.type === "image/webp" ? "webp" : "jpg";
  const picture = url && <img src={url} alt={props.image.prompt || t.image} />;
  return (
    <aside className="side-panel image-side-panel" aria-label={t.panelTitle}>
      <header>
        <h2>{t.panelTitle}</h2>
        <span className="share-actions">
          <button type="button" onClick={props.onList}>
            <Icon name="panel" />
            {t.inThisChat}
          </button>
          <button type="button" aria-label={t.close} title={t.close} onClick={props.onClose}>
            <Icon name="close" />
          </button>
        </span>
      </header>
      {props.onEdit ? (
        <button type="button" className="image-side-open" aria-label={t.image} onClick={props.onEdit}>
          {picture}
        </button>
      ) : (
        picture
      )}
      {props.image.prompt && <p>{props.image.prompt}</p>}
      <div className="share-actions">
        {props.onEdit && (
          <button type="button" className="primary" onClick={props.onEdit}>
            <Icon name="edit" />
            {t.edit}
          </button>
        )}
        <a href={url || undefined} download={`cometrow-image.${extension}`}>
          <Icon name="download" />
          {t.download}
        </a>
        <button type="button" onClick={props.onShare}>
          <Icon name="share" />
          {t.share}
        </button>
      </div>
    </aside>
  );
}

/** Settings > Data controls: the links this account made, each with Delete. Dates only: we cannot read what a link shows. */
export function SharedLinksList({ csrf }: { csrf: string }) {
  const t = useText(shareText);
  const { lang } = useLang();
  const [links, setLinks] = useState<ShareListing[] | "failed">();
  useEffect(() => {
    let live = true;
    listLinks().then(
      (list) => live && setLinks(list),
      () => live && setLinks("failed"),
    );
    return () => {
      live = false;
    };
  }, []);
  const date = (iso: string) => new Date(iso).toLocaleDateString(lang === "de" ? "de-DE" : "en-GB", { day: "numeric", month: "short", year: "numeric" });
  return (
    <section className="share-list" aria-labelledby="share-list-heading">
      <h4 id="share-list-heading">{t.listHeading}</h4>
      <p className="muted">{t.listIntro}</p>
      {links === undefined ? (
        <p className="muted">{t.listLoading}</p>
      ) : links === "failed" ? (
        <p role="status">{t.listFailed}</p>
      ) : !links.length ? (
        <p className="muted">{t.listEmpty}</p>
      ) : (
        <ul>
          {links.map((link) => (
            <li key={link.id}>
              <span>{t.listRow(date(link.createdAt), date(link.expiresAt))}</span>
              <span className="share-actions">
                <button
                  type="button"
                  aria-label={t.deleteThis(date(link.createdAt))}
                  onClick={async () => {
                    if (await deleteLink(link.id, csrf)) setLinks((now) => (Array.isArray(now) ? now.filter((l) => l.id !== link.id) : now));
                  }}
                >
                  <Icon name="trash" />
                  {t.deleteLink}
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
