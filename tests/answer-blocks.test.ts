// Answer blocks (docs/answer-blocks-20261126.md): what counts as a block and what stays code, the
// bounds the app keeps, where a flow's boxes go (a loop does not pull its target down), which
// labels make a note, and the model's rules: in the system message only while the switch is on,
// and that message unchanged, to the character, while it is off.
import { afterEach, expect, it, vi } from "vitest";
import { emptyConversation } from "../shared/contracts";
import { calloutKind, flowLayout, parseDiagram, parseExplore, parseQuiz, parseSteps } from "../src/answer/blocks";
import { answerBlockRules } from "../src/answer/rules";
import { composeContext, newMessage } from "../src/conversation";
import { findIdentifiers } from "../src/identifier-masking";

afterEach(() => vi.unstubAllEnvs());
const json = (value: unknown) => JSON.stringify(value);

it("steps, quiz and explore take their shape and nothing else", () => {
  expect(parseSteps(json({ items: [{ title: "A" }, { title: "B", text: "t", tag: "now" }] }))?.items).toHaveLength(2);
  expect(parseSteps(json({ items: [{ title: "only one" }] }))).toBeUndefined();
  expect(parseSteps(json({ items: Array.from({ length: 9 }, () => ({ title: "x" })) }))).toBeUndefined();
  // A title a little too long is cut, not refused; far too long is not a slip any more.
  expect(parseSteps(json({ items: [{ title: "A" }, { title: "x".repeat(81) }] }))?.items[1].title).toHaveLength(80);
  expect(parseSteps(json({ items: [{ title: "A" }, { title: "x".repeat(400) }] }))).toBeUndefined();
  // The opening of the JSON left out (seen from the live model) is put back.
  expect(parseSteps('items":[{"title":"A"},{"title":"B"}]}')?.items).toHaveLength(2);
  expect(parseSteps("not json")).toBeUndefined();
  expect(parseQuiz(json({ items: [{ q: "Why?", a: "Because." }] }))?.items[0].a).toBe("Because.");
  expect(parseQuiz(json({ items: [{ q: "Why?" }] }))).toBeUndefined();
  expect(parseExplore(json({ tabs: [{ title: "One", text: "a" }, { title: "Two", text: "b" }] }))?.tabs).toHaveLength(2);
  expect(parseExplore(json({ tabs: [{ title: "One", text: "a" }] }))).toBeUndefined();
});

const FLOW = {
  type: "flow",
  nodes: [{ id: "a", label: "Start" }, { id: "b", label: "Act" }, { id: "c", label: "Done?", decision: true }, { id: "d", label: "Fix" }, { id: "e", label: "Report" }],
  edges: [{ from: "a", to: "b" }, { from: "b", to: "c" }, { from: "c", to: "e", label: "yes" }, { from: "c", to: "d", label: "no" }, { from: "d", to: "b" }],
};

it("a diagram is a flow whose arrows name real boxes, or layers; anything else is not a diagram", () => {
  expect(parseDiagram(json(FLOW))?.type).toBe("flow");
  expect(parseDiagram(json({ ...FLOW, edges: [{ from: "a", to: "nowhere" }] }))).toBeUndefined();
  expect(parseDiagram(json({ ...FLOW, edges: [{ from: "a", to: "a" }] }))).toBeUndefined();
  expect(parseDiagram(json({ ...FLOW, nodes: [...FLOW.nodes, { id: "a", label: "Twice" }] }))).toBeUndefined();
  expect(parseDiagram(json({ type: "layers", rows: [[{ label: "Top" }], [{ label: "Left" }, { label: "Right", note: "n" }]] }))?.type).toBe("layers");
  expect(parseDiagram(json({ type: "layers", rows: [[{ label: "Only one row" }]] }))).toBeUndefined();
  expect(parseDiagram(json({ type: "pie", rows: [] }))).toBeUndefined();
});

it("a flow runs from top to bottom, and a loop back does not move the box it returns to", () => {
  const data = parseDiagram(json(FLOW));
  if (data?.type !== "flow") throw Error("not a flow");
  const { rows, back } = flowLayout(data);
  expect(rows).toEqual([["a"], ["b"], ["c"], ["d", "e"]]);
  // "Fix" back to "Act" is the loop: the fifth arrow.
  expect([...back]).toEqual([4]);
});

it("a quoted line is a note only with a label the app knows, in English and German", () => {
  expect(calloutKind("Key idea:")).toBe("idea");
  expect(calloutKind("Kernidee:")).toBe("idea");
  expect(calloutKind("Watch out:")).toBe("caution");
  expect(calloutKind("Achtung")).toBe("caution");
  expect(calloutKind("Conclusion:")).toBe("conclusion");
  expect(calloutKind("Fazit:")).toBe("conclusion");
  expect(calloutKind("Goethe:")).toBeUndefined();
  expect(calloutKind("A quoted sentence")).toBeUndefined();
});

it("the model is told about the blocks only while the switch is on; off, its instructions are unchanged", () => {
  const c = emptyConversation();
  c.messages.push(newMessage("user", "Explain how a heat pump works."));
  const now = new Date("2026-11-26T00:00:00Z");
  const off = composeContext(c, 8000, now, undefined, "en")[0].content;
  expect(off).not.toContain("Visual blocks");
  vi.stubEnv("VITE_ANSWER_BLOCKS", "1");
  const on = composeContext(c, 8000, now, undefined, "en")[0].content;
  // The same message with the rules in one place, after the fixed opening.
  expect(on.replace(answerBlockRules, "")).toBe(off);
  expect(on.indexOf(answerBlockRules)).toBeGreaterThan(on.indexOf("otherwise none."));
  // Each block has its "only when", and the rules stay small: about three hundred tokens.
  for (const word of ["never in a short answer", "not for instructions", "decision or a loop", "tested, quizzed or given exercises", "one at a time", "Never use images"]) expect(answerBlockRules).toContain(word);
  expect(answerBlockRules.length).toBeLessThan(1500);
  // Nothing in the rules looks like an identifier: device masking leaves them as they are.
  expect(answerBlockRules).not.toMatch(/\d{8,}/);
  expect(findIdentifiers(answerBlockRules)).toEqual([]);
});
