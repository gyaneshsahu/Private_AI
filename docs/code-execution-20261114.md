# Code execution on the device (exact calculation), 14 November 2026

Status: **built and tested offline and in headless Chromium. Switched off by default. Nothing was verified live.** No call was made to Privatemode and no key was read.

## What it does

With the switch on, a chat request carries one tool, `python`. When a question needs calculation, the model writes Python code. The code runs on the user's device, in Pyodide (CPython compiled to WebAssembly) inside a Web Worker. What the code printed goes back to the model in a follow-up request. The model then answers. The answer carries the mark "Calculated with code on this device" and a control that opens the code and its output.

The numbers of the calculation are computed on the device. The question, the code and the printed output still go to the model, encrypted, as chat content always does.

Why: `evaluation/arithmetic-gate/results-tools-20261114.md`. With code the Fast model was exact on 56 of 60 arithmetic conversations (43 of 90 without code). Every real error was a misread rounding rule in code that ran correctly. So the user must be able to read the code.

## The switch (default off)

Deployment config, like voice input:

```json
"inference": { "code": { "enabled": true } }
```

Absent or `false`: off. `GET /api/status` then has no `code` field, the browser sends no tool, and the server ignores the follow-up header (every request is charged). With it on, the status carries `code: true` while chat is ready.

On the development server: `PRIVATEAI_CODE=1`.

The browser offers the tool only when all of these hold: the status says `code`, the report's provider is Privatemode (the only one tested), the request goes to the mode's primary model (the backup models were not tested with tools), and Pyodide has not failed to start in this browser session.

## Parts

| Part | File | What it does |
| --- | --- | --- |
| Sandbox rules | `src/python-sandbox.ts` | Version and path of Pyodide, limits, removal of network and storage functions, the Python-level block, running one piece of code |
| Worker | `src/python.worker.ts` | Loads Pyodide from `/vendor/pyodide/314.0.8/`, hardens its scope, runs one piece of code, posts the result |
| Tool and runner | `src/code-tool.ts` | The tool definition and instruction, one worker per call, time limit, replay of earlier code in later turns |
| Loop | `src/tool-loop.ts` | Puts streamed tool calls together, runs them, sends follow-ups, at most 3 rounds |
| Request path | `src/verified-chat.ts` (small additions) | Adds tool and instruction, sends follow-ups with the header `X-PrivateAI-Continuation: tool` |
| Display | `src/CodeRuns.tsx`, `src/text/code.ts` | The mark, the code and output, the failure notes, English and German |
| Credit | `server/continuation-credit.ts`, `server/app.ts` (small additions) | Two follow-up requests per paid message |
| Assets | `scripts/assets.mjs` | Copies the runtime files into `public/vendor/pyodide/<version>/` |

## Streaming tool calls

Before this change the app refused any streamed reply that contained a tool call (`consumeReply` in `src/reply-stream.ts` ends with `INCOMPLETE_ANSWER`). That is unchanged when the tool is off (tested). The SSE parser (`src/completion-events.ts`) passes `delta.tool_calls` through; it only refuses named SSE events.

With the tool on, `consumeToolTurn` joins the fragments by their `index`: the id and name from the first fragment, the argument text added up. It accepts more than one call (at most 4 per reply), calls that arrive whole in one chunk, a missing index or id, and a reply that ends with `finish_reason` `tool_calls` or `stop`. A reply cut off inside a call, a fifth call, or more than 32,000 characters of arguments fails as an incomplete reply. Usage rules and failure classes stay those of `consumeReply`.

**The chunk shapes in the tests are written by hand in the OpenAI format. None was recorded from Privatemode.** Live check 1 below is the real test.

## The loop

1. The first request is the normal one plus `tools` and `tool_choice: "auto"`, and the instruction appended to the system message. The sentence "You have no external tools." is removed from the system message for these requests.
2. If the reply is text: done, as today, one request.
3. If the reply has tool calls: each `python` call runs in a new worker. A call with broken JSON, another tool name or code that is not text gets the tool result `ERROR: call python with {"code": "..."}` (as in the tested harness). A Python error goes back as `ERROR:` plus the traceback, so the model can fix its code.
4. A follow-up request carries the earlier messages, the assistant message with its `tool_calls`, and one `tool` message per call.
5. At most 3 rounds of code per user message. If the fourth reply asks for code again, the message fails with "The calculation needed more steps than allowed". In the test the models needed one round on almost every turn.

