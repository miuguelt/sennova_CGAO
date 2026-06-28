<#
.SYNOPSIS
    SENNOVA CGAO Windows-Native Startup
.DESCRIPTION
    Starts: FastAPI backend on 8000, Vite frontend on 3006
    Uses shared PostgreSQL (127.0.0.1:5434) or SQLite fallback
    Uses Redis on WSL (127.0.0.1:6380)
    Saves ~678MB RAM vs Docker (sennova-frontend + sennova-backend)
#>
param(
    [switch]$Stop,
    [switch]$Status,
    [switch]$Daemon,
    [switch]$FrontendOnly,
    [switch]$BackendOnly
)

$ProjectRoot = "$PSScriptRoot"
$BackendDir = "$ProjectRoot\backend"
$FrontendDir = "$ProjectRoot\frontend"
$LogDir = "$ProjectRoot\logs"
$PythonExe = if (Test-Path "$BackendDir\venv_win\Scripts\python.exe") { "$BackendDir\venv_win\Scripts\python.exe" } elseif (Test-Path "$BackendDir\.venv\Scripts\python.exe") { "$BackendDir\.venv\Scripts\python.exe" } else { (Get-Command python -ErrorAction SilentlyContinue).Source }
$NodeExe = (Get-Command node -ErrorAction SilentlyContinue).Source
$NpxExe = (Get-Command npx -ErrorAction SilentlyContinue).Source

# Cargar variables desde .env
if (Test-Path "$ProjectRoot\.env") {
    Get-Content "$ProjectRoot\.env" | Where-Object { $_ -match '=' -and $_ -notmatch '^#' } | ForEach-Object {
        $k, $v = $_.Split('=', 2)
        [System.Environment]::SetEnvironmentVariable($k.Trim(), $v.Trim())
    }
}
$env:PYTHONUNBUFFERED = "1"

if (-not (Test-Path -LiteralPath $LogDir)) { New-Item -ItemType Directory -Path $LogDir -Force | Out-Null }

function Write-Log { param($msg, $color="White") Write-Host "[$(Get-Date -Format 'HH:mm:ss')] $msg" -ForegroundColor $color }

function Stop-ProcessesOnPort {
    param([int]$Port)
    $conns = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
    foreach ($conn in $conns) {
        $processPid = $conn.OwningProcess
        if ($processPid -gt 4) {
            Write-Log "    [PORT-RESET] Matando PID $processPid en puerto $Port..." "Yellow"
            taskkill /F /T /PID $processPid 2>$null | Out-Null
            Stop-Process -Id $processPid -Force -ErrorAction SilentlyContinue
        }
    }
}

function Start-TransparentProcess {
    param(
        [string]$FilePath, [string]$Arguments, [string]$WorkingDir,
        [string]$LogPath, [string]$Label, [ConsoleColor]$Color = "Gray"
    )
    $logParent = Split-Path $LogPath -Parent
    if (-not (Test-Path $logParent)) { New-Item -ItemType Directory -Path $logParent -Force | Out-Null }
    Remove-Item -LiteralPath $LogPath -Force -ErrorAction SilentlyContinue
    
    $ErrorLogPath = $LogPath.Replace(".log", "_error.log")
    Remove-Item -LiteralPath $ErrorLogPath -Force -ErrorAction SilentlyContinue
    
    # Use native Start-Process with redirect parameters to avoid buffering / block hangs
    $p = Start-Process -FilePath $FilePath -ArgumentList $Arguments -WorkingDirectory $WorkingDir `
        -RedirectStandardOutput $LogPath -RedirectStandardError $ErrorLogPath `
        -WindowStyle Hidden -PassThru
        
    Write-Log "$Label started (PID $($p.Id), log: $(Split-Path $LogPath -Leaf))" "Green"
    return $p
}

function Stop-DockerContainers {
    param([string[]]$Names)
    $job = Start-Job -ScriptBlock { param($n) foreach ($name in $n) { wsl docker stop $name 2>$null | Out-Null; wsl docker rm $name 2>$null | Out-Null } } -ArgumentList (, $Names)
    Wait-Job $job -Timeout 5 | Out-Null; Remove-Job $job -Force -ErrorAction SilentlyContinue
}

function Stop-Sennova {
    Write-Log "STOPPING all SENNOVA processes..." "Yellow"
    Stop-ProcessesOnPort 8000
    Stop-ProcessesOnPort 3006
    Stop-DockerContainers @("sennova-frontend", "sennova-backend")
    Write-Log "All stopped (native + Docker)." "Green"
}

