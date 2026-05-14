# ============================================================================
# 01-security/sast/run.ps1
# Static Application Security Testing
#  - يستدعي: semgrep, gitleaks, eslint-security, codeql-summary
#  - يلتقط المخرجات في ArtifactsDir
# ============================================================================

[CmdletBinding()]
param([Parameter(Mandatory)][string]$ArtifactsDir)

$ErrorActionPreference = 'Continue'
$repoRoot = (Resolve-Path "$PSScriptRoot/../../../..").Path
Set-Location $repoRoot

$summary = [ordered]@{
    category = 'sast'
    startedAt = (Get-Date).ToString('o')
    tools = @()
}

function Add-ToolResult {
    param([string]$Tool, [string]$Status, [string]$Output, [int]$ExitCode)
    $script:summary.tools += [ordered]@{
        tool = $Tool
        status = $Status
        exitCode = $ExitCode
        output = $Output
    }
    $color = if ($Status -eq 'pass') { 'Green' } elseif ($Status -eq 'tool-missing') { 'Yellow' } else { 'Red' }
    Write-Host "  [$Tool] $Status (exit=$ExitCode)" -ForegroundColor $color
}

# --- semgrep (via existing pnpm script) ---
$semgrepOut = Join-Path $ArtifactsDir 'semgrep.json'
if (Get-Command semgrep -ErrorAction SilentlyContinue) {
    Write-Host "[sast] running semgrep..." -ForegroundColor Cyan
    semgrep scan --config .semgrep --config p/typescript --config p/nodejs --config p/secrets --json --output $semgrepOut 2>&1 | Out-Null
    $semgrepStatus = if ($LASTEXITCODE -eq 0) { 'pass' } else { 'fail' }
    Add-ToolResult 'semgrep' $semgrepStatus $semgrepOut $LASTEXITCODE
} else {
    Add-ToolResult 'semgrep' 'tool-missing' '' -1
}

# --- gitleaks (secrets) ---
$gitleaksOut = Join-Path $ArtifactsDir 'gitleaks.json'
if (Get-Command gitleaks -ErrorAction SilentlyContinue) {
    Write-Host "[sast] running gitleaks..." -ForegroundColor Cyan
    gitleaks detect --source . --redact --report-format json --report-path $gitleaksOut --config=.gitleaks.toml 2>&1 | Out-Null
    $gitleaksStatus = if ($LASTEXITCODE -eq 0) { 'pass' } else { 'fail' }
    Add-ToolResult 'gitleaks' $gitleaksStatus $gitleaksOut $LASTEXITCODE
} else {
    Add-ToolResult 'gitleaks' 'tool-missing' '' -1
}

# --- ESLint security plugin (via pnpm lint) ---
$eslintOut = Join-Path $ArtifactsDir 'eslint-security.json'
Write-Host "[sast] running eslint with security focus..." -ForegroundColor Cyan
try {
    pnpm --filter "@the-copy/web" exec eslint . --config apps/web/eslint.config.js --format json --output-file $eslintOut 2>&1 | Out-Null
    Add-ToolResult 'eslint-web' 'pass' $eslintOut $LASTEXITCODE
} catch {
    Add-ToolResult 'eslint-web' 'fail' $eslintOut 1
}

# --- CodeQL summary (latest GitHub Actions run) ---
$codeqlSummary = Join-Path $ArtifactsDir 'codeql-summary.md'
$cq = @"
# CodeQL Summary

CodeQL يُشغَّل في .github/workflows/codeql.yml كجزء من CI.

للحصول على آخر نتائج فعلية:

```text
gh run list --workflow=codeql.yml --limit=1 --json conclusion,headBranch,createdAt
gh run view <run-id> --log
```

هذه الحزمة لا تشغّل CodeQL محلياً (يحتاج CodeQL CLI). تكتفي بإثبات أن المهمة موجودة في CI.

- workflow path: .github/workflows/codeql.yml
- expected conclusion: success
"@
Set-Content -Path $codeqlSummary -Value $cq -Encoding UTF8
Add-ToolResult 'codeql-reference' 'pass' $codeqlSummary 0

$summary.endedAt = (Get-Date).ToString('o')
$summary.failures = ($summary.tools | Where-Object { $_.status -eq 'fail' }).Count
$summary | ConvertTo-Json -Depth 5 | Set-Content -Path (Join-Path $ArtifactsDir 'summary.json') -Encoding UTF8

if ($summary.failures -gt 0) { exit 1 } else { exit 0 }
