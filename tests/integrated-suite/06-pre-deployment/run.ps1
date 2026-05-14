# ============================================================================
# 06-pre-deployment/run.ps1
# منسّق ما قبل النشر — smoke + system + UAT scaffolding + RC checklist
# ============================================================================

[CmdletBinding()]
param(
    [Parameter(Mandatory)][string]$ArtifactsDir,
    [ValidateSet('all','smoke','system','uat-scaffold','rc-scaffold')]
    [string]$Layer = 'all'
)

$ErrorActionPreference = 'Continue'
$here = $PSScriptRoot

if (-not (Test-Path $ArtifactsDir)) { New-Item -ItemType Directory -Path $ArtifactsDir -Force | Out-Null }

$summary = [ordered]@{
    category = 'pre-deployment'
    startedAt = (Get-Date).ToString('o')
    baseUrl = $env:PRE_DEPLOY_BASE_URL ?? 'http://localhost:5000'
    layers = @()
}

function Add-Layer {
    param([string]$Name, [int]$ExitCode, [string]$Notes)
    $script:summary.layers += @{
        name = $Name
        exitCode = $ExitCode
        status = if ($ExitCode -eq 0) { 'pass' } else { 'fail' }
        notes = $Notes
    }
    Write-Host "  [$Name] $(if ($ExitCode -eq 0) { 'pass' } else { 'fail' })" -ForegroundColor $(if ($ExitCode -eq 0) { 'Green' } else { 'Red' })
}

# --- smoke ---
if ($Layer -in @('all','smoke')) {
    Write-Host ""
    Write-Host "[pre-deploy] running smoke..." -ForegroundColor Cyan
    $smokeDir = Join-Path $ArtifactsDir 'smoke'
    if (-not (Test-Path $smokeDir)) { New-Item -ItemType Directory -Path $smokeDir -Force | Out-Null }
    $smokeRunner = Join-Path $here 'smoke/run.ps1'
    if (Test-Path $smokeRunner) {
        & $smokeRunner -ArtifactsDir $smokeDir
        Add-Layer 'smoke' $LASTEXITCODE 'تشغيل صريح من runner خاص'
    } else {
        Add-Layer 'smoke' 1 'runner غير موجود'
    }
}

# --- system ---
if ($Layer -in @('all','system')) {
    Write-Host ""
    Write-Host "[pre-deploy] running system..." -ForegroundColor Cyan
    $systemDir = Join-Path $ArtifactsDir 'system'
    if (-not (Test-Path $systemDir)) { New-Item -ItemType Directory -Path $systemDir -Force | Out-Null }
    $systemRunner = Join-Path $here 'system/run.ps1'
    if (Test-Path $systemRunner) {
        & $systemRunner -ArtifactsDir $systemDir
        Add-Layer 'system' $LASTEXITCODE 'تشغيل صريح من runner خاص'
    } else {
        Add-Layer 'system' 1 'runner غير موجود'
    }
}

# --- UAT scaffolding ---
if ($Layer -in @('all','uat-scaffold')) {
    Write-Host ""
    Write-Host "[pre-deploy] preparing UAT artifacts..." -ForegroundColor Cyan
    $uatDir = Join-Path $ArtifactsDir 'uat'
    if (-not (Test-Path $uatDir)) { New-Item -ItemType Directory -Path $uatDir -Force | Out-Null }
    Copy-Item (Join-Path $here 'uat/scenarios.md') -Destination $uatDir -Force
    Copy-Item (Join-Path $here 'uat/acceptance-criteria.md') -Destination $uatDir -Force
    Add-Layer 'uat-scaffold' 0 'القوالب جُهِّزت — يحتاج تعبئة من صاحب المنتج'
}

# --- RC scaffolding ---
if ($Layer -in @('all','rc-scaffold')) {
    Write-Host ""
    Write-Host "[pre-deploy] preparing RC checklist..." -ForegroundColor Cyan
    $rcDir = Join-Path $ArtifactsDir 'rc'
    if (-not (Test-Path $rcDir)) { New-Item -ItemType Directory -Path $rcDir -Force | Out-Null }
    Copy-Item (Join-Path $here 'rc/release-candidate-checklist.md') -Destination $rcDir -Force
    Copy-Item (Join-Path $here 'rc/rc-decision-template.md') -Destination (Join-Path $ArtifactsDir 'rc-decision.md') -Force
    Add-Layer 'rc-scaffold' 0 'checklist جاهز للتعبئة — قرار rc-decision.md ينتظر'
}

# --- staging runbook نسخ ---
if ($Layer -eq 'all') {
    $stagingDir = Join-Path $ArtifactsDir 'staging'
    if (-not (Test-Path $stagingDir)) { New-Item -ItemType Directory -Path $stagingDir -Force | Out-Null }
    Copy-Item (Join-Path $here 'staging/staging-runbook.md') -Destination $stagingDir -Force
}

$summary.endedAt = (Get-Date).ToString('o')
$summary.failures = ($summary.layers | Where-Object { $_.status -eq 'fail' }).Count
$summary | ConvertTo-Json -Depth 5 | Set-Content -Path (Join-Path $ArtifactsDir 'summary.json') -Encoding UTF8

if ($summary.failures -gt 0) { exit 1 } else { exit 0 }
