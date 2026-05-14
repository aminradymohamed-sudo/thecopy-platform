# mirror.ps1 - Manage mirror environment services for The Copy using Podman.
# Services: PostgreSQL 16 | Redis 7 | Weaviate 1.28.4 | Qdrant | Backend | Web

param(
    [Parameter(Position = 0)]
    [ValidateSet('build', 'up', 'down', 'status', 'logs', 'reset', 'help')]
    [string]$Command = 'help',

    [Parameter(Position = 1)]
    [string]$ServiceName = '',

    [ValidateSet('podman')]
    [string]$Engine = 'podman'
)

$ErrorActionPreference = 'Stop'

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir
$ComposeFile = Join-Path $ProjectRoot 'podman-compose.mirror.yml'

# Use the Python podman-compose tool instead of `podman compose` (the Go subcommand
# delegates to docker-compose.exe on this Windows host and breaks against the rootless
# unix socket). `python -m podman_compose` talks to the podman socket directly.
$ComposeCmd = @('python', '-m', 'podman_compose')
$Services = @('pg-mirror', 'redis-mirror', 'weaviate-mirror', 'qdrant-mirror', 'backend-mirror', 'web-mirror')
$ServiceContainers = @{
    'pg-mirror' = 'thecopy-mirror-pg-mirror-1'
    'redis-mirror' = 'thecopy-mirror-redis-mirror-1'
    'weaviate-mirror' = 'thecopy-mirror-weaviate-mirror-1'
    'qdrant-mirror' = 'thecopy-mirror-qdrant-mirror-1'
    'backend-mirror' = 'thecopy-mirror-backend-mirror-1'
    'web-mirror' = 'thecopy-mirror-web-mirror-1'
}

$HealthFmt = '{{.State.Health.Status}}'

function Write-Msg([string]$Tag, [string]$Msg, [string]$Color = 'White') {
    Write-Host "[$Tag] $Msg" -ForegroundColor $Color
}

function Ensure-MirrorEnvironment {
    # Generate random POSTGRES_PASSWORD if not set
    if ([string]::IsNullOrWhiteSpace($env:POSTGRES_PASSWORD)) {
        $passwordBytes = New-Object byte[] 24
        $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
        try {
            $rng.GetBytes($passwordBytes)
        } finally {
            $rng.Dispose()
        }
        $rawPassword = [Convert]::ToBase64String($passwordBytes)
        $env:POSTGRES_PASSWORD = $rawPassword.Replace('+', '-').Replace('/', '_').TrimEnd('=')
    }

    # Ensure secret exists
    $SecretDir = Join-Path $ProjectRoot 'secret'
    $SecretFile = Join-Path $SecretDir 'tiptap_pro_token.txt'
    if (-not (Test-Path $SecretDir)) {
        New-Item -ItemType Directory -Force -Path $SecretDir | Out-Null
    }
    if (-not (Test-Path $SecretFile)) {
        Set-Content -Path $SecretFile -Value "dummy-token-for-mirror"
        Write-Msg 'WARN' "Created dummy token at $SecretFile. Please replace it with the real token if needed." 'Yellow'
    }

    $env:TIPTAP_PRO_TOKEN = Get-Content -Path $SecretFile -Raw
}

function Invoke-Build {
    Ensure-MirrorEnvironment
    Write-Msg 'INFO' 'Building mirror images...' 'Cyan'
    & $ComposeCmd[0] $ComposeCmd[1..($ComposeCmd.Length-1)] -f $ComposeFile build
}

function Invoke-Up {
    Ensure-MirrorEnvironment
    Write-Msg 'INFO' 'Starting mirror services...' 'Cyan'
    & $ComposeCmd[0] $ComposeCmd[1..($ComposeCmd.Length-1)] -f $ComposeFile up -d
    Write-Host ''
    Wait-ForHealthy
    Write-Host ''
    Write-Msg 'OK' 'Mirror environment is up and running.' 'Green'
    Write-Host '  Web Mirror     -> http://localhost:6000' -ForegroundColor Blue
    Write-Host '  Backend Mirror -> http://localhost:3002' -ForegroundColor Blue
    Write-Host ''
}

function Invoke-Down {
    Write-Msg 'INFO' 'Stopping mirror services...' 'Cyan'
    & $ComposeCmd[0] $ComposeCmd[1..($ComposeCmd.Length-1)] -f $ComposeFile down
    Write-Msg 'OK' 'Mirror services stopped.' 'Green'
}

