# ============================================================================
# 02-performance/web-vitals/run.ps1
# يستهلك apps/web/lighthouserc.json القائم — لا يعدّله
# ============================================================================

[CmdletBinding()]
param([Parameter(Mandatory)][string]$ArtifactsDir)

$ErrorActionPreference = 'Continue'
$here = $PSScriptRoot
$repoRoot = (Resolve-Path "$here/../../../..").Path
Set-Location $repoRoot

if (-not (Test-Path $ArtifactsDir)) { New-Item -ItemType Directory -Path $ArtifactsDir -Force | Out-Null }

$summary = [ordered]@{
    category = 'web-vitals'
    startedAt = (Get-Date).ToString('o')
    source = 'apps/web/lighthouserc.json'
    targetUrls = @('/', '/directors-studio', '/about', '/services')
}

Write-Host "[web-vitals] running lighthouse-ci..." -ForegroundColor Cyan
Write-Host "  source: apps/web/lighthouserc.json (مرجع لا يُعدَّل)" -ForegroundColor Gray

# اللـ output الافتراضي لـ lhci يذهب لـ .lighthouseci/ — ننقله لـ ArtifactsDir
$lhciDir = Join-Path $repoRoot 'apps/web/.lighthouseci'

# collect
$collectLog = Join-Path $ArtifactsDir 'collect.log'
pnpm --filter '@the-copy/web' lighthouse:collect 2>&1 | Tee-Object -FilePath $collectLog | Out-Null
$collectExit = $LASTEXITCODE

# assert (يقرأ من lighthouserc.json — الفشل هنا = breach للـ thresholds)
$assertLog = Join-Path $ArtifactsDir 'assert.log'
pnpm --filter '@the-copy/web' lighthouse:assert 2>&1 | Tee-Object -FilePath $assertLog | Out-Null
$assertExit = $LASTEXITCODE

# نسخ الـ artifacts
if (Test-Path $lhciDir) {
    Copy-Item -Path "$lhciDir/*" -Destination $ArtifactsDir -Recurse -Force -ErrorAction SilentlyContinue
}

$summary.endedAt = (Get-Date).ToString('o')
$summary.collectExit = $collectExit
$summary.assertExit = $assertExit
$summary.status = if ($assertExit -eq 0 -and $collectExit -eq 0) { 'pass' } else { 'fail' }
$summary | ConvertTo-Json -Depth 5 | Set-Content -Path (Join-Path $ArtifactsDir 'summary.json') -Encoding UTF8

if ($summary.status -eq 'fail') { exit 1 } else { exit 0 }
