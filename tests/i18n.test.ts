import { afterEach, expect, it, vi } from "vitest";
import { browserLang, defineText, readLang, saveLang, textFor } from "../src/i18n";

afterEach(() => vi.unstubAllGlobals());

function memoryStorage() {
  const data = new Map<string, string>();
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
  };
}

it("takes German only from a German first browser language, never anything else", () => {
  expect(browserLang(["de-DE", "en"])).toBe("de");
  expect(browserLang(["de"])).toBe("de");
  expect(browserLang(["DE-at"])).toBe("de");
  expect(browserLang(["en-GB", "de-DE"])).toBe("en");
  expect(browserLang(["fr-FR"])).toBe("en");
  expect(browserLang(["dee"])).toBe("en");
  expect(browserLang([])).toBe("en");
});

it("keeps the user's pick in this browser, ignores other stored values and survives blocked storage", () => {
  vi.stubGlobal("navigator", { languages: ["de-DE"], language: "de-DE" });
  vi.stubGlobal("localStorage", memoryStorage());
  expect(readLang()).toBe("de");
  saveLang("en");
  expect(readLang()).toBe("en");
  localStorage.setItem("cometrow.language", "fr");
  expect(readLang()).toBe("de");
  vi.stubGlobal("localStorage", {
    getItem: () => {
      throw Error("blocked");
    },
    setItem: () => {
      throw Error("blocked");
    },
  });
  expect(() => saveLang("en")).not.toThrow();
  expect(readLang()).toBe("de");
});

it("gives each language its own block", () => {
  const sample = defineText({
    en: { hello: "Hello", count: (n: number) => `${n} requests` },
    de: { hello: "Hallo", count: (n: number) => `${n} Anfragen` },
  });
  expect(textFor(sample, "de").count(5)).toBe("5 Anfragen");
  expect(textFor(sample, "en").hello).toBe("Hello");
});
