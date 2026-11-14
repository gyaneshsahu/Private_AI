// Code execution on the device (docs/code-execution-20261114.md): the sandbox rules with the real
// Pyodide running under Node, the worker runner with a fake worker, and where the files come from.
// Nothing here reaches a provider. Real browsers were checked once by hand (see the doc).
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { loadPyodide } from "pyodide";
import { beforeAll, expect, it, vi } from "vitest";
import { IMMUTABLE_PATH } from "../server/render-bridge";
import { neverChanges } from "../server/production-runtime";
import {
  CODE_INSTRUCTION,
  CRASH_OUTPUT,
  CodeUnavailableError,
  PYTHON_TOOL,
  TIMEOUT_OUTPUT,
  codeToolOn,
  runPython,
} from "../src/code-tool";
import {
  CODE_LIMIT,
  OUTPUT_LIMIT,
  PYODIDE_PATH,
  PYODIDE_VERSION,
  RUN_LIMIT_MS,
  hardenScope,
  runCode,
  type PythonRuntime,
} from "../src/python-sandbox";

let python: PythonRuntime;
beforeAll(async () => {
  python = await loadPyodide();
}, 60_000);

it("gives exact Decimal, date and fraction results from the standard library", () => {
  expect(runCode(python, 'from decimal import Decimal\nprint(Decimal("6420")*Decimal("0.19"))')).toEqual({ output: "1219.80" });
  // The style the instruction asks for: strings into Decimal, half-up to 2 decimals, a label per result.
  expect(
    runCode(
      python,
      [
        "from decimal import Decimal, ROUND_HALF_UP",
        'net = Decimal("1234.565")',
        'gross = (net * Decimal("1.19")).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)',
        'print("gross EUR:", gross)',
        'print("float would give:", 0.1 + 0.2, "Decimal gives:", Decimal("0.1") + Decimal("0.2"))',
      ].join("\n"),
    ).output,
  ).toBe("gross EUR: 1469.13\nfloat would give: 0.30000000000000004 Decimal gives: 0.3");
  expect(
    runCode(
      python,
      "import datetime, fractions, statistics, math\nprint(datetime.date(2026, 11, 14) + datetime.timedelta(days=45))\nprint(fractions.Fraction(1, 3) + fractions.Fraction(1, 6), statistics.mean([1, 2, 3, 4]), math.comb(49, 6))",
    ).output,
  ).toBe("2026-12-29\n1/2 2.5 13983816");
});

it("returns a Python error as text the model can act on, without Pyodide's own frames", () => {
  const failed = runCode(python, "x = 1\nprint(x / 0)");
  expect(failed.error).toBe(true);
  expect(failed.output).toMatch(/^ERROR:\n {2}File "<exec>", line 2/);
  expect(failed.output).toContain("ZeroDivisionError: division by zero");
  expect(failed.output).not.toContain("_pyodide");
  expect(runCode(python, "print(").output).toMatch(/^ERROR:\n[\s\S]*SyntaxError/);
  expect(runCode(python, "x = 1")).toEqual({ output: "(nothing was printed)" });
  // One call cannot break the next (the app goes further and uses a new interpreter per call).
  expect(runCode(python, 'print("still fine")')).toEqual({ output: "still fine" });
});

it("blocks the browser bridge and package installation from Python", () => {
  for (const name of ["js", "pyodide", "pyodide.http", "pyodide.code", "pyodide_js", "micropip", "_pyodide"]) {
    const blocked = runCode(python, `import ${name}\nprint("reached")`);
    expect(blocked.error, name).toBe(true);
    expect(blocked.output, name).toMatch(/ImportError|ModuleNotFoundError/);
  }
  expect(runCode(python, "from js import fetch").output).toMatch(/ImportError|ModuleNotFoundError/);
  // The network modules of the standard library find nothing to talk through.
  expect(runCode(python, 'import urllib.request\nurllib.request.urlopen("https://example.com")').error).toBe(true);
});

it("bounds the code and the output", () => {
  expect(runCode(python, "#".repeat(CODE_LIMIT + 1))).toEqual({ output: "ERROR: code too long", error: true });
  const long = runCode(python, 'for i in range(100000):\n    print("x" * 50)');
  expect(long.output.length).toBeLessThan(OUTPUT_LIMIT + 60);
  expect(long.output).toMatch(new RegExp(`\\(output cut at ${OUTPUT_LIMIT} characters\\)$`));
  expect([CODE_LIMIT, OUTPUT_LIMIT, RUN_LIMIT_MS]).toEqual([4000, 4000, 10_000]);
});

