$ErrorActionPreference = "Stop"

pnpm agent:guard:start

$existingWatcher = Get-CimInstance Win32_Process |
  Where-Object {
    $_.CommandLine -like "*scripts/agent/code-memory-watch.ts*" -and
    $_.ProcessId -ne $PID
  } |
  Select-Object -First 1

if (-not $existingWatcher) {
  Start-Process -FilePath "pnpm" -ArgumentList "agent:memory:watch" -WorkingDirectory (Get-Location) -WindowStyle Hidden
}

pnpm agent:bootstrap