function Invoke-Status {
    Write-Msg 'INFO' 'Mirror Service status:' 'Cyan'
    Write-Host ''
    & $ComposeCmd[0] $ComposeCmd[1..($ComposeCmd.Length-1)] -f $ComposeFile ps
    Write-Host ''
}

function Invoke-Logs {
    if (-not [string]::IsNullOrEmpty($ServiceName)) {
        Write-Msg 'INFO' "Logs for: $ServiceName" 'Cyan'
        & $ComposeCmd[0] $ComposeCmd[1..($ComposeCmd.Length-1)] -f $ComposeFile logs -f --tail=100 $ServiceName
    } else {
        Write-Msg 'INFO' 'All logs (last 50 lines):' 'Cyan'
        & $ComposeCmd[0] $ComposeCmd[1..($ComposeCmd.Length-1)] -f $ComposeFile logs --tail=50
    }
}

function Invoke-Reset {
    Write-Msg 'WARN' 'This will DELETE all mirror data.' 'Yellow'
    $confirm = Read-Host 'Type yes to continue'
    if ($confirm -ne 'yes' -and $confirm -ne 'y') {
        Write-Msg 'INFO' 'Cancelled.' 'Cyan'
        return
    }

    Write-Msg 'INFO' 'Stopping mirror services and removing volumes...' 'Cyan'
    & $ComposeCmd[0] $ComposeCmd[1..($ComposeCmd.Length-1)] -f $ComposeFile down -v
    Write-Msg 'INFO' 'Restarting mirror services...' 'Cyan'
    Invoke-Up
}

function Get-ServiceHealth([string]$Svc) {
    try {
        if ($Svc -eq 'backend-mirror' -or $Svc -eq 'web-mirror') {
            # Web/Backend don't have podman healthchecks defined in docker-compose yet, we could check their ports.
            if ($Svc -eq 'backend-mirror') {
                if ((Test-NetConnection -ComputerName '127.0.0.1' -Port 3002 -InformationLevel Quiet -WarningAction SilentlyContinue)) { return 'healthy' }
            }
            if ($Svc -eq 'web-mirror') {
                if ((Test-NetConnection -ComputerName '127.0.0.1' -Port 6000 -InformationLevel Quiet -WarningAction SilentlyContinue)) { return 'healthy' }
            }
            return 'starting'
        }

        $cid = & $ComposeCmd[0] $ComposeCmd[1..($ComposeCmd.Length-1)] -f $ComposeFile ps -q $Svc 2>$null
        if ([string]::IsNullOrEmpty($cid)) { return 'missing' }

        $inspect = podman inspect --format $HealthFmt $cid 2>$null
        if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrEmpty($inspect) -or $inspect.Trim() -eq '<no value>') {
            return 'starting'
        }
        return $inspect.Trim()
    } catch {
        return 'starting'
    }
}

function Wait-ForHealthy {
    $maxWait = 180
    $interval = 5

    Write-Msg 'INFO' "Waiting for services to be ready (max ${maxWait}s)..." 'Cyan'

    foreach ($svc in $Services) {
        $waited = 0
        Write-Host "  $svc " -NoNewline

        while ($true) {
            $h = Get-ServiceHealth $svc

            if ($h -eq 'missing') {
                Write-Host 'NOT FOUND' -ForegroundColor Red
                break
            }

            if ($h -eq 'healthy') {
                Write-Host 'OK' -ForegroundColor Green
                break
            }

            if ($waited -ge $maxWait) {
                Write-Host 'TIMEOUT' -ForegroundColor Yellow
                break
            }

            Write-Host '.' -NoNewline
            Start-Sleep -Seconds $interval
            $waited += $interval
        }
    }
}

function Show-Help {
    Write-Host ''
    Write-Host 'Usage: .\scripts\mirror.ps1 <command>' -ForegroundColor Cyan
    Write-Host ''
    Write-Host '  build    Build the mirror images'
    Write-Host '  up       Start all mirror services'
    Write-Host '  down     Stop all mirror services'
    Write-Host '  status   Show service health status'
    Write-Host '  logs     Show logs'
    Write-Host '  reset    Full reset - deletes all mirror data'
    Write-Host '  help     Show this help'
    Write-Host ''
}

switch ($Command) {
    'build'   { Invoke-Build }
    'up'      { Invoke-Up }
    'down'    { Invoke-Down }
    'status'  { Invoke-Status }
    'logs'    { Invoke-Logs }
    'reset'   { Invoke-Reset }
    'help'    { Show-Help }
    default   { Show-Help }
}
