import type { Conversation } from "../shared/contracts";
import { calculatorArguments } from "./calculator-turn";
import { renderCheckedResponse } from "./checked-response";
import { selectedSources } from "./conversation";

// Explicitly session-owned; never attached to serializable conversation state.
export function createCalculationRecords() {
  const records = new Map<
    string,
    {
      conversationId: string;
      prefix: string;
      sourceIdentity: string;
      messageCount: number;
      raw: string;
    }
  >();
  const prefix = (c: Conversation, count: number) =>
    JSON.stringify(c.messages.slice(0, count));
  const sourceIdentity = (c: Conversation) =>
    JSON.stringify(selectedSources(c));
  function evaluate(raw: string, conversation: Conversation) {
    const args = calculatorArguments.parse(JSON.parse(raw));
    if (new Set(args.results.map((r) => r.id)).size !== args.results.length)
      throw Error("Duplicate calculation result");
    return args.results.map(({ id, decimals, unit }) => ({
      id,
      decimals,
      unit: unit ?? args.unit,
      displayedValue: renderCheckedResponse(
        JSON.stringify({
          inputs: args.inputs,
          steps: args.steps,
          results: [{ id, decimals }],
          passages: [],
          limitation: "none",
        }),
        selectedSources(conversation),
        conversation,
        "result",
      ),
    }));
  }
  return {
    record(
      raw: string,
      conversation: Conversation,
      assistantId: string,
    ): string {
      if (
        raw.length > 32000 ||
        JSON.stringify(conversation.messages).length > 200000 ||
        sourceIdentity(conversation).length > 200000
      )
        throw Error("Calculation record exceeds session bounds");
      const last = conversation.messages.at(-1);
      if (
        last?.id !== assistantId ||
        last.role !== "assistant" ||
        last.status !== "complete" ||
        !last.included
      )
        throw Error("Only a completed included answer can own a record");
      evaluate(raw, conversation);
      const key = crypto.randomUUID();
      records.set(key, {
        conversationId: conversation.id,
        prefix: prefix(conversation, conversation.messages.length),
        sourceIdentity: sourceIdentity(conversation),
        messageCount: conversation.messages.length,
        raw,
      });
      if (records.size > 8) records.delete(records.keys().next().value!);
      return key;
    },
    resolve(key: string, conversation: Conversation) {
      const record = records.get(key);
      if (!record) return undefined;
      if (
        record.conversationId !== conversation.id ||
        record.prefix !== prefix(conversation, record.messageCount) ||
        record.sourceIdentity !== sourceIdentity(conversation)
      ) {
        records.delete(key);
        return undefined;
      }
      // Later corrections do not rewrite an earlier result. The result is
      // historical, never evidence that its operands remain current.
      return {
        historical: true as const,
        results: evaluate(record.raw, conversation),
        program: calculatorArguments.parse(JSON.parse(record.raw)),
      };
    },
    clear() {
      records.clear();
    },
  };
}
