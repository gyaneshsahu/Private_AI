# Privatemode manifest rotation of 14 November 2026: what changed

| | Digest (SHA-256 of the manifest file) |
| --- | --- |
| Approved in the report draft (read 12 November) | `5fa927e3b864738da35d427c10ba8e49ebeeb1531e49618899cf95f654d240c1` (5,992 bytes) |
| Live since 14 November (read through the attested SDK, 14 November, afternoon) | `d63eb5cf91cb3079fe25a848573a4d0e9d869f462dab4f71fd02bdb372f8e833` (5,994 bytes) |

Both files are kept: `.local/privatemode-manifest.5fa927e3.json` (old) and `.local/privatemode-manifest.json` (new). The manifest is Privatemode's statement of exactly which software and hardware settings its confidential servers must prove before the app sends anything. If any of it changes, the digest changes, and the app refuses until you approve the new one.

## The four differences, in plain language

1. **The whole cluster was redeployed under a new name.** Every workload is still there and nothing was added or removed: the two chat models (`glm-5-3`, `glm-5-3-flash`), the speech models (`whisper-qwen3-voxtral`), the OCR model (`deepseek-ocr-2`), `gpt-oss-120b`, the document service (`unstructured-api`), the coordinator and the secret service. Their names moved from namespace `continuum-a225c8` to `continuum-13d78c`, and every workload's policy hash is new. **Meaning:** a fresh deployment of the same set of services, not a new service that could receive our data. The policy hashes also change when a container image is updated, so this does not tell us whether the model software itself changed.
2. **AMD (SEV-SNP) servers: stricter minimums and a new measured image.** Minimum firmware (SNP) version 28 → 30, and the required set of security mitigations from 15 → 1023 (more mitigations required, not fewer). The trusted launch measurement changed. **Meaning:** stricter hardware requirements and a new virtual machine image (firmware or kernel).
3. **Intel (TDX) servers: one measurement register changed** (RTMR 2; the base firmware measurements are unchanged). **Meaning:** a new operating-system image (kernel, boot command line or initial file system).
4. **The key-recovery owner key changed** (`SeedshareOwnerPubKeys`). This is the public key of whoever can recover the cluster's root secret if the cluster must be restored. **Meaning:** a new recovery key. It should belong to Edgeless Systems; only they can confirm that.

## What it matches in the changelog

`docs.privatemode.ai/changelog` lists versions without dates. The newest entry is **v1.64.0**: vLLM upgraded to 0.32.0, Contrast upgraded to 1.26.2, requests that exceed the context window are no longer rejected, and GLM-5.3 output is limited to 128k tokens. Our SDK is 1.63.0, the version before it. A Contrast upgrade (Contrast is the confidential container platform that writes this manifest) explains a new cluster namespace, new policies and new VM images. So the rotation is consistent with v1.64.0, but the changelog does not say on which day v1.64.0 went live, and it does not mention the recovery key.

## What to check before approving

1. The changelog entry v1.64.0 (above) is there and describes an upgrade, not a new service.
2. **Ask Edgeless** (in the same email as the attestation and cache questions): "Did Privatemode v1.64.0 go live on 14 November 2026, and is the new seed-share owner key in the manifest (`SeedshareOwnerPubKeys`, starting `3082020a02820201009eb7f0…`) yours?" Approving before the answer is your call: the hardware minimums got stricter, which is good, and no service was added.
3. Nothing in the app needs to change for v1.64.0: chat, voice and pictures worked on the new deployment in the local tests of 14 November (afternoon).

## Also found in the changelog (useful, not urgent)

- **v1.61.0: GLM reasoning can be switched off** (`reasoning_effort: "none"`). Our notes said it could not. For Fast this could cut tokens and time further; it needs a quality check before use.
- **Upcoming:** "shared prompt cache will be enabled by default" in a future release. That explains why we measured `cached_tokens: 0`: the cache is not on for us yet.
- **No feed, no mailing list, no status subscription** on the changelog or the status page. The only way to learn about a rotation early is our own check (built 15 November, see the routine below) and asking Edgeless for an advance notice contact.

## Routine for the next rotation (added 15 November)

Nothing is approved automatically. The server only notices, pauses and tells you.

**What happens by itself.** The server reads the live manifest through the attested SDK at every start and then every 6 hours (`server/manifest-watch.ts`, one attestation per check, no prompt). On a rotation it logs:

`CometRow manifest alert: Privatemode published a new deployment manifest <digest>; chat is paused until the report approves it (docs/manifest-rotation-20261114.md)`

