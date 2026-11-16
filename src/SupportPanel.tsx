import { useId, useState } from "react";
import { LEGAL_IDENTITY, PLACEHOLDER } from "../shared/legal-identity";
import { useLang } from "./i18n";
import { appText } from "./text/app";
import { shortcutsText } from "./text/shortcuts";
import { supportText } from "./text/support";
import {
  supportCopy,
  supportReport,
  type SupportArea,
  type SupportSymptom,
} from "./support-report";

/** The documents Help links to; the app shows them in its document viewer, as Settings does. */
export type HelpDocument = "workspace-guide" | "privacy-policy" | "imprint";

export function SupportPanel({
  initialArea = "conversation",
  initialSymptom,
  onDocument,
  onShortcuts,
  supportAddress = LEGAL_IDENTITY.supportContactEmail,
}: {
  initialArea?: SupportArea;
  /** Set when opened from "Report a problem" on an answer: only this choice is pre-set, nothing about the conversation. */
  initialSymptom?: SupportSymptom;
  /** Getting started, Privacy policy and Imprint are offered only when given. */
  onDocument?: (id: HelpDocument) => void;
  /** Opens the keyboard shortcuts list; the button is offered only when given. */
  onShortcuts?: () => void;
  /** The support mailbox (deployment/legal-identity.json); nothing is shown while it is not named. */
  supportAddress?: string;
}) {
  const [area, setArea] = useState<SupportArea>(initialArea);
  const [symptom, setSymptom] = useState<SupportSymptom>(initialSymptom ?? "unavailable");
  const [notice, setNotice] = useState("");
  const id = useId();
  const { lang } = useLang();
  const t = supportText[lang];
  const a = appText[lang];
  const copy = supportCopy(lang);
  const report = supportReport({ area, symptom }, lang);
  const address = supportAddress.trim().toLowerCase() === PLACEHOLDER ? "" : supportAddress.trim();
  return (
    <section className="content-view" aria-label={t.heading}>
      <h2>{t.heading}</h2>
      <p>{t.intro}</p>
      {(onDocument || onShortcuts) && (
        <div className="help-links" role="group" aria-label={t.links}>
          {onDocument && (
            <>
              <button type="button" className="text-button" onClick={() => onDocument("workspace-guide")}>
                {a.gettingStarted}
              </button>
              <button type="button" className="text-button" onClick={() => onDocument("privacy-policy")}>
                {a.privacyPolicy}
              </button>
              <button type="button" className="text-button" onClick={() => onDocument("imprint")}>
                {a.imprint}
              </button>
            </>
          )}
          {onShortcuts && (
            <button type="button" className="text-button" onClick={onShortcuts}>
              {shortcutsText[lang].menuEntry}
            </button>
          )}
        </div>
      )}
      <label htmlFor={`${id}-area`}>{t.area}</label>
      <select
        id={`${id}-area`}
        value={area}
        onChange={(event) => {
          setArea(event.target.value as SupportArea);
          setNotice("");
        }}
      >
        {Object.entries(copy.areas).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
      <div className="panel">
        <h3>{t.whatYouCanDo}</h3>
        {copy.guidance[area].map((text) => (
          <p key={text}>{text}</p>
        ))}
      </div>
      <label htmlFor={`${id}-symptom`}>{t.whatHappened}</label>
      <select
        id={`${id}-symptom`}
        // The button that led here is gone with the conversation view: the focus continues here.
        autoFocus={!!initialSymptom}
        value={symptom}
        onChange={(event) => {
          setSymptom(event.target.value as SupportSymptom);
          setNotice("");
        }}
      >
        {Object.entries(copy.symptoms).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
      <label htmlFor={`${id}-report`}>{t.review}</label>
      <textarea id={`${id}-report`} readOnly rows={10} value={report} />
      <button
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(report);
            setNotice(t.copied);
          } catch {
            setNotice(t.copyFailed);
          }
        }}
      >
        {t.copy}
      </button>
      <p role="status" aria-live="polite">
        {notice}
      </p>
      {address && (
        <p className="help-contact">
          {t.contact} <a href={`mailto:${address}`}>{address}</a>. {t.contactHow}
        </p>
      )}
    </section>
  );
}
