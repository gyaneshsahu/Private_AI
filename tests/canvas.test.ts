// Canvas rules (docs/canvas-20261114.md): the Markdown table grid, CSV, the limits, the one
// "ask for changes" message, proposals, undo and the saved form. Offline, no page.
import { expect, it, vi } from "vitest";
import { canvasEnabled } from "../src/device-features";
import { emptyConversation, type Conversation } from "../shared/contracts";
import {
  CANVAS_LIMITS,
  CanvasError,
  canvasProposal,
  canvasRequest,
  checkCanvas,
  isCanvasRequest,
  keepForUndo,
  parseTable,
  parseTsv,
  pasteInto,
  proposedText,
  serializeTable,
  takeUndo,
  toCsv,
  undoCount,
  withCanvas,
  withoutCanvas,
  withoutEarlierCanvas,
} from "../src/canvas";
import { composeContext, newMessage } from "../src/conversation";
import { savedConversationSchema } from "../src/saved-conversation";

const TABLE = "| Name | Price | Note |\n| :--- | ---: | :---: |\n| Tea \\| green | 3,50 |  |\n| Coffee | 4 | strong |";
const problem = (fn: () => unknown) => {
  try {
    fn();
  } catch (error) {
    return (error as CanvasError).problem;
  }
};
const chat = (extra: Partial<Conversation> = {}): Conversation => ({ ...emptyConversation(), ...extra });

it("reads a Markdown table into a grid and writes it back unchanged in meaning", () => {
  const grid = parseTable(TABLE)!;
  expect(grid.header).toEqual(["Name", "Price", "Note"]);
  expect(grid.align).toEqual([":---", "---:", ":---:"]);
  expect(grid.rows).toEqual([
    ["Tea | green", "3,50", ""],
    ["Coffee", "4", "strong"],
  ]);
  const again = serializeTable(grid);
  expect(again).toContain("Tea \\| green");
  expect(parseTable(again)).toEqual(grid);
  // Short rows are filled, long rows cut; without outer pipes is a table too.
  expect(parseTable("a | b\n--- | ---\n| 1 |\n1 | 2 | 3")!.rows).toEqual([
    ["1", ""],
    ["1", "2"],
  ]);
  // Not a table: prose around it, no delimiter row, a column count mismatch.
  expect(parseTable(`Intro\n\n${TABLE}`)).toBeUndefined();
  expect(parseTable("| a | b |\n| c | d |")).toBeUndefined();
  expect(parseTable("| a | b |\n| --- |")).toBeUndefined();
  // A line break typed into a cell becomes a space; a pipe is escaped.
  expect(serializeTable({ header: ["x|y"], align: ["---"], rows: [["one\ntwo"]] })).toBe("| x\\|y |\n| --- |\n| one two |");
});

it("pastes tab-separated text from a spreadsheet, growing the table within its limits", () => {
  expect(parseTsv("a\tb\r\nc\td\r\n")).toEqual([
    ["a", "b"],
    ["c", "d"],
  ]);
  expect(parseTsv('"x\ty"\t"say ""hi"""\n"two\nlines"\t')).toEqual([
    ["x\ty", 'say "hi"'],
    ["two\nlines", ""],
  ]);
  const grid = parseTable(TABLE)!;
  const pasted = pasteInto(grid, 1, 2, parseTsv("p\tq\nr\ts"));
  expect(pasted.header).toEqual(["Name", "Price", "Note", ""]);
  expect(pasted.rows).toEqual([
    ["Tea | green", "3,50", "", ""],
    ["Coffee", "4", "p", "q"],
    ["", "", "r", "s"],
  ]);
  expect(pasteInto(grid, -1, 0, [["A", "B"]]).header).toEqual(["A", "B", "Note"]);
  expect(problem(() => pasteInto(grid, 0, 0, [Array(31).fill("x")]))).toBe("tableFull");
  expect(problem(() => pasteInto(grid, 0, 0, Array.from({ length: 201 }, () => ["x"])))).toBe("tableFull");
});

it("writes CSV with quotes, commas and line ends, and defuses spreadsheet formulas", () => {
  const csv = toCsv({
    header: ["Name", "Note"],
    align: ["---", "---"],
    rows: [
      ['Say "hi"', "a,b"],
      ["=HYPERLINK(1)", "-5"],
      ["+3,50", "@x"],
      ["-cmd", " padded"],
    ],
  });
  expect(csv).toBe('Name,Note\r\n"Say ""hi""","a,b"\r\n\'=HYPERLINK(1),-5\r\n"+3,50",\'@x\r\n\'-cmd," padded"\r\n');
});

