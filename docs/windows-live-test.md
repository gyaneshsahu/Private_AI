# Windows synthetic compatibility test

Sole active workspace: `C:\Gyanesh\Startups\Private_AI`.

On 5 October 2026 the user reconfirmed the USD 2 provider/account/key cap and
disabled auto-recharge. This batch stays within that existing cap, including
prior usage. Possible later increases to USD 5 or USD 10 are not instructions
to change the provider cap or buy credits. Maximum batch scope remains one
compatibility request, then two synthetic invoice turns only after success.
No automatic retries, private data, research or qualification bypasses.

## Prepare without a key

In a Windows PowerShell terminal:

```powershell
Set-Location -LiteralPath 'C:\Gyanesh\Startups\Private_AI'
pwsh.exe -NoProfile -File .\scripts\windows-compatibility.ps1 -Prepare
```

The prompt asks for current dashboard cumulative charges, remaining balance and
model input/output rates. Enter observed values, not the USD 2 cap as a substitute
for spending. Confirm the already reported controls. The public pricing page
could not be fetched in this batch, so current dashboard rates remain required.
Only this non-secret receipt is saved to ignored `.local/windows-billing.json`.
The script never asks for a key during preparation.

Preparation requires a matching public browser preflight less than 24 hours old.
The last Windows success was 5 October 2026 at 11:10:26 UTC. Once stale, refresh
with `node scripts/local-preflight.mjs` (public attestation only, no inference).
A changed digest fails preparation; do not automatically accept it.

The new fixed approval ID is `windows_20261005_compat_usd2`, distinct from every
archived WSL approval. Its exclusive-write permit and persistent claim prevent
reissue/retry. No historical permit is overwritten. Failed preparation retains
its billing receipt for review; do not delete consumed run directories.

## Enter the key safely and run once

After preparation succeeds:

```powershell
pwsh.exe -NoProfile -File .\scripts\windows-compatibility.ps1 -Run
```

Enter the key only at its **masked `Read-Host -AsSecureString` prompt**. Do not
put it in the command, chat, `.env`, a profile, `setx`, or a saved script. The
launcher converts it in memory, sets TINFOIL_API_KEY for its own process and its
Node child, checks readiness, then invokes the one-request runner once. It clears
the environment variable and unmanaged buffer in `finally`; closing the child
PowerShell also discards its process environment. No key is printed or written
to the repository. The provider client necessarily holds the key in process
memory during the request; this is not a guarantee against privileged memory
inspection or operating-system dumps.

Omit `-Run` for readiness only (zero network requests). Setting a variable in a
separate terminal cannot update an already running Codex process; the launcher
runs the test in the same process tree that receives the key. This avoids
copying credentials into this chat or persistent settings.

The request is fixed: `Calculate 2 + 2. Reply with just the number.` Maximum
2,000 input characters, 512 output tokens, 90-second relay deadline, one forward
attempt. The gateway enforces the destination and attempt count, while the
trusted browser constructs encrypted token settings. A USD 0.01 preparation
headroom check is conservative planning, not a provider-enforced monetary limit.

## Review before the conditional invoice workflow

Results remain in `.local/experiment-runs/windows_20261005_compat_usd2/`.
Review answer 4, matching verification, normal terminal stream and relay close,
reported usage and actual billing. Partial output, missing usage or an ambiguous
failure stops the batch. Never rerun the same approval or reset its claim.

The later invoice permit is deliberately not issued before compatibility passes
and charges are reconciled. Its two turns are already within the authorized
batch, but these evidence prerequisites must pass first. No further permission
is needed for ordinary offline debugging. Full worker/GPU/retention qualification
is still NOT_PASSED, even if this transport check succeeds.
