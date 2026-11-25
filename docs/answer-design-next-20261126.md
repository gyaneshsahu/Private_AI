# Visual answers: what your references show and what I propose (26 November 2026)

**Status:** a proposal. Nothing of this is built. It needs your yes, because it adds a few sentences to the model's instructions on every request.

**Your request (26 November):** twelve screenshots of a long ChatGPT answer and of an interactive Claude answer, in `ui-references\received-20261126b`. Learn from them, do not copy. Show what is needed where it is needed, nicely, not many unnecessary pictures. Interactive diagrams with a live try-out are welcome. The platform must know when to do what, so it is useful and not decoration. This is for normal chat.

## What the references do

| In the reference | Why it works | Why it sometimes does not |
| --- | --- | --- |
| A tinted box "The core concept" near the top, a green box "My overall conclusion" at the end | The reader finds the one idea and the verdict without reading everything | |
| One sentence in colour ("Having more parameters does not automatically mean having AGI.") | A warning that must not be missed | Used on every definition it becomes noise |
| A layered diagram of coloured boxes (input, core, memory, planning, …) | Shows parts and how they stack | |
| A flow diagram (objective, plan, act, observe, loop back) | Shows a process with a decision and a loop; text cannot | |
| Stage cards with a small coloured tag ("Stage 1 · Current era", "Hypothetical") | A sequence where each step has a status | |
| Boxes joined by arrows ("Traditional developer" down to "Possible future") | A simple progression | |
| A numbered roadmap inside one card | Sets a list apart as "the plan" | |
| Strips of three stock pictures above sections | | You called it: decoration. They explain nothing and make it look cheap |
| Claude: a row of tabs, one small diagram and one explanation per tab | The reader explores six cases in the space of one; the diagram changes with the tab | |
| Claude: "Quick check" with the answers held back | The reader tests themself | |

## What CometRow has already

Sections, lists, tables with copy, key figures as tiles, list labels, check-lists you can tick, quoted notes, charts from numbers, formulas, code.

## What I propose to add, in this order

Each is a small "answer block", drawn by the app in the theme's colours, in light and dark, readable by screen readers, and never loading anything from another site.

| # | Block | What the reader sees | When the model may use it | Size of the work |
| --- | --- | --- | --- | --- |
| 1 | **Callout** | A tinted box with a label: Key idea (blue), Watch out (amber), Conclusion (green) | At most three in an answer. Key idea only in an explanation of a concept; Conclusion only when the question asked for a judgement; never in a short answer | Small. The model already writes quoted lines; it only needs a label |
| 2 | **Steps** | Cards in a row or column, each with a title, one line, and an optional small tag; arrows between them | A sequence of three to seven stages, phases or levels. Not for instructions (those stay a numbered list) | Small |
| 3 | **Diagram** | Boxes and arrows drawn by the app: a flow with decisions and loops, or layers of parts | Only when the answer describes a process with a branch or loop, or a system made of parts. At most one, unless asked for more | Medium. Our own small drawer, no outside library, like the chart |
| 4 | **Quick check** | Two to five questions; each answer opens on a tap | Only when the user is learning (asks to explain for an exam, to be tested, to practise) | Small |
| 5 | **Explorer** | Tabs; each tab has a short text and, if it helps, its own diagram (block 3) | Several cases of one idea that are best compared one at a time. Rare | Medium, on top of 3 |

**Not proposed: pictures from the web.** The app loads nothing from other sites today, on purpose (no third party sees the user). A diagram drawn by the app says more than a stock picture. If you later want real pictures (a map, a product, a person's work), they would have to come through our own server; that is its own decision with a cost.

**A live try-out** (a slider that changes a chart or a formula's result) is possible later as a sixth block. I would first see how blocks 1 to 5 are used.

## How the platform knows when to do what

1. **Rules in the instructions,** one short sentence per block, each with its "only when" (column four). The model decides; the rule says when not to.
2. **The app keeps the limits** whatever the model writes: no block in an answer under a few lines, at most three callouts, one diagram; a block that is malformed is shown as plain text, never as an error.
3. **Measured before it ships,** as the chart rule was: about 30 made-up questions (half should get a given block, half should not), in English and German, on both models. A block ships only when the model uses it where it should and leaves it out where it should not, in at least nine of ten cases.
4. **Its own switch** per block, so one that turns out noisy can be turned off alone.

## What it costs

- **On every request:** about 150 to 250 more words of instructions for all five blocks. On the Fast model that is a few thousandths of a cent per message; on Thinking about ten times that. I will measure it exactly, as for charts.
- **Once:** the measurement run, well under one euro.
- **A risk to accept:** the instruction text is tied to the frozen wording tests and earlier measurements; changing it means re-running those checks. That is why I did not add anything without asking.

## What I need from you

1. Yes or no to adding instructions for these blocks.
2. Which blocks first. My order is 1, 2, 3, 4, 5; blocks 1 and 2 alone already give the "boxes and colour" of your reference.
3. Whether the Thinking model may use more of them than Fast (it follows such rules more reliably).
