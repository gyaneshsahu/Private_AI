import { useEffect, useId, useRef, useState } from "react";
import { containDialogFocus } from "./dialog-focus";
import { useText } from "./i18n";
import { MAX_DIFFERENCES, modesText } from "./text/modes";

// One flag per browser, nothing personal in the key or the value. It only decides whether the
// explanation is shown again; it grants nothing.
const CONFIRMED = "cometrow.secureMaxConfirmed";
/** True once the Secure Max explanation was confirmed in this browser. */
export function secureMaxConfirmed(): boolean {
  try {
    return localStorage.getItem(CONFIRMED) === "1";
  } catch {
    return false; // storage blocked: ask each time
  }
}
/** Forgets the confirmation (tests; sign-out, if the lead wants it per account). */
export function resetSecureMaxConfirmed(): void {
  try {
    localStorage.removeItem(CONFIRMED);
  } catch {
    /* storage blocked: nothing was remembered */
  }
}

/**
 * The explanation before Secure Max is used: what it means, what is different, and one box to
 * tick. Built like ConfirmDialog and LocalPassphraseDialog (native modal dialog, Escape cancels,
 * focus returns to the control that opened it), with a normal confirm button because nothing is
 * deleted. Focus starts on the heading: the text is long, and focus on Cancel would open a phone
 * screen scrolled to the buttons. Mount it while the question is open.
 */
export function SecureMaxDialog({
  subject,
  onConfirm,
  onCancel,
}: {
  subject: "chat" | "project" | "section";
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const t = useText(modesText);
  const dialog = useRef<HTMLDialogElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const id = useId();
  const [understood, setUnderstood] = useState(false);
  useEffect(() => {
    const element = dialog.current;
    const trigger = document.activeElement as HTMLElement | null;
    element?.showModal();
    heading.current?.focus();
    return () => {
      element?.close();
      if (trigger?.isConnected && !trigger.matches(":disabled")) trigger.focus();
    };
  }, []);
  return (
    <dialog
      ref={dialog}
      className="confirm-dialog secure-max-dialog"
      // Keys stay in this dialog: it may be opened from inside Settings or a form with its own handlers.
      onKeyDown={(event) => {
        containDialogFocus(event);
        event.stopPropagation();
        // Enter on the box would submit a form this dialog sits in (New project).
        if (event.key === "Enter" && event.target instanceof HTMLInputElement) event.preventDefault();
      }}
      aria-labelledby={`${id}-title`}
      aria-describedby={`${id}-text`}
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
    >
      {/* Only the first opening of the section changes the title; the body is the same for every subject. */}
      <h2 ref={heading} tabIndex={-1} id={`${id}-title`}>{subject === "section" ? t.maxIntroTitle : t.maxDialogTitle}</h2>
      <div className="secure-max-body">
        <p id={`${id}-text`}>{t.maxDialogParagraph}</p>
        <h3 id={`${id}-list`}>{t.maxDifferentHeading}</h3>
        <ul aria-labelledby={`${id}-list`}>
          {MAX_DIFFERENCES.map((key) => (
            <li key={key}>{t[key]}</li>
          ))}
        </ul>
        <label className="secure-max-understand">
          <input type="checkbox" checked={understood} onChange={(event) => setUnderstood(event.target.checked)} />
          <span>{t.maxUnderstand}</span>
        </label>
      </div>
      <div className="confirm-actions">
        <button type="button" onClick={onCancel}>
          {t.cancel}
        </button>
        <button
          type="button"
          className="primary"
          disabled={!understood}
          onClick={() => {
            try {
              localStorage.setItem(CONFIRMED, "1");
            } catch {
              /* storage blocked: the dialog is shown again next time */
            }
            onConfirm();
          }}
        >
          {t.maxConfirm}
        </button>
      </div>
    </dialog>
  );
}
