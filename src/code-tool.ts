// Code execution on this device (docs/code-execution-20261114.md): the `python` tool the model
// may call, the instruction that goes with it, and the runner that executes one call in a fresh
// Web Worker. The instruction and the tool are the ones the arithmetic test of 14 November used
// (evaluation/arithmetic-gate/harness-tools.ts), adapted to sit beside the app's own instructions.
import type { AppStatus, Conversation } from "../shared/contracts";
import { OUTPUT_LIMIT, RUN_LIMIT_MS, type CodeResult } from "./python-sandbox";

export type { CodeResult } from "./python-sandbox";
/** One executed call, kept with the answer so the user can read what was calculated. */
export type CodeRun = { code: string; output: string; error?: true };
export const MAX_CODE_RUNS = 12;

/** Declared on follow-up requests of one message; the relay may count them on the paid request's credit. */
export const CONTINUATION_HEADER = "X-PrivateAI-Continuation";

export const CODE_INSTRUCTION =
  " You have one tool, python, which runs Python code on the user's device. When a question involves calculation: never calculate in your head. For every figure you state, call the python tool first and take the figure from its output. In the code: use decimal.Decimal built from strings for money and percentages, round money to 2 decimals with ROUND_HALF_UP unless the question says otherwise, use datetime for dates and times, and print every result with a label. Then answer briefly and state every figure the question asks for, each with its label and unit. For questions without calculation, answer as usual and do not call the tool.";

export const PYTHON_TOOL = {
  type: "function",
  function: {
    name: "python",
    description: "Runs Python 3 code and returns what it printed. Standard library only. Print every result.",
    parameters: {
      type: "object",
      properties: { code: { type: "string", description: "The Python code to run" } },
      required: ["code"],
      additionalProperties: false,
    },
  },
} as const;
export const CODE_REQUEST_OPTIONS = { tools: [PYTHON_TOOL], tool_choice: "auto" } as const;

export const BAD_CALL_OUTPUT = 'ERROR: call python with {"code": "..."}';
export const UNAVAILABLE_OUTPUT =
  "ERROR: the python tool could not start on this device. Do not call it again. Answer without it and say in one sentence that the figures were not calculated with code.";
export const TIMEOUT_OUTPUT = `ERROR: the code ran longer than ${RUN_LIMIT_MS / 1000} seconds and was stopped`;
export const CRASH_OUTPUT = "ERROR: the code stopped without a result (it may have used too much memory)";

/** Pyodide did not start in this browser session: the tool is not offered again until reload. */
let failed = false;
export class CodeUnavailableError extends Error {}

/** The switch is on, the supplier is the tested one, and Pyodide has not failed in this session. */
export function codeToolOn(status: Pick<AppStatus, "code" | "inference"> | undefined): boolean {
  return (
    !!status?.code &&
    status.inference.qualification?.provider === "privatemode" &&
    !failed &&
    typeof Worker !== "undefined" &&
    typeof WebAssembly !== "undefined"
  );
}

/** How long the first download and start may take before the tool counts as unavailable. */
const LOAD_LIMIT_MS = 60_000;
type WorkerLike = Pick<Worker, "postMessage" | "terminate"> & {
  onmessage: ((event: MessageEvent) => void) | null;
  onerror: ((event: ErrorEvent) => void) | null;
};

/**
 * Runs one piece of code in a new worker and ends the worker afterwards, whatever happened: a
 * fresh interpreter per call, as in the tested harness. Rejects with CodeUnavailableError when
 * Pyodide cannot start, and with the signal's reason when the user stops the answer.
 */
