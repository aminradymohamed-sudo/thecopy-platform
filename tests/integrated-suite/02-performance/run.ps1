# ============================================================================
# 02-performance/run.ps1
# منسّق سيناريوهات الأداء — يستدعي k6 لكل سيناريو
# ============================================================================

[CmdletBinding()]
param(
    [Parameter(Mandatory)][string]$ArtifactsDir,
    [ValidateSet('all','load','stress','soak','spike','scalability','web-vitals')]
    [string]$Scenario = 'all'
)

$ErrorActionPreference = 'Continue'
$here = $PSScriptRoot
$scenariosDir = Join-Path $here 'scenarios'

if (-not (Test-Path $ArtifactsDir)) { New-Item -ItemType Directory -Path $ArtifactsDir -Force | Out-Null }

if (-not (Get-Command k6 -ErrorAction SilentlyContinue)) {
    Write-Host "[performance] k6 غير مثبت — تخطي" -ForegroundColor Yellow
    Write-Host "  Windows: winget install k6.k6" -ForegroundColor Gray
    Write-Host "  Linux:   sudo apt install k6" -ForegroundColor Gray
    @{ status = 'tool-missing'; tool = 'k6' } | ConvertTo-Json | Set-Content -Path (Join-Path $ArtifactsDir 'summary.json') -Encoding UTF8
    exit 0  # tool-missing لا يفشّل الحزمة هنا — لكن RC في 06 يحجبه
}

$summary = [ordered]@{
    category = 'performance'
    startedAt = (Get-Date).ToString('o')
    scenarios = @()
}

$scenariosToRun = if ($Scenario -eq 'all') {
    @('load','stress','soak','spike','scalability')
} else {
    @($Scenario)
}

# تشغيل web-vitals (Lighthouse) دائماً عند 'all' أو عند طلبه صراحة
if ($Scenario -in @('all','web-vitals')) {
    Write-Host ""
    Write-Host "[performance] running web-vitals (Lighthouse CI)..." -ForegroundColor Cyan
    $wvDir = Join-Path $ArtifactsDir 'web-vitals'
    if (-not (Test-Path $wvDir)) { New-Item -ItemType Directory -Path $wvDir -Force | Out-Null }
    & (Join-Path $here 'web-vitals/run.ps1') -ArtifactsDir $wvDir
    $wvExit = $LASTEXITCODE
    $summary.scenarios += @{
        scenario = 'web-vitals'
        exitCode = $wvExit
        status = if ($wvExit -eq 0) { 'pass' } else { 'fail' }
        artifacts = @($wvDir)
    }
    if ($Scenario -eq 'web-vitals') {
        # لو طُلب web-vitals وحده، توقّف هنا
        $summary.endedAt = (Get-Date).ToString('o')
        $summary.failures = ($summary.scenarios | Where-Object { $_.status -eq 'fail' }).Count
        $summary | ConvertTo-Json -Depth 5 | Set-Content -Path (Join-Path $ArtifactsDir 'summary.json') -Encoding UTF8
        if ($summary.failures -gt 0) { exit 1 } else { exit 0 }
    }
}

foreach ($s in $scenariosToRun) {
    $script = Join-Path $scenariosDir "$s.k6.js"
    if (-not (Test-Path $script)) {
        Write-Host "[performance] $s : script غير موجود" -ForegroundColor Yellow
        continue
    }

    $jsonOut = Join-Path $ArtifactsDir "$s.json"
    $summaryOut = Join-Path $ArtifactsDir "$s.summary.html"

    Write-Host ""
    Write-Host "[performance] running $s..." -ForegroundColor Cyan
    Write-Host "  script: $script"
    Write-Host "  output: $jsonOut"

    $startedAt = Get-Date

    # k6 args
    $k6Args = @(
        'run',
        '--summary-export', $jsonOut,
        '--out', "json=$($jsonOut + '.lines')"
    )

    # soak يأخذ وقتاً طويلاً — اسمح بتقصير عبر env
    if ($s -eq 'soak' -and -not $env:K6_SOAK_DURATION) {
        Write-Host "  HINT: soak default duration is 2h — set K6_SOAK_DURATION=10m للتجربة السريعة" -ForegroundColor Gray
    }

    & k6 @k6Args $script
    $exitCode = $LASTEXITCODE
    $endedAt = Get-Date

    $summary.scenarios += [ordered]@{
        scenario = $s
        exitCode = $exitCode
        status = if ($exitCode -eq 0) { 'pass' } else { 'fail' }
        durationSeconds = [int]($endedAt - $startedAt).TotalSeconds
        artifacts = @($jsonOut, $summaryOut)
    }
}

$summary.endedAt = (Get-Date).ToString('o')
$summary.failures = ($summary.scenarios | Where-Object { $_.status -eq 'fail' }).Count
$summary | ConvertTo-Json -Depth 5 | Set-Content -Path (Join-Path $ArtifactsDir 'summary.json') -Encoding UTF8

if ($summary.failures -gt 0) { exit 1 } else { exit 0 }
