// Dialogs return focus to the control that opened them. A part loaded on demand mounts after its
// file arrives; by then the focus may have fallen to <body>, so remember the last focused element.
let last: HTMLElement | null = null;
if (typeof document !== "undefined")
  document.addEventListener("focusin", (event) => {
    if (event.target instanceof HTMLElement && event.target !== document.body) last = event.target;
  });

/** The element a dialog should hand the focus back to: the focused one, else the last focused one. */
export function focusOrigin(): HTMLElement | null {
  const active = document.activeElement as HTMLElement | null;
  return active && active !== document.body ? active : last;
}
