// The Share dialog (docs/sharing-20261125.md), for an answer, a chat or an image.
// Step 1, always: the device's own share menu (Web Share API) where the browser has one, Copy and
// Download. All three happen on the device; nothing is stored on a server.
// Step 2, behind its switch: an encrypted link, with its end date and a Delete button.
import { useEffect, useRef, useState } from "react";
import { SHARE, type ShareExpiry } from "../../shared/share-links";
import { containDialogFocus } from "../dialog-focus";
import { Icon } from "../Icon";
import { useLang, useText } from "../i18n";
import { shareText } from "../text/share";
import { createLink, deleteLink, type LinkFailure, type MadeLink } from "./links";
import { subjectFile, subjectText, type ShareSubject } from "./subject";
import "./share.css";

/** True where the browser can hand something to the device's share menu. */
export const canDeviceShare = () => typeof navigator !== "undefined" && typeof navigator.share === "function";

/** Hands the subject to the device's share menu: the image as a file where files are taken, otherwise its text. */
export async function deviceShare(subject: ShareSubject): Promise<void> {
  const file = subjectFile(subject);
  const withFile = { files: [file], title: subject.title };
  try {
    if (subject.kind === "image" && navigator.canShare?.(withFile)) await navigator.share(withFile);
    else await navigator.share({ title: subject.title, text: subjectText(subject) });
  } catch {
    /* closed by the user, or refused by the device: nothing to report */
  }
}

export function downloadSubject(subject: ShareSubject) {
  const file = subjectFile(subject);
  const url = URL.createObjectURL(file);
  Object.assign(document.createElement("a"), { href: url, download: file.name }).click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function ShareDialog(props: {
  subject: ShareSubject;
  /** Encrypted links: "on" offers them, "blocked" says why not here (incognito, Secure Max), "off" shows nothing. */
  links: "on" | "blocked" | "off";
  csrf?: string;
  onClose(): void;
}) {
  const t = useText(shareText);
  const { lang } = useLang();
  const dialog = useRef<HTMLDialogElement>(null);
  const [note, setNote] = useState("");
  const [expires, setExpires] = useState<ShareExpiry>("week");
  const [busy, setBusy] = useState(false);
  const [made, setMade] = useState<MadeLink>();
  useEffect(() => {
    const element = dialog.current;
    const trigger = document.activeElement as HTMLElement | null;
    if (element && !element.open) element.showModal();
    return () => {
      element?.close();
      if (trigger?.isConnected) trigger.focus();
    };
  }, []);
  const { subject } = props;
  const copy = async (text: string, done: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setNote(done);
    } catch {
      setNote(t.copyFailed);
    }
  };
  const create = async () => {
    if (busy || !props.csrf) return;
    setBusy(true);
    setNote(t.creating);
    try {
      setMade(await createLink(subject, expires, props.csrf));
      setNote("");
    } catch (key) {
      const failure = (typeof key === "string" ? key : "failed") as LinkFailure;
      setNote(failure === "tooMany" ? t.tooMany(SHARE.perAccount) : t[failure]);
    } finally {
      setBusy(false);
    }
  };
  const date = (iso: string) => new Date(iso).toLocaleDateString(lang === "de" ? "de-DE" : "en-GB", { day: "numeric", month: "long", year: "numeric" });
  return (
    <dialog
      ref={dialog}
      className="share-dialog"
      aria-label={t.title}
      onKeyDown={containDialogFocus}
      onCancel={(event) => {
        event.preventDefault();
        props.onClose();
      }}
    >
      <header>
        <h2>{t.title}</h2>
        <button type="button" className="icon-button" aria-label={t.close} onClick={props.onClose}>
          <Icon name="close" />
        </button>
      </header>
      <p className="share-subject">
        <strong>{t[subject.kind]}</strong>
        <span>{subject.title}</span>
      </p>
      <div className="share-actions">
        {canDeviceShare() && (
          <button type="button" onClick={() => void deviceShare(subject)}>
            <Icon name="share" />
            {t.device}
          </button>
        )}
        {subject.kind !== "image" && (
          <button type="button" onClick={() => void copy(subjectText(subject), t.copied)}>
            <Icon name="copy" />
            {t.copy}
          </button>
        )}
        <button type="button" onClick={() => downloadSubject(subject)}>
          <Icon name="download" />
          {subject.kind === "image" ? t.download : t.downloadText}
        </button>
      </div>
      <p className="share-note">{t.localNote}</p>
      {props.links !== "off" && (
        <section className="share-link" aria-labelledby="share-link-heading">
          <h3 id="share-link-heading">{t.linkHeading}</h3>
          {props.links === "blocked" ? (
            <p className="share-note">{t.notHere}</p>
          ) : made ? (
            <>
              <label>
                <span>{t.linkLabel}</span>
                <input readOnly value={made.url} onFocus={(event) => event.currentTarget.select()} />
              </label>
              <p className="share-warning">{t.endsOn(date(made.expiresAt))}</p>
              <div className="share-actions">
                <button type="button" className="primary" onClick={() => void copy(made.url, t.linkCopied)}>
                  <Icon name="copy" />
                  {t.copyLink}
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (props.csrf && (await deleteLink(made.id, props.csrf))) {
                      setMade(undefined);
                      setNote(t.deleted);
                    } else setNote(t.failed);
                  }}
                >
                  <Icon name="trash" />
                  {t.deleteLink}
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="share-warning">{t.linkIntro}</p>
              <label>
                <span>{t.expires}</span>
                <select value={expires} disabled={busy} onChange={(event) => setExpires(event.target.value as ShareExpiry)}>
                  <option value="day">{t.day}</option>
                  <option value="week">{t.week}</option>
                  <option value="month">{t.month}</option>
                </select>
              </label>
              <div className="share-actions">
                <button type="button" className="primary" disabled={busy} onClick={() => void create()}>
                  {t.create}
                </button>
              </div>
            </>
          )}
        </section>
      )}
      <p className="share-status" role="status">
        {note}
      </p>
    </dialog>
  );
}
