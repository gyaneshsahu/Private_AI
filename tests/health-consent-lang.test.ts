// One consent version covers the English and German texts: a choice made in either language
// counts for both while that version is current, and a new version asks again.
import { afterEach, expect, it, vi } from "vitest";
import { HEALTH_CONSENT, HEALTH_CONSENT_DE, healthConsentCopy } from "../shared/health-consent";
import { readHealthConsent, writeHealthConsent } from "../src/health-consent";

afterEach(() => vi.unstubAllGlobals());

function memoryStorage() {
  const data = new Map<string, string>();
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
  };
}

it("picks the wording by language, under one shared version", () => {
  expect(healthConsentCopy()).toBe(HEALTH_CONSENT);
  expect(healthConsentCopy("de")).toBe(HEALTH_CONSENT_DE);
  expect(HEALTH_CONSENT_DE.version).toBe(HEALTH_CONSENT.version);
});

it("counts a consent given in German for the English interface, and the other way round", () => {
  vi.stubGlobal("localStorage", memoryStorage());
  writeHealthConsent("accepted", "de");
  expect(readHealthConsent()).toMatchObject({ version: HEALTH_CONSENT.version, choice: "accepted", lang: "de" });
  writeHealthConsent("declined", "en");
  expect(readHealthConsent()).toMatchObject({ choice: "declined", lang: "en" });
});

it("records the interface language when none is passed", () => {
  vi.stubGlobal("localStorage", memoryStorage());
  localStorage.setItem("cometrow.language", "de");
  expect(writeHealthConsent("accepted").lang).toBe("de");
  expect(readHealthConsent()?.lang).toBe("de");
});

it("asks again when the version pair changed, whichever language the old consent was in", () => {
  vi.stubGlobal("localStorage", memoryStorage());
  for (const lang of ["de", "en", undefined]) {
    // draft-2026-11-12 was the English-only text, before the German was added.
    localStorage.setItem(
      "cometrow.healthConsent",
      JSON.stringify({ version: "draft-2026-11-12", choice: "accepted", at: "2026-11-12T10:00:00.000Z", lang }),
    );
    expect(readHealthConsent()).toBeUndefined();
  }
});
