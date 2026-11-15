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
- **No feed, no mailing list, no status subscription** on the changelog or the status page. The only way to learn about a rotation early is our own daily check (now planned, see `docs/owner-decisions.md`) and asking Edgeless for an advance notice contact.
