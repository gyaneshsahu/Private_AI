// Keyboard use of the <details> menus ("+" in the composer, "…" in the header): opening moves focus
// to the first item, ArrowUp/ArrowDown/Home/End move between items. Escape is the app-wide menu
// closer's (App.tsx): it closes the menu and puts focus back on its button.
import type { KeyboardEvent, SyntheticEvent } from "react";

const ITEMS = ".menu-surface :is(button, select, input, a[href]):not(:disabled)";
const MOVES: Record<string, (at: number, last: number) => number> = {
  ArrowDown: (at, last) => (at >= last ? 0 : at + 1),
  ArrowUp: (at, last) => (at <= 0 ? last : at - 1),
  Home: () => 0,
  End: (_, last) => last,
};

function items(menu: HTMLElement) {
  return [...menu.querySelectorAll<HTMLElement>(ITEMS)].filter((item) => item.checkVisibility());
}

/** Spread on the menu's <details>. */
export function useMenuKeys() {
  return {
    onToggle(event: SyntheticEvent<HTMLDetailsElement>) {
      if (event.currentTarget.open) items(event.currentTarget)[0]?.focus();
    },
    onKeyDown(event: KeyboardEvent<HTMLDetailsElement>) {
      const menu = event.currentTarget;
      const target = event.target as HTMLElement;
      const move = MOVES[event.key];
      // A list box keeps its own arrow keys.
      if (!move || !menu.open || target.matches("select, textarea, input:not([type=checkbox])")) return;
      const list = items(menu);
      if (!list.length) return;
      event.preventDefault();
      // From the menu's own button, Down and Home go to the first item, Up and End to the last.
      const at = list.indexOf(target);
      list[at < 0 ? (event.key === "ArrowDown" || event.key === "Home" ? 0 : list.length - 1) : move(at, list.length - 1)].focus();
    },
  };
}
