// Tool-calling test (owner, 14 November 2026): does a Privatemode model call a code tool reliably,
// and does running its code fix the arithmetic set? The model gets one tool, `python`; this harness
// runs the code and returns what it printed; the model's final text is scored by the frozen scorer.
// No Design A/B, no flags: an answer is exact, wrong or missing. Synthetic set only.
//
//   Invoke-WithPrivateAiSecret -Name PRIVATEMODE_API_KEY -Action {
//     npx tsx evaluation/arithmetic-gate/harness-tools.ts --cell flash --label flash-1 [--ids a,b] [--critical] [--cap 150000] }
//
// Writes .local/arithmetic-tools-20261114/<label>/results.json. --cap stops before a conversation
// once the reported tokens pass it (the free allowance is small).
import { spawnSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { PrivatemodeAI } from "privatemode-ai";
import { scoreConversation, type GateCase } from "./scorer";

const ROOT = ".local/arithmetic-tools-20261114";
const CELLS = {
  // The alpha's two modes as shipped (evaluation/qualification-drafts/privatemode-20261112.json).
  flash: { model: "glm-5.3-flash", reasoning_effort: "low", maxOutput: 2048 },
  glm: { model: "glm-5.3", reasoning_effort: "high", maxOutput: 16384 },
} as const;
const MAX_ROUNDS = 5;
const PACE_MS = 1500;

const arg = (name: string) => (process.argv.includes(`--${name}`) ? process.argv[process.argv.indexOf(`--${name}`) + 1] : undefined);

const SYSTEM = `You answer questions that involve calculation. Reply in the language of the user's question.
Never calculate in your head. For every figure you state, call the python tool first and take the figure from its output.
In the code: use decimal.Decimal built from strings for money and percentages, round money to 2 decimals with ROUND_HALF_UP unless the question says otherwise, use datetime for dates and times, and print every result with a label.
Then answer briefly and state every figure the question asks for, each with its label and unit.`;

const TOOLS = [
  {
    type: "function",
    function: {
      name: "python",
      description: "Runs Python 3 code and returns what it printed. Standard library only. Print every result.",
      parameters: { type: "object", properties: { code: { type: "string", description: "The Python code to run" } }, required: ["code"], additionalProperties: false },
    },
  },
];

// shortcut: a deny-list around the local Python, good enough for our own synthetic prompts in a
// test harness; the product runs model code in the browser's Pyodide sandbox instead.
const DENIED = /\b(?:os|sys|subprocess|socket|shutil|pathlib|urllib|requests|http|ctypes|importlib|builtins)\b|__|\b(?:open|exec|eval|compile|input|globals|locals|getattr|setattr)\s*\(/;
export function runPython(code: string): string {
  if (code.length > 4000) return "ERROR: code too long";
  if (DENIED.test(code)) return "ERROR: only calculation with the standard library (decimal, fractions, math, datetime, statistics) is allowed";
  const run = spawnSync("python", ["-I", "-S", "-c", code], { encoding: "utf8", timeout: 10_000 });
  if (run.error) return `ERROR: ${run.error.message}`;
  return (run.status === 0 ? run.stdout : `ERROR:\n${run.stderr}`).slice(0, 2000) || "(nothing was printed)";
}

type Message = Record<string, unknown>;
type TurnRecord = { answer: string; rounds: number; toolCalls: number; badToolCalls: number; toolErrors: number; codes: string[]; outputs: string[]; input: number; output: number; failure?: string };

async function runTurn(client: PrivatemodeAI, cell: (typeof CELLS)[keyof typeof CELLS], messages: Message[]): Promise<TurnRecord> {
  const record: TurnRecord = { answer: "", rounds: 0, toolCalls: 0, badToolCalls: 0, toolErrors: 0, codes: [], outputs: [], input: 0, output: 0 };
  for (; record.rounds < MAX_ROUNDS; ) {
    record.rounds++;
    await new Promise((r) => setTimeout(r, PACE_MS));
    let reply;
    try {
      reply = await client.chat.completions.create(
        { model: cell.model, messages, tools: TOOLS, tool_choice: "auto", reasoning_effort: cell.reasoning_effort, max_completion_tokens: cell.maxOutput, stream: false } as never,
        { signal: AbortSignal.timeout(300_000) } as never,
      );
    } catch (error) {
      record.failure = String((error as Error).message).slice(0, 300);
      return record;
    }
    const usage = (reply as { usage?: { prompt_tokens?: number; completion_tokens?: number } }).usage;
    record.input += usage?.prompt_tokens ?? 0;
    record.output += usage?.completion_tokens ?? 0;
    const message = (reply as unknown as { choices: { message: { content?: string | null; tool_calls?: { id: string; function: { name: string; arguments: string } }[] } }[] }).choices[0].message;
    const calls = message.tool_calls ?? [];
    if (!calls.length) {
      record.answer = message.content ?? "";
      return record;
    }
    // History keeps the call and its result, never the reasoning.
    messages.push({ role: "assistant", content: message.content ?? "", tool_calls: calls });
    for (const call of calls) {
      record.toolCalls++;
      let code: unknown;
      try {
        code = call.function.name === "python" ? JSON.parse(call.function.arguments).code : undefined;
      } catch {
        /* counted below */
      }
      let output: string;
      if (typeof code !== "string") {
        record.badToolCalls++;
        output = 'ERROR: call python with {"code": "..."}';
      } else {
        output = runPython(code);
        record.codes.push(code);
        if (output.startsWith("ERROR")) record.toolErrors++;
      }
      record.outputs.push(output);
      messages.push({ role: "tool", tool_call_id: call.id, content: output });
    }
  }
  record.failure = "no final answer within the tool rounds";
  return record;
}

async function main() {
  const cellName = arg("cell") as keyof typeof CELLS;
  const cell = CELLS[cellName];
  const label = arg("label");
  if (!cell || !label) throw Error("--cell flash|glm --label <name>");
  const apiKey = process.env.PRIVATEMODE_API_KEY;
  if (!apiKey) throw Error("Load PRIVATEMODE_API_KEY with scripts/WindowsSecrets.psm1");
  const cap = Number(arg("cap") ?? 150_000);
  const ids = arg("ids")?.split(",");
  let cases = (JSON.parse(await readFile("evaluation/arithmetic-gate/unseen-v3-20261023.json", "utf8")).cases as GateCase[]).filter((c) => !ids || ids.includes(c.id));
  if (process.argv.includes("--critical")) cases = cases.filter((c) => (c as { critical?: boolean }).critical);
  await mkdir(`${ROOT}/${label}`, { recursive: true });
  const client = new PrivatemodeAI({ apiKey, enableWasmLogging: false });
  const records: { caseId: string; critical: boolean; outcome: string; usedTool: boolean[]; turns: TurnRecord[]; score: unknown }[] = [];
  let tokens = 0;
  try {
    for (const gateCase of cases) {
      if (tokens > cap) {
        console.log(`stopped at the token cap (${tokens} > ${cap})`);
        break;
      }
      const messages: Message[] = [{ role: "system", content: SYSTEM }];
      const turns: TurnRecord[] = [];
      for (const text of gateCase.turns) {
        messages.push({ role: "user", content: text });
        const turn = await runTurn(client, cell, messages);
        turns.push(turn);
        tokens += turn.input + turn.output;
        if (!turn.answer) break;
        messages.push({ role: "assistant", content: turn.answer });
      }
      const answers = turns.map((t) => t.answer);
      const delivered = turns.length === gateCase.turns.length && answers.every(Boolean);
      const score = scoreConversation(gateCase, answers);
      const outcome = !delivered ? "no-answer" : score.pass ? "exact" : "wrong";
      records.push({ caseId: gateCase.id, critical: !!(gateCase as { critical?: boolean }).critical, outcome, usedTool: turns.map((t) => t.toolCalls > 0), turns, score });
      console.log(`${gateCase.id} ${outcome} tools ${turns.map((t) => t.toolCalls).join("+")} tokens ${turns.reduce((n, t) => n + t.input + t.output, 0)}`);
      await writeFile(`${ROOT}/${label}/results.json`, JSON.stringify({ cell: cellName, ...cell, startedWith: SYSTEM, records }, null, 1));
    }
  } finally {
    client.close();
  }
  const n = (o: string) => records.filter((r) => r.outcome === o).length;
  const turns = records.flatMap((r) => r.turns);
  console.log(
    JSON.stringify({
      conversations: records.length,
      exact: n("exact"),
      wrong: n("wrong"),
      noAnswer: n("no-answer"),
      turns: turns.length,
      turnsWithTool: turns.filter((t) => t.toolCalls > 0).length,
      badToolCalls: turns.reduce((s, t) => s + t.badToolCalls, 0),
      toolErrors: turns.reduce((s, t) => s + t.toolErrors, 0),
      input: turns.reduce((s, t) => s + t.input, 0),
      output: turns.reduce((s, t) => s + t.output, 0),
    }),
  );
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("harness-tools.ts")) await main();
