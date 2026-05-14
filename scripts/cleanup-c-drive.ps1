# cleanup-c-drive.ps1
# تنظيف آمن للقرص C — يحذف فقط ملفات مؤقتة وكاش معروفة، لا يلمس بيانات المستخدم.
# الاستخدام:
#   pwsh scripts/cleanup-c-drive.ps1                # وضع DryRun: عرض الحجم الذي سيُحرَّر
#   pwsh scripts/cleanup-c-drive.ps1 -Execute       # التنفيذ الفعلي
#   pwsh scripts/cleanup-c-drive.ps1 -Execute -Force # بدون سؤال تأكيد

[CmdletBinding()]
param(
    [switch]$Execute,
    [switch]$Force
)

$ErrorActionPreference = 'Continue'
$ProgressPreference = 'SilentlyContinue'

# مواقع التنظيف الآمنة (لا تلمس بيانات المستخدم أبداً)
$Targets = @(
    # ملفات مؤقتة للمستخدم الحالي
    @{ Path = $env:TEMP; Label = 'User TEMP'; PreserveTopFolder = $true }
    @{ Path = "$env:LOCALAPPDATA\Temp"; Label = 'LocalAppData Temp'; PreserveTopFolder = $true }

    # ملفات مؤقتة على مستوى النظام
    @{ Path = 'C:\Windows\Temp'; Label = 'Windows Temp'; PreserveTopFolder = $true }
    @{ Path = 'C:\Windows\Prefetch'; Label = 'Windows Prefetch'; PreserveTopFolder = $true }
    @{ Path = 'C:\Windows\SoftwareDistribution\Download'; Label = 'Windows Update Cache'; PreserveTopFolder = $true }
    @{ Path = 'C:\Windows\Logs\CBS'; Label = 'CBS Logs'; PreserveTopFolder = $true }
    @{ Path = 'C:\Windows\Logs\DPX'; Label = 'DPX Logs'; PreserveTopFolder = $true }
    @{ Path = 'C:\Windows\Logs\WindowsUpdate'; Label = 'Windows Update Logs'; PreserveTopFolder = $true }

    # كاش متصفحات (User scope)
    @{ Path = "$env:LOCALAPPDATA\Google\Chrome\User Data\Default\Cache"; Label = 'Chrome Cache'; PreserveTopFolder = $true }
    @{ Path = "$env:LOCALAPPDATA\Google\Chrome\User Data\Default\Code Cache"; Label = 'Chrome Code Cache'; PreserveTopFolder = $true }
    @{ Path = "$env:LOCALAPPDATA\Microsoft\Edge\User Data\Default\Cache"; Label = 'Edge Cache'; PreserveTopFolder = $true }
    @{ Path = "$env:LOCALAPPDATA\Microsoft\Edge\User Data\Default\Code Cache"; Label = 'Edge Code Cache'; PreserveTopFolder = $true }
    @{ Path = "$env:APPDATA\Mozilla\Firefox\Profiles"; Label = 'Firefox Cache'; PreserveTopFolder = $true; FileFilter = 'cache*' }

    # كاش npm/pnpm/yarn/pip
    @{ Path = "$env:APPDATA\npm-cache"; Label = 'npm Cache'; PreserveTopFolder = $true }
    @{ Path = "$env:LOCALAPPDATA\npm-cache"; Label = 'npm Cache (Local)'; PreserveTopFolder = $true }
    @{ Path = "$env:LOCALAPPDATA\pnpm\store"; Label = 'pnpm Store'; PreserveTopFolder = $true; ConfirmEach = $true }
    @{ Path = "$env:LOCALAPPDATA\Yarn\Cache"; Label = 'Yarn Cache'; PreserveTopFolder = $true }
    @{ Path = "$env:LOCALAPPDATA\pip\cache"; Label = 'pip Cache'; PreserveTopFolder = $true }

    # كاش Python
    @{ Path = "$env:LOCALAPPDATA\Programs\Python\Python312\__pycache__"; Label = 'Python 3.12 Cache'; PreserveTopFolder = $true }
    @{ Path = "$env:LOCALAPPDATA\Programs\Python\Python313\__pycache__"; Label = 'Python 3.13 Cache'; PreserveTopFolder = $true }

    # كاش Visual Studio Code
    @{ Path = "$env:APPDATA\Code\Cache"; Label = 'VS Code Cache'; PreserveTopFolder = $true }
    @{ Path = "$env:APPDATA\Code\CachedData"; Label = 'VS Code CachedData'; PreserveTopFolder = $true }
    @{ Path = "$env:APPDATA\Code\logs"; Label = 'VS Code Logs'; PreserveTopFolder = $true }
    @{ Path = "$env:APPDATA\Code\User\workspaceStorage"; Label = 'VS Code Workspace Storage'; PreserveTopFolder = $true; ConfirmEach = $true }

    # WSL temp files
    @{ Path = "$env:LOCALAPPDATA\Packages\CanonicalGroupLimited.UbuntuonWindows*\LocalState\Temp"; Label = 'WSL Ubuntu Temp'; PreserveTopFolder = $true }

    # Crash dumps و Delivery Optimization
    @{ Path = "$env:LOCALAPPDATA\CrashDumps"; Label = 'Crash Dumps'; PreserveTopFolder = $true }
    @{ Path = 'C:\Windows\System32\config\systemprofile\AppData\Local\CrashDumps'; Label = 'System Crash Dumps'; PreserveTopFolder = $true }

    # Thumbnail cache (User scope)
    @{ Path = "$env:LOCALAPPDATA\Microsoft\Windows\Explorer"; Label = 'Explorer Thumbs'; PreserveTopFolder = $true; FileFilter = 'thumbcache*.db','iconcache*.db' }

    # كاش podman temp و logs
    @{ Path = "$env:LOCALAPPDATA\containers\podman"; Label = 'Podman Logs'; PreserveTopFolder = $true; FileFilter = '*.log' }
)

