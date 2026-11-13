// German and English interface (owner, 13 November 2026). The language comes from the browser's
// first preferred language (de... gives German, anything else English) until the user picks one
// with the DE/EN switch; the pick is kept only in this browser. Never from IP, email or account.
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Lang = "de" | "en";
export const LANGS: readonly Lang[] = ["de", "en"];
const KEY = "cometrow.language";

/** German when the browser's first preferred language is German, otherwise English. */
export function browserLang(
  preferred: readonly string[] | undefined = typeof navigator === "undefined"
    ? undefined
    : navigator.languages?.length
      ? navigator.languages
      : [navigator.language],
): Lang {
  return /^de\b/i.test(preferred?.[0] ?? "") ? "de" : "en";
}

/** The user's saved pick, else the browser's language. Blocked storage falls back to the browser. */
export function readLang(): Lang {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === "de" || saved === "en") return saved;
  } catch {
    /* storage blocked: browser language */
  }
  return browserLang();
}

export function saveLang(lang: Lang) {
  try {
    localStorage.setItem(KEY, lang);
  } catch {
    /* storage blocked: the pick lasts for this page only */
  }
}

/**
 * The current interface language outside React (for example the model's language rule). It follows
 * the provider below while the app runs and reads storage otherwise.
 */
let current: Lang | undefined;
export function uiLang(): Lang {
  return current ?? readLang();
}

type Text = Record<string, string | ((...args: never[]) => string)>;
/**
 * One block of user-facing text in both languages. The German block must have exactly the English
 * block's keys and shapes, so a missing or extra translation fails the type check.
 */
export function defineText<T extends Text>(text: { en: T; de: { [K in keyof T]: T[K] } }) {
  return text;
}
/** The block for a language, outside React. */
export function textFor<T extends Text>(text: { en: T; de: T }, lang: Lang = uiLang()): T {
  return text[lang];
}

const LangContext = createContext<{ lang: Lang; setLang: (lang: Lang) => void }>({
  lang: "en",
  setLang: () => {},
});

export function LangProvider({ children, initial }: { children: ReactNode; initial?: Lang }) {
  const [lang, setLangState] = useState<Lang>(() => initial ?? readLang());
  current = lang;
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  const setLang = (next: Lang) => {
    saveLang(next);
    current = next;
    setLangState(next);
  };
  return <LangContext.Provider value={{ lang, setLang }}>{children}</LangContext.Provider>;
}

export function useLang() {
  return useContext(LangContext);
}

/** The block for the current language, inside React. */
export function useText<T extends Text>(text: { en: T; de: T }): T {
  return text[useLang().lang];
}

const switchText = defineText({
  en: { label: "Language", german: "Deutsch", english: "English" },
  de: { label: "Sprache", german: "Deutsch", english: "English" },
});

/** The visible DE/EN switch. */
export function LanguageSwitch({ className = "language-switch" }: { className?: string }) {
  const { lang, setLang } = useLang();
  const t = switchText[lang];
  return (
    <div className={className} role="group" aria-label={t.label}>
      {LANGS.map((option) => (
        <button
          key={option}
          type="button"
          lang={option}
          aria-pressed={lang === option}
          aria-label={option === "de" ? t.german : t.english}
          onClick={() => setLang(option)}
        >
          {option.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
