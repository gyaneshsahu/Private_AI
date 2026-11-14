# Pyodide (Python in the browser): licence and source (14 November 2026)

Pyodide runs the Python code of the code-execution feature on the user's device (`docs/code-execution-20261114.md`). It is served from our own domain, it is loaded only when code first runs, and its licence is recorded here.

## What is shipped

| Package (npm) | Version | Licence in `package.json` |
| --- | --- | --- |
| `pyodide` | 314.0.8 (the registry's `latest` on 14 November 2026) | MPL-2.0 |

Pinned to the exact version in `package.json` and by integrity hash in `package-lock.json` (`sha512-74Wq1kXOC+CCEzAfxuRAO701nAcCMLjf8NrwvWpu8S41dVMXwXmLQ05dYB+F4e46AdnGo0oq7YHSVUpHsoarLQ==`). The lock file gained two entries: `pyodide` and its type-only dependency `@types/emscripten` 1.41.6 (MIT). Its other dependency, `ws`, was already installed and is used only under Node.

`scripts/assets.mjs` copies five unchanged files into `public/vendor/pyodide/314.0.8/` during `npm run assets` and `npm run build`:

| File | Size in bytes | SHA-256 |
| --- | ---: | --- |
| `pyodide.asm.wasm` | 9,597,892 | `e14d49ceca9b4a0e274ea918f3a898de2d3880b6e5573a6cfe1a2267ecc70329` |
| `python_stdlib.zip` | 2,545,550 | `2bd3394a145bfbbe5bbc9d9d6ab9136abbb986c6fef6c142b3a2962227aa5c28` |
| `pyodide.asm.mjs` | 1,250,259 | `22514b8be6980e28a02c8b1d6387ce8dfe666fc4edf8d547cff5dce29ff4d972` |
| `pyodide-lock.json` | 119,077 | `5dc2fc119108bc148c7457dc86e7675b5c87e1cafd420b9c34c1eaef7b36c010` |
| `pyodide.mjs` | 17,758 | `1bb8cc14f9405aaa7cd4e00c12edd0a8539de9cc026618d6ee5a9663f367dc70` |

13,530,536 bytes together (6,390,645 with gzip, 5,461,479 with brotli). Not shipped: the optional packages (numpy, pandas and the rest), `micropip`, the console pages, the source maps and the Node build `pyodide.js`.

Nothing is fetched from a CDN at build time or at run time. `pyodide.mjs` contains a jsDelivr address as its default place for optional packages; the worker sets our own path instead, and the content security policy would block the other host.

## Licences

- **Pyodide** is under the Mozilla Public License 2.0 (its `package.json`; the npm package contains no licence file). MPL-2.0 lets us serve the unchanged files. It asks that recipients are told the files are under MPL-2.0 and where the source is. `scripts/assets.mjs` writes `NOTICE.txt` into the same folder with the licence name, the licence address and the source repository (`https://github.com/pyodide/pyodide`, tag `314.0.8`). We change no file, so we have no changed source of our own to publish.
- **CPython and its standard library** (inside `pyodide.asm.wasm` and `python_stdlib.zip`) are under the Python Software Foundation License, which allows redistribution.
- **Other components** compiled into the runtime (Emscripten's libraries, libffi, zlib and others) carry permissive licences according to the Pyodide repository. They were not read one by one.

Checked on 14 November 2026 by reading the installed package and the registry entry. Not checked: the licence file and third-party notices in the source repository at the tag, and no lawyer has read this. If the app gets a licences page, Pyodide and Python belong on it.

## How it is loaded

- Only `src/python.worker.ts` loads it, from the path in `src/python-sandbox.ts`. The page and the main bundle do not name it. `tests/code-tool.test.ts` checks this, the version pin, the copied files and the notice.
- The folder name is the version, so a new version gets a new path and browsers may keep the files (`docs/code-execution-20261114.md`, "Loading, size and timing").
- Upgrading: change the version in `package.json` and `PYODIDE_VERSION` in `src/python-sandbox.ts` together (the test fails otherwise), run the code tests, and update this file.