Text the model streams before a tool call ("Let me calculate") is shown while it arrives and removed when the code has run. The final answer stands alone.

The usage shown for the message is the sum over all its requests. The mode's time limits (90 seconds for Fast) cover the whole message with all rounds.

Each follow-up verifies the destination again through the adapter (Privatemode reuses its verified session) and refuses to continue if the release digest changed.

**Identifier masking:** code from the model may contain placeholders. They are restored before the code runs, so the code works on the real values on the device. The output is masked again before it goes back. Tested.

## The instruction and the tool

They are the ones the test used, adapted to sit beside the app's own instructions (`CODE_INSTRUCTION` and `PYTHON_TOOL` in `src/code-tool.ts`). The three sentences about how to calculate are word for word those of the harness; a test compares them. Added: one sentence in front ("You have one tool ... When a question involves calculation:") and one at the end ("For questions without calculation, answer as usual and do not call the tool.").

**Not tested with any model:** this instruction together with the app's long system message. The test used a short system message of its own. Live check 2.

Size: the instruction and the tool definition cost about 1,000 characters of the context limit. They are counted before sending (`withCodeTool`); a context that does not fit with them is refused with nothing sent. The existing schema-overhead test (`tests/assisted-structured-transport.test.ts`) is untouched and passes; the new limit test is in `tests/tool-loop.test.ts`.

## The sandbox, and its limits stated honestly

What is enforced:

- **Own worker, thrown away after one call.** Every call gets a new worker and a new interpreter. Nothing carries over between calls, turns or conversations. The file system is in memory and dies with the worker.
- **No network and no browser storage from the worker.** After Pyodide has loaded and before any model code runs, the worker deletes `fetch`, `XMLHttpRequest`, `WebSocket`, `WebSocketStream`, `WebTransport`, `EventSource`, `importScripts`, `Worker`, `SharedWorker`, `BroadcastChannel`, `indexedDB`, `caches`, `RTCPeerConnection`, `RTCDataChannel`, `Notification`, `FontFace`, `fonts` and `navigator.storage`, `serviceWorker`, `locks`, also from the prototypes. If one of them cannot be removed, the worker refuses to run code.
- **The content security policy is the second wall.** `connect-src 'self'` and `default-src 'self'` allow no other host. `script-src` has no `unsafe-eval`, so code in the worker cannot turn a string into JavaScript.
- **Python-level block.** `import js`, `pyodide`, `pyodide_js`, `_pyodide` and `micropip` fail. No package can be installed: `micropip` is not shipped and the optional packages are not copied.
- **Time limit:** 10 seconds of running time, then the worker is terminated. Starting Pyodide has its own limit of 60 seconds; after that the tool counts as unavailable.
- **Limits:** code 4,000 characters, output 4,000 characters, at most 4 calls per reply and 12 kept per answer.
- **Memory:** a blow-up ends in a Python `MemoryError` or a dead worker. Only the worker dies; the model gets an error text.
- **Messages from the worker are data.** The page checks each field and accepts one result per worker.

What it is not:

- **The Python-level block is not a wall.** In the Chromium probe, code that worked at it removed the block and reached the worker's global scope through Python's garbage collector. There it found none of the functions listed above, and the browser refused to evaluate a string as JavaScript (CSP). No request left for another host. So the walls are the stripped worker and the CSP, not the Python block.
- **The list of removed functions is a block list.** A browser API that makes requests and is not on the list would still be stopped by the CSP for other hosts, but could reach our own origin with a GET. Nothing was found that does.
- **It is not a defence against a browser bug** in WebAssembly or workers.
- **What the code can see** is only what the model put into the code. The worker has no access to the page, the vault or the conversation.
- **A Safari or Firefox worker was not tested.** Only Chromium.

## Loading, size and timing

Pyodide `314.0.8` (npm, exact pin), MPL-2.0: `docs/third-party-pyodide-20261114.md`. Runtime files only:

| File | Size | gzip -9 | brotli |
| --- | ---: | ---: | ---: |
| `pyodide.asm.wasm` | 9,597,892 | 3,593,128 | 2,739,076 |
| `python_stdlib.zip` | 2,545,550 | 2,503,691 | 2,487,047 |
| `pyodide.asm.mjs` | 1,250,259 | 261,215 | 207,278 |
| `pyodide-lock.json` | 119,077 | 25,492 | 21,689 |
| `pyodide.mjs` | 17,758 | 7,119 | 6,389 |
| **Total** | **13,530,536 (13.5 MB)** | **6,390,645 (6.4 MB)** | **5,461,479 (5.5 MB)** |

