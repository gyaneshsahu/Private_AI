# First local experiment — prepared, not yet run

Tinfoil is a synthetic-test candidate, not an approved provider for private user data. This workflow changes no SDK and makes no paid request. Cloud certificate work remains paused.

## Current handoff: approved synthetic run

The user's WSL Chromium preflight returned `ROUTER_VERIFICATION_PASSED`, zero inference requests, and router release digest `ad95d02b2e27b3c1d5c327f2ee9616634f841e4b2ed5a48f404e4e9f595a4876`. They supplied current API prices for `gpt-oss-120b`: $0.15 per million input tokens and $0.60 per million output tokens. They explicitly approved **up to $2 of actual spending for one two-turn synthetic test**, reported that auto-recharge is disabled and that the account spending limit is $2, and set the API key in the open WSL terminal. These account settings are user-reported; this assistant has not accessed the account or read the key. No inference request has run yet.

Use the freshly exported `PrivateAI-local-evaluation.zip` to update the existing WSL project, preserving its `.local/` directory and open terminal. The archive contains project source only; it excludes `.local/`, credentials, installed dependencies, generated builds and Git metadata. Unzip over `~/projects/Private_AI` from WSL, for example `unzip -o /mnt/c/Users/<your-Windows-name>/Downloads/PrivateAI-local-evaluation.zip -d ~/projects`, using the actual location where you downloaded it. Run the following **in the same terminal that has the key**:

```sh
cd ~/projects/Private_AI
npm run experiment:prepare
npm run experiment:check
```

`experiment:prepare` reads the recent successful local browser evidence, records the already-approved $2 limit and reported rates, and writes a single-use 24-hour permit into ignored `.local/experiment.json`. It sends no network request and does not print the API key. It refuses stale, failed or different-router evidence. `experiment:check` prints prerequisites without a provider call. Confirm that it reports `node24`, `browser`, `apiKeyPresent`, and `suitableLocalNetwork` as true, and `approvedCapUSD` as 2.

The already-authorized test command is `npm run experiment:run`. It is billable, so run it only after the offline check passes and the Tinfoil dashboard still shows the $2 account limit and auto-recharge disabled. This is the user's existing authorization, not a request for another approval. It uses the fixed synthetic invoice and two turns, with no external tools, no automatic retries and at most two inference attempts. It writes a result under `.local/experiment-runs/synthetic_20261004_two_turns_usd2/result.json`. Do not delete the consumed approval directory or rerun after a failure; even a failed request might be charged. Report the result and the provider's actual charged amount for reconciliation. The result contains synthetic text and model replies, not the API key; inspect it before sharing if desired.

This run remains an experiment: router verification and an answer do not qualify the full downstream confidential path or permit real private user data.

## Confirmed local setup and account status

The user has **Windows with WSL2**. The account has since been activated, a key was placed locally in WSL, and the $2 test was approved as described above. The earlier no-key steps remain useful for setting up a fresh WSL environment.

Use WSL2 for the first attempt, with Linux Node 24 and Linux Playwright Chromium in the same environment. Put the project in the WSL Linux filesystem, for example `~/projects/Private_AI`, rather than sharing a Windows `node_modules` directory. Do not mix Windows npm/Node executables with Linux browser binaries. A headless browser needs no desktop/WSLg window.

Inside the transferred project directory in WSL:

```sh
node --version
node -p "process.platform"
npm ci
npx playwright install chromium
node scripts/local-preflight.mjs --check
```

Expect Node `v24.x` and platform `linux`. If Playwright reports missing Linux libraries, use its documented dependency installer, `npx playwright install-deps chromium`, on a supported distribution; this may ask for local administrator privileges. Do not change trust settings to fix certificate errors. If WSL itself proves unsuitable, assess native Windows separately rather than creating another lengthy environment-repair project.

Dependency/browser installation downloads packages but does not call paid inference. The `--check` command itself makes no network request. The normal preflight makes a public attestation request but no AI request. None requires Tinfoil activation or an API key.

## Immediate prerequisite check

Use the current working project on the local computer, with Node 24. Local files are not yet committed/pushed; cloning the GitHub repository alone may not include this work. Preserve and transfer the current working tree through an authorized workspace export or arrange repository publication separately. Do not send `.env`, keys, `.local` evidence or other secrets with a project export.

From that project directory:

```sh
npm ci
node scripts/local-preflight.mjs --check
```

If the browser is missing, run `npx playwright install chromium`. Then the single verification command is:

```sh
node scripts/local-preflight.mjs
```

It starts an isolated loopback page, uses the installed browser SDK to verify the public router, writes a minimal result under ignored `.local/`, and closes the page/server. It does not launch the PrivateAI chat application, read an API key, send an inference request, modify certificate trust or turn off TLS checks. It only allows the fixed public bundle request and local JavaScript modules. A normal TLS connection is still necessary.

Do not unset a required proxy or disable certificate checks to make it pass. The command rejects proxy-configured environments explicitly; select a suitable local environment. A failure is useful evidence, not permission to weaken the checks. A passing result is limited to router verification in that browser and does not approve a release or downstream model.

## Needed before the two-turn conversation

The user has now supplied the relevant rates, chosen limit and key status for this bounded synthetic run. Confirm the account controls immediately before the billable command. Supplier charges still require reconciliation afterward, and no real private inputs are permitted.

