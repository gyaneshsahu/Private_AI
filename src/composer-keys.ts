// The message box: when Enter sends, the length limit and the height. Pure decisions, so a stray
// Enter can be tested without a browser: a send costs allowance.

/** The textarea's maxLength. The browser cuts a longer paste at this length. */
export const MESSAGE_LIMIT = 20000;
const COUNTER_FROM = 1000;
const MAX_HEIGHT = 160;

/** Phones and tablets without a mouse: Enter stays a new line there and the button sends. */
export function touchDevice(): boolean {
  return (
    typeof matchMedia === "function" &&
    matchMedia("(hover: none) and (pointer: coarse)").matches
  );
}

type Key = Pick<
  KeyboardEvent,
  "key" | "shiftKey" | "ctrlKey" | "altKey" | "metaKey" | "isComposing" | "keyCode" | "repeat"
>;
/**
 * True when this key press is "send": plain Enter on a device with a keyboard. Not with a
 * modifier, not while an input method composes text (keyCode 229 covers browsers that report
 * isComposing late), not from a held key, not on touch devices.
 */
export function isSendKey(event: Key, touch: boolean): boolean {
  return (
    event.key === "Enter" &&
    !touch &&
    !event.shiftKey &&
    !event.ctrlKey &&
    !event.altKey &&
    !event.metaKey &&
    !event.isComposing &&
    event.keyCode !== 229 &&
    !event.repeat
  );
}

/** The Send button's own rule. The Enter key uses the same one, plus `waiting`. */
export function sendBlocked(state: {
  busy: boolean;
  text: string;
  ready: boolean;
  /** A choice on screen needs an answer first (search first, health data). Enter only. */
  waiting?: boolean;
}): boolean {
  return state.busy || !state.ready || !state.text.trim() || !!state.waiting;
}

/** What to show about the length: the "cut" notice at the limit, a counter close to it. */
export function limitState(length: number, max = MESSAGE_LIMIT) {
  const remaining = Math.max(0, max - length);
  return { cut: length >= max, remaining, counter: remaining <= COUNTER_FROM };
}

/** Grow the box with its text up to a maximum; an empty box goes back to one line. */
export function fitHeight(field: HTMLTextAreaElement | null) {
  if (!field) return;
  field.style.height = "auto";
  if (field.value) field.style.height = `${Math.min(field.scrollHeight, MAX_HEIGHT)}px`;
}