it("composes one change request: the canvas once, the instruction, inside the limits", () => {
  const message = canvasRequest("  Make it shorter. ", "# Plan\n\nStep one.");
  expect(message.startsWith("Make it shorter.\n\n[Canvas document")).toBe(true);
  expect(message.split("# Plan").length).toBe(2);
  expect(message).not.toMatch(/\d/);
  expect(isCanvasRequest({ ...newMessage("user", message) })).toBe(true);
  expect(isCanvasRequest({ ...newMessage("assistant", message) })).toBe(false);
  // The largest request still fits the 20,000 character message limit.
  expect(canvasRequest("x".repeat(CANVAS_LIMITS.instruction), "y".repeat(CANVAS_LIMITS.characters)).length).toBeLessThanOrEqual(20000);
  expect(problem(() => canvasRequest("Go", "y".repeat(CANVAS_LIMITS.characters + 1)))).toBe("long");
  expect(problem(() => canvasRequest("x".repeat(CANVAS_LIMITS.instruction + 1), "text"))).toBe("instruction");
  expect(problem(() => canvasRequest(" ", "text"))).toBe("noInstruction");
  expect(problem(() => canvasRequest("Go", "  "))).toBe("empty");
  expect(problem(() => checkCanvas("y".repeat(CANVAS_LIMITS.characters + 1)))).toBe("long");
});

it("sends the canvas text once even after earlier change requests, and counts it in the context", () => {
  const first = canvasRequest("Shorter", "OLD-CANVAS-TEXT");
  let c = chat({
    messages: [
      newMessage("user", "Write a plan"),
      newMessage("assistant", "PLAN"),
      newMessage("user", first),
      newMessage("assistant", "OLD-ANSWER"),
    ],
  });
  c = withoutEarlierCanvas(c);
  expect(c.messages.map((m) => m.included)).toEqual([true, true, false, false]);
  const next = { ...c, messages: [...c.messages, newMessage("user", canvasRequest("Longer", "NEW-CANVAS-TEXT"))] };
  const sent = JSON.stringify(composeContext(next, 100000));
  expect(sent.split("NEW-CANVAS-TEXT").length).toBe(2);
  expect(sent).not.toContain("OLD-CANVAS-TEXT");
  expect(sent).not.toContain("OLD-ANSWER");
  expect(sent).toContain("PLAN");
  // Over the context budget the ordinary refusal applies.
  expect(() => composeContext(next, 50)).toThrow();
});

it("offers the newest answer as a proposal until it is applied or discarded, and undoes in order", () => {
  const request = newMessage("user", canvasRequest("Shorter", "Long text"));
  const answer = newMessage("assistant", "```markdown\nShort text\n```");
  let c = withCanvas(chat({ messages: [request, answer] }), "Long text");
  expect(canvasProposal(c)?.id).toBe(answer.id);
  expect(proposedText(answer.text)).toBe("Short text");
  expect(proposedText("Plain\n\n```js\nx\n```")).toBe("Plain\n\n```js\nx\n```");
  // Apply: the old version is kept for undo, the proposal is decided.
  keepForUndo(c.id, c.canvas!.text);
  c = withCanvas(c, proposedText(answer.text), answer.id);
  expect(c.canvas).toEqual({ text: "Short text", resolved: answer.id });
  expect(canvasProposal(c)).toBeUndefined();
  expect(undoCount(c.id)).toBe(1);
  // Typing keeps the decision mark.
  c = withCanvas(c, "Short text!");
  expect(c.canvas?.resolved).toBe(answer.id);
  expect(takeUndo(c.id)).toBe("Long text");
  expect(takeUndo(c.id)).toBeUndefined();
  for (let i = 0; i < CANVAS_LIMITS.undo + 5; i++) keepForUndo(c.id, `v${i}`);
  expect(undoCount(c.id)).toBe(CANVAS_LIMITS.undo);
  // A discarded proposal stays discarded; a failed answer is a proposal that can be dismissed.
  const failed = { ...newMessage("assistant", ""), status: "error" as const };
  const d = withCanvas(chat({ messages: [request, failed] }), "Long text");
  expect(canvasProposal(d)?.status).toBe("error");
  expect(canvasProposal(withCanvas(d, "Long text", failed.id))).toBeUndefined();
  expect(withoutCanvas(c).canvas).toBeUndefined();
});

it("saves the canvas with the conversation, reads conversations saved before it, and refuses oversize", () => {
  const old = { ...chat({ messages: [newMessage("user", "Hi")] }) };
  expect(savedConversationSchema.parse(old).canvas).toBeUndefined();
  const withOne = withCanvas(old, TABLE, "answer-id");
  expect(savedConversationSchema.parse(JSON.parse(JSON.stringify(withOne))).canvas).toEqual({ text: TABLE, resolved: "answer-id" });
  expect(savedConversationSchema.safeParse(withCanvas(old, "y".repeat(CANVAS_LIMITS.characters + 1))).success).toBe(false);
  expect(savedConversationSchema.safeParse({ ...old, canvas: { text: "x", extra: 1 } }).success).toBe(false);
});

it("is off unless the build switch is set", () => {
  vi.stubEnv("VITE_CANVAS", "");
  expect(canvasEnabled()).toBe(false);
  vi.stubEnv("VITE_CANVAS", "1");
  expect(canvasEnabled()).toBe(true);
  vi.unstubAllEnvs();
});
