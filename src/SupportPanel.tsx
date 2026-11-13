import { useId, useState } from "react";
import { useLang } from "./i18n";
import { supportText } from "./text/support";
import {
  supportCopy,
  supportReport,
  type SupportArea,
  type SupportSymptom,
} from "./support-report";

export function SupportPanel({
  initialArea = "conversation",
}: {
  initialArea?: SupportArea;
}) {
  const [area, setArea] = useState<SupportArea>(initialArea);
  const [symptom, setSymptom] = useState<SupportSymptom>("unavailable");
  const [notice, setNotice] = useState("");
  const id = useId();
  const { lang } = useLang();
  const t = supportText[lang];
  const copy = supportCopy(lang);
  const report = supportReport({ area, symptom }, lang);
  return (
    <section className="content-view" aria-label={t.heading}>
      <h2>{t.heading}</h2>
      <p>{t.intro}</p>
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
      <p>{t.contact}</p>
    </section>
  );
}
