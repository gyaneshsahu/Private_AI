// Keyboard shortcuts (src/use-shortcuts.ts) and what the copy shortcuts copy (src/shortcut-copy.ts).
import { describe, expect, it } from "vitest";
import type { Message } from "../shared/contracts";
import { runShortcut, shortcutFor, type ShortcutId } from "../src/use-shortcuts";
import { lastAnswer, lastCodeBlock } from "../src/shortcut-copy";

const press = (key: string, o: Partial<KeyboardEvent> = {}) => ({
  key,
  code: /^[a-z]$/i.test(key) ? `Key${key.toUpperCase()}` : "",
  shiftKey: false,
  ctrlKey: false,
  altKey: false,
  metaKey: false,
  isComposing: false,
  keyCode: 0,
  repeat: false,
  defaultPrevented: false,
  ...o,
});
const combos: [ShortcutId, string, boolean][] = [
  ["newChat", "O", true],
  ["search", "k", false],
  ["sidebar", "S", true],
  ["copyAnswer", "C", true],
  ["copyCode", ":", true], // US layout: Shift+; gives ":"
  ["copyCode", ";", true], // German layout: Shift+, gives ";"
  ["help", "/", false],
  ["help", "/", true], // German layout: "/" is Shift+7
];

describe("shortcutFor", () => {
  for (const [id, key, shiftKey] of combos) {
    it(`Ctrl elsewhere, Cmd on Apple: ${id} (${key}${shiftKey ? ", Shift" : ""})`, () => {
      expect(shortcutFor(press(key, { ctrlKey: true, shiftKey }), false)).toBe(id);
      expect(shortcutFor(press(key, { metaKey: true, shiftKey }), true)).toBe(id);
      // The other platform's modifier does nothing, and neither do both together.
      expect(shortcutFor(press(key, { metaKey: true, shiftKey }), false)).toBeUndefined();
      expect(shortcutFor(press(key, { ctrlKey: true, shiftKey }), true)).toBeUndefined();
      expect(shortcutFor(press(key, { ctrlKey: true, metaKey: true, shiftKey }), true)).toBeUndefined();
    });
  }
  it("Shift+Escape on both platforms, plain Escape never", () => {
    expect(shortcutFor(press("Escape", { shiftKey: true }), false)).toBe("composer");
    expect(shortcutFor(press("Escape", { shiftKey: true }), true)).toBe("composer");
    expect(shortcutFor(press("Escape"), false)).toBeUndefined();
    expect(shortcutFor(press("Escape", { shiftKey: true, ctrlKey: true }), false)).toBeUndefined();
  });
  it("Mac lowercase keys with Shift, and letters by position on a non-Latin layout", () => {
    expect(shortcutFor(press("o", { metaKey: true, shiftKey: true }), true)).toBe("newChat");
    expect(shortcutFor(press("л", { code: "KeyK", ctrlKey: true }), false)).toBe("search");
  });
  it("Shift must match: Ctrl+O, Ctrl+Shift+K and Ctrl+S stay the browser's", () => {
    expect(shortcutFor(press("o", { ctrlKey: true }), false)).toBeUndefined();
    expect(shortcutFor(press("K", { ctrlKey: true, shiftKey: true }), false)).toBeUndefined();
    expect(shortcutFor(press("s", { ctrlKey: true }), false)).toBeUndefined();
    expect(shortcutFor(press(";", { ctrlKey: true }), false)).toBeUndefined();
  });
  it("ignores composing and Alt (AltGr is Ctrl+Alt)", () => {
    expect(shortcutFor(press("k", { ctrlKey: true, isComposing: true }), false)).toBeUndefined();
    expect(shortcutFor(press("k", { ctrlKey: true, keyCode: 229 }), false)).toBeUndefined();
    expect(shortcutFor(press("/", { ctrlKey: true, altKey: true }), false)).toBeUndefined();
  });
});