it("removes every network and storage function from a worker scope, also from its prototypes, and reports what it could not remove", () => {
  class Base {
    fetch() {}
    importScripts() {}
  }
  class Scope extends Base {
    WebSocket = class {};
    XMLHttpRequest = class {};
    Worker = class {};
    indexedDB = {};
    caches = {};
    EventSource = class {};
    navigator = Object.create({ storage: {}, userAgent: "test" });
    postMessage() {}
    WebAssembly = {};
  }
  const scope = new Scope() as unknown as Record<string, unknown>;
  expect(hardenScope(scope)).toEqual([]);
  for (const name of ["fetch", "importScripts", "WebSocket", "XMLHttpRequest", "Worker", "indexedDB", "caches", "EventSource"])
    expect(name in scope, name).toBe(false);
  expect("storage" in (scope.navigator as object)).toBe(false);
  // What Pyodide and the reply need stays.
  expect(typeof scope.postMessage).toBe("function");
  expect(scope.WebAssembly).toBeDefined();
  // A function that cannot be removed is reported, and the worker then refuses to run code.
  const stubborn = Object.defineProperty({}, "fetch", { value: () => {}, configurable: false });
  expect(hardenScope(stubborn)).toEqual(["fetch"]);
  const worker = readFileSync("src/python.worker.ts", "utf8");
  expect(worker).toContain("hardenScope(self).length ? undefined : python");
  expect(worker.indexOf("hardenScope(self)")).toBeLessThan(worker.indexOf("runCode(python"));
});

/** A stand-in for the worker: the test decides what it posts and when. */
function fakeWorker() {
  const worker = {
    onmessage: null as ((event: MessageEvent) => void) | null,
    onerror: null as ((event: ErrorEvent) => void) | null,
    posted: [] as unknown[],
    terminated: 0,
    postMessage(message: unknown) {
      this.posted.push(message);
    },
    terminate() {
      this.terminated++;
    },
    say(data: unknown) {
      this.onmessage?.({ data } as MessageEvent);
    },
  };
  return worker;
}
const limits = { loadMs: 50, runMs: 30 };

it("runs one call in one worker and ends the worker, whatever happens", async () => {
  const worker = fakeWorker();
  const result = runPython("print(1)", new AbortController().signal, () => worker, limits);
  expect(worker.posted).toEqual([{ code: "print(1)" }]);
  worker.say({ ready: true });
  worker.say({ result: { output: "1" } });
  expect(await result).toEqual({ output: "1" });
  expect(worker.terminated).toBe(1);
  // A result before "ready", or of the wrong shape, is ignored: the worker ran model-written code.
  const odd = fakeWorker();
  const pending = runPython("x", new AbortController().signal, () => odd, limits);
  odd.say({ result: { output: "too early" } });
  odd.say({ ready: true });
  odd.say({ result: { output: 7 } });
  odd.say({ result: { output: "y".repeat(10_000), error: true } });
  const cut = await pending;
  expect(cut.error).toBe(true);
  expect(cut.output.length).toBe(OUTPUT_LIMIT + 100);
});

it("stops code that runs too long, reports a crash, and obeys the stop button", async () => {
  const slow = fakeWorker();
  const timedOut = runPython("while True: pass", new AbortController().signal, () => slow, limits);
  slow.say({ ready: true });
  expect(await timedOut).toEqual({ output: TIMEOUT_OUTPUT, error: true });
  expect(TIMEOUT_OUTPUT).toContain("10 seconds");
  expect(slow.terminated).toBe(1);

  const crashed = fakeWorker();
  const crash = runPython("x = [0] * 10**12", new AbortController().signal, () => crashed, limits);
  crashed.say({ ready: true });
  crashed.onerror?.({} as ErrorEvent);
  expect(await crash).toEqual({ output: CRASH_OUTPUT, error: true });
  expect(crashed.terminated).toBe(1);

  const stopped = fakeWorker();
  const controller = new AbortController();
  const run = runPython("print(1)", controller.signal, () => stopped, limits);
  controller.abort(new DOMException("stop", "AbortError"));
  await expect(run).rejects.toMatchObject({ name: "AbortError" });
  expect(stopped.terminated).toBe(1);
});

it("when Pyodide cannot start the run is refused and the tool is not offered again in this session", async () => {
  vi.stubGlobal("Worker", class {});
  const status = { code: true as const, inference: { ready: true, reason: "", qualification: { provider: "privatemode" } as never } };
  try {
    expect(codeToolOn(status)).toBe(true);
    // Off without the switch, and for a supplier the tool was not tested with.
    expect(codeToolOn({ ...status, code: undefined })).toBe(false);
    expect(codeToolOn({ ...status, inference: { ...status.inference, qualification: { provider: "tinfoil" } as never } })).toBe(false);
    expect(codeToolOn(undefined)).toBe(false);
    const worker = fakeWorker();
    const run = runPython("print(1)", new AbortController().signal, () => worker, limits);
    worker.say({ unavailable: true });
    await expect(run).rejects.toBeInstanceOf(CodeUnavailableError);
    expect(worker.terminated).toBe(1);
    expect(codeToolOn(status)).toBe(false);
    // The same when nothing arrives in time (a blocked download), or the worker cannot be made.
    const silent = fakeWorker();
    await expect(runPython("print(1)", new AbortController().signal, () => silent, limits)).rejects.toBeInstanceOf(CodeUnavailableError);
    await expect(
      runPython("print(1)", new AbortController().signal, () => {
        throw new Error("no workers here");
      }),
    ).rejects.toBeInstanceOf(CodeUnavailableError);
  } finally {
    vi.unstubAllGlobals();
  }
});

