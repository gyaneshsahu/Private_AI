[CmdletBinding()]
param(
    [Parameter(Mandatory)][ValidateSet('Initialize','Configure','Backup','Verify','Restore','Status','Schedule')][string]$Action,
    [string]$SshTarget,
    [string]$SshIdentityFile,
    [string]$Archive,
    [string]$RestoreDirectory,
    [string]$AgeBinary
)
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$project = Split-Path -Parent $PSScriptRoot
$root = 'C:\PrivateAI-backups'
$keyName = 'PRIVATEAI_BACKUP_IDENTITY'
Import-Module (Join-Path $PSScriptRoot 'WindowsSecrets.psm1')
if (-not $AgeBinary) { $AgeBinary = Join-Path $project '.local\tools\age-v1.3.2\age\age.exe' }
if (-not [IO.Path]::IsPathFullyQualified($AgeBinary) -or -not (Test-Path -LiteralPath $AgeBinary -PathType Leaf)) { throw 'Install the verified age executable first.' }
for ($ancestor = $root; $ancestor; $ancestor = [IO.Path]::GetDirectoryName($ancestor)) {
    if (Test-Path -LiteralPath (Join-Path $ancestor '.git')) { throw 'Backup destination must be outside Git.' }
}
function Assert-Root {
    $item = Get-Item -LiteralPath $root
    if (-not $item.PSIsContainer -or ($item.Attributes -band [IO.FileAttributes]::ReparsePoint)) { throw 'Unsafe backup directory.' }
    $currentSid = [Security.Principal.WindowsIdentity]::GetCurrent().User.Value
    $permissions = Get-Acl -LiteralPath $root
    $rules = @($permissions.GetAccessRules($true, $true, [Security.Principal.SecurityIdentifier]))
    if (-not $permissions.AreAccessRulesProtected -or $rules.Count -ne 1 -or $rules[0].IdentityReference.Value -ne $currentSid -or $rules[0].AccessControlType -ne 'Allow' -or $rules[0].FileSystemRights -ne 'FullControl') { throw 'Backup directory must have only the current Windows account access.' }
}
function Invoke-Registry([string]$Operation, [string]$File) {
    $previousAge = $env:PRIVATEAI_AGE_BINARY
    $previousRestore = $env:PRIVATEAI_RESTORE_DIRECTORY
    try {
        $env:PRIVATEAI_AGE_BINARY = $AgeBinary
        $env:PRIVATEAI_RESTORE_DIRECTORY = $RestoreDirectory
        Invoke-WithPrivateAiSecret -Name $keyName -Action {
            & node --import tsx (Join-Path $project 'scripts/encrypted-registry.ts') $Operation $File
            if ($LASTEXITCODE -ne 0) { throw 'Encrypted registry verification or restore failed.' }
        }
    } finally {
        $env:PRIVATEAI_AGE_BINARY = $previousAge
        $env:PRIVATEAI_RESTORE_DIRECTORY = $previousRestore
    }
}
function Remove-ExpiredArchives {
    Assert-Root
    $cutoff = [DateTime]::UtcNow.AddDays(-7)
    foreach ($file in Get-ChildItem -LiteralPath $root -File) {
        if ($file.Name -notmatch '^registry-(\d{8}T\d{6}Z)-[a-f0-9]{32}\.age(?:\.partial)?$') { continue }
        if ($file.Attributes -band [IO.FileAttributes]::ReparsePoint) { throw 'Unsafe archive link.' }
        $created = [DateTime]::ParseExact($Matches[1], "yyyyMMdd'T'HHmmss'Z'", [Globalization.CultureInfo]::InvariantCulture, [Globalization.DateTimeStyles]::AssumeUniversal).ToUniversalTime()
        if ($created -lt $cutoff) {
            $resolvedFile = [IO.Path]::GetFullPath($file.FullName)
            if ([IO.Path]::GetDirectoryName($resolvedFile) -cne $root) { throw 'Unsafe retention target.' }
            Remove-Item -LiteralPath $resolvedFile
        }
    }
}
if ($Action -eq 'Initialize') {
    if (Test-Path -LiteralPath (Join-Path $root 'config.json')) { throw 'Already initialized; use Configure to set the SSH target.' }
    if (Test-Path -LiteralPath $root) { Assert-Root } else { New-Item -ItemType Directory -Path $root | Out-Null }
    $sid = [Security.Principal.WindowsIdentity]::GetCurrent().User
    $acl = [Security.AccessControl.DirectorySecurity]::new()
    $acl.SetAccessRuleProtection($true, $false)
    $acl.SetOwner($sid)
    $acl.AddAccessRule([Security.AccessControl.FileSystemAccessRule]::new($sid, 'FullControl', 'ContainerInherit,ObjectInherit', 'None', 'Allow'))
    Set-Acl -LiteralPath $root -AclObject $acl
    if (-not (Test-PrivateAiSecret -Name $keyName)) {
        $generated = & (Join-Path (Split-Path $AgeBinary) 'age-keygen.exe') 2>$null
        if ($LASTEXITCODE -ne 0) { throw 'Backup key generation failed.' }
        $identity = @($generated | Where-Object { $_ -match '^AGE-SECRET-KEY-1[0-9A-Z]+$' })
        if ($identity.Count -ne 1) { throw 'Invalid generated key.' }
        $secure = ConvertTo-SecureString $identity[0] -AsPlainText -Force
        try { [PrivateAi.LocalCredentials]::Save($keyName, $secure) } finally { $secure.Dispose(); $identity = $null; $generated = $null }
    }
    $recipient = Invoke-WithPrivateAiSecret -Name $keyName -Action {
        [Environment]::GetEnvironmentVariable($keyName, 'Process') | & (Join-Path (Split-Path $AgeBinary) 'age-keygen.exe') -y
        if ($LASTEXITCODE -ne 0) { throw 'Recipient derivation failed.' }
    }
    if ($recipient -notmatch '^age1[0-9a-z]{58}$') { throw 'Invalid recipient.' }
    if ($SshTarget -and $SshTarget -notmatch '^srv-[a-z0-9]+@ssh\.[a-z0-9-]+\.render\.com$') { throw 'Use the exact Render SSH target.' }
    $configFile = Join-Path $root 'config.json'
    if (Test-Path -LiteralPath $configFile) { throw 'Configuration already exists; preserve it and review any change.' }
    @{recipient=$recipient;sshTarget=$SshTarget;ageBinary=$AgeBinary;recoveryCopyVerified=$false} | ConvertTo-Json | Set-Content -LiteralPath $configFile
    Write-Output 'Backup directory restricted and key stored in Windows Credential Manager. Independent recovery-key copy is not yet verified.'
    exit
}
Assert-Root
$config = Get-Content -Raw -LiteralPath (Join-Path $root 'config.json') | ConvertFrom-Json
if ($Action -eq 'Configure') {
    if ($SshTarget -notmatch '^srv-[a-z0-9]+@ssh\.[a-z0-9-]+\.render\.com$') { throw 'Use the exact target displayed by Render.' }
    $config.sshTarget = $SshTarget
    if ($SshIdentityFile) {
        if (-not [IO.Path]::IsPathFullyQualified($SshIdentityFile) -or -not (Test-Path -LiteralPath $SshIdentityFile -PathType Leaf)) { throw 'Choose an existing absolute SSH identity path.' }
        $config | Add-Member -NotePropertyName sshIdentityFile -NotePropertyValue $SshIdentityFile -Force
    }
    $config | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $root 'config.json')
    Write-Output 'SSH target configured. Transfer remains unverified.'
    exit
}
if ($Action -eq 'Verify' -or $Action -eq 'Restore') {
    if (-not $Archive) { throw 'Choose an encrypted archive.' }
    if ($Action -eq 'Restore') {
        if ($RestoreDirectory -and [IO.Path]::GetFullPath($RestoreDirectory).TrimEnd('\') -cne $root) { throw 'Restore only into the approved protected backup directory.' }
        $RestoreDirectory = $root
    }
    Invoke-Registry $Action.ToLowerInvariant() $Archive
    exit
}
if ($Action -eq 'Schedule') {
    if (-not $config.sshTarget) { throw 'Configure and test SSH transfer before scheduling.' }
    $receiptFile = Join-Path $root 'status.json'
    if (-not (Test-Path -LiteralPath $receiptFile)) { throw 'A verified real transfer is required before scheduling.' }
    $scheduleReceipt = Get-Content -Raw -LiteralPath $receiptFile | ConvertFrom-Json
    if ($scheduleReceipt.outcome -ne 'VERIFIED' -or -not $config.recoveryCopyVerified) { throw 'Verify transfer and independent recovery-key custody before scheduling.' }
    $taskName = 'PrivateAI encrypted registry backup'
    if (Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue) { throw 'Task exists; do not overwrite without review.' }
    $executable = (Get-Command pwsh).Source
    $taskAction = New-ScheduledTaskAction -Execute $executable -Argument ('-NoProfile -File "' + $PSCommandPath + '" -Action Backup') -WorkingDirectory $project
    $trigger = New-ScheduledTaskTrigger -Daily -At '09:00'
    $principal = New-ScheduledTaskPrincipal -UserId ([Security.Principal.WindowsIdentity]::GetCurrent().Name) -LogonType Interactive -RunLevel Limited
    $settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -ExecutionTimeLimit (New-TimeSpan -Minutes 5) -MultipleInstances IgnoreNew
    Register-ScheduledTask -TaskName $taskName -Action $taskAction -Trigger $trigger -Principal $principal -Settings $settings | Out-Null
    Write-Output 'Daily backup scheduled at 09:00 Windows local time, while this user is signed in. Missed work runs when available.'
    exit
}
if ($Action -eq 'Status') {
    $statusFile = Join-Path $root 'status.json'
    if (-not (Test-Path -LiteralPath $statusFile)) { throw 'No verified backup receipt exists.' }
    $receipt = Get-Content -Raw -LiteralPath $statusFile | ConvertFrom-Json
    $stale = -not $receipt.lastSuccess -or ([DateTime]::UtcNow - [DateTime]::Parse($receipt.lastSuccess).ToUniversalTime()).TotalHours -gt 24
    @{stale=$stale;lastSuccess=$receipt.lastSuccess;lastAttempt=$receipt.lastAttempt;outcome=$receipt.outcome;recoveryCopyVerified=$config.recoveryCopyVerified} | ConvertTo-Json
    if ($stale -or $receipt.outcome -ne 'VERIFIED') { exit 1 }; exit
}
$lastSuccess = $null
$statusFile = Join-Path $root 'status.json'
if (Test-Path -LiteralPath $statusFile) { $lastSuccess = (Get-Content -Raw -LiteralPath $statusFile | ConvertFrom-Json).lastSuccess }
$outcome = 'FAILED'
try {
    if ($config.sshTarget -notmatch '^srv-[a-z0-9]+@ssh\.[a-z0-9-]+\.render\.com$' -or $config.recipient -notmatch '^age1[0-9a-z]{58}$') { throw 'Invalid transfer configuration.' }
    $name = 'registry-' + [DateTime]::UtcNow.ToString("yyyyMMdd'T'HHmmss'Z'") + '-' + [Guid]::NewGuid().ToString('N') + '.age'
    $partial = Join-Path $root ($name + '.partial')
    $start = [Diagnostics.ProcessStartInfo]::new('ssh.exe')
    $start.UseShellExecute=$false; $start.CreateNoWindow=$true; $start.RedirectStandardOutput=$true; $start.RedirectStandardError=$true
    if (-not $config.PSObject.Properties['sshIdentityFile'] -or -not (Test-Path -LiteralPath $config.sshIdentityFile -PathType Leaf)) { throw 'Configure the registered SSH identity path.' }
    $knownHosts = Join-Path $root 'known_hosts'
    if (-not (Test-Path -LiteralPath $knownHosts -PathType Leaf)) { throw 'Pin the verified Render host key before transfer.' }
    foreach ($arg in @('-T','-i',$config.sshIdentityFile,'-o','IdentitiesOnly=yes','-o','BatchMode=yes','-o','StrictHostKeyChecking=yes','-o',('UserKnownHostsFile='+$knownHosts),'-o','ConnectTimeout=15',$config.sshTarget,'node --import tsx scripts/encrypted-registry.ts export ' + $config.recipient)) { $start.ArgumentList.Add($arg) }
    $process = [Diagnostics.Process]::Start($start)
    $errorTask = $process.StandardError.ReadToEndAsync()
    $stream = [IO.File]::Open($partial,[IO.FileMode]::CreateNew,[IO.FileAccess]::Write)
    try {
        $buffer = [byte[]]::new(65536); $total=0
        $deadline = [DateTime]::UtcNow.AddSeconds(90)
        while ($true) {
            $remaining = [int]($deadline - [DateTime]::UtcNow).TotalMilliseconds
            if ($remaining -le 0) { throw 'Backup transfer timed out.' }
            $read = $process.StandardOutput.BaseStream.ReadAsync($buffer,0,$buffer.Length)
            if (-not $read.Wait($remaining)) { throw 'Backup transfer timed out.' }
            $count = $read.Result; if ($count -eq 0) { break }
            $total += $count; if ($total -gt 16MB) { throw 'Backup exceeds size bound.' }
            $stream.Write($buffer,0,$count)
        }
        if (-not $process.WaitForExit(10000) -or $process.ExitCode -ne 0) { throw 'SSH backup failed.' }
    } finally { $stream.Dispose(); if (-not $process.HasExited) { $process.Kill($true) }; $process.Dispose() }
    $verification = Invoke-Registry 'verify' $partial
    if (-not ($verification | ConvertFrom-Json).verified) { throw 'Backup verification failed.' }
    Move-Item -LiteralPath $partial -Destination (Join-Path $root $name)
    $lastSuccess = [DateTime]::UtcNow.ToString('o'); $outcome='VERIFIED'
} catch {
    Write-Warning 'PrivateAI backup failed. Inspect configuration/access; no sensitive diagnostic is logged.'
} finally {
    try { Remove-ExpiredArchives } catch { $outcome='RETENTION_FAILED' }
    @{lastAttempt=[DateTime]::UtcNow.ToString('o');lastSuccess=$lastSuccess;outcome=$outcome} | ConvertTo-Json | Set-Content -LiteralPath $statusFile
}
if ($outcome -ne 'VERIFIED') { exit 1 }
Write-Output 'Encrypted backup transferred and authenticated; seven-day local retention applied.'
