# ============================================================================
# 03-compatibility/run.ps1
# منسّق اختبارات التوافق — playwright cross-browser/device
# ============================================================================

[CmdletBinding()]
param(
    [Parameter(Mandatory)][string]$ArtifactsDir,
    [string]$Project = '',
    [switch]$SkipAccessibility
)

$ErrorActionPreference = 'Continue'
$here = $PSScriptRoot
$repoRoot = (Resolve-Path "$here/../../..").Path

if (-not (Test-Path $ArtifactsDir)) { New-Item -ItemType Directory -Path $ArtifactsDir -Force | Out-Null }

$env:COMPAT_ARTIFACTS_DIR = $ArtifactsDir
# Mirror runs on :6080 (تم النقل من :6000 لتجاوز ERR_UNSAFE_PORT في WebKit)
# نُفضّل MIRROR_BASE_URL إذا متاح، ثم COMPAT_BASE_URL، ثم نسقط على 6080.
if ($env:MIRROR_BASE_URL) { $env:COMPAT_BASE_URL = $env:MIRROR_BASE_URL }
$env:COMPAT_BASE_URL = $env:COMPAT_BASE_URL ?? 'http://localhost:6080'

# تحقق أن الواجهة قيد التشغيل
try {
    $r = Invoke-WebRequest -Uri $env:COMPAT_BASE_URL -Method Head -TimeoutSec 5 -UseBasicParsing
    Write-Host "[compat] frontend reachable: $($r.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "[compat] frontend غير قابل للوصول على $($env:COMPAT_BASE_URL)" -ForegroundColor Yellow
    Write-Host "  شغّل: pnpm dev:web أو حدّد COMPAT_BASE_URL=staging-url" -ForegroundColor Gray
}

Set-Location $repoRoot
$configPath = Join-Path $here 'playwright.compat.config.ts'

$pwArgs = @('test', '--config', $configPath)
if ($Project) { $pwArgs += @('--project', $Project) }

Write-Host ""
Write-Host "[compat] running playwright..." -ForegroundColor Cyan
pnpm --filter '@the-copy/web' exec playwright @pwArgs
$exitCode = $LASTEXITCODE

# --- Accessibility (axe-core) ---
$a11yExit = 0
if (-not $SkipAccessibility) {
    Write-Host ""
    Write-Host "[compat] running accessibility sub-package (axe-core)..." -ForegroundColor Cyan
    $a11yDir = Join-Path $ArtifactsDir 'accessibility'
    if (-not (Test-Path $a11yDir)) { New-Item -ItemType Directory -Path $a11yDir -Force | Out-Null }
    & (Join-Path $here 'accessibility/run.ps1') -ArtifactsDir $a11yDir
    $a11yExit = $LASTEXITCODE
}

$summary = @{
    category = 'compatibility'
    project = $Project
    browserExitCode = $exitCode
    a11yExitCode = $a11yExit
    status = if ($exitCode -eq 0 -and $a11yExit -eq 0) { 'pass' } else { 'fail' }
    reportDir = (Join-Path $ArtifactsDir 'playwright-report')
    resultsJson = (Join-Path $ArtifactsDir 'results.json')
    a11yDir = (Join-Path $ArtifactsDir 'accessibility')
}
$summary | ConvertTo-Json | Set-Content -Path (Join-Path $ArtifactsDir 'summary.json') -Encoding UTF8

if ($exitCode -ne 0 -or $a11yExit -ne 0) { exit 1 } else { exit 0 }
