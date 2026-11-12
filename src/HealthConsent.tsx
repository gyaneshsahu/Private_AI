import { HEALTH_CONSENT } from "../shared/health-consent";
import type { HealthConsentChoice, HealthConsentRecord } from "./health-consent";

/** Asked once before the first message while the draft flag is on. */
export function HealthConsentPrompt({
  onChoose,
}: {
  onChoose: (choice: HealthConsentChoice) => void;
}) {
  return (
    <section
      className="notice health-consent"
      role="region"
      aria-label={HEALTH_CONSENT.title}
      data-draft={HEALTH_CONSENT.status}
    >
      <h3>{HEALTH_CONSENT.title}</h3>
      {HEALTH_CONSENT.paragraphs.map((text) => (
        <p key={text}>{text}</p>
      ))}
      <div className="row">
        <button className="primary" onClick={() => onChoose("accepted")}>
          {HEALTH_CONSENT.accept}
        </button>
        <button onClick={() => onChoose("declined")}>{HEALTH_CONSENT.decline}</button>
      </div>
    </section>
  );
}

/** Settings, Privacy & data: shows and changes the current choice. */
export function HealthConsentSetting({
  record,
  onChoose,
}: {
  record: HealthConsentRecord | undefined;
  onChoose: (choice: HealthConsentChoice) => void;
}) {
  const accepted = record?.choice === "accepted";
  return (
    <div className="health-consent-setting" data-draft={HEALTH_CONSENT.status}>
      <h4>{HEALTH_CONSENT.title}</h4>
      <p>
        {accepted
          ? "You allowed health and other sensitive details in your messages."
          : record
            ? "You chose not to allow health and other sensitive details."
            : "You have not chosen yet; you will be asked before your first message."}
      </p>
      <button
        className="text-button"
        onClick={() => onChoose(accepted ? "declined" : "accepted")}
      >
        {accepted ? "Withdraw permission" : "Allow health and sensitive details"}
      </button>
    </div>
  );
}