export function runPython(
  code: string,
  signal: AbortSignal,
  spawn: () => WorkerLike = () =>
    new Worker(new URL("./python.worker.ts", import.meta.url), { type: "module" }),
  limits = { loadMs: LOAD_LIMIT_MS, runMs: RUN_LIMIT_MS },
): Promise<CodeResult> {
  return new Promise((resolve, reject) => {
    let worker: WorkerLike;
    try {
      signal.throwIfAborted();
      worker = spawn();
    } catch (error) {
      if (!signal.aborted) failed = true;
      return reject(signal.aborted ? error : new CodeUnavailableError());
    }
    let started = false;
    const unavailable = () => {
      failed = true;
      finish(() => reject(new CodeUnavailableError()));
    };
    let timer = setTimeout(unavailable, limits.loadMs);
    const abort = () => finish(() => reject(signal.reason));
    const finish = (settle: () => void) => {
      clearTimeout(timer);
      signal.removeEventListener("abort", abort);
      worker.onmessage = worker.onerror = null;
      worker.terminate();
      settle();
    };
    signal.addEventListener("abort", abort, { once: true });
    worker.onerror = () =>
      started ? finish(() => resolve({ output: CRASH_OUTPUT, error: true })) : unavailable();
    // The worker ran model-written code: its messages are data, checked field by field.
    worker.onmessage = ({ data }) => {
      if (data?.unavailable === true && !started) unavailable();
      else if (data?.ready === true && !started) {
        started = true;
        clearTimeout(timer);
        timer = setTimeout(
          () => finish(() => resolve({ output: TIMEOUT_OUTPUT, error: true })),
          limits.runMs,
        );
      } else if (started && typeof data?.result?.output === "string")
        finish(() =>
          resolve({
            output: data.result.output.slice(0, OUTPUT_LIMIT + 100),
            ...(data.result.error === true ? { error: true as const } : {}),
          }),
        );
    };
    worker.postMessage({ code });
  });
}

/** A message as the chat API takes it once tools are in play. */
export type WireMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  tool_calls?: { id: string; type: "function"; function: { name: "python"; arguments: string } }[];
  tool_call_id?: string;
};
export const wireSize = (messages: WireMessage[]) =>
  messages.reduce((n, m) => n + m.content.length + (m.tool_calls ? JSON.stringify(m.tool_calls).length : 0), 0) +
  JSON.stringify(CODE_REQUEST_OPTIONS).length;

/**
 * The outgoing messages with the tool instruction, and with the code and output of earlier
 * answers put back as the tool-call and tool-result messages the model saw then (the form the
 * test used across turns). `messages` is composeContext's list after masking: its last entries
 * are the conversation's included messages, in order. `mask` covers the replayed code and output.
 * When the replay does not fit, earlier answers go as plain text only; when even the tool does
 * not fit, the caller gets an error before anything is sent.
 */
export function withCodeTool(
  messages: { role: "system" | "user" | "assistant"; content: string }[],
  conversation: Conversation,
  mask: (text: string) => string,
  maxCharacters: number,
  tooLarge: string,
): WireMessage[] {
  const plain: WireMessage[] = messages.map((m, index) =>
    index === 0
      ? { ...m, content: m.content.replace(" You have no external tools.", "") + CODE_INSTRUCTION }
      : { ...m },
  );
  const included = conversation.messages.filter((m) => m.included && m.status === "complete");
  const offset = plain.length - included.length;
  const replayed: WireMessage[] = plain.slice(0, offset);
  included.forEach((original, index) => {
    const runs = original.role === "assistant" ? (original.codeRuns ?? []) : [];
    if (runs.length) {
      const calls = runs.map((run, n) => ({
        id: `call_${index}_${n}`,
        type: "function" as const,
        function: { name: "python" as const, arguments: JSON.stringify({ code: mask(run.code) }) },
      }));
      replayed.push({ role: "assistant", content: "", tool_calls: calls });
      runs.forEach((run, n) =>
        replayed.push({ role: "tool", tool_call_id: calls[n].id, content: mask(run.output) }),
      );
    }
    replayed.push(plain[offset + index]);
  });
  if (wireSize(replayed) <= maxCharacters) return replayed;
  if (wireSize(plain) <= maxCharacters) return plain;
  throw new Error(tooLarge);
}
