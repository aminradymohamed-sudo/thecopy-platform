# ============================================================================
# 03-compatibility/accessibility/run.ps1
# يشغّل axe-scan + keyboard-nav specs
# ============================================================================

[CmdletBinding()]
param([Parameter(Mandatory)][string]$ArtifactsDir)

$ErrorActionPreference = 'Continue'
$here = $PSScriptRoot
$repoRoot = (Resolve-Path "$here/../../../..").Path

if (-not (Test-Path $ArtifactsDir)) { New-Item -ItemType Directory -Path $ArtifactsDir -Force | Out-Null }
Set-Location $repoRoot

$env:A11Y_ARTIFACTS_DIR = $ArtifactsDir

# تأكد من تثبيت @axe-core/playwright
$axePkgPath = Join-Path $repoRoot 'node_modules/@axe-core/playwright'
if (-not (Test-Path $axePkgPath)) {
    Write-Host "[a11y] installing @axe-core/playwright (devDep)..." -ForegroundColor Cyan
    pnpm --filter '@the-copy/web' add -D '@axe-core/playwright' 2>&1 | Out-Null
}

# تشغيل specs عبر playwright
$compatConfig = Resolve-Path (Join-Path $here '../playwright.compat.config.ts')

Write-Host "[a11y] running axe-scan + keyboard-nav..." -ForegroundColor Cyan

# نُشغّلهما بـ playwright config مستقل أو مع الموجود
# نستخدم regex في cli ليتطابق مع الملفين فقط بدلاً من تمرير مسارات مطلقة
# (بعض إصدارات pnpm/playwright تخفق في حل المسارات المطلقة عبر --filter cwd shift).
pnpm --filter '@the-copy/web' exec playwright test `
    --reporter=list `
    --reporter=json `
    --project=chromium-desktop `
    --config "$compatConfig" `
    --grep '(a11y / |keyboard / )' 2>&1 | Tee-Object -FilePath (Join-Path $ArtifactsDir 'playwright.log')

$exitCode = $LASTEXITCODE

@{
    category = 'accessibility'
    exitCode = $exitCode
    status = if ($exitCode -eq 0) { 'pass' } else { 'fail' }
    artifactsDir = $ArtifactsDir
    baseline = @(
        'artifacts/art-director/a11y-report.json',
        'artifacts/art-director/contrast-report.json',
        'output/playwright/BREAKAPP/axe-report.json'
    )
} | ConvertTo-Json -Depth 5 | Set-Content -Path (Join-Path $ArtifactsDir 'summary.json') -Encoding UTF8

exit $exitCode
