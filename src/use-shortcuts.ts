// Keyboard shortcuts like ChatGPT's (docs/keyboard-shortcuts-20261116.md). One keydown listener on
// window; the key decision is pure so it can be tested without a browser.
import { useEffect, useRef } from "react";

export type ShortcutId = "newChat" | "search" | "sidebar" | "composer" | "copyAnswer" | "copyCode" | "help";
/** What each shortcut does. A missing action leaves the key to the browser. Return false when nothing was done. */
export type ShortcutActions = Partial<Record<ShortcutId, () => void | false>>;

/** The list, in the order the help shows it. `shift: undefined` accepts either (German "/" is Shift+7). */
export const SHORTCUTS: readonly { id: ShortcutId; mod: boolean; shift?: boolean; key: string }[] = [
  { id: "newChat", mod: true, shift: true, key: "o" },
  { id: "search", mod: true, shift: false, key: "k" },
  { id: "sidebar", mod: true, shift: true, key: "s" },
  { id: "composer", mod: false, shift: true, key: "Escape" },
  { id: "copyAnswer", mod: true, shift: true, key: "c" },
  { id: "copyCode", mod: true, shift: true, key: ";" },
  { id: "help", mod: true, key: "/" },
];

/** Cmd on Apple devices, Ctrl elsewhere. */
export function isApple(): boolean {
  if (typeof navigator === "undefined") return false;
  const platform = (navigator as { userAgentData?: { platform?: string } }).userAgentData?.platform || navigator.platform;
  return /mac|iphone|ipad|ipod/i.test(platform);
}

type Key = Pick<KeyboardEvent, "key" | "code" | "shiftKey" | "ctrlKey" | "altKey" | "metaKey" | "isComposing" | "keyCode" | "repeat">;
/** The shortcut this key press means, or undefined. Exactly the platform's modifier; Alt never (AltGr is Ctrl+Alt). */
export function shortcutFor(event: Key, apple: boolean): ShortcutId | undefined {
  if (event.isComposing || event.keyCode === 229 || event.altKey) return;
  const mod = apple ? event.metaKey && !event.ctrlKey : event.ctrlKey && !event.metaKey;
  if (!mod && (event.ctrlKey || event.metaKey)) return;
  // Letters by key (Dvorak), by position when the layout has no Latin letters; Shift+; is ":" on US keyboards.
  const key = /^[a-z]$/i.test(event.key)
    ? event.key.toLowerCase()
    : /^Key[A-Z]$/.test(event.code) && event.key.length === 1 && !/[\x20-\x7e]/.test(event.key)
      ? event.code.slice(3).toLowerCase()
      : event.key === ":" ? ";" : event.key;
  return SHORTCUTS.find((s) => s.key === key && s.mod === mod && (s.shift === undefined || s.shift === event.shiftKey))?.id;
}

/** Runs the shortcut's action. Returns true when it ran, so the caller blocks the browser's own use of the key. */
export function runShortcut(
  event: Key & Pick<KeyboardEvent, "defaultPrevented" | "repeat">,
  actions: ShortcutActions,
  apple: boolean,
  root: Pick<Document, "querySelector"> = document,
): boolean {
  if (event.defaultPrevented) return false;
  const id = shortcutFor(event, apple);
  const action = id && actions[id];
  if (!action) return false;
  // Another modal dialog (a confirmation, the source viewer) owns the keys. The sidebar drawer does not.
  if (root.querySelector("dialog[open]:not(.shortcut-help):not(.navigation-drawer)")) return false;
  // While the help is open only its own shortcut works (to close it): the page behind it is inert.
  if (id !== "help" && root.querySelector("dialog.shortcut-help[open]")) return false;
  // A held key runs the action once but keeps the browser's use of the key blocked (developer tools, bookmarks).
  if (event.repeat) return true;
  return action() !== false;
}

/** Registers the shortcuts once; `actions` may be a new object on every render. */
export function useShortcuts(actions: ShortcutActions) {
  const current = useRef(actions);
  current.current = actions;
  useEffect(() => {
    const apple = isApple();
    const listener = (event: KeyboardEvent) => {
      if (runShortcut(event, current.current, apple)) event.preventDefault();
    };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, []);
}
