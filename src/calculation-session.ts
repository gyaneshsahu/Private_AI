import type { Conversation } from "../shared/contracts";
import { selectedSources } from "./conversation";
import { createCalculationRecords } from "./calculation-records";
import { expandCalculationReplay } from "./calculation-replay";

export type CalculationSession = ReturnType<typeof createCalculationSession>;
export function createCalculationSession() {
  const records = createCalculationRecords();
  let keys: string[] = [];
  let conversationId: string | undefined;
  let pending:
    | {
        raw: string;
        answer: string;
        messages: string;
        sources: string;
        count: number;
      }
    | undefined;
  const clear = () => {
    records.clear();
    keys = [];
    pending = undefined;
    conversationId = undefined;
  };
  function synchronize(c: Conversation) {
    if (conversationId !== undefined && conversationId !== c.id) clear();
    conversationId = c.id;
    if (pending) {
      const p = pending;
      const prefixMatches =
        JSON.stringify(c.messages.slice(0, p.count)) === p.messages &&
        JSON.stringify(selectedSources(c)) === p.sources;
      const answer = c.messages[p.count];
      if (
        !prefixMatches ||
        c.messages.length > p.count + 1 ||
        (answer &&
          (answer.role !== "assistant" ||
            !answer.included ||
            answer.status === "error"))
      )
        pending = undefined;
      else if (answer?.status === "complete") {
        pending = undefined;
        if (answer.text === p.answer) {
          try {
            keys.push(records.record(p.raw, c, answer.id));
            keys = keys.slice(-8);
          } catch {
            /* A delivered reply does not imply a reusable record. */
          }
        }
      }
    }
    keys = keys.filter((key) => records.resolve(key, c) !== undefined);
  }
  return {
    clear,
    synchronize,
    references(c: Conversation) {
      synchronize(c);
      return keys.flatMap((recordId) => {
        const record = records.resolve(recordId, c);
        return record
          ? [{ recordId, historical: true as const, results: record.results }]
          : [];
      });
    },
    expand(raw: string, c: Conversation) {
      synchronize(c);
      return expandCalculationReplay(raw, records, c);
    },
    stage(raw: string, answer: string, c: Conversation) {
      synchronize(c);
      const messages = JSON.stringify(c.messages),
        sources = JSON.stringify(selectedSources(c));
      if (
        raw.length > 32000 ||
        answer.length > 64000 ||
        messages.length > 200000 ||
        sources.length > 200000
      ) {
        pending = undefined;
        return;
      }
      pending = {
        raw,
        answer,
        messages,
        sources,
        count: c.messages.length,
      };
    },
  };
}