**Our own server does not compress.** There is no compression in `server/`. Unless Render's edge compresses these responses, the first download is 13.5 MB. Whether it does was not checked (live check 6).

- **Not in the page.** The page and the main bundle do not name Pyodide (test). The worker is its own 1.9 kB chunk and imports `/vendor/pyodide/314.0.8/pyodide.mjs` at run time. Nothing is requested before the first tool call (checked in Chromium).
- **Never a CDN.** `indexURL` and `packageBaseUrl` are our own path. Our built chunks contain no CDN address. Pyodide's own `pyodide.mjs` contains the string `https://cdn.jsdelivr.net/pyodide/...` as its default package address; with `packageBaseUrl` set it is not used. In the Chromium runs no request went to another host.
- **Kept by the browser.** The folder name is the exact version, so the files never change at their path. The static file rule (`neverChanges` in `server/production-runtime.ts`) and the Render bridge (`IMMUTABLE_PATH`) now let browsers keep `/vendor/pyodide/<version>/*.{mjs,wasm,zip,json}` for a year, like the hash-named build files. Without this every call would download 13.5 MB again, because each call starts a new worker. This is a change to a reviewed rule: see the open decisions.

Measured in headless Chromium on the development laptop, production build, the real CSP string, server on localhost (so the download time is close to zero):

| | Time from creating the worker to the result |
| --- | ---: |
| First call (download from localhost, compile, start, run) | about 1.4 to 1.5 s |
| Later calls (new worker, files from the browser cache) | about 1.0 to 1.2 s |

`print(Decimal("6420")*Decimal("0.19"))` printed `1219.80`. The run itself took under 10 ms; the rest is starting Pyodide.

**Cost of a fresh interpreter per call:** about 1 second per call on this laptop. That is the price of the safest rule (nothing carries over, a time-out can simply kill the worker) and it matches the tested harness, which started a new Python per call. A phone will be slower, perhaps several seconds; not measured. A private window keeps no 9.6 MB file in its cache (seen in the probe with a throwaway browser profile), so there every call downloads the Wasm file again.

## Content security policy

**No change.** The policy already has what a same-origin Wasm worker needs:

- `script-src 'self' 'wasm-unsafe-eval'`: the worker script, the dynamic import of `pyodide.mjs` and `pyodide.asm.mjs`, and compiling WebAssembly.
- `worker-src 'self' blob:`: the worker.
- `connect-src 'self'`: the worker's fetches of the Wasm file, the standard library and the lock file.

Checked with the policy string `createApp` sends in production, on a production build. No violation was reported. The header tests are unchanged and pass.

## Allowance and cost

Owner decision of 14 November: a paid message may make up to two follow-up tool requests without using more allowance.

- When the provider accepts a charged chat request, the server gives that account a credit: 2 follow-ups, same answer mode, 90 seconds (`server/continuation-credit.ts`).
- A request with `x-privateai-continuation: tool` takes one from the credit and is not charged. It grants no new credit.
- A follow-up without a credit (none granted, used up, expired, another mode, another account) is charged like a new message. So the third follow-up of one message costs one more unit of its mode, and being paid it grants two again.
- The credit is granted when the provider accepts the request, not when the reply ends. The browser sends its follow-up the moment it has read the reply, and the server sometimes learns up to 2 seconds later that a reply was complete. The bound is the same.
- The stop switch, the size limit, three requests per instance, one request per account and the spend check apply to every follow-up. The daily cap applies to every charged request; a follow-up on credit costs nothing, so the cap has nothing to count.
- Counts, content-free: `chat.<mode>.tool_continuation`, beside the usual `chat.<mode>.completed`.
- The older header `x-privateai-continuation-approval` belongs to the calculator experiment (`evaluation/experiment-gateway.ts`). The product relay never read it. It is untouched and both headers are on the Render bridge's forwarding list.

**The abuse bound.** The body is encrypted, so the server cannot see whether a follow-up really carries a tool result. A modified browser can therefore send any request as a follow-up. It gets at most **2 extra requests per paid one**, in the same mode, within 90 seconds, one at a time. Worst case: three times the provider cost per allowance unit.

**Two shortcuts the owner must know:**

1. **Follow-ups on credit are not in the usage ledger** (the ledger takes 1 to 10 units, not 0; the retry credit works the same way). Their tokens and cost are not metered and the spend guard does not see them. The spend guard still checks before each one, but its total can be low by up to the cost of two requests per paid message. To fix: let the ledger record a request with zero units.
2. **The credit lives in the server's memory.** A restart within those 90 seconds charges a follow-up that was due free.

