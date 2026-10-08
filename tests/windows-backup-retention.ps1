$ErrorActionPreference = 'Stop'
$project = Split-Path -Parent $PSScriptRoot
$root = Join-Path $project ('.local\retention-test-' + [Guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $root | Out-Null
function Assert-Root {
    if (-not $root.StartsWith((Join-Path $project '.local\retention-test-'), [StringComparison]::OrdinalIgnoreCase)) { throw 'Unsafe test directory.' }
}
$tokens=$null; $errors=$null
$ast=[Management.Automation.Language.Parser]::ParseFile((Join-Path $project 'scripts/windows-backup.ps1'),[ref]$tokens,[ref]$errors)
if ($errors.Count) { throw 'Backup script syntax failed.' }
$definition=$ast.Find({param($node) $node -is [Management.Automation.Language.FunctionDefinitionAst] -and $node.Name -eq 'Remove-ExpiredArchives'},$true)
if (-not $definition) { throw 'Retention implementation missing.' }
Invoke-Expression $definition.Extent.Text
$old='registry-'+[DateTime]::UtcNow.AddDays(-8).ToString("yyyyMMdd'T'HHmmss'Z'")+'-'+[Guid]::NewGuid().ToString('N')+'.age'
$recent='registry-'+[DateTime]::UtcNow.ToString("yyyyMMdd'T'HHmmss'Z'")+'-'+[Guid]::NewGuid().ToString('N')+'.age'
$names=@($old,$old+'.partial',$recent,'synthetic-preserve.age','config.json')
try {
    foreach($name in $names) { [IO.File]::WriteAllText((Join-Path $root $name),'synthetic retention fixture') }
    Remove-ExpiredArchives
    if ((Test-Path -LiteralPath (Join-Path $root $old)) -or (Test-Path -LiteralPath (Join-Path $root ($old+'.partial')))) { throw 'Expired archive retained.' }
    foreach($name in @($recent,'synthetic-preserve.age','config.json')) {
        if (-not (Test-Path -LiteralPath (Join-Path $root $name))) { throw 'Protected or current file removed.' }
    }
    'Retention passed: expired archives/partials removed; current archives and unrelated evidence preserved.'
} finally {
    Assert-Root
    foreach($name in $names) {
        $file=Join-Path $root $name
        if(Test-Path -LiteralPath $file) { Remove-Item -LiteralPath $file }
    }
    Remove-Item -LiteralPath $root
}
