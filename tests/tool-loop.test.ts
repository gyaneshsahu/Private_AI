// Code execution, browser side (docs/code-execution-20261114.md): streamed tool calls are put
// together from fragments, each call runs on the device, and the loop continues until the model
// answers in text. Chunks are written in the shape OpenAI-compatible servers stream them; none
// was recorded from Privatemode, so this is not live provider evidence. The transport is a mock.
import { afterEach, expect, it, vi } from "vitest";
import type { ChatCompletionChunk } from "openai/resources/chat/completions";
import { emptyConversation, type Conversation } from "../shared/contracts";
import { BAD_CALL_OUTPUT, CODE_INSTRUCTION, PYTHON_TOOL, UNAVAILABLE_OUTPUT, withCodeTool, type CodeRun, type WireMessage } from "../src/code-tool";
import { composeContext, newMessage } from "../src/conversation";
import { IncompleteReplyError } from "../src/reply-stream";
import { MAX_TOOL_ROUNDS, consumeToolTurn, runToolLoop } from "../src/tool-loop";
import { streamVerifiedConversation, type VerifiedChatPolicy } from "../src/verified-chat";

const { request } = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock("tinfoil", () => ({
  fetchAttestationBundle: async () => ({ domain: "inference.tinfoil.sh" }),
  Verifier: class {
    async verifyBundle() {}
    getVerificationDocument() {
      return {
        securityVerified: true,
        releaseDigest: "a".repeat(64),
        configRepo: "tinfoilsh/confidential-model-router",
        hpkePublicKey: "synthetic",
        enclaveHost: "inference.tinfoil.sh",
      };
    }
  },
}));
vi.mock("ehbp", () => ({
  Identity: { fromPublicKeyHex: async () => ({}) },
  Transport: class {
    request = request;
  },
}));
afterEach(() => {
  vi.unstubAllGlobals();
  request.mockReset();
});

const pricing = { inputPerMillion: 1, outputPerMillion: 2, currency: "USD" as const };
type Delta = ChatCompletionChunk.Choice.Delta;
const chunk = (delta: Delta, finish: ChatCompletionChunk.Choice["finish_reason"] = null): ChatCompletionChunk => ({
  id: "fixture",
  object: "chat.completion.chunk",
  created: 0,
  model: "fixture-only",
  choices: [{ index: 0, delta, finish_reason: finish }],
});
const usage = (input = 10, output = 5): ChatCompletionChunk => ({
  ...chunk({}),
  choices: [],
  usage: { prompt_tokens: input, completion_tokens: output, total_tokens: input + output },
});
/** One tool-call fragment at `index`, as a streamed delta. */
const call = (index: number, part: { id?: string; name?: string; args?: string }) =>
  chunk({
    tool_calls: [
      {
        index,
        ...(part.id ? { id: part.id, type: "function" as const } : {}),
        function: { ...(part.name ? { name: part.name } : {}), ...(part.args !== undefined ? { arguments: part.args } : {}) },
      },
    ],
  });
/** A whole reply that calls python once with `code`, its arguments cut into `pieces` fragments. */
function toolReply(code: string, id = "call_a", pieces = 3): ChatCompletionChunk[] {
  const args = JSON.stringify({ code });
  const size = Math.ceil(args.length / pieces);
  return [
    chunk({ role: "assistant", content: "" }),
    call(0, { id, name: "python", args: "" }),
    ...Array.from({ length: pieces }, (_, i) => call(0, { args: args.slice(i * size, (i + 1) * size) })),
    chunk({}, "tool_calls"),
    usage(),
  ];
}
const textReply = (text: string): ChatCompletionChunk[] => [chunk({ role: "assistant", content: text.slice(0, 5) }), chunk({ content: text.slice(5) }, "stop"), usage(20, 8)];
async function* events(items: ChatCompletionChunk[]) {
  yield* items;
}
const signal = () => new AbortController().signal;
const turn = (items: ChatCompletionChunk[], onChunk: (text: string) => void = () => {}) =>
  consumeToolTurn(events(items), pricing, signal(), onChunk);

