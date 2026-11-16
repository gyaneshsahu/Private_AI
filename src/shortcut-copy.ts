// What the copy shortcuts copy (src/use-shortcuts.ts). Pure: no page, no clipboard.
import type { Message } from "../shared/contracts";

/** The last answer, if its Copy button would be on (ChatMessage disables it for incomplete answers). */
export function lastAnswer(messages: readonly Message[]): Message | undefined {
  const last = messages.filter((message) => message.role === "assistant").at(-1);
  return last && last.status === "complete" && last.text ? last : undefined;
}

/**
 * The text of the last fenced code block in markdown, as the answer's Copy code button copies it
 * (without the final line break). A fence left open runs to the end, as in CommonMark.
 * shortcut: only fences at the start of a line (up to 3 spaces), not inside lists or quotes, and no
 * indented code blocks; upgrade to the markdown parser's tree if models start nesting code there.
 */
export function lastCodeBlock(text: string): string | undefined {
  let last: string | undefined;
  let fence = "";
  let body: string[] = [];
  for (const line of text.split(/\r?\n/)) {
    if (!fence) {
      const open = /^ {0,3}(`{3,}|~{3,})(.*)$/.exec(line);
      // A backtick fence's info string may not contain a backtick (that line is inline code).
      if (open && !(open[1][0] === "`" && open[2].includes("`"))) [fence, body] = [open[1], []];
    } else if (new RegExp(`^ {0,3}${fence[0]}{${fence.length},}\\s*$`).test(line)) {
      last = body.join("\n");
      fence = "";
    } else body.push(line);
  }
  return fence ? body.join("\n") : last;
}
