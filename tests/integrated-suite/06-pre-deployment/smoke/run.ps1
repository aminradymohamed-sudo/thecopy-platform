# ============================================================================
# smoke/run.ps1 — اختبار الدخان: هل التطبيق يعمل أصلاً؟
# سريع جداً (< 2 دقيقة) — يُشغَّل في staging قبل وبعد النشر مباشرة
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

$results = [ordered]@{
    category = 'smoke'
    startedAt = (Get-Date).ToString('o')
    baseUrl = $baseUrl
    apiUrl = $apiUrl
    checks = @()
}

function Add-Check {
    param([string]$Name, [bool]$Passed, [string]$Detail)
    $script:results.checks += @{
        name = $Name
        status = if ($Passed) { 'pass' } else { 'fail' }
        detail = $Detail
    }
    Write-Host "  [$Name] $(if ($Passed) { 'pass' } else { 'fail' }) — $Detail" -ForegroundColor $(if ($Passed) { 'Green' } else { 'Red' })
}

# 1. frontend root
try {
    $r = Invoke-WebRequest -Uri "$baseUrl/" -Method Get -TimeoutSec 10 -UseBasicParsing
    Add-Check 'frontend-root' ($r.StatusCode -eq 200) "status=$($r.StatusCode)"
} catch {
    Add-Check 'frontend-root' $false $_.Exception.Message
}

# 2. backend health
try {
    $r = Invoke-WebRequest -Uri "$apiUrl/health" -Method Get -TimeoutSec 10 -UseBasicParsing
    Add-Check 'backend-health' ($r.StatusCode -eq 200) "status=$($r.StatusCode)"
} catch {
    Add-Check 'backend-health' $false $_.Exception.Message
}

# 3. backend api/health
try {
    $r = Invoke-WebRequest -Uri "$apiUrl/api/health" -Method Get -TimeoutSec 10 -UseBasicParsing
    Add-Check 'api-health' ($r.StatusCode -eq 200) "status=$($r.StatusCode)"
} catch {
    Add-Check 'api-health' $false $_.Exception.Message
}

# 4. critical static assets
try {
    $r = Invoke-WebRequest -Uri "$baseUrl/_next/static/" -Method Head -TimeoutSec 10 -UseBasicParsing -SkipHttpErrorCheck
    Add-Check 'static-assets-reachable' ($r.StatusCode -lt 500) "status=$($r.StatusCode)"
} catch {
    Add-Check 'static-assets-reachable' $false $_.Exception.Message
}

# 5. CORS / security headers presence
try {
    $r = Invoke-WebRequest -Uri "$baseUrl/" -Method Get -TimeoutSec 10 -UseBasicParsing
    $headers = $r.Headers
    $hasXContent = $headers.ContainsKey('X-Content-Type-Options')
    $hasXFrame = $headers.ContainsKey('X-Frame-Options') -or $headers.ContainsKey('Content-Security-Policy')
    Add-Check 'security-headers-present' ($hasXContent -and $hasXFrame) "X-Content-Type=$hasXContent, X-Frame/CSP=$hasXFrame"
} catch {
    Add-Check 'security-headers-present' $false $_.Exception.Message
}

# 6. playwright smoke spec (single critical path)
try {
    $smokeSpec = Join-Path $here 'tests/post-deploy.spec.ts'
    $predeployConfig = Resolve-Path (Join-Path $here '../playwright.predeploy.config.ts')
    if (Test-Path $smokeSpec) {
        Write-Host "  running playwright smoke spec..." -ForegroundColor Cyan
        $env:SMOKE_BASE_URL = $baseUrl
        $env:SMOKE_API_URL = $apiUrl
        $env:PRE_DEPLOY_BASE_URL = $baseUrl
        $env:PRE_DEPLOY_API_URL = $apiUrl
        $env:PRE_DEPLOY_ARTIFACTS_DIR = $ArtifactsDir
        pnpm --filter '@the-copy/web' exec playwright test --config "$predeployConfig" --grep 'Post-deploy smoke' --reporter=list 2>&1 |
            Tee-Object -FilePath (Join-Path $ArtifactsDir 'playwright-smoke.log') | Out-Null
        Add-Check 'playwright-smoke' ($LASTEXITCODE -eq 0) "exit=$LASTEXITCODE"
    }
} catch {
    Add-Check 'playwright-smoke' $false $_.Exception.Message
}

$results.endedAt = (Get-Date).ToString('o')
$results.failures = ($results.checks | Where-Object { $_.status -eq 'fail' }).Count
$results | ConvertTo-Json -Depth 5 | Set-Content -Path (Join-Path $ArtifactsDir 'summary.json') -Encoding UTF8

Write-Host ""
Write-Host "smoke result: $($results.failures) failures of $($results.checks.Count) checks" -ForegroundColor $(if ($results.failures -eq 0) { 'Green' } else { 'Red' })

if ($results.failures -gt 0) { exit 1 } else { exit 0 }