it("puts a single call together from fragments, however the arguments are cut", async () => {
  const code = 'from decimal import Decimal\nprint("VAT:", Decimal("6420") * Decimal("0.19"))';
  for (const pieces of [1, 2, 7, 40]) {
    const shown: string[] = [];
    const result = await turn(toolReply(code, "call_x", pieces), (text) => shown.push(text));
    expect(result.calls).toEqual([{ id: "call_x", name: "python", arguments: JSON.stringify({ code }) }]);
    expect(JSON.parse(result.calls[0].arguments).code).toBe(code);
    // The marker that closes the stream for the reader never reaches the user.
    expect(shown.join("")).toBe("");
    expect(result.usage).toMatchObject({ input: 10, output: 5, total: 15 });
  }
});

it("keeps two calls apart by their index, also when their fragments interleave or arrive whole", async () => {
  const interleaved = await turn([
    call(0, { id: "call_a", name: "python", args: '{"code":"pri' }),
    call(1, { id: "call_b", name: "python", args: '{"code":"pr' }),
    call(0, { args: 'nt(1)"}' }),
    call(1, { args: 'int(2)"}' }),
    chunk({}, "tool_calls"),
    usage(),
  ]);
  expect(interleaved.calls).toEqual([
    { id: "call_a", name: "python", arguments: '{"code":"print(1)"}' },
    { id: "call_b", name: "python", arguments: '{"code":"print(2)"}' },
  ]);
  // Both calls in one chunk, no index, no id, and a server that ends such a reply with "stop".
  const whole = await turn([
    chunk({
      tool_calls: [
        { function: { name: "python", arguments: '{"code":"print(1)"}' } },
        { function: { name: "python", arguments: '{"code":"print(2)"}' } },
      ] as never,
    }),
    chunk({}, "stop"),
    usage(),
  ]);
  expect(whole.calls.map((c) => [c.id, c.arguments])).toEqual([
    ["call_0", '{"code":"print(1)"}'],
    ["call_1", '{"code":"print(2)"}'],
  ]);
});

it("streams a plain answer as before and returns no calls; text before a call is passed on and reported", async () => {
  const shown: string[] = [];
  const plain = await turn(textReply("Hello there."), (text) => shown.push(text));
  expect(plain.calls).toEqual([]);
  expect(shown.join("")).toBe("Hello there.");
  const preamble: string[] = [];
  const mixed = await turn([chunk({ content: "Let me calculate. " }), ...toolReply("print(1)")], (text) => preamble.push(text));
  expect(preamble.join("")).toBe("Let me calculate. ");
  expect(mixed.text).toBe("Let me calculate. ");
  expect(mixed.calls).toHaveLength(1);
});

it("refuses broken streams as incomplete replies: too many calls, a reply cut off inside a call, oversized arguments", async () => {
  await expect(turn([call(4, { id: "x", name: "python", args: "{}" }), chunk({}, "tool_calls"), usage()])).rejects.toMatchObject({
    diagnostic: { code: "INVALID_CHOICE" },
  });
  await expect(turn([call(0, { id: "x", name: "python", args: '{"code":"pri' }), chunk({}, "length"), usage()])).rejects.toMatchObject({
    diagnostic: { code: "OUTPUT_LIMIT_REACHED" },
  });
  await expect(turn([call(0, { id: "x", name: "python", args: '{"code":"pri' })])).rejects.toBeInstanceOf(IncompleteReplyError);
  await expect(
    turn([call(0, { id: "x", name: "python", args: "x".repeat(33_000) }), chunk({}, "tool_calls"), usage()]),
  ).rejects.toMatchObject({ diagnostic: { code: "FRAME_TOO_LARGE" } });
});

