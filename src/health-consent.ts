// Device-only record of the health-details choice (draft; see shared/health-consent.ts).
// A choice for an older text version counts as no choice, so a changed text is asked again.
import { HEALTH_CONSENT } from "../shared/health-consent";

const KEY = "cometrow.healthConsent";
export type HealthConsentChoice = "accepted" | "declined";
export interface HealthConsentRecord {
  version: string;
  choice: HealthConsentChoice;
  at: string;
}

export function readHealthConsent(): HealthConsentRecord | undefined {
  try {
    const value = JSON.parse(localStorage.getItem(KEY) ?? "null");
    return value?.version === HEALTH_CONSENT.version &&
      (value.choice === "accepted" || value.choice === "declined")
      ? value
      : undefined;
  } catch {
    return undefined;
  }
}

export function writeHealthConsent(choice: HealthConsentChoice): HealthConsentRecord {
  const record = { version: HEALTH_CONSENT.version, choice, at: new Date().toISOString() };
  try {
    localStorage.setItem(KEY, JSON.stringify(record));
  } catch {
    // Storage blocked: the choice holds for this page only and is asked again next time.
  }
  return record;
}
