[CmdletBinding()]
param()
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$project = Split-Path -Parent $PSScriptRoot
Import-Module (Join-Path $PSScriptRoot 'WindowsSecrets.psm1')
if (-not (Test-PrivateAiSecret -Name BRAVE_SEARCH_API_KEY)) {
    throw 'Store BRAVE_SEARCH_API_KEY using windows-secret.ps1 first.'
}
if (-not (Test-Path -LiteralPath (Join-Path $project 'dist/index.html'))) {
    throw 'Run npm run build before starting the preview.'
}
$names = @('PORT','PRIVATEAI_ORIGIN','PRIVATEAI_INVITES_FILE','PRIVATEAI_ACCESS_KEY','PRIVATEAI_QUALIFICATION_FILE','TINFOIL_API_KEY')
$previous = @{}
foreach ($name in $names) { $previous[$name] = [Environment]::GetEnvironmentVariable($name, 'Process') }
Push-Location $project
try {
    $env:PORT = '4173'
    $env:PRIVATEAI_ORIGIN = 'http://127.0.0.1:4173'
    $env:PRIVATEAI_INVITES_FILE = ''
    $env:PRIVATEAI_ACCESS_KEY = ''
    $env:PRIVATEAI_QUALIFICATION_FILE = '.local/search-preview-no-qualification.json'
    $env:TINFOIL_API_KEY = ''
    Write-Output 'Local search preview: http://127.0.0.1:4173 — public queries only; AI chat remains unavailable. Ctrl+C stops the server.'
    Invoke-WithPrivateAiSecret -Name BRAVE_SEARCH_API_KEY -Action {
        node --use-system-ca --import tsx server/index.ts
        if ($LASTEXITCODE -ne 0) { throw 'Preview server stopped with an error.' }
    }
} finally {
    foreach ($name in $names) { [Environment]::SetEnvironmentVariable($name, $previous[$name], 'Process') }
    Pop-Location
}