/** Runs the loop over scripted replies; `run` stands in for the worker. */
async function loop(
  replies: ChatCompletionChunk[][],
  run: (code: string) => Promise<{ output: string; error?: true }>,
  extra: Partial<Parameters<typeof runToolLoop>[0]> = {},
) {
  const sent: WireMessage[][] = [];
  const shown: string[] = [];
  const statuses: string[] = [];
  const reported: { runs: CodeRun[]; unavailable: boolean }[] = [];
  const result = runToolLoop({
    first: events(replies[0]),
    messages: [{ role: "user", content: "question" }],
    next: async (messages) => {
      sent.push(structuredClone(messages));
      return events(replies[sent.length]);
    },
    run,
    pricing,
    signal: signal(),
    maxCharacters: 50_000,
    onChunk: (text) => shown.push(text),
    onStatus: (text) => statuses.push(text),
    onRuns: (runs, unavailable) => reported.push({ runs, unavailable }),
    ...extra,
  });
  return { result, sent, shown, statuses, reported };
}

it("runs the code, sends call and result back in the form the model expects, and adds up the usage of every round", async () => {
  const run = vi.fn(async (_code: string) => ({ output: "VAT: 1219.80" }));
  const { result, sent, shown, statuses, reported } = await loop([toolReply("print(1)", "call_a"), textReply("The VAT is 1,219.80 EUR.")], run);
  const total = await result;
  expect(total).toMatchObject({ input: 30, output: 13, total: 43 });
  expect(total!.estimatedUSD).toBeCloseTo((30 * 1 + 13 * 2) / 1e6, 12);
  expect(run).toHaveBeenCalledTimes(1);
  expect(run.mock.calls[0][0]).toBe("print(1)");
  expect(sent).toHaveLength(1);
  expect(sent[0]).toEqual([
    { role: "user", content: "question" },
    { role: "assistant", content: "", tool_calls: [{ id: "call_a", type: "function", function: { name: "python", arguments: '{"code":"print(1)"}' } }] },
    { role: "tool", tool_call_id: "call_a", content: "VAT: 1219.80" },
  ]);
  expect(shown.join("")).toBe("The VAT is 1,219.80 EUR.");
  expect(statuses).toEqual(["Calculating on your device…"]);
  expect(reported).toEqual([{ runs: [{ code: "print(1)", output: "VAT: 1219.80" }], unavailable: false }]);
});

it("gives the model its code's error so it can fix the code within the rounds, and shows both runs", async () => {
  const run = vi.fn()
    .mockResolvedValueOnce({ output: 'ERROR:\n  File "<exec>", line 1\nNameError: name \'Decimal\' is not defined', error: true })
    .mockResolvedValueOnce({ output: "total: 12.50" });
  const { result, sent, reported } = await loop([toolReply("print(Decimal(1))", "c1"), toolReply("from decimal import Decimal\nprint(1)", "c2"), textReply("The total is 12.50.")], run);
  await result;
  expect(sent[0].at(-1)!.content).toContain("NameError");
  expect(sent[1].filter((m) => m.role === "tool").map((m) => m.tool_call_id)).toEqual(["c1", "c2"]);
  expect(reported.at(-1)!.runs).toEqual([
    { code: "print(Decimal(1))", output: expect.stringContaining("NameError"), error: true },
    { code: "from decimal import Decimal\nprint(1)", output: "total: 12.50" },
  ]);
});

it("a malformed call gets a tool error message, not a crash: bad JSON, another tool name, code that is not text", async () => {
  const run = vi.fn(async () => ({ output: "ok" }));
  const bad = [
    call(0, { id: "c1", name: "python", args: '{"code": "print(1)' }),
    call(1, { id: "c2", name: "calculator", args: '{"code":"print(1)"}' }),
    call(2, { id: "c3", name: "python", args: '{"code": 5}' }),
    call(3, { id: "c4", name: "python", args: '{"code":"print(4)"}' }),
    chunk({}, "tool_calls"),
    usage(),
  ];
  const { result, sent, reported } = await loop([bad, textReply("Done with it.")], run);
  await result;
  expect(sent[0].filter((m) => m.role === "tool").map((m) => m.content)).toEqual([BAD_CALL_OUTPUT, BAD_CALL_OUTPUT, BAD_CALL_OUTPUT, "ok"]);
  expect(run).toHaveBeenCalledTimes(1);
  // Only real code is shown to the user.
  expect(reported[0].runs).toEqual([{ code: "print(4)", output: "ok" }]);
});

