[CmdletBinding()]
param([switch]$Prepare, [switch]$Run)
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
if ($Prepare -and $Run) { throw 'Prepare and Run must be separate.' }
$projectRoot = Split-Path -Parent $PSScriptRoot
Push-Location -LiteralPath $projectRoot
try {
    if ($Prepare) {
        if (Test-Path -LiteralPath '.local/compatibility.json') { throw 'A permit already exists. Do not overwrite or reissue it.' }
        $culture = [Globalization.CultureInfo]::InvariantCulture
        $receipt = [ordered]@{
            checkedAt = [DateTime]::UtcNow.ToString('o')
            cumulativeSpentUSD = [double]::Parse((Read-Host 'Dashboard cumulative charges in USD, including previous tests (use decimal point)'), $culture)
            remainingBalanceUSD = [double]::Parse((Read-Host 'Dashboard remaining available balance in USD'), $culture)
            accountCapUSD = 2
            autoRechargeDisabled = $false
            keyMatchesCappedAccount = $false
            inputPerMillion = [double]::Parse((Read-Host 'Current gpt-oss-120b price in USD per million INPUT tokens'), $culture)
            outputPerMillion = [double]::Parse((Read-Host 'Current gpt-oss-120b price in USD per million OUTPUT tokens'), $culture)
            noAdditionalRequestFee = $false
        }
        if ((Read-Host 'Confirm account/key cap USD 2, auto-recharge OFF, same capped account, and no extra request fee: type CONFIRMED') -cne 'CONFIRMED') { throw 'Billing controls not confirmed.' }
        $receipt.autoRechargeDisabled = $true
        $receipt.keyMatchesCappedAccount = $true
        $receipt.noAdditionalRequestFee = $true
        [IO.Directory]::CreateDirectory((Join-Path $projectRoot '.local')) | Out-Null
        $receiptPath = Join-Path $projectRoot '.local/windows-billing.json'
        $bytes = [Text.Encoding]::UTF8.GetBytes(($receipt | ConvertTo-Json))
        $stream = [IO.File]::Open($receiptPath, [IO.FileMode]::CreateNew, [IO.FileAccess]::Write)
        try { $stream.Write($bytes, 0, $bytes.Length) } finally { $stream.Dispose() }
        & node --import tsx evaluation/prepare-windows-compatibility.ts
        if ($LASTEXITCODE -ne 0) { throw 'Preparation failed; evidence preserved. No inference sent.' }
        return
    }
    if (-not (Test-Path -LiteralPath '.local/compatibility.json')) { throw 'Prepare the bounded permit first with -Prepare. No key is needed for preparation.' }
    $permit = Get-Content -Raw -LiteralPath '.local/compatibility.json' | ConvertFrom-Json
    if ($permit.approvalId -cne 'windows_20261005_compat_usd2' -or $permit.scenario -cne 'adapter_compatibility' -or $permit.approvedCapUSD -ne 2 -or $permit.providerCapUSD -ne 2) {
        throw 'This launcher requires the fresh Windows USD 2 compatibility approval, not a historical permit.'
    }
    if (Test-Path -LiteralPath '.local/experiment-runs/windows_20261005_compat_usd2') { throw 'Approval already consumed. No retry.' }
    & node scripts/browser-runtime.mjs
    if ($LASTEXITCODE -ne 0) { throw 'Browser cannot launch. Follow the setup instruction above; no secret was loaded and no inference sent.' }
    Import-Module (Join-Path $PSScriptRoot 'WindowsSecrets.psm1')
    if (-not (Test-PrivateAiSecret -Name 'TINFOIL_API_KEY')) {
        throw 'Store the key once with: pwsh -NoProfile -File .\scripts\windows-secret.ps1 -Action Set'
    }
    Invoke-WithPrivateAiSecret -Name 'TINFOIL_API_KEY' -Action {
        & node --use-system-ca --import tsx evaluation/run-local.ts --check --compatibility
        if ($LASTEXITCODE -ne 0) { throw 'Readiness failed. No inference request made.' }
        if ($Run) {
            & node --use-system-ca --import tsx evaluation/run-local.ts --run --compatibility
            if ($LASTEXITCODE -ne 0) { throw 'Run stopped. No retry. Preserve its result and consumed claim.' }
        }
    }
} finally { Pop-Location }
