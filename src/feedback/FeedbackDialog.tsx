// The feedback form for testers (docs/feedback-20261125.md): a category, a text, an optional
// rating and an optional screenshot the tester picks himself. The app never takes a screenshot on
// its own. What is sent along is said on the form: the account, the language, the window size.
import { useEffect, useRef, useState } from "react";
import { FEEDBACK, type FeedbackCategory, type FeedbackRequest } from "../../shared/feedback";
import { containDialogFocus } from "../dialog-focus";
import { Icon } from "../Icon";
import { useLang, useText } from "../i18n";
import { feedbackText } from "../text/feedback";
import "./feedback.css";

/** The chosen picture, drawn again no larger than FEEDBACK.screenshotSide: smaller, and without its metadata. */
async function scaled(file: File): Promise<NonNullable<FeedbackRequest["screenshot"]>> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, FEEDBACK.screenshotSide / Math.max(bitmap.width, bitmap.height));
  const canvas = Object.assign(document.createElement("canvas"), { width: Math.round(bitmap.width * scale), height: Math.round(bitmap.height * scale) });
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  for (const quality of [0.8, 0.6, 0.4]) {
    const data = canvas.toDataURL("image/jpeg", quality).split(",")[1];
    if (data.length <= FEEDBACK.screenshotChars) return { type: "image/jpeg", data };
  }
  throw Error("too large");
}

export function FeedbackDialog(props: { csrf: string; onClose(): void }) {
  const t = useText(feedbackText);
  const { lang } = useLang();
  const dialog = useRef<HTMLDialogElement>(null);
  const file = useRef<HTMLInputElement>(null);
  const [category, setCategory] = useState<FeedbackCategory>("problem");
  const [text, setText] = useState("");
  const [rating, setRating] = useState<number>();
  const [shot, setShot] = useState<{ name: string; picture: NonNullable<FeedbackRequest["screenshot"]> }>();
  const [state, setState] = useState<"" | "sending" | "sent">("");
  const [note, setNote] = useState("");
  useEffect(() => {
    const element = dialog.current;
    const trigger = document.activeElement as HTMLElement | null;
    if (element && !element.open) element.showModal();
    return () => {
      element?.close();
      if (trigger?.isConnected) trigger.focus();
    };
  }, []);
  async function send() {
    if (state || !text.trim()) return;
    setState("sending");
    setNote("");
    const body: FeedbackRequest = {
      category,
      text: text.trim(),
      ...(rating ? { rating } : {}),
      ...(shot ? { screenshot: shot.picture } : {}),
      context: { lang, width: Math.max(100, Math.round(window.innerWidth)), height: Math.max(100, Math.round(window.innerHeight)) },
    };
    try {
      const response = await fetch("/api/feedback", { method: "POST", headers: { "Content-Type": "application/json", "X-PrivateAI-CSRF": props.csrf }, body: JSON.stringify(body) });
      if (response.status === 201) return setState("sent");
      setNote(response.status === 429 ? t.limit(FEEDBACK.perDay) : t.failed);
    } catch {
      setNote(t.failed);
    }
    setState("");
  }
  return (
    <dialog
      ref={dialog}
      className="feedback-dialog"
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
      {state === "sent" ? (
        <>
          <p role="status">{t.sent}</p>
          <div className="feedback-actions">
            <button type="button" className="primary" onClick={props.onClose}>
              {t.close}
            </button>
          </div>
        </>
      ) : (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void send();
          }}
        >
          <p className="muted">{t.intro}</p>
          <fieldset>
            <legend>{t.category}</legend>
            <div className="feedback-choices">
              {FEEDBACK.categories.map((value) => (
                <label key={value}>
                  <input type="radio" name="feedback-category" value={value} checked={category === value} onChange={() => setCategory(value)} />
                  <span>{t[value]}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <label className="feedback-field">
            <span>{t.text}</span>
            <textarea rows={5} maxLength={FEEDBACK.textMax} placeholder={t.textPlaceholder} value={text} onChange={(event) => setText(event.target.value)} />
          </label>
          <fieldset>
            <legend>{t.rating}</legend>
            <div className="feedback-rating">
              <span aria-hidden="true">{t.ratingLow}</span>
              {[1, 2, 3, 4, 5].map((n) => (
                <label key={n}>
                  {/* A second click on the chosen number takes the rating back. */}
                  <input type="radio" name="feedback-rating" aria-label={t.ratingValue(n)} checked={rating === n} onChange={() => setRating(n)} onClick={() => rating === n && setRating(undefined)} />
                  <span aria-hidden="true">{n}</span>
                </label>
              ))}
              <span aria-hidden="true">{t.ratingHigh}</span>
            </div>
          </fieldset>
          <input
            ref={file}
            type="file"
            hidden
            accept="image/png,image/jpeg"
            aria-label={t.screenshot}
            onChange={async (event) => {
              const chosen = event.target.files?.[0];
              event.target.value = "";
              if (!chosen) return;
              try {
                setShot({ name: chosen.name, picture: await scaled(chosen) });
                setNote("");
              } catch {
                setNote(t.screenshotFailed);
              }
            }}
          />
          {shot ? (
            <p className="feedback-shot">
              <span>{t.screenshotChosen(shot.name)}</span>
              <button type="button" className="text-button" onClick={() => setShot(undefined)}>
                {t.screenshotRemove}
              </button>
            </p>
          ) : (
            <button type="button" className="feedback-attach" onClick={() => file.current?.click()}>
              <Icon name="image" />
              {t.screenshot}
            </button>
          )}
          <p className="muted feedback-note">{t.sentAlong}</p>
          <p className="feedback-status" role="status">
            {state === "sending" ? t.sending : note}
          </p>
          <div className="feedback-actions">
            <button type="button" onClick={props.onClose}>
              {t.cancel}
            </button>
            <button type="submit" className="primary" disabled={!!state || !text.trim()}>
              {t.send}
            </button>
          </div>
        </form>
      )}
    </dialog>
  );
}