it(`stops after ${MAX_TOOL_ROUNDS} rounds of code: a fourth call is not run and the answer fails with its usage`, async () => {
  const run = vi.fn(async () => ({ output: "1" }));
  const { result, sent } = await loop(Array.from({ length: 6 }, (_, i) => toolReply("print(1)", `c${i}`)), run);
  await expect(result).rejects.toMatchObject({
    name: "IncompleteReplyError",
    message: expect.stringContaining("more steps than allowed"),
    usage: { total: 60 },
  });
  expect(MAX_TOOL_ROUNDS).toBe(3);
  expect(run).toHaveBeenCalledTimes(3);
  // The first request plus three follow-ups; the relay counts two of them on the paid message.
  expect(sent).toHaveLength(3);
});

it("falls back when the code cannot run on this device: the model is told to answer without the tool, and the answer is marked", async () => {
  const run = vi.fn(async () => {
    throw new Error("Pyodide did not start");
  });
  const two = [call(0, { id: "c1", name: "python", args: '{"code":"print(1)"}' }), call(1, { id: "c2", name: "python", args: '{"code":"print(2)"}' }), chunk({}, "tool_calls"), usage()];
  const { result, sent, shown, reported } = await loop([two, textReply("About 1,220 EUR; not calculated with code.")], run);
  expect(await result).toMatchObject({ total: 43 });
  // Tried once; the second call of the round is answered without another start.
  expect(run).toHaveBeenCalledTimes(1);
  expect(sent[0].filter((m) => m.role === "tool").map((m) => m.content)).toEqual([UNAVAILABLE_OUTPUT, UNAVAILABLE_OUTPUT]);
  expect(reported).toEqual([{ runs: [], unavailable: true }]);
  expect(shown.join("")).toContain("not calculated with code");
});

it("stopping while code runs ends the message with the usage so far; a failed follow-up does too", async () => {
  const controller = new AbortController();
  const stopped = await loop(
    [toolReply("print(1)")],
    async () => {
      controller.abort(new DOMException("stop", "AbortError"));
      throw controller.signal.reason;
    },
    { signal: controller.signal },
  );
  await expect(stopped.result).rejects.toMatchObject({ name: "IncompleteReplyError", usage: { total: 15 } });
  expect(stopped.sent).toHaveLength(0);
  const failed = await loop([toolReply("print(1)")], async () => ({ output: "1" }), {
    next: async () => {
      throw new Error("network");
    },
  });
  await expect(failed.result).rejects.toMatchObject({ name: "IncompleteReplyError", usage: { total: 15 } });
});

it("runs code with the user's real values and sends nothing unmasked back", async () => {
  const run = vi.fn(async (code: string) => ({ output: `echo ${code}` }));
  const { result, sent, reported } = await loop([toolReply("print('{{IBAN-1}}')"), textReply("Printed it now.")], run, {
    mask: (text) => text.replaceAll("DE89370400440532013000", "{{IBAN-1}}"),
    restore: (text) => text.replaceAll("{{IBAN-1}}", "DE89370400440532013000"),
  });
  await result;
  expect(run.mock.calls[0][0]).toBe("print('DE89370400440532013000')");
  expect(reported[0].runs[0].code).toContain("DE89370400440532013000");
  expect(JSON.stringify(sent)).not.toContain("DE89370400440532013000");
  expect(sent[0].at(-1)!.content).toBe("echo print('{{IBAN-1}}')");
});

const withRuns = (): Conversation => {
  const c = emptyConversation();
  c.messages.push(newMessage("user", "What is 19 % VAT on 6,420 EUR?"));
  c.messages.push({
    ...newMessage("assistant", "The VAT is 1,219.80 EUR."),
    codeRuns: [
      { code: "print(Decimal(1))", output: "ERROR:\nNameError", error: true },
      { code: 'print("VAT:", 1219.80)', output: "VAT: 1219.8" },
    ],
  });
  c.messages.push(newMessage("user", "And on 100 EUR?"));
  return c;
};

