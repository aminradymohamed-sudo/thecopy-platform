# ============================================================================
# system/run.ps1 — اختبار النظام ككتلة واحدة متكاملة (E2E عرضي)
# ============================================================================

[CmdletBinding()]
param([Parameter(Mandatory)][string]$ArtifactsDir)

$ErrorActionPreference = 'Continue'
$here = $PSScriptRoot
$repoRoot = (Resolve-Path "$here/../../../..").Path

if (-not (Test-Path $ArtifactsDir)) { New-Item -ItemType Directory -Path $ArtifactsDir -Force | Out-Null }
Set-Location $repoRoot

$baseUrl = $env:PRE_DEPLOY_BASE_URL ?? 'http://localhost:5000'
$apiUrl = $env:PRE_DEPLOY_API_URL ?? ($baseUrl -replace ':5000', ':3001')
$systemSpec = Join-Path $here 'tests/system.spec.ts'
$predeployConfig = Resolve-Path (Join-Path $here '../playwright.predeploy.config.ts')

if (-not (Test-Path $systemSpec)) {
    Write-Host "[system] spec غير موجود: $systemSpec" -ForegroundColor Yellow
    exit 1
}

$env:SYSTEM_BASE_URL = $baseUrl
$env:SYSTEM_API_URL = $apiUrl
$env:PRE_DEPLOY_BASE_URL = $baseUrl
$env:PRE_DEPLOY_API_URL = $apiUrl
$env:PRE_DEPLOY_ARTIFACTS_DIR = $ArtifactsDir
$env:PLAYWRIGHT_HTML_REPORT = (Join-Path $ArtifactsDir 'playwright-report')

Write-Host ""
Write-Host "[system] running E2E system tests..." -ForegroundColor Cyan
pnpm --filter '@the-copy/web' exec playwright test --config "$predeployConfig" --grep 'System E2E' --reporter=list 2>&1 |
    Tee-Object -FilePath (Join-Path $ArtifactsDir 'playwright.log')
$exitCode = $LASTEXITCODE

@{
    category = 'system'
    exitCode = $exitCode
    status = if ($exitCode -eq 0) { 'pass' } else { 'fail' }
    reportDir = (Join-Path $ArtifactsDir 'playwright-report')
} | ConvertTo-Json | Set-Content -Path (Join-Path $ArtifactsDir 'summary.json') -Encoding UTF8

exit $exitCode
