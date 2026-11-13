// React-free twin of the helpers in src/i18n.tsx for text blocks and modules outside React.
// Modules loaded by workers, the evaluation entry or Node must not pull React in through i18n.tsx.
import type { Lang } from "../i18n";
export type { Lang } from "../i18n";

type Text = Record<string, string | ((...args: never[]) => string)>;
/** Same contract as defineText in src/i18n.tsx: German must have exactly the English keys. */
export function defineText<T extends Text>(text: { en: T; de: { [K in keyof T]: T[K] } }) {
  return text;
}

/**
 * The interface language outside React. LangProvider writes it to <html lang> on every change,
 * so that wins; before it mounts (or without a page) this repeats readLang() in src/i18n.tsx.
 */
export function uiLang(): Lang {
  const page = typeof document === "undefined" ? "" : document.documentElement.lang;
  if (page === "de" || page === "en") return page;
  try {
    const saved = localStorage.getItem("cometrow.language");
    if (saved === "de" || saved === "en") return saved;
  } catch {
    /* storage blocked or absent: browser language */
  }
  const first =
    typeof navigator === "undefined" ? "" : (navigator.languages?.[0] ?? navigator.language ?? "");
  return /^de\b/i.test(first) ? "de" : "en";
}

/** The block for a language, outside React. */
export function textFor<T extends Text>(text: { en: T; de: T }, lang: Lang = uiLang()): T {
  return text[lang];
}
