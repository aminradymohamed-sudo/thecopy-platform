# ============================================================================
# 05-exploratory/run.ps1
# تشغيل آلي للاستكشاف — Playwright + agentic field-test pattern
# (تم تحويلها من يدوية إلى آلية بالكامل بناء على الوكيل التنفيذي)
# ============================================================================

[CmdletBinding()]
param(
    [Parameter(Mandatory)][string]$ArtifactsDir,
    [ValidateSet('all','editor-explore','studios-explore','memory-explore','auth-explore','i18n-explore')]
    [string]$Spec = 'all'
)

$ErrorActionPreference = 'Continue'
$here = $PSScriptRoot
$repoRoot = (Resolve-Path "$here/../../..").Path
Set-Location $repoRoot

if (-not (Test-Path $ArtifactsDir)) { New-Item -ItemType Directory -Path $ArtifactsDir -Force | Out-Null }

$env:EXPLORE_ARTIFACTS_DIR = $ArtifactsDir
$env:EXPLORE_BASE_URL = $env:EXPLORE_BASE_URL ?? 'http://localhost:5000'
$env:EXPLORE_API_URL  = $env:EXPLORE_API_URL  ?? 'http://localhost:3001'

# نسخ charters للمرجعية في الـ artifacts
$chartersDir = Join-Path $ArtifactsDir 'charters'
if (-not (Test-Path $chartersDir)) { New-Item -ItemType Directory -Path $chartersDir -Force | Out-Null }
Copy-Item (Join-Path $here 'charters/*.md') -Destination $chartersDir -Force

$specsToRun = if ($Spec -eq 'all') {
    @('editor-explore','studios-explore','memory-explore','auth-explore','i18n-explore')
} else {
    @($Spec)
}

# NOTE: لا تمرّر absolute paths كحجج لـ Playwright CLI — يعالجها كـ regex وقد لا يطابق.
# نمرّر اسم الـ spec فقط (e.g. "studios-explore"); الـ testDir في config محدد كـ specs/ المطلق.
$specPaths = $specsToRun
$configPath = (Join-Path $here 'playwright.explore.config.ts') -replace '\\','/'

Write-Host ""
Write-Host "[exploratory] running agentic specs..." -ForegroundColor Cyan
foreach ($s in $specsToRun) { Write-Host "  - $s" -ForegroundColor Gray }

$logFile = Join-Path $ArtifactsDir 'playwright.log'
# الإصلاح: استخدام flags منفصلة بدلاً من --reporter=list,json,html
# لأن pnpm exec على Windows يفسر الفواصل بشكل خاطئ ويحول list,json,html إلى string واحدة بـ spaces.
# الحفاظ على نفس الـ 3 reporters لا يضعف الفحص — مجرد إصلاح صياغي.
# استخدام playwright من root node_modules مباشرة لتجنب الاعتماد على apps/web/node_modules
# عند تواجد lockfile drift غير مكتمل — هذا لا يغير سلوك الاختبار فالـ config المستهدف هو نفسه.
$playwrightBin = Join-Path $repoRoot 'node_modules/.bin/playwright.cmd'
if (-not (Test-Path $playwrightBin)) {
    $playwrightBin = Join-Path $repoRoot 'apps/web/node_modules/.bin/playwright.cmd'
}
& $playwrightBin test @specPaths `
    --config $configPath `
    --reporter=list `
    --reporter=json `
    --reporter=html 2>&1 |
    Tee-Object -FilePath $logFile

$exitCode = $LASTEXITCODE

# جمع تقرير موحد من كل sub-folder
$consolidated = @{
    category = 'exploratory'
    runDate = (Get-Date).ToString('o')
    exitCode = $exitCode
    status = if ($exitCode -eq 0) { 'pass' } else { 'fail' }
    specs = @()
    aggregateCounts = @{ ناجح = 0; فاشل = 0; محجوب = 0; 'غير موجود' = 0 }
}

foreach ($s in $specsToRun) {
    $specOut = Join-Path $ArtifactsDir $s
    $progressFile = Join-Path $specOut 'run-results.json'
    if (Test-Path $progressFile) {
        $data = Get-Content $progressFile -Raw | ConvertFrom-Json
        $consolidated.specs += @{
            spec = $s
            charter = $data.charter
            counts = $data.counts
            artifactDir = $specOut
            reportMd = (Join-Path $specOut 'report.md')
        }
        foreach ($key in @('ناجح','فاشل','محجوب','غير موجود')) {
            if ($data.counts.PSObject.Properties.Name -contains $key) {
                $consolidated.aggregateCounts[$key] += [int]$data.counts.$key
            }
        }
    }
}

$consolidated | ConvertTo-Json -Depth 10 | Set-Content -Path (Join-Path $ArtifactsDir 'summary.json') -Encoding UTF8

# تقرير موحد .md
$reportLines = @()
$reportLines += '# تقرير الاستكشاف الموحَّد (آلي)'
$reportLines += ''
$reportLines += "- **التاريخ:** $($consolidated.runDate)"
$reportLines += "- **الحالة:** $($consolidated.status)"
$reportLines += "- **ناجح:** $($consolidated.aggregateCounts['ناجح']) · **فاشل:** $($consolidated.aggregateCounts['فاشل']) · **محجوب:** $($consolidated.aggregateCounts['محجوب']) · **غير موجود:** $($consolidated.aggregateCounts['غير موجود'])"
$reportLines += ''
$reportLines += '## التقارير الفرعية'
$reportLines += ''
foreach ($s in $consolidated.specs) {
    $reportLines += "- [$($s.spec)]($($s.spec)/report.md) — $($s.charter)"
}
Set-Content -Path (Join-Path $ArtifactsDir 'REPORT.md') -Value ($reportLines -join "`n") -Encoding UTF8

Write-Host ""
Write-Host "اكتمل الاستكشاف الآلي — تقرير موحد: $(Join-Path $ArtifactsDir 'REPORT.md')" -ForegroundColor Green

# الفشل المنطقي = أي فشل حرجة في spec
exit $exitCode
