// Answer blocks (docs/answer-blocks-20261126.md): what the model may write besides text, as small
// JSON in a fenced block, the way charts work (src/AnswerChart.tsx). Each parser returns the data
// or undefined; anything that does not fit stays an ordinary code block, never an error. Sizes are
// bounded here whatever the model writes. Nothing is fetched and no library is used.
import { z } from "zod";

const short = (max: number) => z.string().trim().min(1).max(max);

const steps = z.object({ items: z.array(z.object({ title: short(80), text: short(300).optional(), tag: short(28).optional() })).min(2).max(8) });
export type StepsData = z.infer<typeof steps>;

const quiz = z.object({ items: z.array(z.object({ q: short(400), a: short(900) })).min(1).max(8) });
export type QuizData = z.infer<typeof quiz>;

const flow = z.object({
  type: z.literal("flow"),
  title: short(100).optional(),
  nodes: z.array(z.object({ id: short(24), label: short(48), decision: z.boolean().optional() })).min(2).max(14),
  edges: z.array(z.object({ from: short(24), to: short(24), label: short(18).optional() })).min(1).max(24),
});
const layers = z.object({
  type: z.literal("layers"),
  title: short(100).optional(),
  rows: z.array(z.array(z.object({ label: short(40), note: short(90).optional() })).min(1).max(4)).min(2).max(7),
});
const diagram = z.union([flow, layers]);
export type FlowData = z.infer<typeof flow>;
export type LayersData = z.infer<typeof layers>;
export type DiagramData = z.infer<typeof diagram>;

const explore = z.object({ tabs: z.array(z.object({ title: short(32), text: short(1600), diagram: diagram.optional() })).min(2).max(8) });
export type ExploreData = z.infer<typeof explore>;

function parsed<T>(schema: z.ZodType<T>, text: string): T | undefined {
  try {
    const result = schema.safeParse(JSON.parse(text));
    return result.success ? result.data : undefined;
  } catch {
    return undefined;
  }
}
export const parseSteps = (text: string) => parsed(steps, text);
export const parseQuiz = (text: string) => parsed(quiz, text);
export const parseExplore = (text: string) => parsed(explore, text);
/** A flow whose edges name nodes that exist; a layers diagram as it is. */
export function parseDiagram(text: string): DiagramData | undefined {
  const data = parsed(diagram, text);
  if (data?.type !== "flow") return data;
  const ids = new Set(data.nodes.map((node) => node.id));
  return ids.size === data.nodes.length && data.edges.every((edge) => ids.has(edge.from) && ids.has(edge.to) && edge.from !== edge.to) ? data : undefined;
}

/**
 * Where a flow's boxes go: rows from top to bottom. A node sits one row under the lowest node that
 * points to it; an edge that points back up (a loop) does not pull its target down.
 */
export function flowLayout(data: FlowData): { rows: string[][]; back: Set<number> } {
  const rank = new Map<string, number>();
  const back = new Set<number>();
  const targets = new Set(data.edges.map((edge) => edge.to));
  const roots = data.nodes.filter((node) => !targets.has(node.id));
  for (const root of roots.length ? roots : [data.nodes[0]]) rank.set(root.id, 0);
  // Edges in the order written: a target not yet placed goes under its source; one already placed above is a loop.
  for (let pass = 0; pass < data.nodes.length; pass++) {
    let moved = false;
    data.edges.forEach((edge, index) => {
      const from = rank.get(edge.from);
      if (from === undefined || back.has(index)) return;
      const to = rank.get(edge.to);
      if (to === undefined) {
        rank.set(edge.to, from + 1);
        moved = true;
      } else if (to <= from) back.add(index);
    });
    if (!moved) break;
  }
  // A node nothing reaches (a loose one) goes at the end.
  let last = Math.max(0, ...rank.values());
  for (const node of data.nodes) if (!rank.has(node.id)) rank.set(node.id, ++last);
  const rows: string[][] = [];
  for (const node of data.nodes) (rows[rank.get(node.id)!] ??= []).push(node.id);
  return { rows: rows.filter(Boolean), back };
}

/** Which kind of note a quoted line is, from its bold label (English and German); undefined: an ordinary quote. */
export function calloutKind(label: string): "idea" | "caution" | "conclusion" | undefined {
  const word = label.replace(/[:：.\s]+$/, "").trim().toLowerCase();
  if (/^(key idea|core idea|the core concept|key point|in short|note|tip|kernidee|kerngedanke|kurz gesagt|hinweis|tipp|merke)$/.test(word)) return "idea";
  if (/^(watch out|warning|caution|important|careful|achtung|vorsicht|warnung|wichtig)$/.test(word)) return "caution";
  if (/^(conclusion|bottom line|verdict|summary|my conclusion|fazit|ergebnis|zusammenfassung|schlussfolgerung)$/.test(word)) return "conclusion";
}
