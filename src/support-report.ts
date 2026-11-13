import type { Lang } from "./i18n";
import {
  supportAreasDe,
  supportGuidanceDe,
  supportSymptomsDe,
  supportText,
} from "./text/support";

export const supportAreas = {
  conversation: "Chat or an answer",
  research: "Web research or citations",
  documents: "Documents or images",
  saved: "Saved conversations or backup",
  account: "Sign-in or account access",
  billing: "Usage or payment",
  accessibility: "Keyboard, screen reader or layout",
  privacy: "Privacy or security concern",
} as const;
export const supportSymptoms = {
  unavailable: "A feature was unavailable",
  incomplete: "A reply or operation did not finish",
  incorrect: "An answer was incorrect or misleading",
  unsafe: "An answer may cause harm",
  access: "I could not access something",
  usability: "A control was difficult to use",
  other: "Another problem",
} as const;
export type SupportArea = keyof typeof supportAreas;
export type SupportSymptom = keyof typeof supportSymptoms;

/** Explicit allowlist: never serialize status objects, errors, URLs or workspace content. */
export function supportReport(
  input: {
    area: unknown;
    symptom: unknown;
  },
  lang: Lang = "en",
): string {
  const copy = supportCopy(lang);
  const t = supportText[lang];
  const area =
    typeof input.area === "string" && Object.hasOwn(supportAreas, input.area)
      ? copy.areas[input.area as SupportArea]
      : t.notSelected;
  const symptom =
    typeof input.symptom === "string" &&
    Object.hasOwn(supportSymptoms, input.symptom)
      ? copy.symptoms[input.symptom as SupportSymptom]
      : t.notSelected;
  return t.note(area, symptom);
}

/** Areas, symptoms and guidance in the interface language. */
export function supportCopy(lang: Lang): {
  areas: Record<SupportArea, string>;
  symptoms: Record<SupportSymptom, string>;
  guidance: Record<SupportArea, readonly string[]>;
} {
  return lang === "de"
    ? { areas: supportAreasDe, symptoms: supportSymptomsDe, guidance: supportGuidanceDe }
    : { areas: supportAreas, symptoms: supportSymptoms, guidance: supportGuidance };
}

export const supportGuidance: Record<SupportArea, readonly string[]> = {
  conversation: [
    "A missing or stopped reply is not a completed answer. Retry starts a new request and may use another allowance; CometRow does not retry automatically.",
    "Check important answers against reliable evidence. For immediate danger, contact local emergency services or a trusted person; this app cannot contact help for you.",
  ],
  research: [
    "Open the cited source and compare the claim with the actual evidence and dates. A working citation does not prove an answer is correct.",
    "Research is temporary. Reloading or leaving may lose the session; saved history and automatic exports are unavailable for search conversations. Do not include retrieved text in a support note.",
  ],
  documents: [
    "Review extracted text and correct mistakes before sending it. Importing a file does not send it to the model.",
    "Supported formats and limits are shown in Context. Try a small synthetic file to reproduce an import problem; do not attach your original document to a report.",
  ],
  saved: [
    "Do not clear browser storage while investigating missing saved work. Temporary drafts are not saved snapshots; save explicitly before leaving when saving is available.",
    "Sign-in recovery cannot recover your vault passphrase. A downloaded encrypted backup requires its original passphrase. Restore adds copies to an unlocked vault; it does not overwrite existing snapshots.",
  ],
  account: [
    "Use a sign-in method already linked to your account. Never share verification codes, recovery credentials or passkeys with support.",
    "Account recovery and local vault recovery are separate. After suspected account compromise, use account recovery and review active sessions and linked sign-in methods.",
  ],
  billing: [
    "A request allowance counts attempts, not guaranteed completed answers or a monetary balance. Interrupted requests may remain counted.",
    "For a pending or uncertain payment, do not repeatedly retry checkout. Review account status and ask the evaluation coordinator to investigate. Do not send card details.",
  ],
  accessibility: [
    "Describe the control and task using a synthetic example. If useful, voluntarily tell the coordinator your browser, screen reader and device; this note does not collect them.",
    "Changing workspace sections preserves your draft. Locking the vault clears unsaved work; review the warning before confirming.",
  ],
  privacy: [
    "Stop the affected action if you suspect unintended disclosure. Do not send the exposed content, keys or tokens in a report.",
    "Tell the evaluation coordinator which action occurred and approximately when, without private content. Locking does not erase content already copied to your clipboard or downloaded.",
  ],
};
