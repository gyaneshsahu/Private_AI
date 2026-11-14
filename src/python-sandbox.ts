// The sandbox rules for model-written Python (docs/code-execution-20261114.md). No DOM and no
// Pyodide import here: the worker (src/python.worker.ts) and the Node tests share this file.
// The real wall is the Web Worker with its network and storage functions removed, behind the
// page's content security policy. The Python-level block below is a second layer, not a wall.

/** Exact version in package.json; scripts/assets.mjs copies it into a folder of this name (test). */
export const PYODIDE_VERSION = "314.0.8";
/** Our own origin only. Never a CDN. */
export const PYODIDE_PATH = `/vendor/pyodide/${PYODIDE_VERSION}/`;
export const CODE_LIMIT = 4000;
export const OUTPUT_LIMIT = 4000;
export const RUN_LIMIT_MS = 10_000;

export type CodeResult = { output: string; error?: true };

/** Everything in a worker that reaches the network, other pages or browser storage. */
const BLOCKED = [
  "fetch",
  "XMLHttpRequest",
  "WebSocket",
  "WebSocketStream",
  "WebTransport",
  "EventSource",
  "importScripts",
  "Worker",
  "SharedWorker",
  "BroadcastChannel",
  "indexedDB",
  "caches",
  "RTCPeerConnection",
  "RTCDataChannel",
  "Notification",
];
const BLOCKED_NAVIGATOR = ["storage", "serviceWorker", "locks", "sendBeacon", "connection"];

function remove(target: object | null | undefined, names: string[]): string[] {
  if (!target) return [];
  for (let o: object | null = target; o && o !== Object.prototype; o = Object.getPrototypeOf(o))
    for (const name of names)
      if (Object.hasOwn(o, name))
        try {
          delete (o as Record<string, unknown>)[name];
        } catch {
          /* reported below */
        }
  return names.filter((name) => name in target);
}

/**
 * Removes the network and storage functions from a worker scope, after Pyodide has loaded and
 * before any model code runs. Returns the names that could not be removed; the worker refuses
 * to run code unless the list is empty.
 */
export function hardenScope(scope: object): string[] {
  return [
    ...remove(scope, BLOCKED),
    ...remove((scope as { navigator?: object }).navigator, BLOCKED_NAVIGATOR),
  ];
}

/**
 * Python-level block: `import js`, `pyodide`, `pyodide_js` and `micropip` fail. Code that works
 * at it can undo this (Python can reach its own interpreter), so it guards against ordinary
 * use, and the removed worker functions guard against the rest.
 */
export const PYTHON_BLOCK = `
import sys as _s
_s.meta_path[:] = [f for f in _s.meta_path if type(f).__name__ != "JsFinder"]
for _n in list(_s.modules):
    if _n.split(".")[0] in ("js", "pyodide", "_pyodide", "pyodide_js", "_pyodide_core", "micropip"):
        _s.modules[_n] = None
for _n in ("js", "pyodide", "_pyodide", "pyodide_js", "_pyodide_core", "micropip", "pyodide.http", "pyodide.code", "pyodide.ffi"):
    _s.modules[_n] = None
del _s, _n
`;

/** The part of Pyodide this file uses. */
export interface PythonRuntime {
  runPython(code: string): unknown;
  setStdout(options: { batched: (line: string) => void }): void;
  setStderr(options: { batched: (line: string) => void }): void;
}

/**
 * Runs one piece of code in a fresh interpreter and returns what it printed, as the tested
 * harness did (evaluation/arithmetic-gate/harness-tools.ts): the printed text, or "ERROR:" and
 * the Python error so the model can fix its code.
 */
export function runCode(python: PythonRuntime, code: string): CodeResult {
  if (code.length > CODE_LIMIT) return { output: "ERROR: code too long", error: true };
  let printed = "";
  python.setStdout({
    batched: (line) => {
      if (printed.length <= OUTPUT_LIMIT) printed += line + "\n";
    },
  });
  python.setStderr({ batched: () => {} });
  try {
    python.runPython(PYTHON_BLOCK);
    python.runPython(code);
    python.runPython("import sys\nsys.stdout.flush()");
  } catch (error) {
    // Pyodide's message is the Python traceback; its own frames come first and say nothing.
    const trace = String((error as Error)?.message ?? error);
    const own = trace.indexOf('  File "<exec>"');
    return {
      output: `ERROR:\n${own >= 0 ? trace.slice(own) : trace}`.trim().slice(0, OUTPUT_LIMIT),
      error: true,
    };
  }
  const output = printed.trimEnd();
  if (!output) return { output: "(nothing was printed)" };
  return {
    output:
      output.length > OUTPUT_LIMIT
        ? `${output.slice(0, OUTPUT_LIMIT)}\n(output cut at ${OUTPUT_LIMIT} characters)`
        : output,
  };
}
