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

Preparation already succeeded for the reported readiness failure. Do not repeat
`-Prepare` or delete its permit. That failure sent zero inference requests and
did not consume the approval. The old browser check tested full Chrome's path
while launching the headless browser. Readiness now actually launches/closes
the selected browser without navigating, before loading a credential.

Save the key once for your Windows user on this computer:

```powershell
pwsh.exe -NoProfile -File .\scripts\windows-secret.ps1 -Action Set
pwsh.exe -NoProfile -File .\scripts\windows-compatibility.ps1
```

Enter the key only at the masked prompt. The second command checks readiness
only: no inference or attestation request. All prerequisites must be true before
using `pwsh.exe -NoProfile -File .\scripts\windows-compatibility.ps1 -Run` once.
No automatic retry is performed.

The native Windows Credential Manager entry is `PrivateAI/Local/TINFOIL_API_KEY`.
It uses generic credentials with local-machine persistence: the same Windows
user on this computer, with no enterprise roaming. This follows Microsoft's
[credential persistence definitions](https://learn.microsoft.com/en-us/windows/win32/api/wincred/ns-wincred-credentialw).
It is outside the repo, Git, evidence and logs. The launcher loads it into only
its process environment for the Node child and restores that environment in
`finally`. Unmanaged buffers are cleared. The credential remains stored until
replaced or removed; same-user software can access it, and process memory is
necessarily plaintext while a client uses the key.

Do not put the key in chat, command arguments, `.env`, profiles or `setx`.
There is deliberately no command to display/export it. Manage it with:

```powershell
pwsh.exe -NoProfile -File .\scripts\windows-secret.ps1 -Action Status
pwsh.exe -NoProfile -File .\scripts\windows-secret.ps1 -Action Set
pwsh.exe -NoProfile -File .\scripts\windows-secret.ps1 -Action Remove
```

`Status` prints only presence. `Set` replaces the entry using another masked
prompt. `Remove` removes the local copy; revoke a compromised key separately at
the provider. `-Name ANOTHER_API_KEY` supports future providers under separate
named entries, but does not enable an integration or authorize spending.

If the browser cannot launch, check the non-secret diagnostic with
`node scripts/browser-runtime.mjs`. Without a custom CHROMIUM_PATH, install the
pinned browser for the same Windows user with
`npx playwright install chromium-headless-shell`, then check again. An explicit
invalid override fails closed rather than silently selecting another browser.
No TLS or Windows security policy is disabled.

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