**What a calculation costs us.** In the test a two-turn conversation used about 2,000 tokens on the Fast model with code (two requests per turn). The 12 November pipeline used about 6,400 on `glm-5.3` low. Through the app the system message is much longer than the harness's, so the app's numbers will be higher: every follow-up sends the whole context again. Not measured (live check 3).

## What the user sees

- While code runs: the status line "Calculating on your device…".
- On the answer: "Calculated with code on this device" and "Show the code and its output". Collapsed by default. Each piece of code and each output has a Copy button. A piece of code that ended with an error is shown with its error.
- If every run ended with an error: "Code was tried on this device but ended with an error. The figures in this answer were not calculated with code. Please check them."
- If Pyodide cannot start (offline, WebAssembly blocked, an old browser, 60 seconds without a start): the model is told that the tool is not available and to answer without it, in the same follow-up request (which rides on the credit). The answer carries: "The calculation was not run on this device: the calculator could not start in this browser. ..." For the rest of the browser session the tool is not offered and Auto sends maths to Thinking again, as today.
- German texts for all of these (`src/text/code.ts`, same keys).

## Auto routing and the old arithmetic check

- **Routing:** with the feature on and usable, Auto sends maths to Fast instead of Thinking (`autoDecision(conversation, true)`). Nothing else moves. With the feature off, or after Pyodide failed, maths goes to Thinking as before.
- **The old check** (`src/arithmetic/*`: recalculating the relations an answer writes out) stays the fallback. It runs on every answer that was not calculated with code: the model did not call the tool, all runs failed, Pyodide could not start, or the backup model answered.
- **On an answer calculated with code the recalculation is skipped.** Its two notices ("some figures did not match", "a number could be read two ways") come from reading the answer's text with heuristics. Beside "Calculated with code" they would contradict the mark, and where they disagree with exact code the heuristic is the likelier one to be wrong.
- **The completeness warning stays** on every answer. "This answer may not state every figure you asked for" does not contradict the mark and still catches a real gap.
- Not built: a check that the figures in the answer are the figures the code printed. A model could still copy a number wrongly from the output. The user can open the output.

## Saved conversations and later turns

- The code and output are saved with the answer (`codeRuns` on the message; at most 12 runs of 4,000 characters of code and 4,200 of output each; `codeUnavailable` for the fallback note). They are part of what the user saw. Nothing new is stored on the server.
- In later turns the earlier answer's runs are sent back to the model as the assistant message with `tool_calls`, the `tool` results, then the answer text. This is the form the test used across turns. All runs of one answer are replayed as one round of calls.
- If the replay does not fit the context limit it is left out and the earlier answers go as plain text.
- With the switch off nothing is replayed (tool messages without a tool definition could be refused).
- The context meter in the composer does not count the replayed code. It can under-read by the size of earlier runs.
- The PDF export does not include the code.

## Data analysis on an uploaded table: not built

Out of scope for this pass. What it would take: pass a CSV attachment's text into the worker with the code (`pyodide.FS.writeFile("/data/<name>.csv", text)` before the run, a few lines in `src/python.worker.ts`), tell the model the file names in the instruction, raise the code and output limits, and decide the size limit. The standard library has `csv` and `statistics`. `pandas` would be an optional package of about 15 MB more and is not shipped. The model needs no upload: today it would have to copy the numbers into its code.

## Tests (all offline)

| File | Tests | What |
| --- | ---: | --- |
| `tests/code-tool.test.ts` | 11 | The real Pyodide under Node: exact Decimal, date and fraction results; errors as text; `import js`, `pyodide`, `micropip` blocked; code and output limits. The scope hardening on a stand-in scope. The runner with a stand-in worker: one worker per call, time limit, crash, stop, unavailable. The instruction against the harness. The copied files, the version pin, no CDN in our sources. The keep-forever rule for both servers |
| `tests/tool-loop.test.ts` | 16 | Fragment assembly (one call, two calls, interleaved, whole, cut 1 to 40 ways); broken streams; the loop with a mocked transport (results sent back, error then fix, malformed calls, the cap of 3, fallback, stop, masking); replay in later turns; the size limit; the app's own request path with a mocked encrypted transport (tool and instruction out, follow-up with the header, one request when no tool is called, nothing changes with the tool off) |
| `tests/code-continuation-credit.test.ts` | 8 | Granted after a paid request, at most 2, expiry, wrong mode or account charged, off without the switch, counts, daily cap, stop switch, spend check, one request at a time |
| `tests/code-execution.test.ts` | 3 | Auto routing on and off, saved conversation round trip and limits, texts |
| `tests/code-execution-ui.test.ts` | 1 | Real Chromium, real worker, real Pyodide on the test's Vite server; only the model is faked. The mark, the collapsed control, code and exact output, Copy buttons, Auto in Fast, no request to another host, Python's ways out blocked, a real 10-second stop, and the switch off |
| `tests/deployment-inference-config.test.ts`, `tests/i18n-modules.test.ts`, `tests/render-bridge-headers.test.ts` | | The `code` config field, German for every text, the new header on the bridge list |

