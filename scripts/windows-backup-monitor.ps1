[CmdletBinding()]
param([ValidateSet('Check','Notify','Schedule','TestNotification')][string]$Action='Check')
$ErrorActionPreference='Stop'
$project=Split-Path -Parent $PSScriptRoot
if ($Action -eq 'TestNotification') {
    $shell=New-Object -ComObject WScript.Shell
    try { $null=$shell.Popup('TEST ONLY: PrivateAI backup alert delivery check. Your backup state has not changed.',5,'PrivateAI backup notification test',64) }
    finally { [Runtime.InteropServices.Marshal]::ReleaseComObject($shell) | Out-Null }
    'Test notification call completed; human visibility is not independently confirmed.'
    exit
}
if ($Action -eq 'Schedule') {
    $name='PrivateAI backup health monitor'
    if(Get-ScheduledTask -TaskName $name -ErrorAction SilentlyContinue){throw 'Monitor already exists; preserve it.'}
    $taskAction=New-ScheduledTaskAction -Execute (Get-Command pwsh).Source -Argument ('-NoProfile -WindowStyle Hidden -File "'+$PSCommandPath+'" -Action Notify') -WorkingDirectory $project
    $hourly=New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(1) -RepetitionInterval (New-TimeSpan -Hours 1)
    $logon=New-ScheduledTaskTrigger -AtLogOn -User ([Security.Principal.WindowsIdentity]::GetCurrent().Name)
    $principal=New-ScheduledTaskPrincipal -UserId ([Security.Principal.WindowsIdentity]::GetCurrent().Name) -LogonType Interactive -RunLevel Limited
    $settings=New-ScheduledTaskSettingsSet -StartWhenAvailable -ExecutionTimeLimit (New-TimeSpan -Minutes 2) -MultipleInstances IgnoreNew
    Register-ScheduledTask -TaskName $name -Action $taskAction -Trigger @($hourly,$logon) -Principal $principal -Settings $settings | Out-Null
    'Hourly and sign-in backup health monitor installed. This computer cannot alert while offline.'
    exit
}
$health=$null
try { $health=(& node --import tsx (Join-Path $project 'scripts/backup-health.ts')) | ConvertFrom-Json } catch {}
if ($health -and $health.healthy -eq $true) { 'Backup health: healthy'; exit 0 }
if ($Action -eq 'Notify') {
    try {
        $shell=New-Object -ComObject WScript.Shell
        $null=$shell.Popup('PrivateAI backup needs attention: the latest verified backup is missing, stale, failed, or recovery custody is unverified. Open PrivateAI and run the backup Status check. Do not resume invitations until reviewed.',30,'PrivateAI backup warning',48)
    } finally { if($shell){[Runtime.InteropServices.Marshal]::ReleaseComObject($shell) | Out-Null} }
}
'Backup health: attention required'
exit 1
