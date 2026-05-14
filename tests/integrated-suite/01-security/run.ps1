# ============================================================================
# 01-security/run.ps1
# منسّق حزمة الأمان — يستدعي pnpm security:* و sub-runners
# ============================================================================

[CmdletBinding()]
param(
    [ValidateSet('all','sast','dast','deps','pentest')]
    [string]$Category = 'all',
    [Parameter(Mandatory)]
    [string]$ArtifactsDir
)

$ErrorActionPreference = 'Stop'
$here = $PSScriptRoot

if (-not (Test-Path $ArtifactsDir)) {
    New-Item -ItemType Directory -Path $ArtifactsDir -Force | Out-Null
}

$failures = @()

function Invoke-Sub {
    param([string]$Name, [string]$ScriptPath, [string]$OutDir)
    $sub = Join-Path $OutDir $Name
    if (-not (Test-Path $sub)) { New-Item -ItemType Directory -Path $sub -Force | Out-Null }
    Write-Host ""
    Write-Host "--> $Name" -ForegroundColor Cyan
    try {
        & $ScriptPath -ArtifactsDir $sub
        if ($LASTEXITCODE -ne 0) { $script:failures += $Name }
    } catch {
        Write-Host "  [$Name] EXCEPTION: $_" -ForegroundColor Red
        $script:failures += $Name
    }
}

if ($Category -in @('all','sast'))    { Invoke-Sub 'sast'    (Join-Path $here 'sast/run.ps1')    $ArtifactsDir }
if ($Category -in @('all','deps'))    { Invoke-Sub 'deps'    (Join-Path $here 'deps/run.ps1')    $ArtifactsDir }
if ($Category -in @('all','dast'))    { Invoke-Sub 'dast'    (Join-Path $here 'dast/run.ps1')    $ArtifactsDir }
if ($Category -in @('all','pentest')) { Invoke-Sub 'pentest' (Join-Path $here 'pentest/run.ps1') $ArtifactsDir }

if ($failures.Count -gt 0) {
    Write-Host ""
    Write-Host "حزم الأمان الفاشلة: $($failures -join ', ')" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "اكتمل تشغيل حزمة الأمان." -ForegroundColor Green
exit 0
