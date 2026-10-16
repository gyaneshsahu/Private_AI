import { z } from "zod";
import type { Conversation } from "../shared/contracts";
import { calculatorArguments } from "./calculator-turn";
import { createCalculationRecords } from "./calculation-records";

const identifier = z.string().regex(/^[a-z][a-z0-9_]{0,31}$/);
export const replayArguments = calculatorArguments.extend({
  inputs: calculatorArguments.shape.inputs.min(0),
  derivedInputs: z
    .array(
      z
        .object({
          id: identifier,
          recordId: z.string().uuid(),
          resultId: identifier,
        })
        .strict(),
    )
    .max(8)
    .optional(),
});

// Offline compiler only. Reuses validated operations, never displayed decimals
// or assistant quotations. The ordinary calculator still validates the output.
export function expandCalculationReplay(
  raw: string,
  records: ReturnType<typeof createCalculationRecords>,
  conversation: Conversation,
): string {
  if (raw.length > 32000) throw Error("Replay exceeds bounds");
  const args = replayArguments.parse(JSON.parse(raw));
  const occupied = new Set<string>();
  for (const item of [
    ...args.inputs,
    ...(args.derivedInputs ?? []),
    ...args.steps,
  ]) {
    if (occupied.has(item.id)) throw Error("Duplicate replay identifier");
    occupied.add(item.id);
  }
  const inputs = [...args.inputs];
  const steps: typeof args.steps = [];
  const aliases = new Map<string, string>();
  let sequence = 0;
  const fresh = () => {
    let id: string;
    do {
      id = `replay_${sequence++}`;
    } while (occupied.has(id));
    occupied.add(id);
    return id;
  };
  for (const derived of args.derivedInputs ?? []) {
    const record = records.resolve(derived.recordId, conversation);
    if (
      !record ||
      !record.program.results.some((r) => r.id === derived.resultId)
    )
      throw Error("Calculation record unavailable");
    const mapping = new Map<string, string>();
    for (const input of record.program.inputs) {
      const id = fresh();
      mapping.set(input.id, id);
      inputs.push({ ...input, id });
    }
    for (const step of record.program.steps) {
      const id = fresh();
      const left = mapping.get(step.left),
        right = mapping.get(step.right);
      if (!left || !right) throw Error("Invalid stored dependency");
      steps.push({ ...step, id, left, right });
      mapping.set(step.id, id);
    }
    aliases.set(derived.id, mapping.get(derived.resultId)!);
  }
  steps.push(
    ...args.steps.map((step) => ({
      ...step,
      left: aliases.get(step.left) ?? step.left,
      right: aliases.get(step.right) ?? step.right,
    })),
  );
  const expanded = calculatorArguments.parse({
    unit: args.unit,
    inputs,
    steps,
    results: args.results,
  });
  const result = JSON.stringify(expanded);
  if (result.length > 32000) throw Error("Expanded replay exceeds bounds");
  return result;
}
