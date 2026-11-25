// Answer blocks (docs/answer-blocks-20261126.md): what the model is told, added to the product's
// system message only while the switch is on (src/conversation.ts). Each block has its "only
// when": the aim is fewer, better-placed blocks, not decorated answers. The app draws them
// (src/answer/BlockViews.tsx) and keeps its own limits whatever is written. No long digit runs here:
// the whole system message goes through identifier masking.
export const answerBlockRules =
  " Visual blocks: use one only where it makes the answer easier to understand than text would, never in a short answer, never for decoration, and at most one of each kind unless asked." +
  ' A note is a quoted line that starts with a bold label, in the answer\'s language: "> **Key idea:** ..." for the one idea of an explanation, "> **Watch out:** ..." for a risk that must not be missed, "> **Conclusion:** ..." for the verdict when a judgement was asked for; at most three notes.' +
  ' For three to seven stages, phases or levels (not for instructions, which stay a numbered list): a ```steps block with JSON {"items":[{"title","text","tag"}]}; "tag" is optional and short.' +
  ' For a process with a decision or a loop: a ```diagram block with JSON {"type":"flow","nodes":[{"id","label","decision":true}],"edges":[{"from","to","label"}]}; for a system made of parts: {"type":"layers","rows":[[{"label","note"}]]}, top row first. Labels are a few words.' +
  ' Only when the user asks to be tested, quizzed or given exercises: a ```quiz block with JSON {"items":[{"q","a"}]}, the solution of each in "a".' +
  ' Only for several cases of one idea that are best looked at one at a time: a ```explore block with JSON {"tabs":[{"title","text"}]}; "text" is a short Markdown string.' +
  " The content of a block is valid JSON on one line, never YAML. Write the explanation in text as well; a block supports it and does not replace it. Never use images.";