One-off probe (script deleted afterwards): the production build served with the production CSP string, headless Chromium. Results are in the sections above.

Not run: the whole suite, the durable suite, the Playwright specs under `tests/browser` (none was edited). `tests/render-bridge.test.ts` and `tests/ingress-workspace.test.ts` need a database and were not run; the two rules they cover are tested directly in `tests/code-tool.test.ts`.

## What the lead must check live

Nothing below was checked.

1. **Streaming tool calls through the app, both models.** Development server with `PRIVATEAI_CODE=1`, a Privatemode report, Fast and Thinking. Ask "What is 19 % of 6,420 EUR?". Expect: the status "Calculating on your device…", the mark, the code, `1219.80`, and two chat requests in the network panel, the second with `x-privateai-continuation: tool`. If the answer fails as incomplete, read `delta.tool_calls` in the stream: the unknowns are whether Privatemode streams fragments with an `index`, which `finish_reason` it sends, whether usage arrives in a final chunk on a tool-call reply, and whether the reasoning models send text before the call.
2. **The app's long system message with the tool.** Does the model still call the tool on every calculation, and never on a plain question ("What is the capital of France?", a rewrite, a health question)? An unneeded tool call costs a second request.
3. **The arithmetic set through the app:**

   ```
   npx tsx evaluation/blind-benchmark/run-ours.ts --privatemode --code --modes fast,thinking --cases evaluation/arithmetic-gate/unseen-v3-20261023.json
   ```

   Each result file has `turnTexts` (every turn's answer), `codeMarks` and `codeRuns`. Score with `scoreConversation(case, turnTexts)` from `evaluation/arithmetic-gate/scorer.ts`. Compare with 56 of 60 (Fast) and 31 of 32 (Thinking). Note the tokens. These flags were type-checked, not run.
4. **Allowance.** One calculation must use one unit (Fast) in the account's usage, and the hourly counts line must show `chat.fast.tool_continuation`.
5. **A phone.** iPhone Safari and Android Chrome: does Pyodide start, how long does the first call take on mobile data, and the later ones. Also desktop Firefox and Safari.
6. **Download size on the hosted site.** In the network panel on `app.cometrow.com`: is `pyodide.asm.wasm` compressed by Render's edge (about 2.7 to 3.6 MB) or sent whole (9.6 MB)? Does the second calculation load it from the browser's cache (`Cache-Control: public, max-age=31536000, immutable`)?
7. **The Render bridge** forwards `x-privateai-continuation` (on its list, tested offline only).
8. **Backup and fallback.** With the primary model refused, the backup answers without the tool: the answer must carry no code mark.

## Open decisions for the owner

1. **Long-lived caching of `/vendor/pyodide/<version>/`.** It widens the rule "browsers keep only hash-named files" on the server and the Render bridge. The OCR work avoided exactly this. Without it the feature downloads 13.5 MB per calculation, so the alternative is not to ship it.
2. **Switch on for the alpha or not**, after live checks 1 to 5.
3. **Follow-ups not in the ledger** (shortcut 1 above): accept for the alpha, or have zero-unit ledger rows built first.
4. **3 rounds, of which 2 are free.** The third follow-up is charged. Simpler would be a cap of 2 rounds. The test's models almost always needed one.
5. **Fresh interpreter per call** (about 1 s each on a laptop) or one interpreter per conversation (faster, state carries over, a time-out loses it).
6. **A rounding sentence in the instruction** ("round only what the question says to 0.05"): the known remaining error. It needs new test cases first, so it was not added.
7. **Privacy wording.** The app now runs model-written code on the user's device and downloads a Python runtime from our server. No text in the app or the policy says so yet.
