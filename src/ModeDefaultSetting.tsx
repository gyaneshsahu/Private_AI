import { useId, useState } from "react";
import type { Mode } from "../shared/modes";
import { useText } from "./i18n";
import { LockIcon } from "./ModeBadge";
import { SecureMaxDialog } from "./SecureMaxDialog";
import { modesText } from "./text/modes";

/**
 * Settings, "Default for new chats": Secure (recommended) or Secure Max. Choosing Secure Max
 * always shows the explanation first, because it changes every new chat. Without Secure Max
 * there is no choice: only what Secure means.
 */
export function ModeDefaultSetting({
  value,
  onChange,
  maxAvailable,
}: {
  value: Mode;
  onChange: (mode: Mode) => void;
  maxAvailable: boolean;
}) {
  const t = useText(modesText);
  const id = useId();
  const [asking, setAsking] = useState(false);
  if (!maxAvailable)
    return (
      <p className="mode-default mode-default-only">
        <strong>{t.secureLabel}</strong> <span>{t.secureLine}</span>
      </p>
    );
  return (
    <fieldset className="mode-default">
      <legend>{t.defaultHeading}</legend>
      <label>
        <input
          type="radio"
          name={id}
          checked={value === "secure"}
          aria-labelledby={`${id}-secure-name`}
          aria-describedby={`${id}-secure`}
          onChange={() => onChange("secure")}
        />
        <span>
          <span id={`${id}-secure-name`}>
            <strong>{t.secureLabel}</strong> ({t.recommended})
          </span>
          <small id={`${id}-secure`}>{t.secureLine}</small>
        </span>
      </label>
      <label>
        <input
          type="radio"
          name={id}
          checked={value === "max"}
          aria-labelledby={`${id}-max-name`}
          aria-describedby={`${id}-max`}
          // Controlled: the radio stays unchecked until the dialog is confirmed.
          onChange={(event) => {
            event.currentTarget.focus();
            setAsking(true);
          }}
        />
        <span>
          <strong id={`${id}-max-name`}>
            <LockIcon /> {t.maxLabel}
          </strong>
          <small id={`${id}-max`}>{t.maxLine}</small>
        </span>
      </label>
      {asking && (
        <SecureMaxDialog
          subject="default"
          onCancel={() => setAsking(false)}
          onConfirm={() => {
            setAsking(false);
            onChange("max");
          }}
        />
      )}
    </fieldset>
  );
}
