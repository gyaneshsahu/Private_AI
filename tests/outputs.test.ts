// Outputs panel list (src/outputs.ts): order, what is left out, titles and details in both languages.
import { describe, expect, it } from "vitest";
import { emptyConversation, type Conversation, type Message } from "../shared/contracts";
import { chatOutputs, formatWhen } from "../src/outputs";
import { outputsText } from "../src/text/outputs";

const PNG = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
const answer = (id: string, prompt: string, at?: string): Message => ({
  id,
  role: "assistant",
  text: `[Created image: ${prompt}]`,
  status: "complete",
  included: true,
  at,
  createdImage: { type: "image/png", data: PNG, model: "synthetic", prompt },
});

function chat(): Conversation {
  return {
    ...emptyConversation(),
    title: "Synthetic chat",
    board: {
      items: [
        { id: "b1", kind: "box", colour: 0, x: 10, y: 10, w: 100, h: 60 },
        { id: "n1", kind: "note", x: 200, y: 40, text: "Synthetic note" },
      ],
      changedAt: "2026-11-17T13:05:00.000Z",
    },
    canvas: { text: "Intro line\n\n## Synthetic plan\n\nBody." },
    messages: [
      { id: "q1", role: "user", text: "Draw a fox", status: "complete", included: true, image: true },
      answer("a1", "A red fox in snow", "2026-11-17T10:00:00.000Z"),
      answer("a2", "A blue whale   at dusk " + "x".repeat(100)),
    ],
    attachments: [
      { id: "f1", name: "notes.pdf", sources: [], selected: true, kind: "document" },
      { id: "f2", name: "screen.png", sources: [], selected: true, kind: "screenshot" },
      { id: "f3", name: "big.pdf", sources: [], selected: true, large: true },
      { id: "r1", name: "Search: synthetic", sources: [], selected: true, kind: "research" },
    ],
  };
}

describe("chatOutputs", () => {
  it("lists the board, the canvas, created images newest first, then files without search results", () => {
    const items = chatOutputs(chat(), "en");
    expect(items.map((i) => `${i.kind}:${i.id}`)).toEqual(["board:board", "canvas:canvas", "image:a2", "image:a1", "file:f1", "file:f2", "file:f3"]);
  });

  it("titles: the board's name, the canvas's first heading, the clipped prompt, the file name", () => {
    const items = chatOutputs(chat(), "en");
    expect(items[0].title).toBe("Whiteboard");
    expect(items[1].title).toBe("Synthetic plan");
    expect(items[2].title).toHaveLength(80);
    expect(items[2].title).toMatch(/^A blue whale at dusk x+…$/);
    expect(items[3].title).toBe("A red fox in snow");
    expect(items[4].title).toBe("notes.pdf");
  });

  it("the canvas without a heading takes its first line, clipped to 60 characters", () => {
    const c = { ...chat(), canvas: { text: "\n  " + "Long first line ".repeat(10) + "\nSecond" } };
    const title = chatOutputs(c, "en")[1].title;
    expect(title.length).toBeLessThanOrEqual(60);
    expect(title.startsWith("Long first line Long")).toBe(true);
  });

  it("details in English and German", () => {
    for (const lang of ["en", "de"] as const) {
      const t = outputsText[lang];
      const items = chatOutputs(chat(), lang);
      const when = formatWhen("2026-11-17T13:05:00.000Z", lang);
      expect(when).toMatch(/17.*\d\d:\d\d|\d\d:\d\d.*17/);
      expect(items[0].detail).toBe(t.boardDetail(2, when));
      expect(items[1].detail).toBe(t.canvasDetail(chat().canvas!.text.length));
      expect(items[2].detail).toBe(t.imageDetail(""));
      expect(items[3].detail).toBe(t.imageDetail(formatWhen("2026-11-17T10:00:00.000Z", lang)));
      expect(items.slice(4).map((i) => i.detail)).toEqual([t.document, t.screenshot, t.largeDocument]);
    }
    expect(chatOutputs(chat(), "en")[0].detail).toMatch(/^2 items · last changed /);
    expect(chatOutputs(chat(), "de")[0].detail).toMatch(/^2 Elemente · zuletzt geändert /);
    expect(outputsText.en.boardDetail(1, "x")).toBe("1 item · last changed x");
    expect(outputsText.de.canvasDetail(1234)).toBe("Canvas-Dokument · 1.234 Zeichen");
  });

  it("image items carry their picture, type and time", () => {
    const image = chatOutputs(chat(), "en").find((i) => i.id === "a1");
    expect(image).toMatchObject({ kind: "image", at: "2026-11-17T10:00:00.000Z", image: { type: "image/png", data: PNG } });
  });

  it("leaves out an empty board, an empty canvas and search results; nothing at all for a new chat", () => {
    const c = { ...chat(), board: { items: [], changedAt: "2026-11-17T13:05:00.000Z" }, canvas: { text: " \n " }, messages: [] };
    expect(chatOutputs(c, "de").map((i) => i.id)).toEqual(["f1", "f2", "f3"]);
    expect(chatOutputs(emptyConversation(), "en")).toEqual([]);
  });
});