describe("runShortcut", () => {
  const page = (...open: string[]) => ({
    querySelector: (selector: string) =>
      (selector === "dialog[open]:not(.shortcut-help):not(.navigation-drawer)"
        ? open.some((c) => c !== "shortcut-help" && c !== "navigation-drawer")
        : selector === "dialog.shortcut-help[open]" && open.includes("shortcut-help"))
        ? ({} as Element)
        : null,
  });
  const ran: string[] = [];
  const actions = {
    newChat: () => void ran.push("newChat"),
    help: () => void ran.push("help"),
    copyAnswer: () => false as const,
  };
  const newChat = press("O", { ctrlKey: true, shiftKey: true });
  const help = press("/", { ctrlKey: true });
  it("runs the action and reports it, so the browser default is blocked only then", () => {
    ran.length = 0;
    expect(runShortcut(newChat, actions, false, page())).toBe(true);
    expect(ran).toEqual(["newChat"]);
    // An action that did nothing, an absent action, or a key that is no shortcut: the browser keeps it.
    expect(runShortcut(press("C", { ctrlKey: true, shiftKey: true }), actions, false, page())).toBe(false);
    expect(runShortcut(press("K", { ctrlKey: true }), actions, false, page())).toBe(false);
    expect(runShortcut(press("t", { ctrlKey: true }), actions, false, page())).toBe(false);
    expect(runShortcut({ ...newChat, defaultPrevented: true }, actions, false, page())).toBe(false);
  });
  it("a held key runs nothing again but stays blocked", () => {
    ran.length = 0;
    expect(runShortcut({ ...newChat, repeat: true }, actions, false, page())).toBe(true);
    expect(ran).toEqual([]);
  });
  it("another open dialog blocks every shortcut; the sidebar drawer does not", () => {
    ran.length = 0;
    expect(runShortcut(newChat, actions, false, page("confirm-dialog"))).toBe(false);
    expect(runShortcut(help, actions, false, page("confirm-dialog"))).toBe(false);
    expect(runShortcut(newChat, actions, false, page("navigation-drawer"))).toBe(true);
    expect(ran).toEqual(["newChat"]);
  });
  it("while the help is open only its own shortcut works", () => {
    ran.length = 0;
    expect(runShortcut(newChat, actions, false, page("shortcut-help"))).toBe(false);
    expect(runShortcut(help, actions, false, page("shortcut-help"))).toBe(true);
    expect(ran).toEqual(["help"]);
  });
});

const message = (role: Message["role"], text: string, status: Message["status"] = "complete"): Message => ({
  id: `${role}-${text.length}`,
  role,
  text,
  status,
  included: true,
});

describe("lastAnswer", () => {
  it("is the last assistant message, only when complete and not empty", () => {
    const a = message("assistant", "First");
    const b = message("assistant", "Second");
    expect(lastAnswer([message("user", "q"), a, message("user", "q2"), b])).toBe(b);
    expect(lastAnswer([a, message("user", "q2")])).toBe(a);
    expect(lastAnswer([a, message("assistant", "Half", "partial")])).toBeUndefined();
    expect(lastAnswer([a, message("assistant", "", "error")])).toBeUndefined();
    expect(lastAnswer([message("user", "q")])).toBeUndefined();
  });
});

describe("lastCodeBlock", () => {
  it("returns the last fenced block without the fences", () => {
    expect(lastCodeBlock("Text\n```js\nconst a = 1;\n```\nMore\n```python\nprint(1)\nprint(2)\n```\nEnd")).toBe("print(1)\nprint(2)");
  });
  it("needs a closing fence at least as long, of the same character", () => {
    expect(lastCodeBlock("````md\n```\ninner\n```\n````")).toBe("```\ninner\n```");
    expect(lastCodeBlock("~~~\na\n```\nb\n~~~")).toBe("a\n```\nb");
  });
  it("an open fence runs to the end; CRLF and empty blocks work", () => {
    expect(lastCodeBlock("```\nnot closed\nyet")).toBe("not closed\nyet");
    expect(lastCodeBlock("```sh\r\nls\r\n```\r\n")).toBe("ls");
    expect(lastCodeBlock("```\n```")).toBe("");
  });
  it("no block: undefined; inline code and four-space fences are not blocks", () => {
    expect(lastCodeBlock("Just `code` here")).toBeUndefined();
    expect(lastCodeBlock("```inline``` text")).toBeUndefined();
    expect(lastCodeBlock("    ```\n    x\n    ```")).toBeUndefined();
  });
});
