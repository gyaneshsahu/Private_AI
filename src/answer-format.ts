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
      // One code, or several in one bracket ("[id1, id2]"), each with an optional page or line.
      const parts = node.value.split(
        /([\[【]\s*(?:[a-zA-Z0-9-]{6,36}(?:,\s*(?:page|p\.)\s*[1-9]\d{0,3}|†(?:source|L\d{1,6}(?:-L\d{1,6})?))?(?:\s*[,;]\s*(?=[a-zA-Z0-9-]{6,36}[,;†\]】\s])|\s*(?=[\]】])))+[\]】])/gi,
      );
      if (parts.length === 1) return;
      const children: PhrasingContent[] = parts
        .filter(Boolean)
        .flatMap((part) => {
          if (!/^[\[【]/.test(part))
            return [{ type: "text", value: part } as PhrasingContent];
          const [open, close] = part[0] === "[" ? ["[", "]"] : ["【", "】"];
          return part
            .slice(1, -1)
            .trim()
            .split(/\s*[,;]\s*(?!\s*(?:page|p\.)\s*\d)/i)
            .map((code): PhrasingContent => ({
              type: "link",
              url: "#source-" + code.split(/[,†]/)[0].trim(),
              children: [{ type: "text", value: open + code + close }],
            }));
        });
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
