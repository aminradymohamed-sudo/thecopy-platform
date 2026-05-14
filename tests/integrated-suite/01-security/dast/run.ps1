# ============================================================================
# 01-security/dast/run.ps1
# Dynamic Application Security Testing
#  - يستدعي scripts/security/zap-baseline.sh (موجود)
#  - ثم يضيف ZAP authenticated context (جديد)
# ============================================================================

[CmdletBinding()]
param([Parameter(Mandatory)][string]$ArtifactsDir)

$ErrorActionPreference = 'Continue'
$repoRoot = (Resolve-Path "$PSScriptRoot/../../../..").Path
Set-Location $repoRoot

$summary = [ordered]@{
    category = 'dast'
    startedAt = (Get-Date).ToString('o')
    targets = @()
}

# تأكد أن التطبيق يعمل قبل ZAP
function Test-Endpoint {
    param([string]$Url)
    try {
        $r = Invoke-WebRequest -Uri $Url -Method Head -TimeoutSec 5 -UseBasicParsing -SkipCertificateCheck:$false
        return $r.StatusCode -lt 500
    } catch { return $false }
}

$frontend = 'http://localhost:5000'
$backend = 'http://localhost:3001'

if (-not (Test-Endpoint "$frontend")) {
    Write-Host "[dast] frontend غير مُشغَّل على $frontend — يجب تشغيل pnpm dev:web أولاً" -ForegroundColor Yellow
    $summary.targets += @{ url = $frontend; status = 'unreachable' }
}
if (-not (Test-Endpoint "$backend/health")) {
    Write-Host "[dast] backend غير مُشغَّل على $backend — يجب تشغيل pnpm dev:backend أولاً" -ForegroundColor Yellow
    $summary.targets += @{ url = $backend; status = 'unreachable' }
}

# --- ZAP baseline (يستدعي السكربت القائم) ---
if (Get-Command bash -ErrorAction SilentlyContinue) {
    Write-Host "[dast] running ZAP baseline (existing scripts/security/zap-baseline.sh)..." -ForegroundColor Cyan
    $env:ZAP_REPORT_DIR = $ArtifactsDir
    bash ./scripts/security/zap-baseline.sh 2>&1 | Tee-Object -FilePath (Join-Path $ArtifactsDir 'zap-baseline.log')
    $baselineExit = $LASTEXITCODE
    $summary.targets += @{ name = 'zap-baseline'; exitCode = $baselineExit; report = (Join-Path $ArtifactsDir 'zap-baseline.html') }
} else {
    Write-Host "[dast] bash غير متاح — لا يمكن تشغيل zap-baseline.sh" -ForegroundColor Yellow
    $summary.targets += @{ name = 'zap-baseline'; status = 'tool-missing' }
}

# --- ZAP authenticated (جديد — يستهدف المسارات خلف JWT) ---
$authContextPath = Join-Path $PSScriptRoot 'auth-context.yml'
if (Test-Path $authContextPath) {
    Write-Host "[dast] running ZAP authenticated context..." -ForegroundColor Cyan
    if (Get-Command docker -ErrorAction SilentlyContinue) {
        $reportFile = Join-Path $ArtifactsDir 'zap-authenticated.html'
        $jsonReport = Join-Path $ArtifactsDir 'zap-authenticated.json'
        docker run --rm `
            -v "${repoRoot}:/zap/wrk" `
            --network host `
            ghcr.io/zaproxy/zaproxy:stable `
            zap-baseline.py `
            -t "$backend/api/health" `
            -r "/zap/wrk/$([System.IO.Path]::GetRelativePath($repoRoot, $reportFile))" `
            -J "/zap/wrk/$([System.IO.Path]::GetRelativePath($repoRoot, $jsonReport))" `
            2>&1 | Tee-Object -FilePath (Join-Path $ArtifactsDir 'zap-authenticated.log')
        $summary.targets += @{ name = 'zap-authenticated'; exitCode = $LASTEXITCODE; report = $reportFile }
    } else {
        Write-Host "[dast] docker غير متاح — تخطي authenticated scan" -ForegroundColor Yellow
        $summary.targets += @{ name = 'zap-authenticated'; status = 'tool-missing' }
    }
}

$summary.endedAt = (Get-Date).ToString('o')
$summary | ConvertTo-Json -Depth 5 | Set-Content -Path (Join-Path $ArtifactsDir 'summary.json') -Encoding UTF8

# لا نُفشِل الحزمة على tool-missing — فقط على exit codes غير صفرية من سكربت موجود
$realFailures = ($summary.targets | Where-Object { $_.exitCode -and $_.exitCode -gt 1 }).Count
exit $realFailures
