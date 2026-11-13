import { useEffect, useState, type ReactNode } from "react";
import { readAppearance, saveAppearance } from "./appearance";
import { Icon } from "./Icon";
import { useText } from "./i18n";
import { themeText } from "./text/account";
export function AccountTheme({ children }: { children: ReactNode }) {
  const t = useText(themeText);
  const [appearance, setAppearance] = useState(readAppearance);
  const [dark, setDark] = useState(
    () => matchMedia("(prefers-color-scheme: dark)").matches,
  );
  useEffect(() => {
    const m = matchMedia("(prefers-color-scheme: dark)");
    const update = () => setDark(m.matches);
    m.addEventListener("change", update);
    return () => m.removeEventListener("change", update);
  }, []);
  return (
    <div
      className="chat-design account-shell"
      data-theme={
        appearance === "system" ? (dark ? "dark" : "light") : appearance
      }
    >
      <label className="account-appearance">
        <Icon name="sun" />
        {t.appearance}
        <select
          aria-label={t.appearance}
          value={appearance}
          onChange={(e) => {
            const next = e.target.value as typeof appearance;
            setAppearance(next);
            saveAppearance(next);
          }}
        >
          <option value="system">{t.system}</option>
          <option value="light">{t.light}</option>
          <option value="dark">{t.dark}</option>
        </select>
      </label>
      {children}
    </div>
  );
}
