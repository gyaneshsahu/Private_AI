export type Appearance = "system" | "light" | "dark";
const key = "privateai.appearance";

export function readAppearance(): Appearance {
  try {
    const value = localStorage.getItem(key);
    return value === "light" || value === "dark" ? value : "system";
  } catch {
    return "system";
  }
}

export function saveAppearance(value: Appearance): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Restricted storage still permits changing the theme for this session.
  }
}