it("replays an earlier answer's code and output as tool messages in later turns, and keeps the app's other instructions", () => {
  const c = withRuns();
  const context = composeContext(c, 100_000);
  const wire = withCodeTool(context, c, (text) => text, 100_000, "too large");
  expect(wire[0].content.startsWith(context[0].content.replace(" You have no external tools.", ""))).toBe(true);
  expect(wire[0].content.endsWith(CODE_INSTRUCTION)).toBe(true);
  expect(wire[0].content).not.toContain("You have no external tools.");
  expect(context[0].content).toContain("You have no external tools.");
  expect(wire.slice(1).map((m) => m.role)).toEqual(["user", "assistant", "tool", "tool", "assistant", "user"]);
  const [, , calls, first, second, answer] = wire;
  expect(calls).toMatchObject({ content: "", tool_calls: [{ id: "call_1_0", type: "function" }, { id: "call_1_1" }] });
  expect(JSON.parse(calls.tool_calls![1].function.arguments)).toEqual({ code: 'print("VAT:", 1219.80)' });
  expect([first.tool_call_id, second.tool_call_id]).toEqual(["call_1_0", "call_1_1"]);
  expect(second.content).toBe("VAT: 1219.8");
  expect(answer).toEqual({ role: "assistant", content: "The VAT is 1,219.80 EUR." });
  // The caller's list is not changed, and an answer left out of context is not replayed.
  expect(context.map((m) => m.role)).toEqual(["system", "user", "assistant", "user"]);
  c.messages[1].included = false;
  expect(withCodeTool(composeContext(c, 100_000), c, (text) => text, 100_000, "x").map((m) => m.role)).toEqual(["system", "user", "user"]);
});

it("counts the tool and the replay before sending: the replay is dropped first, then the request is refused", () => {
  const c = withRuns();
  const context = composeContext(c, 100_000);
  const plain = context.reduce((n, m) => n + m.content.length, 0);
  const overhead = CODE_INSTRUCTION.length - " You have no external tools.".length + JSON.stringify({ tools: [PYTHON_TOOL], tool_choice: "auto" }).length;
  // The tool and its instruction cost about 1,000 characters of the context limit.
  expect(overhead).toBeGreaterThan(700);
  expect(overhead).toBeLessThan(1200);
  const fits = withCodeTool(context, c, (text) => text, plain + overhead, "too large");
  expect(fits.map((m) => m.role)).toEqual(["system", "user", "assistant", "user"]);
  expect(() => withCodeTool(context, c, (text) => text, plain + overhead - 1, "too large")).toThrow("too large");
});

const policy: VerifiedChatPolicy = {
  origin: "https://inference.tinfoil.sh",
  repository: "tinfoilsh/confidential-model-router",
  releaseDigests: ["a".repeat(64)],
  model: "synthetic",
  maxInputCharacters: 20000,
  maxOutputTokens: 4096,
  pricing: { inputPerMillion: 1, outputPerMillion: 1, currency: "USD" },
  codeTool: true,
};
const sse = (items: ChatCompletionChunk[]) =>
  new Response(items.map((e) => "data: " + JSON.stringify(e) + "\n\n").join("") + "data: [DONE]\n\n", {
    headers: { "content-type": "text/event-stream" },
  });

