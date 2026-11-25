// Answer design (docs/answer-design-20261125.md): reads the structure the model already writes
// and marks it, so the page can draw it better. Nothing is asked of the model and no text is
// changed: with the marks ignored the answer reads exactly as before.
//  - the opening sentence or two of a longer answer: the lead;
//  - a paragraph that is only a bold line ending in a colon, before a list: a label for that list;
//  - two to six short lines of "**Name:** value": key figures, drawn as tiles.
import type { Paragraph, PhrasingContent, Root, RootContent } from "mdast";
import { calloutKind } from "./blocks";

const textOf = (nodes: PhrasingContent[]): string =>
  nodes.map((node) => ("value" in node ? node.value : "children" in node ? textOf(node.children as PhrasingContent[]) : "")).join("");

/** The paragraph's lines, split at line ends inside text and at hard breaks. */
function lines(paragraph: Paragraph): PhrasingContent[][] {
  const out: PhrasingContent[][] = [[]];
  for (const node of paragraph.children) {
    if (node.type === "break") out.push([]);
    else if (node.type === "text" && node.value.includes("\n")) {
      node.value.split("\n").forEach((part, index) => {
        if (index) out.push([]);
        if (part) out.at(-1)!.push({ type: "text", value: part });
      });
    } else out.at(-1)!.push(node);
  }
  return out.filter((line) => textOf(line).trim());
}

/** "**Name:** value" with a short name and a short value; the colon may sit inside or after the bold. */
function fact(line: PhrasingContent[]): { name: string; value: PhrasingContent[] } | undefined {
  const [first, ...rest] = line;
  if (first?.type !== "strong") return;
  let name = textOf(first.children).trim();
  let value = rest;
  if (name.endsWith(":")) name = name.slice(0, -1).trim();
  else if (value[0]?.type === "text" && /^\s*:/.test(value[0].value)) value = [{ type: "text", value: value[0].value.replace(/^\s*:/, "") }, ...value.slice(1)];
  else return;
  const shown = textOf(value).trim();
  // A figure, not a sentence: short, and with a digit in it.
  if (!name || name.length > 28 || !shown || shown.length > 44 || !/\d/.test(shown)) return;
  return { name, value };
}

const mark = (node: RootContent, hName: string | undefined, className: string, extra: Record<string, unknown> = {}) => {
  node.data = { ...node.data, ...(hName ? { hName } : {}), hProperties: { ...(node.data as { hProperties?: object } | undefined)?.hProperties, className: [className], ...extra } } as never;
};

export function answerStructure() {
  return (tree: Root) => {
    const blocks = tree.children;
    blocks.forEach((block, index) => {
      if (block.type !== "paragraph") return;
      const next = blocks[index + 1];
      // A label for the list under it.
      if (block.children.length === 1 && block.children[0].type === "strong" && /[:：]\s*$/.test(textOf(block.children)) && next?.type === "list") {
        mark(block, undefined, "answer-label");
        return;
      }
      // Key figures.
      const facts = lines(block).map(fact);
      if (facts.length >= 2 && facts.length <= 6 && facts.every(Boolean)) {
        mark(block, "dl", "answer-facts");
        block.children = facts.map((f) => ({
          type: "emphasis", // a carrier node: drawn as the <div> named below
          data: { hName: "div" },
          children: [
            { type: "emphasis", data: { hName: "dt" }, children: [{ type: "text", value: f!.name }] },
            { type: "emphasis", data: { hName: "dd" }, children: f!.value },
          ],
        })) as PhrasingContent[];
      }
    });
    // The lead: the answer's first paragraph, when more follows and it is short enough to be one thought.
    const first = blocks[0];
    if (first?.type === "paragraph" && blocks.length > 2 && !first.data && textOf(first.children).length <= 320) mark(first, undefined, "answer-lead");
  };
}

/**
 * Answer blocks (docs/answer-blocks-20261126.md): a quoted line that opens with a bold label the app
 * knows ("Key idea:", "Watch out:", "Conclusion:", and their German words) is a note of that kind.
 */
export function answerCallouts() {
  return (tree: Root) => {
    for (const block of tree.children) {
      if (block.type !== "blockquote") continue;
      const first = block.children[0];
      const label = first?.type === "paragraph" && first.children[0]?.type === "strong" ? textOf(first.children[0].children) : "";
      const kind = label && calloutKind(label);
      if (!kind) continue;
      mark(block, undefined, "answer-callout", { className: ["answer-callout", kind] });
      // The label stands on its own line: the space that followed it would indent the text.
      const after = (first as Paragraph).children[1];
      if (after?.type === "text") after.value = after.value.replace(/^\s+/, "");
    }
  };
}

/** A table as tab-separated text, for pasting into a spreadsheet. */
export function tableText(table: HTMLTableElement): string {
  return [...table.rows].map((row) => [...row.cells].map((cell) => cell.innerText.replace(/\s+/g, " ").trim()).join("\t")).join("\n");
}
