// One worker runs one piece of model-written Python and is then thrown away (src/code-tool.ts).
// Pyodide comes from our own origin at run time, so it is in no bundle and loads only when code
// first runs. Rules and limits: src/python-sandbox.ts.
import { hardenScope, runCode, PYODIDE_PATH, type PythonRuntime } from "./python-sandbox";

const scope = self as unknown as {
  onmessage: ((event: MessageEvent<{ code: string }>) => void) | null;
  postMessage(message: unknown): void;
};

const ready: Promise<PythonRuntime | undefined> = (async () => {
  try {
    const { loadPyodide } = await import(/* @vite-ignore */ `${PYODIDE_PATH}pyodide.mjs`);
    const python: PythonRuntime = await loadPyodide({ indexURL: PYODIDE_PATH });
    // Fail closed: no code runs while a network or storage function is still reachable.
    return hardenScope(self).length ? undefined : python;
  } catch {
    return undefined;
  }
})();

scope.onmessage = async ({ data }) => {
  const python = await ready;
  if (!python) return scope.postMessage({ unavailable: true });
  scope.postMessage({ ready: true });
  scope.postMessage({ result: runCode(python, String(data.code)) });
};