function Show-Status {
    Write-Log "=== SENNOVA STATUS ===" "Cyan"
    $backend = Test-NetConnection -ComputerName 127.0.0.1 -Port 8000 -WarningAction SilentlyContinue -ErrorAction SilentlyContinue
    $frontend = Test-NetConnection -ComputerName 127.0.0.1 -Port 3006 -WarningAction SilentlyContinue -ErrorAction SilentlyContinue
    Write-Log "Backend  (8000): $(if($backend.TcpTestSucceeded){'ONLINE'}else{'OFFLINE'})" $(if($backend.TcpTestSucceeded){'Green'}else{'Red'})
    Write-Log "Frontend (3006): $(if($frontend.TcpTestSucceeded){'ONLINE'}else{'OFFLINE'})" $(if($frontend.TcpTestSucceeded){'Green'}else{'Red'})
}

if ($Stop) { Stop-Sennova; return }
if ($Status) { Show-Status; return }

# === DAEMON MODE: arranca procesos, guarda PIDs, sale inmediatamente ===
if ($Daemon) {
    Stop-ProcessesOnPort 8000
    Stop-ProcessesOnPort 3006

    if (-not $PythonExe) { Write-Error "ERROR: Python not found"; exit 1 }
    if (-not $NodeExe) { Write-Error "ERROR: Node not found"; exit 1 }

    # Esperar a que la base de datos y Redis estén listos antes de lanzar daemons
    $maxWait = 20
    $waited = 0
    while ($waited -lt $maxWait) {
        $pgOk = try { $s = New-Object System.Net.Sockets.TcpClient('127.0.0.1', 5434); $s.Close(); $true } catch { $false }
        $redisOk = try { $s = New-Object System.Net.Sockets.TcpClient('127.0.0.1', 6380); $s.Close(); $true } catch { $false }
        if ($pgOk -and $redisOk) { break }
        Start-Sleep -Seconds 1
        $waited++
    }

    $dbUrl = if ($env:DATABASE_URL) { $env:DATABASE_URL } elseif ($pgOk) { "postgresql+psycopg://admin:devbrain_secure_pwd@127.0.0.1:5434/sennova_db" } else { "sqlite:///./sennova.db" }
    
    $pidFile = Join-Path $LogDir "daemon.pid"
    $pids = @()

    $beBat = Join-Path $LogDir "run_backend.bat"
    $beLog = Join-Path $LogDir "backend.log"
    $beErrLog = Join-Path $LogDir "backend_error.log"
    
    @"
@echo off
set DATABASE_URL=$dbUrl
set REDIS_HOST=127.0.0.1
set REDIS_PORT=6380
set JWT_SECRET=Lg0u7opP5_6NU1eIJUjYyIIlyZp3XFZ4E3qGKXOr-j_G6TiYaXZ8Psf7thuhQ9r3
set ALLOWED_ORIGINS=http://localhost:3006,http://localhost:5173,http://localhost:8050,http://127.0.0.1:3006,http://127.0.0.1:8050
set DEBUG=true
set VITE_API_URL=http://localhost:8000
set PYTHONUNBUFFERED=1
cd /d "$BackendDir"
"$PythonExe" run_server.py > "$beLog" 2> "$beErrLog" < NUL
"@ | Out-File -FilePath $beBat -Encoding ascii

    $beCmdLine = "cmd.exe /c `"$beBat`""
    $beResult = Invoke-CimMethod -ClassName Win32_Process -MethodName Create -Arguments @{ CommandLine = $beCmdLine; CurrentDirectory = $BackendDir }
    $pids += $beResult.ProcessId

    $feBat = Join-Path $LogDir "run_frontend.bat"
    $feLog = Join-Path $LogDir "frontend.log"
    $feErrLog = Join-Path $LogDir "frontend_error.log"
    
    @"
@echo off
set VITE_API_URL=http://localhost:8000
cd /d "$FrontendDir"
".\node_modules\.bin\vite.cmd" --port 3006 --host 0.0.0.0 > "$feLog" 2> "$feErrLog" < NUL
"@ | Out-File -FilePath $feBat -Encoding ascii

    $feCmdLine = "cmd.exe /c `"$feBat`""
    $feResult = Invoke-CimMethod -ClassName Win32_Process -MethodName Create -Arguments @{ CommandLine = $feCmdLine; CurrentDirectory = $FrontendDir }
    $pids += $feResult.ProcessId

    # Guardar PIDs
    $pids | Out-File -FilePath $pidFile -Encoding UTF8
    Write-Output "DAEMON_OK:$($pids -join ',')"
    exit 0
}

