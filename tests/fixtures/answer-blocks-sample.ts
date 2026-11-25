// One answer that uses every answer block (docs/answer-blocks-20261126.md), written by hand in the
// shapes the model is told to use. For tests/answer-blocks-ui.test.ts and its screenshots.
const fence = "```";
const block = (name: string, data: unknown) => `${fence}${name}\n${JSON.stringify(data)}\n${fence}`;

export const BLOCKS_SAMPLE = [
  "# How an AI agent works",
  "",
  "An agent is a program that pursues a goal by acting, looking at the result and adjusting, instead of answering once.",
  "",
  "> **Key idea:** An agent is a loop, not a single answer: it acts, observes and corrects itself until the goal is reached.",
  "",
  "## The loop",
  "",
  "It plans, acts and checks. When the check fails it changes the plan and tries again.",
  "",
  block("diagram", {
    type: "flow",
    title: "The loop of an agent",
    nodes: [
      { id: "goal", label: "Receive the goal" },
      { id: "plan", label: "Make a plan" },
      { id: "act", label: "Act" },
      { id: "look", label: "Observe the result" },
      { id: "done", label: "Goal reached?", decision: true },
      { id: "fix", label: "Adjust the plan" },
      { id: "report", label: "Report" },
    ],
    edges: [
      { from: "goal", to: "plan" },
      { from: "plan", to: "act" },
      { from: "act", to: "look" },
      { from: "look", to: "done" },
      { from: "done", to: "report", label: "yes" },
      { from: "done", to: "fix", label: "no" },
      { from: "fix", to: "act" },
    ],
  }),
  "",
  "## What it is made of",
  "",
  block("diagram", {
    type: "layers",
    title: "The parts of an agent",
    rows: [
      [{ label: "Input", note: "text, files, tool results" }],
      [{ label: "Model", note: "understands and decides" }],
      [{ label: "Memory", note: "what happened so far" }, { label: "Tools", note: "search, code, files" }],
      [{ label: "Checks", note: "verify before reporting" }],
    ],
  }),
  "",
  "## How far this has come",
  "",
  block("steps", {
    items: [
      { title: "Chat models", text: "Answer one message at a time.", tag: "Everywhere" },
      { title: "Tool use", text: "Call a search or run code inside one answer.", tag: "Common" },
      { title: "Agents", text: "Work through many steps towards a goal.", tag: "Growing" },
      { title: "Long-running agents", text: "Work for hours with little supervision.", tag: "Early" },
    ],
  }),
  "",
  "> **Watch out:** An agent can act on a wrong assumption many times before anyone looks. Give it limits and check its results.",
  "",
  "## Three kinds, side by side",
  "",
  block("explore", {
    tabs: [
      { title: "Coding", text: "Reads a codebase, changes files, runs the tests and repairs what fails.\n\nIts check is the test suite." },
      { title: "Research", text: "Searches, reads sources and writes a report with what it found and where." },
      { title: "Office work", text: "Fills forms, files invoices and answers routine mail inside fixed rules." },
    ],
  }),
  "",
  "## Check yourself",
  "",
  block("quiz", {
    items: [
      { q: "What is the difference between a chat answer and an agent?", a: "A chat answer is written once. An agent acts, looks at the result and tries again until the goal is reached." },
      { q: "Why does an agent need checks?", a: "Because it can repeat a mistake many times without anyone looking." },
    ],
  }),
  "",
  "> **Conclusion:** Use an agent when the work has many steps and a result that can be checked. For one question, a normal answer is faster and safer.",
  "",
  "A block that does not fit its shape stays as it was written:",
  "",
  block("steps", { items: "not a list" }),
].join("\n");
