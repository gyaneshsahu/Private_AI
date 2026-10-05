$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot 'WindowsSecrets.psm1')
$name = 'PRIVATEAI_TEST_' + [Guid]::NewGuid().ToString('N').ToUpperInvariant()
$secret = [Security.SecureString]::new()
foreach ($char in 'SYNTHETIC_ONLY_credential_test'.ToCharArray()) { $secret.AppendChar($char) }
try {
    if (Test-PrivateAiSecret $name) { throw 'Test namespace unexpectedly exists.' }
    [PrivateAi.LocalCredentials]::Save($name, $secret)
    if (-not (Test-PrivateAiSecret $name)) { throw 'Save failed.' }
    Invoke-WithPrivateAiSecret -Name $name -Action {
        if ([Environment]::GetEnvironmentVariable($name, 'Process') -cne 'SYNTHETIC_ONLY_credential_test') { throw 'Roundtrip failed.' }
    }
    if ([Environment]::GetEnvironmentVariable($name, 'Process')) { throw 'Environment leaked after success.' }
    $secret.Clear(); foreach ($char in 'SYNTHETIC_ONLY_replacement'.ToCharArray()) { $secret.AppendChar($char) }
    [PrivateAi.LocalCredentials]::Save($name, $secret)
    try {
        Invoke-WithPrivateAiSecret -Name $name -Action {
            if ([Environment]::GetEnvironmentVariable($name, 'Process') -cne 'SYNTHETIC_ONLY_replacement') { throw 'Replacement failed.' }
            throw 'Expected test failure'
        }
    } catch { if ($_.Exception.Message -cne 'Expected test failure') { throw } }
    if ([Environment]::GetEnvironmentVariable($name, 'Process')) { throw 'Environment leaked after failure.' }
    Remove-PrivateAiSecret $name
    if (Test-PrivateAiSecret $name) { throw 'Removal failed.' }
    Write-Output 'Credential Manager synthetic lifecycle passed: save, read, replace, cleanup on success/failure, remove. No real API key accessed.'
} finally {
    Remove-PrivateAiSecret $name
    [Environment]::SetEnvironmentVariable($name, $null, 'Process')
    $secret.Dispose()
}
