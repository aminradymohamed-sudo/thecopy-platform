# ============================================================================
# 01-security/deps/run.ps1
# Dependency Scanning — pnpm audit + Snyk + Trivy + SBOM + Licenses
# ============================================================================

[CmdletBinding()]
param([Parameter(Mandatory)][string]$ArtifactsDir)

$ErrorActionPreference = 'Continue'
$repoRoot = (Resolve-Path "$PSScriptRoot/../../../..").Path
Set-Location $repoRoot

$summary = [ordered]@{
    category = 'deps'
    startedAt = (Get-Date).ToString('o')
    tools = @()
}

function Add-Tool {
    param([string]$Tool, [string]$Status, [int]$ExitCode, [string]$Output)
    $script:summary.tools += [ordered]@{ tool = $Tool; status = $Status; exitCode = $ExitCode; output = $Output }
    $color = if ($Status -eq 'pass') { 'Green' } elseif ($Status -eq 'tool-missing') { 'Yellow' } else { 'Red' }
    Write-Host "  [$Tool] $Status" -ForegroundColor $color
}

# --- env safe check (existing pnpm script) ---
Write-Host "[deps] env safe check..." -ForegroundColor Cyan
$envOut = Join-Path $ArtifactsDir 'env-safe.txt'
pnpm security:env:check 2>&1 | Tee-Object -FilePath $envOut | Out-Null
$envStatus = if ($LASTEXITCODE -eq 0) { 'pass' } else { 'fail' }
Add-Tool 'env-safe' $envStatus $LASTEXITCODE $envOut

# --- pnpm audit (prod high) ---
Write-Host "[deps] pnpm audit (prod, high)..." -ForegroundColor Cyan
$auditOut = Join-Path $ArtifactsDir 'pnpm-audit.json'
pnpm audit --prod --audit-level=high --json 2>&1 | Set-Content -Path $auditOut -Encoding UTF8
$auditStatus = if ($LASTEXITCODE -eq 0) { 'pass' } else { 'fail' }
Add-Tool 'pnpm-audit' $auditStatus $LASTEXITCODE $auditOut

# --- Snyk (existing pnpm script) ---
if (Get-Command snyk -ErrorAction SilentlyContinue) {
    Write-Host "[deps] snyk test..." -ForegroundColor Cyan
    $snykOut = Join-Path $ArtifactsDir 'snyk.json'
    snyk test --all-projects --severity-threshold=high --json 2>&1 | Set-Content -Path $snykOut -Encoding UTF8
    $snykStatus = if ($LASTEXITCODE -eq 0) { 'pass' } else { 'fail' }
    Add-Tool 'snyk' $snykStatus $LASTEXITCODE $snykOut

    Write-Host "[deps] snyk code test..." -ForegroundColor Cyan
    $snykCodeOut = Join-Path $ArtifactsDir 'snyk-code.json'
    snyk code test --json 2>&1 | Set-Content -Path $snykCodeOut -Encoding UTF8
    $snykCodeStatus = if ($LASTEXITCODE -eq 0) { 'pass' } else { 'fail' }
    Add-Tool 'snyk-code' $snykCodeStatus $LASTEXITCODE $snykCodeOut
} else {
    Add-Tool 'snyk' 'tool-missing' -1 ''
}

# --- Trivy (existing scripts/security/trivy-scan.sh) ---
if (Get-Command bash -ErrorAction SilentlyContinue) {
    Write-Host "[deps] trivy fs scan (via existing script)..." -ForegroundColor Cyan
    $trivyLog = Join-Path $ArtifactsDir 'trivy-fs.log'
    $env:TRIVY_REPORT_DIR = $ArtifactsDir
    bash ./scripts/security/trivy-scan.sh 2>&1 | Tee-Object -FilePath $trivyLog | Out-Null
    $trivyStatus = if ($LASTEXITCODE -eq 0) { 'pass' } else { 'fail' }
    Add-Tool 'trivy-fs' $trivyStatus $LASTEXITCODE $trivyLog
} else {
    Add-Tool 'trivy-fs' 'tool-missing' -1 ''
}

# --- SBOM (CycloneDX) ---
if (Get-Command npx -ErrorAction SilentlyContinue) {
    Write-Host "[deps] generating SBOM (CycloneDX)..." -ForegroundColor Cyan
    $sbomOut = Join-Path $ArtifactsDir 'sbom.cdx.json'
    npx --yes @cyclonedx/cyclonedx-npm --output-format JSON --output-file $sbomOut 2>&1 | Out-Null
    if (Test-Path $sbomOut) {
        Add-Tool 'sbom-cyclonedx' 'pass' 0 $sbomOut
    } else {
        Add-Tool 'sbom-cyclonedx' 'fail' 1 ''
    }
}

# --- License audit (allowlist) ---
$policyPath = Join-Path $PSScriptRoot 'policy.json'
if (Test-Path $policyPath) {
    $policy = Get-Content $policyPath -Raw | ConvertFrom-Json
    $licenseReport = Join-Path $ArtifactsDir 'license-report.md'
    if (Get-Command npx -ErrorAction SilentlyContinue) {
        Write-Host "[deps] license audit..." -ForegroundColor Cyan
        $allowed = ($policy.licenses.allowed -join ';')
        $licenseRaw = Join-Path $ArtifactsDir 'license-checker.json'
        npx --yes license-checker --json --production --out $licenseRaw 2>&1 | Out-Null
        if (Test-Path $licenseRaw) {
            $licenseData = Get-Content $licenseRaw -Raw | ConvertFrom-Json
            $disallowed = @()
            foreach ($pkg in $licenseData.PSObject.Properties) {
                $lic = $pkg.Value.licenses
                if ($lic -and ($policy.licenses.allowed -notcontains $lic) -and ($policy.licenses.allowed -notcontains 'ALL')) {
                    $disallowed += "$($pkg.Name) :: $lic"
                }
            }
            $body = "# License Audit`n`n"
            if ($disallowed.Count -gt 0) {
                $body += "## رخص خارج الـ allowlist`n`n"
                $body += ($disallowed | ForEach-Object { "- $_" }) -join "`n"
                Set-Content -Path $licenseReport -Value $body -Encoding UTF8
                Add-Tool 'license-audit' 'fail' 1 $licenseReport
            } else {
                $body += "كل الرخص ضمن الـ allowlist."
                Set-Content -Path $licenseReport -Value $body -Encoding UTF8
                Add-Tool 'license-audit' 'pass' 0 $licenseReport
            }
        }
    }
}

$summary.endedAt = (Get-Date).ToString('o')
$summary.failures = ($summary.tools | Where-Object { $_.status -eq 'fail' }).Count
$summary | ConvertTo-Json -Depth 5 | Set-Content -Path (Join-Path $ArtifactsDir 'summary.json') -Encoding UTF8

if ($summary.failures -gt 0) { exit 1 } else { exit 0 }
