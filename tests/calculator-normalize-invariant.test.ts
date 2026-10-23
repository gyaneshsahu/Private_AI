import { describe, expect, it } from "vitest";
import {
  normalizeEvidenceShorthand,
  normalizeDecimal,
} from "../src/calculator-normalize";
import { CONSTANT_OPERANDS } from "../src/checked-response";
import { evidenceNumberTokens } from "../src/number-evidence";
import { emptyConversation, type Conversation } from "../shared/contracts";

// The normaliser may move numbers between shapes (a literal operand becomes an
// input) and rename identifiers, but it never changes a numeric value and never
// introduces one that is not already an input value, an allowed constant, or a
// form that some quotation in the arguments stands for.

function numbersIn(value: unknown, out: string[] = []): string[] {
  if (typeof value === "string") {
    const key = normalizeDecimal(value);
    if (key !== undefined) out.push(key);
  } else if (Array.isArray(value)) value.forEach((v) => numbersIn(v, out));
  else if (value && typeof value === "object")
    Object.values(value as object).forEach((v) => numbersIn(v, out));
  return out;
}

function conversationWith(text: string): Conversation {
  const c = emptyConversation();
  c.messages.push({
    id: "u1",
    role: "user",
    text,
    status: "complete",
    included: true,
  });
  return c;
}

// Deterministic pseudo-random generator for a fuzz loop that stays reproducible.
function lcg(seed: number) {
  let s = seed >>> 0;
  return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 2 ** 32;
}

describe("normaliser value invariant", () => {
  const userText =
    "Nettobetrag 1.785,00 EUR, Umsatzsteuer 19 %, Lieferung am 03.11.2026 um 09:23 Uhr, 18 Minuten Fußweg, Rate 2,5 %.";
  const conversation = conversationWith(userText);
  const quotes = [
    "1.785,00 EUR",
    "19 %",
    "09:23",
    "18 Minuten",
    "2,5 %",
    "nothing numeric here",
  ];
  const operandPool = [
    "1785",
    "19",
    "0.19",
    "1.19",
    "563",
    "18",
    "100",
    "12",
    "2.5",
    "0.025",
    "42",
    "7/100",
    "1.21",
  ];

  it("holds on 500 generated argument shapes", () => {
    const random = lcg(20261023);
    const pick = <T>(xs: readonly T[]) => xs[Math.floor(random() * xs.length)];
    for (let round = 0; round < 500; round++) {
      const inputCount = 1 + Math.floor(random() * 3);
      const inputs = Array.from({ length: inputCount }, (_, i) => {
        const quote = pick(quotes);
        const evidenceShape = random();
        const evidence =
          evidenceShape < 0.3
            ? quote
            : evidenceShape < 0.55
              ? {
                  kind: pick(["user", "userMessage", "constant", undefined]),
                  quote,
                  userTurn: 1,
                }
              : evidenceShape < 0.7
                ? { kind: "constant" }
                : { quote };
        return {
          id: pick([`in${i}`, `inputValue${i}`, `In-${i}`]),
          value: pick(operandPool),
          evidence,
        };
      });
      const steps = Array.from(
        { length: 1 + Math.floor(random() * 3) },
        (_, i) => ({
          id: pick([`s${i}`, "sum", "sum", `stepId${i}`]),
          op: pick(["add", "subtract", "multiply", "divide", "percentOf"]),
          left: pick([...inputs.map((x) => x.id), ...operandPool, "sum"]),
          right: pick([...inputs.map((x) => x.id), ...operandPool, "sum"]),
        }),
      );
      const args = {
        unit: "EUR",
        inputs: random() < 0.1 ? inputs[0] : inputs,
        steps,
        results: [
          { id: pick(["sum", steps[0].id, "resultName"]), decimals: 2 },
        ],
      };
      const before = numbersIn(args);
      const after = normalizeEvidenceShorthand(args, [], conversation);
      const afterNumbers = numbersIn(after);
      // Every number in the input survives (never altered, never dropped) ...
      for (const n of before)
        expect(afterNumbers, `round ${round} lost ${n}`).toContain(n);
      // ... and every number in the output is one of: an input number, an allowed constant,
      // or a form that one of the quotations stands for. Nothing else can appear.
      const allowed = new Set([
        ...before,
        ...CONSTANT_OPERANDS.map((c) => normalizeDecimal(c)!),
        ...quotes.flatMap((q) =>
          evidenceNumberTokens(q)
            .map(normalizeDecimal)
            .filter((x): x is string => x !== undefined),
        ),
        "1", // userTurn: 1 is a structural number, not a value
      ]);
      for (const n of afterNumbers)
        expect(allowed.has(n), `round ${round} introduced ${n}`).toBe(true);
      // Input values are untouched one by one.
      const inArr = Array.isArray(args.inputs) ? args.inputs : [args.inputs];
      const outArr = (after as { inputs: { value: string }[] }).inputs;
      inArr.forEach((input, i) => expect(outArr[i].value).toBe(input.value));
    }
  });

  it("changes only ids, evidence shape and operand references on a worked example", () => {
    const args = {
      unit: "EUR",
      inputs: [
        { id: "grossAmount", value: "1785.00", evidence: "1.785,00 EUR" },
        { id: "rate", value: "19", evidence: "19 %" },
      ],
      steps: [{ id: "net", op: "divide", left: "grossAmount", right: "1.19" }],
      results: [{ id: "net", decimals: 2 }],
    };
    const out = normalizeEvidenceShorthand(
      args,
      [],
      conversation,
    ) as typeof args & {
      inputs: { id: string; value: string; evidence: unknown }[];
    };
    expect(out.inputs[0].value).toBe("1785.00");
    expect(out.steps[0].right).not.toBe("1.19");
    const added = out.inputs.find((i) => i.id === out.steps[0].right);
    expect(added?.value).toBe("1.19");
    expect(added?.evidence).toEqual({
      kind: "user",
      userTurn: 1,
      quote: "19 %",
    });
    expect(numbersIn(out).sort()).toEqual(numbersIn(args).sort());
  });
});
