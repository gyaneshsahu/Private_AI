import { useEffect, useId, useRef } from "react";
import { containDialogFocus } from "./dialog-focus";

/**
 * A modal question before a destructive action. Mount it while the question is open.
 * The browser's modal dialog keeps focus inside and closes on Escape. Focus starts on Cancel,
 * so Enter never deletes by accident. On close focus returns to the control that opened it, or
 * to `fallback` when that control is gone or disabled (for example the deleted row's button).
 */
export function ConfirmDialog({
  title,
  text,
  confirmLabel,
  cancelLabel,
  onClose,
  fallback,
}: {
  title: string;
  text: string;
  confirmLabel: string;
  cancelLabel: string;
  onClose: (confirmed: boolean) => void;
  fallback?: () => HTMLElement | null;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const cancel = useRef<HTMLButtonElement>(null);
  const id = useId();
  useEffect(() => {
    const element = dialog.current;
    const trigger = document.activeElement as HTMLElement | null;
    element?.showModal();
    cancel.current?.focus();
    return () => {
      element?.close();
      if (trigger?.isConnected && !trigger.matches(":disabled") && trigger.checkVisibility())
        trigger.focus();
      else fallback?.()?.focus();
    };
    // Once per mount: `fallback` is a new function on every render of the caller.
  }, []);
  return (
    <dialog
      ref={dialog}
      className="confirm-dialog"
      onKeyDown={containDialogFocus}
      aria-labelledby={`${id}-title`}
      aria-describedby={`${id}-text`}
      onCancel={(event) => {
        event.preventDefault();
        onClose(false);
      }}
    >
      <h2 id={`${id}-title`}>{title}</h2>
      <p id={`${id}-text`}>{text}</p>
      <div className="confirm-actions">
        <button ref={cancel} type="button" onClick={() => onClose(false)}>
          {cancelLabel}
        </button>
        <button type="button" className="danger-button" onClick={() => onClose(true)}>
          {confirmLabel}
        </button>
      </div>
    </dialog>
  );
}