function Get-FolderSizeGB {
    param([string]$Path, [string[]]$FileFilter)
    if (-not (Test-Path $Path)) { return 0.0 }
    try {
        if ($FileFilter) {
            $items = @()
            foreach ($f in $FileFilter) {
                $items += Get-ChildItem -Path $Path -Filter $f -Recurse -Force -ErrorAction SilentlyContinue
            }
            $bytes = ($items | Measure-Object -Property Length -Sum -ErrorAction SilentlyContinue).Sum
        } else {
            $bytes = (Get-ChildItem -Path $Path -Recurse -Force -ErrorAction SilentlyContinue |
                Measure-Object -Property Length -Sum).Sum
        }
        if ($null -eq $bytes) { return 0.0 }
        return [Math]::Round($bytes/1GB, 2)
    } catch { return 0.0 }
}

function Remove-FolderContents {
    param([string]$Path, [string[]]$FileFilter, [bool]$PreserveTopFolder = $true)
    if (-not (Test-Path $Path)) { return @{ Deleted = 0; Skipped = 0 } }
    $deleted = 0
    $skipped = 0
    if ($FileFilter) {
        foreach ($f in $FileFilter) {
            Get-ChildItem -Path $Path -Filter $f -Recurse -Force -ErrorAction SilentlyContinue | ForEach-Object {
                try { Remove-Item -Path $_.FullName -Force -Recurse -ErrorAction Stop; $deleted++ }
                catch { $skipped++ }
            }
        }
    } else {
        Get-ChildItem -Path $Path -Force -ErrorAction SilentlyContinue | ForEach-Object {
            try { Remove-Item -Path $_.FullName -Force -Recurse -ErrorAction Stop; $deleted++ }
            catch { $skipped++ }
        }
    }
    return @{ Deleted = $deleted; Skipped = $skipped }
}

# === المرحلة 1: المسح الأولي ===
Write-Host ''
Write-Host '=================================================================' -ForegroundColor Cyan
Write-Host '   تحليل المساحة القابلة للاستعادة على القرص C' -ForegroundColor Cyan
Write-Host '=================================================================' -ForegroundColor Cyan
Write-Host ''

$initialFree = (Get-Volume -DriveLetter C).SizeRemaining / 1GB
Write-Host ("[BEFORE] القرص C متاح: {0:N2} GB من {1:N2} GB" -f $initialFree, ((Get-Volume -DriveLetter C).Size/1GB)) -ForegroundColor Yellow
Write-Host ''

$totalReclaimable = 0.0
$report = @()
foreach ($t in $Targets) {
    $sizeGB = Get-FolderSizeGB -Path $t.Path -FileFilter $t.FileFilter
    $totalReclaimable += $sizeGB
    $report += [PSCustomObject]@{
        Label = $t.Label
        Path = $t.Path
        SizeGB = $sizeGB
        Confirm = if ($t.ConfirmEach) { 'YES' } else { 'NO' }
    }
}

# عرض الجدول
$report | Where-Object SizeGB -gt 0 | Sort-Object SizeGB -Descending |
    Format-Table -AutoSize @(
        @{ Label='SizeGB'; Expression={ '{0:N2}' -f $_.SizeGB }; Width=8 }
        @{ Label='Confirm?'; Expression='Confirm'; Width=8 }
        'Label'
    )

Write-Host ('--- إجمالي المساحة القابلة للاستعادة: {0:N2} GB ---' -f $totalReclaimable) -ForegroundColor Green

# Recycle Bin (يستخدم Clear-RecycleBin بشكل منفصل)
$recycleBinSize = 0.0
try {
    $shell = New-Object -ComObject Shell.Application
    $bin = $shell.NameSpace(10)
    if ($bin) {
        $bytes = ($bin.Items() | Measure-Object -Property Size -Sum).Sum
        if ($bytes) { $recycleBinSize = [Math]::Round($bytes/1GB, 2) }
    }
} catch {}
Write-Host ('--- Recycle Bin: {0:N2} GB (سيُفرَّغ أيضاً) ---' -f $recycleBinSize) -ForegroundColor Green

