// The German off-switch (owner, 13 November 2026): a build without VITE_GERMAN_UI=1 is English
// everywhere, whatever the browser language, a saved pick or a caller says, and has no DE/EN switch.
// The rest of the suite runs with the setting on (vitest.config.ts).
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { interfaceLanguage } from "../src/german-rules";
import { LangProvider, LanguageSwitch, germanEnabled, readLang, uiLang, useLang } from "../src/i18n";
import { uiLang as textLang } from "../src/text/core";

const ShowLang = () => createElement("i", null, useLang().lang);
const page = () =>
  renderToStaticMarkup(
    createElement(LangProvider, {
      initial: "de",
      children: [createElement(ShowLang, { key: 1 }), createElement(LanguageSwitch, { key: 2 })],
    }),
  );

beforeEach(() => {
  // A browser that would get German in every way the app knows: language, saved pick, page language.
  vi.stubGlobal("navigator", { languages: ["de-DE"], language: "de-DE" });
  vi.stubGlobal("localStorage", { getItem: () => "de", setItem: () => {} });
  vi.stubGlobal("document", { documentElement: { lang: "de" } });
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

it.each(["", "0", "true"])("is English everywhere and hides the switch when VITE_GERMAN_UI is %j", (value) => {
  vi.stubEnv("VITE_GERMAN_UI", value);
  expect(germanEnabled()).toBe(false);
  expect(readLang()).toBe("en");
  expect(uiLang()).toBe("en");
  expect(textLang()).toBe("en");
  expect(interfaceLanguage()).toBe("en");
  expect(page()).toBe("<i>en</i>");
});

it("gives the same browser German and the switch only when VITE_GERMAN_UI is 1", () => {
  vi.stubEnv("VITE_GERMAN_UI", "1");
  expect(readLang()).toBe("de");
  expect(textLang()).toBe("de");
  expect(page()).toMatch(/^<i>de<\/i><div class="language-switch"/);
});
