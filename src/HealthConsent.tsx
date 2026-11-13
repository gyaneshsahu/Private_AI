import { healthConsentCopy } from "../shared/health-consent";
import type { HealthConsentChoice, HealthConsentRecord } from "./health-consent";
import { defineText, useLang, useText } from "./i18n";

const settingText = defineText({
  en: {
    allowed: "You allowed health and other sensitive details in your messages.",
    declined: "You chose not to allow health and other sensitive details.",
    notChosen: "You have not chosen yet; you will be asked before your first message.",
    withdraw: "Withdraw permission",
    allow: "Allow health and sensitive details",
  },
  de: {
    allowed: "Sie haben Gesundheitsangaben und andere sensible Angaben in Ihren Nachrichten erlaubt.",
    declined: "Sie haben sich entschieden, Gesundheitsangaben und andere sensible Angaben nicht zu erlauben.",
    notChosen: "Sie haben noch nicht gewählt; Sie werden vor Ihrer ersten Nachricht gefragt.",
    withdraw: "Erlaubnis widerrufen",
    allow: "Gesundheitsangaben und sensible Angaben erlauben",
  },
});

/** Asked once before the first message while the draft flag is on. */
export function HealthConsentPrompt({
  onChoose,
}: {
  onChoose: (choice: HealthConsentChoice) => void;
}) {
  const consent = healthConsentCopy(useLang().lang);
  return (
    <section
      className="notice health-consent"
      role="region"
      aria-label={consent.title}
      data-draft={consent.status}
    >
      <h3>{consent.title}</h3>
      {consent.paragraphs.map((text) => (
        <p key={text}>{text}</p>
      ))}
      <div className="row">
        <button className="primary" onClick={() => onChoose("accepted")}>
          {consent.accept}
        </button>
        <button onClick={() => onChoose("declined")}>{consent.decline}</button>
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
  const consent = healthConsentCopy(useLang().lang);
  const t = useText(settingText);
  const accepted = record?.choice === "accepted";
  return (
    <div className="health-consent-setting" data-draft={consent.status}>
      <h4>{consent.title}</h4>
      <p>{accepted ? t.allowed : record ? t.declined : t.notChosen}</p>
      <button
        className="text-button"
        onClick={() => onChoose(accepted ? "declined" : "accepted")}
      >
        {accepted ? t.withdraw : t.allow}
      </button>
    </div>
  );
}
