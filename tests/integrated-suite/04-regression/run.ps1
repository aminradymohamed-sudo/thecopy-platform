# ============================================================================
# 04-regression/run.ps1
# ============================================================================

[CmdletBinding()]
param([Parameter(Mandatory)][string]$ArtifactsDir)

$ErrorActionPreference = 'Continue'
$here = $PSScriptRoot
$repoRoot = (Resolve-Path "$here/../../..").Path

if (-not (Test-Path $ArtifactsDir)) { New-Item -ItemType Directory -Path $ArtifactsDir -Force | Out-Null }
Set-Location $repoRoot

$summary = [ordered]@{
    category = 'regression'
    startedAt = (Get-Date).ToString('o')
    suites = @()
}

function Add-Suite {
    param([string]$Name, [int]$ExitCode, [string]$Output)
    $script:summary.suites += @{
        name = $Name
        exitCode = $ExitCode
        status = if ($ExitCode -eq 0) { 'pass' } else { 'fail' }
        output = $Output
    }
    Write-Host "  [$Name] $(if ($ExitCode -eq 0) { 'pass' } else { 'fail' })" -ForegroundColor $(if ($ExitCode -eq 0) { 'Green' } else { 'Red' })
}

Write-Host "[regression] running web integration (vitest)..." -ForegroundColor Cyan
$webIntLog = Join-Path $ArtifactsDir 'web-integration.log'
pnpm --filter '@the-copy/web' test:integration 2>&1 | Tee-Object -FilePath $webIntLog | Out-Null
Add-Suite 'web-integration' $LASTEXITCODE $webIntLog

Write-Host "[regression] running backend integration (vitest)..." -ForegroundColor Cyan
$beIntLog = Join-Path $ArtifactsDir 'backend-integration.log'
pnpm --filter '@the-copy/backend' test:integration 2>&1 | Tee-Object -FilePath $beIntLog | Out-Null
Add-Suite 'backend-integration' $LASTEXITCODE $beIntLog

Write-Host "[regression] running workspace unit tests (turbo test)..." -ForegroundColor Cyan
$unitLog = Join-Path $ArtifactsDir 'workspace-unit.log'
pnpm test 2>&1 | Tee-Object -FilePath $unitLog | Out-Null
Add-Suite 'workspace-unit' $LASTEXITCODE $unitLog

$cpJsonPath = Join-Path $here 'critical-paths.json'
$criticalPaths = (Get-Content $cpJsonPath -Raw | ConvertFrom-Json).criticalPaths

Write-Host "[regression] running playwright critical-paths e2e..." -ForegroundColor Cyan

$specs = @()
foreach ($cp in $criticalPaths) {
    foreach ($s in $cp.specs) {
        if ($s -like 'apps/web/tests/e2e/*.spec.ts') {
            $specs += $s
        }
    }
}

if ($specs.Count -gt 0) {
    $pwReportDir = Join-Path $ArtifactsDir 'playwright-report'
    $env:PLAYWRIGHT_HTML_REPORT = $pwReportDir
    $env:PLAYWRIGHT_JSON_OUTPUT_NAME = (Join-Path $ArtifactsDir 'playwright-results.json')

    $pwLog = Join-Path $ArtifactsDir 'playwright.log'
    $specsArg = $specs -join ' '
    pnpm --filter '@the-copy/web' exec playwright test $specs --reporter=html,json,list 2>&1 |
        Tee-Object -FilePath $pwLog | Out-Null
    Add-Suite 'playwright-critical-paths' $LASTEXITCODE $pwLog
} else {
    Write-Host "  No specs found in critical-paths.json" -ForegroundColor Yellow
}

$summary.endedAt = (Get-Date).ToString('o')
$summary.failures = ($summary.suites | Where-Object { $_.status -eq 'fail' }).Count
$summary | ConvertTo-Json -Depth 5 | Set-Content -Path (Join-Path $ArtifactsDir 'summary.json') -Encoding UTF8

if ($summary.failures -gt 0) { exit 1 } else { exit 0 }