# === MODO INTERACTIVO: loop de monitoreo (original) ===
Stop-ProcessesOnPort 8000
Stop-ProcessesOnPort 3006
wsl docker stop sennova-frontend sennova-backend 2>$null | Out-Null
Stop-DockerContainers @("sennova-frontend", "sennova-backend")

if (-not $PythonExe) { Write-Log "ERROR: Python not found" "Red"; return }
if (-not $NodeExe) { Write-Log "ERROR: Node not found" "Red"; return }

$pgOk = Test-NetConnection -ComputerName 127.0.0.1 -Port 5434 -WarningAction SilentlyContinue -ErrorAction SilentlyContinue
$redisOk = Test-NetConnection -ComputerName 127.0.0.1 -Port 6380 -WarningAction SilentlyContinue -ErrorAction SilentlyContinue

Write-Log "=== Starting SENNOVA Windows-Native ===" "Cyan"
if ($pgOk.TcpTestSucceeded) { Write-Log "PostgreSQL: ONLINE (5434)" "Green" } else { Write-Log "PostgreSQL: OFFLINE — using SQLite fallback" "Yellow" }
if ($redisOk.TcpTestSucceeded) { Write-Log "Redis: ONLINE (6380)" "Green" } else { Write-Log "Redis: OFFLINE — cache disabled" "Yellow" }

$procs = @()

if (-not $FrontendOnly) {
    $env:DATABASE_URL = if ($env:DATABASE_URL) { $env:DATABASE_URL } elseif ($pgOk.TcpTestSucceeded) { "postgresql+psycopg://admin:devbrain_secure_pwd@127.0.0.1:5434/sennova_db" } else { "sqlite:///./sennova.db" }
    $env:REDIS_HOST = "127.0.0.1"; $env:REDIS_PORT = "6380"
    $env:JWT_SECRET = "Lg0u7opP5_6NU1eIJUjYyIIlyZp3XFZ4E3qGKXOr-j_G6TiYaXZ8Psf7thuhQ9r3"
    $env:ALLOWED_ORIGINS = "http://localhost:3006,http://localhost:5173,http://localhost:8050,http://127.0.0.1:3006,http://127.0.0.1:8050"
    $env:DEBUG = "true"

    $procs += Start-TransparentProcess -FilePath $PythonExe -Arguments "-c `"import asyncio; asyncio.set_event_loop(asyncio.new_event_loop()); import uvicorn; uvicorn.run('app.main:app', host='0.0.0.0', port=8000)`"" -WorkingDir $BackendDir -LogPath (Join-Path $LogDir "backend.log") -Label "Backend" -Color "Cyan"
}

if (-not $BackendOnly) {
    $env:VITE_API_URL = "http://localhost:8000"
    $procs += Start-TransparentProcess -FilePath "cmd.exe" -Arguments "/c .\node_modules\.bin\vite.cmd --port 3006 --host 0.0.0.0" -WorkingDir $FrontendDir -LogPath (Join-Path $LogDir "frontend.log") -Label "Frontend" -Color "Green"
}

try { $host.UI.RawUI.WindowTitle = "SENNOVA CGAO — Monitoring (Q=stop)" } catch {}

Write-Log "Esperando servicios..." "Yellow"
$maxWait = 30; $waited = 0
while ($waited -lt $maxWait) {
    $beUp = (Test-NetConnection -ComputerName 127.0.0.1 -Port 8000 -WarningAction SilentlyContinue).TcpTestSucceeded
    $feUp = (Test-NetConnection -ComputerName 127.0.0.1 -Port 3006 -WarningAction SilentlyContinue).TcpTestSucceeded
    if ($beUp -and ($feUp -or $BackendOnly)) { break }
    Start-Sleep -Seconds 1; $waited++
}

Write-Log "`n=== SENNOVA Windows-Native Ready ===" "Green"
Write-Log "Frontend: http://localhost:3006" "Cyan"
Write-Log "Backend:  http://localhost:8000/docs" "Cyan"
Write-Log "Save: ~678MB RAM (vs Docker)" "Green"

$liveProcesses = $procs | Where-Object { -not $_.HasExited }
while ($liveProcesses.Count -gt 0) {
    try {
        if ([Console]::KeyAvailable) {
            $key = [Console]::ReadKey($true)
            if ($key.Key -eq 'Q') {
                Write-Log "Stopping..." "Yellow"
                $procs | ForEach-Object { if (-not $_.HasExited) { try { $_.Kill() } catch {} } }
                break
            }
        }
    } catch { Start-Sleep -Seconds 2 }
    $liveProcesses = $procs | Where-Object { -not $_.HasExited }
    Start-Sleep -Milliseconds 300
}
Write-Log "Detached. To stop: .\start-windows.ps1 -Stop" "Yellow"
