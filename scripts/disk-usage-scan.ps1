# disk-usage-scan.ps1
# يفحص أكبر المجلدات على القرص C ويعرض النتائج مرتبة.
# يكتب النتائج في ملف للاستيراد إلى Excel أو إعادة الفرز.
#
# الاستخدام:
#   pwsh scripts/disk-usage-scan.ps1                      # فحص top-level
#   pwsh scripts/disk-usage-scan.ps1 -Path 'C:\Users'     # فحص مجلد محدد
#   pwsh scripts/disk-usage-scan.ps1 -Depth 2             # عمق أكبر

[CmdletBinding()]
param(
    [string]$Path = 'C:\',
    [int]$Depth = 1,
    [int]$MinSizeMB = 100,
    [string]$OutputFile = ''
)

$ErrorActionPreference = 'Continue'
$ProgressPreference = 'SilentlyContinue'

if (-not $OutputFile) {
    $OutputFile = "$env:TEMP\disk-scan-$((Get-Date).ToString('yyyyMMdd-HHmmss')).csv"
}

Write-Host ''
Write-Host '====================================================' -ForegroundColor Cyan
Write-Host "  فحص استهلاك الـ disk: $Path" -ForegroundColor Cyan
Write-Host "  العمق: $Depth | الحد الأدنى: $MinSizeMB MB" -ForegroundColor Cyan
Write-Host '====================================================' -ForegroundColor Cyan
Write-Host ''

function Get-DirSizeFast {
    param([string]$DirPath)
    try {
        $di = New-Object System.IO.DirectoryInfo $DirPath
        # تخطي reparse points (junctions/symlinks لتجنب الحلقات)
        if ($di.Attributes -band [System.IO.FileAttributes]::ReparsePoint) {
            return -1  # علامة reparse
        }
        $size = 0
        foreach ($file in $di.EnumerateFiles('*', [System.IO.SearchOption]::AllDirectories)) {
            try { $size += $file.Length } catch {}
        }
        return $size
    } catch {
        return -2  # علامة خطأ
    }
}

function Format-SizeGB {
    param([long]$Bytes)
    if ($Bytes -lt 0) { return 'SKIP' }
    if ($Bytes -lt 1MB) { return "{0:N0} KB" -f ($Bytes/1KB) }
    if ($Bytes -lt 1GB) { return "{0:N1} MB" -f ($Bytes/1MB) }
    return "{0:N2} GB" -f ($Bytes/1GB)
}

# جمع كل المجلدات على المستوى المطلوب
$results = @()
$total = 0
$startTime = Get-Date

$dirs = Get-ChildItem $Path -Directory -Force -ErrorAction SilentlyContinue
$totalDirs = $dirs.Count
$counter = 0

foreach ($dir in $dirs) {
    $counter++
    Write-Progress -Activity "فحص $Path" -Status "$counter/$totalDirs : $($dir.Name)" -PercentComplete (($counter / $totalDirs) * 100)
    $size = Get-DirSizeFast -DirPath $dir.FullName
    if ($size -ge ($MinSizeMB * 1MB)) {
        $results += [PSCustomObject]@{
            Name = $dir.Name
            Path = $dir.FullName
            Size = $size
            SizeFormatted = Format-SizeGB $size
        }
        $total += $size
    } elseif ($size -eq -1) {
        Write-Host "  [JUNCTION/SYMLINK] $($dir.Name) — تخطّي" -ForegroundColor Gray
    }
}
Write-Progress -Activity "فحص $Path" -Completed

$elapsed = (Get-Date) - $startTime

# عرض النتائج
$sorted = $results | Sort-Object Size -Descending

Write-Host ''
Write-Host "النتائج (>= $MinSizeMB MB):" -ForegroundColor Green
$sorted | Format-Table -AutoSize @(
    @{ Label='Size'; Expression={ $_.SizeFormatted }; Width=12; Alignment='Right' }
    'Name'
)

Write-Host ''
Write-Host "إجمالي المجلدات الكبيرة: $($sorted.Count)" -ForegroundColor Cyan
Write-Host ("إجمالي حجمها: {0}" -f (Format-SizeGB $total)) -ForegroundColor Cyan
Write-Host ("الزمن المنقضي: {0:N1} ثانية" -f $elapsed.TotalSeconds) -ForegroundColor Gray

# حفظ CSV
$sorted | Select-Object SizeFormatted, Size, Path |
    Export-Csv -Path $OutputFile -Encoding UTF8 -NoTypeInformation
Write-Host "النتائج محفوظة في: $OutputFile" -ForegroundColor Yellow
Write-Host ''

# إن كان scan لـ C: مباشرة، اقترح فحص أعمق للمكتشف
if ($Path -eq 'C:\') {
    $top3 = $sorted | Select-Object -First 3
    Write-Host 'لفحص أعمق لأكبر 3 مجلدات:' -ForegroundColor Yellow
    foreach ($t in $top3) {
        Write-Host ("  pwsh scripts/disk-usage-scan.ps1 -Path '{0}'" -f $t.Path) -ForegroundColor White
    }
}