it("through the app's own request path: the tool and instruction go out, the follow-up is a second request declared as a continuation", async () => {
  vi.stubGlobal("location", { host: "localhost", origin: "http://localhost" });
  request.mockResolvedValueOnce(sse(toolReply('print("VAT:", 1219.80)', "call_live"))).mockResolvedValueOnce(sse(textReply("The VAT is 1,219.80 EUR.")));
  const c = emptyConversation();
  c.messages.push(newMessage("user", "What is 19 % VAT on 6,420 EUR? My IBAN is DE89370400440532013000."));
  const shown: string[] = [];
  const runs: CodeRun[][] = [];
  const run = vi.fn(async () => ({ output: "VAT: 1219.8" }));
  const total = await streamVerifiedConversation(
    c, policy, "synthetic-csrf", new AbortController().signal,
    (text) => shown.push(text), () => {}, () => {},
    undefined, undefined, undefined, undefined, undefined, undefined, undefined,
    { run, onRuns: (all) => runs.push(all) },
  );
  expect(request).toHaveBeenCalledTimes(2);
  const [first, second] = request.mock.calls.map(([url, init]) => ({ url, headers: new Headers(init.headers), body: JSON.parse(init.body) }));
  expect(first.body.tools).toEqual([PYTHON_TOOL]);
  expect(first.body.tool_choice).toBe("auto");
  expect(first.body.stream).toBe(true);
  expect(first.body.messages[0].content).toContain(CODE_INSTRUCTION.trim());
  expect(first.headers.has("x-privateai-continuation")).toBe(false);
  expect(second.url).toBe(first.url);
  expect(second.headers.get("x-privateai-continuation")).toBe("tool");
  expect(second.headers.get("x-privateai-csrf")).toBe("synthetic-csrf");
  expect(second.body.tools).toEqual([PYTHON_TOOL]);
  expect(second.body.messages.slice(-2)).toEqual([
    { role: "assistant", content: "", tool_calls: [{ id: "call_live", type: "function", function: { name: "python", arguments: JSON.stringify({ code: 'print("VAT:", 1219.80)' }) } }] },
    { role: "tool", tool_call_id: "call_live", content: "VAT: 1219.8" },
  ]);
  // Identifier masking still covers every request of the message.
  expect(JSON.stringify([first.body, second.body])).not.toContain("DE89370400440532013000");
  expect(shown.join("")).toBe("The VAT is 1,219.80 EUR.");
  expect(runs).toEqual([[{ code: 'print("VAT:", 1219.80)', output: "VAT: 1219.8" }]]);
  expect(total).toMatchObject({ input: 30, output: 13 });
});

it("through the app's own request path: an answer without a tool call is one request, as today; the tool needs its runtime and no other contract", async () => {
  vi.stubGlobal("location", { host: "localhost", origin: "http://localhost" });
  request.mockResolvedValueOnce(sse(textReply("Berlin is the capital.")));
  const c = emptyConversation();
  c.messages.push(newMessage("user", "What is the capital of Germany?"));
  const shown: string[] = [];
  const run = vi.fn();
  const args = [c, policy, "synthetic", new AbortController().signal, (text: string) => shown.push(text), () => {}, () => {}] as const;
  await streamVerifiedConversation(...args, undefined, undefined, undefined, undefined, undefined, undefined, undefined, { run, onRuns: () => {} });
  expect(request).toHaveBeenCalledTimes(1);
  expect(run).not.toHaveBeenCalled();
  expect(shown.join("")).toBe("Berlin is the capital.");
  await expect(streamVerifiedConversation(...args)).rejects.toThrow("requires its runtime");
  await expect(
    streamVerifiedConversation(c, { ...policy, optionalCalculator: true }, "synthetic", new AbortController().signal, () => {}, () => {}, () => {}, undefined, undefined, undefined, undefined, undefined, undefined, undefined, { run, onRuns: () => {} }),
  ).rejects.toThrow("Choose one response contract");
  expect(request).toHaveBeenCalledTimes(1);
});

it("without the switch nothing changes: no tool, no instruction, and a streamed tool call is still refused", async () => {
  vi.stubGlobal("location", { host: "localhost", origin: "http://localhost" });
  request.mockResolvedValueOnce(sse(toolReply("print(1)")));
  const c = withRuns();
  await expect(
    streamVerifiedConversation(c, { ...policy, codeTool: false }, "synthetic", new AbortController().signal, () => {}, () => {}, () => {}),
  ).rejects.toMatchObject({ diagnostic: { code: "INCOMPLETE_ANSWER" } });
  const body = JSON.parse(request.mock.calls[0][1].init?.body ?? request.mock.calls[0][1].body);
  expect(body).not.toHaveProperty("tools");
  expect(body.messages[0].content).not.toContain("python tool");
  // Saved code and output of earlier answers are not replayed without the tool.
  expect(body.messages.map((m: WireMessage) => m.role)).toEqual(["system", "user", "assistant", "user"]);
});
