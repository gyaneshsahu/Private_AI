import { useId, useState } from "react";
import {
  supportAreas,
  supportSymptoms,
  supportGuidance,
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
  const report = supportReport({ area, symptom });
  return (
    <section className="content-view" aria-label="Help and problem reporting">
      <h2>Help and problem reporting</h2>
      <p>
        Find a recovery step or prepare a note to share. Nothing here sends a
        report or attaches your workspace.
      </p>
      <label htmlFor={`${id}-area`}>Problem area</label>
      <select
        id={`${id}-area`}
        value={area}
        onChange={(event) => {
          setArea(event.target.value as SupportArea);
          setNotice("");
        }}
      >
        {Object.entries(supportAreas).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
      <div className="panel">
        <h3>What you can do</h3>
        {supportGuidance[area].map((text) => (
          <p key={text}>{text}</p>
        ))}
      </div>
      <label htmlFor={`${id}-symptom`}>What happened</label>
      <select
        id={`${id}-symptom`}
        value={symptom}
        onChange={(event) => {
          setSymptom(event.target.value as SupportSymptom);
          setNotice("");
        }}
      >
        {Object.entries(supportSymptoms).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
      <label htmlFor={`${id}-report`}>Review your support note</label>
      <textarea id={`${id}-report`} readOnly rows={10} value={report} />
      <button
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(report);
            setNotice(
              "Support note copied. Nothing was submitted. Your clipboard is controlled by your device.",
            );
          } catch {
            setNotice(
              "Copy was unavailable. Select the note above and copy it manually. Nothing was submitted.",
            );
          }
        }}
      >
        Copy support note
      </button>
      <p role="status" aria-live="polite">
        {notice}
      </p>
      <p>
        A staffed support contact and response times have not been published.
        During this restricted evaluation, share the reviewed note with the
        person coordinating your access. This is not an emergency or monitored
        reporting service.
      </p>
    </section>
  );
}
