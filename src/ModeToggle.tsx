import { useId, useState } from "react";
import type { Mode } from "../shared/modes";
import { useText } from "./i18n";
import { LockIcon } from "./ModeBadge";
import { SecureMaxDialog, secureMaxConfirmed } from "./SecureMaxDialog";
import { modesText } from "./text/modes";

/**
 * The lock switch on New chat and New project. Off = Secure, and nothing more is shown. On =
 * Secure Max with its one line. The first time it is turned on, the explanation is shown first;
 * Cancel leaves it off. Renders nothing when Secure Max is not offered.
 */
export function ModeToggle({
  mode,
  onChange,
  maxAvailable,
  disabled,
}: {
  mode: Mode;
  onChange: (mode: Mode) => void;
  maxAvailable: boolean;
  disabled?: boolean;
}) {
  const t = useText(modesText);
  const id = useId();
  const [asking, setAsking] = useState(false);
  if (!maxAvailable) return null;
  const on = mode === "max";
  return (
    <div className="mode-toggle">
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-describedby={on ? id : undefined}
        disabled={disabled}
        onClick={(event) => {
          // Safari does not focus a clicked button; the dialog returns focus to the focused control.
          event.currentTarget.focus();
          if (on) onChange("secure");
          else if (secureMaxConfirmed()) onChange("max");
          else setAsking(true);
        }}
      >
        <LockIcon solid={on} />
        <span>{t.maxLabel}</span>
        <span className="mode-switch-track" aria-hidden="true" />
      </button>
      {on && (
        <p id={id} className="mode-line">
          {t.maxLine}
        </p>
      )}
      {asking && (
        <SecureMaxDialog
          subject="chat"
          onCancel={() => setAsking(false)}
          onConfirm={() => {
            setAsking(false);
            onChange("max");
          }}
        />
      )}
    </div>
  );
}