The exact invoice prompts, expected numbers and evidence checklist are in the [provider recommendation](provider-recommendation.md#small-local-test-after-prerequisites). That paid step will reuse the existing extraction/context/encryption components and remain separate from operational provider qualification. Do not fabricate a passing qualification file to enable the main app.

## Historical activation checkpoint

This checkpoint has now been passed for the bounded test only. The user reported account controls and approved up to $2 actual spending. The rules below remain relevant for later provider/account decisions.

When the experiment is otherwise ready, present the selected model, dated rates, estimated request envelope and an explicit proposed total spending cap. Include any activation fee, minimum deposit or payment authorization hold disclosed by the provider. Unknown activation charges must be resolved before proceeding; do not describe adding a payment method as necessarily free.

If limits can only be inspected after activation, distinguish approval to activate from approval to make inference requests. The user enters payment information directly with Tinfoil. After activation, inspect and set account limits and disable automatic recharge if available **before** running inference. Keep the runner stopped until the actual protection against excess charges is understood. If the provider cannot enforce the approved cap, report that material gap for a decision instead of treating token limits or an alert as an equivalent guarantee.

API credentials, if later created, stay in secure local process settings. Current preparation does not need them. The user need only share non-secret model prices and the relevant descriptions of billing controls when the cost review is ready.

## Validation status

### Isolated conversation runner

`npm run experiment:check` is offline. It reports missing prerequisites and makes no network requests. A deliberately incomplete template is provided at `evaluation/experiment.example.json`; it is not valid authorization and must not be populated with invented evidence to make the command pass.

Only after explicit activation/spending decisions, reviewed live-browser evidence and release selection, prepare `.local/experiment.json` with real approval evidence, dated rates and a verified supplier spending cap. Then `npm run experiment:run` runs the two fixed synthetic turns in a headless browser. The API key remains in the local server process. The page uses the same context, extraction, verification, encryption and stream-completion modules as the product, but has a separate experiment permit. That permit cannot satisfy production qualification.

The loopback relay allows at most two inference attempts, counts a failed attempt, stops after a transport/provider failure, rejects cross-origin/CSRF/changed destinations and forwards only explicitly constructed headers. It does not log request bodies or credentials. A consumed approval directory prevents restarts or concurrent processes from reusing an approval. Do not delete that directory to retry; review possible charges and obtain a new approved run. These are local controls for a trusted operator, not substitutes for provider-enforced billing limits.

Missing usage stops further turns. Cancellation/transport failure preserves partial text and any received usage. Results under `.local/experiment-runs/<approvalId>/` contain the synthetic transcript, source IDs, verified release observations, timings, usage estimates and request outcomes. They always say qualification is not passed and require human review against the expected figures; a completed model response is not automatically a quality pass. Reconcile actual billing separately, including charges not captured by input/output estimates. Shutdown forcibly killing the process may prevent a final artifact, but the consumed approval remains.

Offline verification: 53 tests passed, including a real Chromium/local-extraction run with an **explicitly mocked model** and no external requests. Seven product browser checks passed; type checking and the production build passed after the shared transport refactor. These are not live provider results. No valid experiment permit, operational qualification file or API key was created, and no paid test was run.

On 4 October 2026, `node --check scripts/local-preflight.mjs` passed, and `--check` found Node 24 and Chromium without network requests. Running the normal command in Cloud stopped at the intended proxy-environment guard, before launching a browser or fetching provider data. This confirms that guard, not the full workflow. The real browser-network path must be tested on the selected local machine; it has not been demonstrated here. No paid inference or customer-data processing is authorized by these commands.

### Diagnose an early browser failure without another model request

The user-reported 2026-10-04 18:32:26 UTC run extracted the synthetic
invoice but returned no verification evidence, no assistant text and an empty
gateway attempts list. Its first-turn timer was 5.5 ms. This bounds the failure
to before an inference forward was recorded; the old report does not identify
the underlying error. The reported provider dashboard also showed zero usage.
Neither observation establishes provider qualification.

Use `npx tsx evaluation/run-local.ts --diagnose` with the existing unexpired
permit. This does not consume or reset the original approval. It writes a new
`.local/diagnostic-<timestamp>/result.json`, loads the real browser dependencies
and permits only the public attestation lookup outside localhost. Browser
routing blocks inference, and the server forwarding function independently
throws before any provider fetch in diagnostic mode. No API key is required.
A stop at `INFERENCE_BLOCKED_BY_DIAGNOSTIC` is expected if verification and
transport preparation work. Other stops now report a fixed stage and error
category, plus restricted network status/error codes; arbitrary error strings,
headers and request bodies are not saved. Do not delete the previous run or
rerun the billable command while diagnosing it.

### Read a compact summary without rerunning the experiment

New runs print their summary automatically. To review an existing run offline:

```bash
npm run experiment:review -- /path/to/run/result.json
```

Keep that run's original `permit.json` beside `result.json`. This command makes
no network calls, does not access an API key and does not renew spending approval.
It prints recorded request/completion counts, verification matches, exact token
estimates, durations and unresolved network-failure counts. It omits transcripts
and arbitrary error text. It cannot grade meaning, confirm billing or qualify a
provider. Deliberately blocked diagnostics now receive an expected-stop label
rather than being presented as an ordinary inference failure.

The parser changed after the first live test to prevent raw SDK error logging.
See [privacy/failure review](privacy-failure-review.md) for local evidence and
why the prior live test is not validation of this new adapter revision.
