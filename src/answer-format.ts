import type { Root, PhrasingContent } from "mdast";
import { visit } from "unist-util-visit";

export function sourceCitations() {
  return (tree: Root) => {
    // A line break is the only HTML syntax promoted to an element. All other
    // raw HTML remains escaped by the Markdown renderer.
    visit(tree, "html", (node, index, parent) => {
      if (
        index != null &&
        parent &&
        parent.type !== "root" &&
        /^<br\s*\/?>$/i.test(node.value)
      ) {
        parent.children.splice(index, 1, { type: "break" });
      }
    });
    visit(tree, "text", (node, index, parent) => {
      if (index == null || !parent || parent.type === "link") return;
      const parts = node.value.split(
        /(\[[a-zA-Z0-9-]{6,36}(?:,\s*(?:page|p\.)\s*[1-9]\d{0,3})?\]|【[a-zA-Z0-9-]{6,36}(?:,\s*(?:page|p\.)\s*[1-9]\d{0,3})?】)/gi,
      );
      if (parts.length === 1) return;
      const children: PhrasingContent[] = parts.filter(Boolean).map((part) =>
        /^[\[【]/.test(part)
          ? {
              type: "link",
              url: "#source-" + part.slice(1, -1).split(",")[0],
              children: [{ type: "text", value: part }],
            }
          : { type: "text", value: part },
      );
      parent.children.splice(index, 1, ...children);
      return index + children.length;
    });
  };
}

// Support the standalone display delimiters observed in live replies; preserve
// code examples verbatim and leave incomplete streamed math readable as text.
export function displayMath(text: string): string {
  let fence: { char: string; length: number } | undefined;
  let math = false;
  return text
    .split("\n")
    .map((line) => {
      const marker = /^ {0,3}(`{3,}|~{3,})/.exec(line)?.[1];
      if (marker) {
        if (!fence) fence = { char: marker[0], length: marker.length };
        else if (
          marker[0] === fence.char &&
          marker.length >= fence.length &&
          /^ {0,3}(`+|~+)\s*$/.test(line)
        )
          fence = undefined;
        return line;
      }
      if (fence) return line;
      if (/^\\\[\s*$/.test(line)) {
        math = true;
        return "$$";
      }
      if (math && /^\\\]\s*$/.test(line)) {
        math = false;
        return "$$";
      }
      return line;
    })
    .join("\n");
}