Write-Host ''

# === المرحلة 2: التنفيذ ===
if (-not $Execute) {
    Write-Host '** وضع DryRun فقط — لا حذف **' -ForegroundColor Yellow
    Write-Host 'لتنفيذ الحذف الفعلي:' -ForegroundColor Yellow
    Write-Host '  pwsh scripts/cleanup-c-drive.ps1 -Execute' -ForegroundColor White
    Write-Host ''
    return
}

if (-not $Force) {
    Write-Host 'هل تريد المتابعة بالحذف الفعلي؟ (y/N): ' -ForegroundColor Red -NoNewline
    $resp = Read-Host
    if ($resp -ne 'y' -and $resp -ne 'Y') {
        Write-Host 'تم الإلغاء.' -ForegroundColor Yellow
        return
    }
}

Write-Host ''
Write-Host '=================================================================' -ForegroundColor Cyan
Write-Host '   بدء الحذف الفعلي' -ForegroundColor Cyan
Write-Host '=================================================================' -ForegroundColor Cyan

$totalDeleted = 0
$totalSkipped = 0
foreach ($t in $Targets) {
    $sizeBefore = Get-FolderSizeGB -Path $t.Path -FileFilter $t.FileFilter
    if ($sizeBefore -le 0) { continue }

    if ($t.ConfirmEach -and -not $Force) {
        Write-Host ('  [{0}] حذف {1:N2} GB من {2}؟ (y/N): ' -f $t.Label, $sizeBefore, $t.Path) -ForegroundColor Yellow -NoNewline
        $r = Read-Host
        if ($r -ne 'y' -and $r -ne 'Y') {
            Write-Host '    تم تخطي.' -ForegroundColor Gray
            continue
        }
    }

    Write-Host ('  [{0}] جاري حذف {1:N2} GB ...' -f $t.Label, $sizeBefore) -ForegroundColor Cyan -NoNewline
    $result = Remove-FolderContents -Path $t.Path -FileFilter $t.FileFilter -PreserveTopFolder $t.PreserveTopFolder
    $totalDeleted += $result.Deleted
    $totalSkipped += $result.Skipped
    Write-Host (' ({0} حُذف / {1} معلَّق-قيد-الاستخدام)' -f $result.Deleted, $result.Skipped) -ForegroundColor Green
}

# تفريغ Recycle Bin
Write-Host '  [Recycle Bin] جاري التفريغ ...' -ForegroundColor Cyan -NoNewline
try {
    Clear-RecycleBin -DriveLetter C -Force -ErrorAction Stop
    Write-Host ' OK' -ForegroundColor Green
} catch {
    Write-Host (' فشل: {0}' -f $_.Exception.Message) -ForegroundColor Yellow
}

# Disk Cleanup التلقائي
Write-Host '  [cleanmgr] تشغيل Disk Cleanup التلقائي ...' -ForegroundColor Cyan
try {
    Start-Process -FilePath 'cleanmgr.exe' -ArgumentList '/verylowdisk' -Wait -ErrorAction SilentlyContinue
    Write-Host '    OK' -ForegroundColor Green
} catch {
    Write-Host '    تم التخطي (يحتاج تشغيل يدوي)' -ForegroundColor Yellow
}

# === المرحلة 3: تقرير نهائي ===
Write-Host ''
Write-Host '=================================================================' -ForegroundColor Cyan
Write-Host '   التقرير النهائي' -ForegroundColor Cyan
Write-Host '=================================================================' -ForegroundColor Cyan

$finalFree = (Get-Volume -DriveLetter C).SizeRemaining / 1GB
$reclaimed = $finalFree - $initialFree

Write-Host ('  قبل التنظيف:   {0:N2} GB متاح' -f $initialFree) -ForegroundColor Yellow
Write-Host ('  بعد التنظيف:   {0:N2} GB متاح' -f $finalFree) -ForegroundColor Green
Write-Host ('  المساحة المُسترَدّة: {0:N2} GB' -f $reclaimed) -ForegroundColor Cyan
Write-Host ''
Write-Host ('  ملفات حُذفت: {0}' -f $totalDeleted) -ForegroundColor Gray
Write-Host ('  ملفات معلَّقة (قيد الاستخدام، تُحرَّر بعد إعادة التشغيل): {0}' -f $totalSkipped) -ForegroundColor Gray
Write-Host ''

if ($finalFree -lt 30) {
    Write-Host '⚠ المساحة المتاحة أقل من 30GB. يُنصح بـ:' -ForegroundColor Red
    Write-Host '  1. إزالة برامج غير مستخدمة من Settings > Apps' -ForegroundColor White
    Write-Host '  2. نقل ملفات Documents/Downloads إلى F:' -ForegroundColor White
    Write-Host '  3. تشغيل cleanmgr.exe كـ Admin مع جميع الخيارات' -ForegroundColor White
}
