import { useId } from "react";
import { useText } from "./i18n";
import { modesText } from "./text/modes";

/** Settings: "Open CometRow in Secure Max", one switch with one line under it. */
export function SecureMaxStartSetting({ value, onChange }: { value: boolean; onChange: (value: boolean) => void }) {
  const t = useText(modesText);
  const id = useId();
  return (
    <div className="secure-max-start">
      <label>
        <input type="checkbox" role="switch" checked={value} aria-describedby={id} onChange={(event) => onChange(event.target.checked)} /> {t.maxStartLabel}
      </label>
      <p id={id} className="muted">
        {t.maxStartLine}
      </p>
    </div>
  );
}