it("keeps the instruction and the tool the arithmetic test used", () => {
  const harness = readFileSync("evaluation/arithmetic-gate/harness-tools.ts", "utf8");
  // The three tested sentences about how to calculate are in the app's instruction word for word.
  for (const sentence of [
    "Never calculate in your head. For every figure you state, call the python tool first and take the figure from its output.",
    "In the code: use decimal.Decimal built from strings for money and percentages, round money to 2 decimals with ROUND_HALF_UP unless the question says otherwise, use datetime for dates and times, and print every result with a label.",
    "Then answer briefly and state every figure the question asks for, each with its label and unit.",
  ]) {
    expect(harness).toContain(sentence);
    expect(CODE_INSTRUCTION.replace("never calculate", "Never calculate")).toContain(sentence);
  }
  expect(harness).toContain(`description: "${PYTHON_TOOL.function.description}"`);
  expect(PYTHON_TOOL.function.parameters).toEqual({
    type: "object",
    properties: { code: { type: "string", description: "The Python code to run" } },
    required: ["code"],
    additionalProperties: false,
  });
  expect(CODE_INSTRUCTION.length).toBeLessThan(800);
});

it("serves the pinned Pyodide from our own origin: runtime files only, in a folder named by the version, never a CDN", () => {
  const installed = JSON.parse(readFileSync("node_modules/pyodide/package.json", "utf8"));
  expect(installed.version).toBe(PYODIDE_VERSION);
  expect(installed.license).toBe("MPL-2.0");
  expect(JSON.parse(readFileSync("package.json", "utf8")).dependencies.pyodide).toBe(PYODIDE_VERSION);
  expect(PYODIDE_PATH).toBe(`/vendor/pyodide/${PYODIDE_VERSION}/`);
  execFileSync(process.execPath, ["scripts/assets.mjs"]);
  const folder = `public/vendor/pyodide/${PYODIDE_VERSION}`;
  expect(readdirSync(folder).sort()).toEqual(
    ["NOTICE.txt", "pyodide-lock.json", "pyodide.asm.mjs", "pyodide.asm.wasm", "pyodide.mjs", "python_stdlib.zip"].sort(),
  );
  for (const file of ["pyodide.asm.wasm", "python_stdlib.zip", "pyodide.mjs"])
    expect(readFileSync(`${folder}/${file}`).equals(readFileSync(`node_modules/pyodide/${file}`)), file).toBe(true);
  expect(readFileSync(`${folder}/NOTICE.txt`, "utf8")).toContain("Mozilla Public License 2.0");
  // Only the worker loads it, by our own path; the page and the other sources never name it.
  const worker = readFileSync("src/python.worker.ts", "utf8");
  expect(worker).toContain("loadPyodide({ indexURL: PYODIDE_PATH, packageBaseUrl: PYODIDE_PATH })");
  for (const file of ["python.worker.ts", "python-sandbox.ts", "code-tool.ts"])
    expect(/https?:\/\/|jsdelivr|unpkg|cdnjs/i.test(readFileSync(`src/${file}`, "utf8")), file).toBe(false);
  expect(readFileSync("index.html", "utf8")).not.toMatch(/pyodide/i);
  const naming = (readdirSync("src", { recursive: true }) as string[]).filter(
    (file) => /\.tsx?$/.test(file) && /from "pyodide"|vendor\/pyodide/.test(readFileSync(`src/${file}`, "utf8")),
  );
  expect(naming).toEqual(["python-sandbox.ts"]);
});

it("lets browsers keep the version-named Pyodide files, and nothing else new", () => {
  const file = `vendor/pyodide/${PYODIDE_VERSION}/pyodide.asm.wasm`;
  expect(neverChanges(`/srv/dist/${file}`)).toBe(true);
  expect(neverChanges(`C:\\srv\\dist\\${file.replaceAll("/", "\\")}`)).toBe(true);
  expect(IMMUTABLE_PATH.test(`/${file}`)).toBe(true);
  for (const name of ["pyodide.mjs", "pyodide.asm.mjs", "python_stdlib.zip", "pyodide-lock.json"])
    expect(IMMUTABLE_PATH.test(`/vendor/pyodide/${PYODIDE_VERSION}/${name}`), name).toBe(true);
  // No version in the path, another vendor folder, a nested path or a query: still no-store.
  for (const path of [
    "/vendor/pyodide/pyodide.asm.wasm",
    "/vendor/pyodide/latest/pyodide.asm.wasm",
    "/vendor/ocr/worker.min.js",
    `/vendor/pyodide/${PYODIDE_VERSION}/sub/pyodide.mjs`,
    `/vendor/pyodide/${PYODIDE_VERSION}/pyodide.mjs?x=1`,
    `/vendor/pyodide/${PYODIDE_VERSION}/index.html`,
    "/index.html",
  ]) {
    expect(IMMUTABLE_PATH.test(path), path).toBe(false);
    expect(neverChanges(`/srv/dist${path}`), path).toBe(false);
  }
});
