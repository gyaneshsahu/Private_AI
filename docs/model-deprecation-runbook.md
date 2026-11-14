# Model deprecation runbook (Privatemode)

Written 13 November 2026. Use it when Privatemode announces a deprecation, or when the service log shows a line that starts with `CometRow model alert:`.

A model change is manual and announced. Nothing in the app switches models by itself.

## What we know

- The usual deprecation notice is about two weeks. It is guaranteed only with an Enterprise agreement (owner-reported, Edgeless email of 13 November 2026).
- Pinning an exact model version is an Enterprise feature (same source).
- During the deprecation window an old ID can answer with the successor model, without an error (same source; Privatemode's docs say `glm-5.2` routes to GLM-5.3).
- After removal, requests fail with "model not found".
- We use `glm-5.3` (Thinking) and `glm-5.3-flash` (Fast). Each is the other's backup. The IDs are values in the signed qualification report.

## What the alerts mean

All alerts go to the service log (Render, Logs). Search for `CometRow model alert:`.

| Log line | Meaning | Urgency |
| --- | --- | --- |
| `... is marked deprecated in Privatemode's model list` | The notice window has started. | Start this runbook today. |
| `... changed in Privatemode's model list since the baseline` | A listed property changed. The ID may now serve another model. | Treat as silent rerouting until checked (see below). |
| `... is no longer in Privatemode's model list` | The model is removed. Chat for that mode fails. | Act now. |
| `the provider answered "model not found" for ...` | A user request just failed for this reason. | Act now. |
| `no baseline is recorded for ...` | The baseline file is empty. Changes cannot be detected. | Record the baseline (below). |
| `the daily model list check failed (...)` | The check could not run. The models were not checked. | Run the manual check. If it fails twice, read the changelog by hand. |

A healthy day shows one line: `CometRow model check: ... listed and unchanged`. The check runs at every start of the service and then every 24 hours. No line at all for more than a day means the service has no Privatemode report or was not redeployed with this change.

The hourly counts line also shows `chat.<mode>.upstream_model-not-found`.

What users see when a model is gone: "The AI model for this answer mode is not available on the secure server. No answer was received, and no other model was used in its place." The app does not retry on the backup model in this case. The backup retry is for outages and time-outs only. A removed model is permanent, so a retry would turn into an unannounced model change.

## The manual check and the baseline

One command reads the model list. It sends the key only. No prompt, no user data, no tokens.

```
Invoke-WithPrivateAiSecret -Name PRIVATEMODE_API_KEY -Action { npx tsx scripts/privatemode-models-check.ts }
```

- Add `--record` to write the baseline to `server/privatemode-models-baseline.json`. Commit the file and deploy. The server reads it from the image.
- Run the check once more right after recording. If a property already differs, it changes on every request. Add its name to `VOLATILE` in `server/model-watch.ts`, then record again.
- Add `--sdk` to read the list through the Privatemode SDK instead of plain HTTPS.
- Add `--models a,b` to check other IDs, for example a successor.

**Verified live on 14 November 2026:** the baseline is recorded (chat and speech models) and the plain HTTPS read works; see the section at the end. The paragraph below describes the state before that. The server reads the list with a plain HTTPS GET to `/v1/models` and the key. The SDK documentation says this reply is not encrypted and needs only the key, but nobody has tried the plain call yet. If the plain call fails and `--sdk` works, tell the agent: the server check must then be changed. Until then the server logs `the daily model list check failed` every day, which is the intended behaviour for a check that cannot run.

The public changelog (https://docs.privatemode.ai/changelog/) is not checked automatically. A page fingerprint would raise an alert on every release note. Keep reading it in the weekly review.

## Steps on a deprecation notice or a "deprecated" alert

1. **Read the notice.** Note the removal date and the successor ID. Record both in `docs/READINESS.md` with the source and date.
2. **Do not change the report yet.** The current IDs stay until the successor has passed step 3.
3. **Test the successor.** Put the successor's exact ID in the local test report and in a tiers file, then rerun:
   - The 51-prompt benchmark: `evaluation/blind-benchmark/run-ours.ts --privatemode` with `BENCH_DIR=evaluation/blind-benchmark-privatemode-20261112`. Earlier results: `evaluation/benchmark-privatemode-20261112/SUMMARY.md`.
   - The 25-prompt check: `BENCH_DIR=evaluation/benchmark-privatemode-20261112`, then `npx tsx evaluation/benchmark-privatemode-20261112/checks.ts`.
   - The arithmetic set: `evaluation/arithmetic-gate/harness-v3.ts --cases unseen-v3`. Earlier results: `evaluation/arithmetic-gate/results-v3-unseen-20261112.md`.
   - The German-rules sets: `evaluation/german-rules-40-20261113` (40 questions) and `evaluation/german-rules-official-20261113`. Bars are in each folder's `BARS.md`. Earlier results are in each `SUMMARY.md`.
   - The failure cases: `evaluation/live-failure-check.ts --privatemode`.
   - Time limits: compare time to first word with `docs/thinking-timeouts-20261113.md`.
   Grade with the same bars as before. These runs cost money and need the owner's go-ahead.
4. **Decide.** If the successor meets the bars, continue. If not, the options are the other GLM model for both modes, or the manual move to Tinfoil (`docs/provider-switch-20261112.md`). The owner decides.
5. **Update the report draft.** Change the model IDs and the evidence in `evaluation/qualification-drafts/privatemode-20261112.json` and `docs/qualification-report-draft-privatemode-20261112.md`. Use exact IDs only. The schema refuses `glm-latest` and `glm-flash-latest`. The owner signs.
6. **Announce.** Write the notice into the notice file (`inference.noticeFile`, see `docs/development-deployment.md`): `echo "..." > <noticeFile>` in the Render shell. Every user sees it within 30 seconds. Announce at least 24 hours ahead unless the old model has already stopped. Draft: "CometRow will change its AI model on [date]. Answers may read a little differently. Your saved conversations are not affected."
7. **Switch by hand.** Follow steps 2 to 6 of the procedure in `docs/provider-switch-20261112.md`, swapping only the report file: stop chat with the stop file, replace the Render secret file for `inference.qualificationFile`, deploy, verify, resume, send one message per mode.
8. **Record the new baseline.** Run the manual check with `--record --models <new IDs>`. Commit and deploy.
9. **Clear the notice** when the change is done (empty the notice file). Record the switch in `docs/READINESS.md`.

## If the old ID already answers with the successor

Signs: a "changed" alert, a deprecation entry dated in the past, or answers that suddenly read or time differently.

1. Treat the current model as unqualified. Users are getting a model we did not test.
2. Stop chat with the stop file if the change is not confirmed harmless within the day. The app then shows "Private chat is paused by the operator."
3. Put a notice in the notice file. Say that the provider changed the model and that we are checking it.
4. Run step 3 above on the successor's own exact ID, not on the old ID.
5. If it passes, do steps 5 to 9 so the report names the model that really answers. If it fails, do step 4.
6. Ask Privatemode support what was routed and since when. Record the answer in `docs/supplier-privatemode-20261112.md` as owner-reported with the date.

## If a model is already removed

1. The affected mode fails for everyone with the message above. The other mode still works if its own model is listed.
2. Put a notice in the notice file at once. Tell users which mode works.
3. Go through steps 3 to 9 as fast as the tests allow. Do not skip the tests to restore the mode sooner.

## Checked live, 14 November 2026

One request with a model ID that does not exist (`cometrow-no-such-model`, one-word synthetic prompt, no tokens charged as far as the reply shows). Privatemode answered **HTTP 404**, `application/json`, plain (not encrypted): `{"error":{"message":"model \"cometrow-no-such-model\" not found","type":""}}`. The relay's check (`modelNotFound` in `server/providers/inference-relay.ts`) classes exactly this as model not found, on the status and on the text. Not checked: what a model that was retired (rather than never existed) returns, and whether a retired ID is first routed to a successor without any error. The daily list check is the signal for that case.
