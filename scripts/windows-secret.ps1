[CmdletBinding()]
param(
    [Parameter(Mandatory)][ValidateSet('Set','Status','Remove')][string]$Action,
    [ValidatePattern('^[A-Z][A-Z0-9_]{1,63}$')][string]$Name = 'TINFOIL_API_KEY'
)
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot 'WindowsSecrets.psm1')
switch ($Action) {
    'Set' { Set-PrivateAiSecret -Name $Name; Write-Output "$Name saved/replaced in this Windows user's local credential store." }
    'Status' { [pscustomobject]@{ Name=$Name; Stored=(Test-PrivateAiSecret -Name $Name) } }
    'Remove' { Remove-PrivateAiSecret -Name $Name; Write-Output "$Name removed from the local credential store. Provider-side revocation is separate." }
}