From then on `/api/status` says `"ready": false` with the reason "CometRow is checking an update from its AI provider. Chat is paused until the update is approved." (German in the German interface), and every user sees that sentence as the notice, unless your notice file holds text (yours wins). Send stays off, so users see a paused app, not failed messages. The stop switch and the notice file work as before. The pause clears by itself at the first check that finds the live manifest approved and served, which in practice is the start after your deploy.

Other lines: `CometRow manifest check: the live Privatemode manifest <digest> is approved and served.` is normal. `CometRow manifest alert: the live Privatemode manifest <digest> is approved, but the manifest file on the server is another one; ...` means you signed the new digest but did not upload the new manifest file (also a pause). `CometRow manifest alert: the manifest check failed (...)` means the check could not run; the status stays as it was.

**Why every 6 hours.** Privatemode limits attestations per organisation (about 6 to 10, then a 60-second pause). Each open browser session already uses one per 10 minutes. Four checks a day are like one user opening the app four times a day. A rotation is then seen within 6 hours at most; active users meet it earlier in the app itself.

**Your five steps** (about 30 to 40 minutes of your time when there is no warning):

| # | Step | Time |
| --- | --- | --- |
| 1 | You see the alert line (Render, Logs, search `CometRow manifest`) or a friend reports the paused notice. Nothing to do in the app: it is already paused | 0 min |
| 2 | Run the one command (with your go-ahead, as for any live call; during a rotation chat is paused anyway). It writes the new manifest, a report draft and your checklist, and prints every change:<br>`Invoke-WithPrivateAiSecret -Name PRIVATEMODE_API_KEY -Action { npx tsx scripts/privatemode-rotation.ts --report <your signed report.json> --write .local/privatemode-manifest.<date>.json }` | 2 min |
| 3 | Read the printed list and `.local/privatemode-manifest.<date>.checklist.md`. Any line marked WARNING (a workload added, a minimum lowered, mitigations dropped, more machines or recovery keys accepted, or a field the tool cannot read): stop, ask Edgeless, do not approve. Otherwise check the changelog entry, and ask Edgeless about a new recovery key | 10 to 15 min (plus Edgeless' answer if you wait for it) |
| 4 | Sign: open `.local/privatemode-manifest.<date>.report-draft.json`. The new digest is first, the old ones are kept. Set `reviewedAt` and `validUntil` (at most 7 days later); until then the draft cannot load. If the minimums got stricter, consider removing the old digest so a return to the weaker deployment is not accepted | 5 min |
| 5 | Upload the signed report as `qualification-privatemode.json` and, unless `inference.liveManifest` is on, the new manifest file as `privatemode-manifest.json` (exact bytes). Deploy the same commit. Check the log for `CometRow manifest check: ... approved and served.`, `/api/status` for `"ready": true`, and send one message | 10 to 15 min (mostly the Render deploy) |

The command never writes the report you pass or the approved manifest file, never approves, and never touches Render. Offline you can rerun the comparison on saved files with `--live-file <file> --approved <file>` (no key needed). Exit code 0 means nothing to do, 2 means a new manifest was written for your review.

**What the diff says.** Workloads added (warning) or removed, versus the same services renamed into a new namespace or with new policy hashes (normal for a redeployment). AMD minimum firmware, boot loader, TEE and microcode versions raised (stricter) or lowered (warning). The mitigation bit mask with more bits (stricter) or with bits dropped (warning). A new AMD launch measurement (new VM image). Intel registers RTMR 0 to 3, MRTD and MRSEAM, the minimum TCB evaluation number (lower is a warning), the allowed chip and platform lists (more is a warning), a new hardware type (warning). The recovery key replaced (ask Edgeless) or a second one added (warning). Anything else that changed is a warning saying the tool cannot interpret it. For the rotation of 14 November it prints exactly the four differences above and no warning (`tests/manifest-rotation.test.ts`).

## The live manifest switch, and why there is still downtime

`inference.liveManifest: true` in the deployment config (default off) makes the relay serve the live manifest that the server's own check read through the attested SDK, but only when the report approves its digest. Otherwise it serves the configured manifest file, as before, and refuses when neither is approved. The browser checks the digest again, unchanged. With it on, step 5 has no manifest file upload: you only sign and deploy a report with the new digest.

**There is still downtime between a rotation and your approval.** The report can only approve a digest you know, and Privatemode does not announce new digests in advance today. If it ever did, you could sign a report with both digests before the rotation, and with the switch on the relay would move to the new manifest at the next check after the rotation (within 6 hours, or at once after a restart). Without advance digests, chat is paused from the rotation until your deploy; the routine above keeps that to your 30 to 40 minutes once you see the alert.

Not verified: the server-side SDK read on Render (outbound access to Privatemode and its manifest download, and the memory for the 29 MB Wasm module at each check). Watch the first `CometRow manifest` line and the memory graph after the first deploy with this code.
