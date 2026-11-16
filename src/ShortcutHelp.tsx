import { Fragment, useEffect, useId, useRef } from "react";
import { containDialogFocus } from "./dialog-focus";
import { useText } from "./i18n";
import { shortcutsText } from "./text/shortcuts";
import { isApple, SHORTCUTS } from "./use-shortcuts";
import { focusOrigin } from "./focus-origin";

/**
 * The list of keyboard shortcuts, as a modal dialog. Mount it while open (like ConfirmDialog):
 * focus starts on Close, Escape closes, Tab stays inside, and on close focus returns to the opener,
 * or to `fallback` when the opener is gone (for example the account menu in a closed drawer).
 */
export function ShortcutHelp({
  onClose,
  fallback,
  apple = isApple(),
}: {
  onClose: () => void;
  fallback?: () => HTMLElement | null;
  apple?: boolean;
}) {
  const t = useText(shortcutsText);
  const dialog = useRef<HTMLDialogElement>(null);
  const close = useRef<HTMLButtonElement>(null);
  const id = useId();
  useEffect(() => {
    const element = dialog.current;
    const trigger = focusOrigin();
    element?.showModal();
    close.current?.focus();
    return () => {
      element?.close();
      if (trigger?.isConnected && !trigger.matches(":disabled") && trigger.checkVisibility()) trigger.focus();
      else fallback?.()?.focus();
    };
    // Once per mount: `fallback` is a new function on every render of the caller.
  }, []);
  const key = (name: string) => {
    if (name === "mod")
      return apple ? (
        <kbd>
          <span aria-hidden="true">⌘</span>
          <span className="sr-only">{t.command}</span>
        </kbd>
      ) : (
        <kbd>{t.ctrl}</kbd>
      );
    return <kbd>{name === "shift" ? t.shift : name === "Escape" ? t.esc : name.toUpperCase()}</kbd>;
  };
  return (
    <dialog
      ref={dialog}
      className="shortcut-help"
      onKeyDown={containDialogFocus}
      aria-labelledby={`${id}-title`}
      aria-describedby={`${id}-text`}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <h2 id={`${id}-title`}>{t.title}</h2>
      <p id={`${id}-text`}>{t.intro}</p>
      <dl>
        {SHORTCUTS.map((s) => (
          <div key={s.id}>
            <dt>{t[s.id]}</dt>
            <dd>
              {[...(s.mod ? ["mod"] : []), ...(s.shift ? ["shift"] : []), s.key].map((name, index) => (
                <Fragment key={name}>
                  {index > 0 && <span aria-hidden="true"> + </span>}
                  {key(name)}
                </Fragment>
              ))}
            </dd>
          </div>
        ))}
      </dl>
      <div className="confirm-actions">
        <button ref={close} type="button" onClick={onClose}>
          {t.close}
        </button>
      </div>
    </dialog>
  );
}
