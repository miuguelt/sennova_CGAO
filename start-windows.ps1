<#
.SYNOPSIS
    SENNOVA CGAO Windows-Native Startup
.DESCRIPTION
    Starts: FastAPI backend on 8000, Vite frontend on 3006
    Uses shared native PostgreSQL (127.0.0.1:5434)
    Uses native Memurai (127.0.0.1:6380)
    Reads secrets from the process environment or the untracked project .env
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

function Import-ProjectEnvironment {
    param([string]$Path)

    if (-not (Test-Path -LiteralPath $Path)) { return }

    Get-Content -LiteralPath $Path | ForEach-Object {
        $line = $_.Trim()
        if (-not $line -or $line.StartsWith("#") -or -not $line.Contains("=")) { return }

        $key, $value = $line.Split("=", 2)
        $key = $key.Trim()
        $value = $value.Trim()
        if ($value.Length -ge 2 -and (
            ($value.StartsWith('"') -and $value.EndsWith('"')) -or
            ($value.StartsWith("'") -and $value.EndsWith("'"))
        )) {
            $value = $value.Substring(1, $value.Length - 2)
        }
        if ($key) {
            [System.Environment]::SetEnvironmentVariable($key, $value, "Process")
        }
    }
}

Import-ProjectEnvironment -Path (Join-Path $ProjectRoot ".env")
# Inyectar credenciales desde WCM (sobrescribe .env si existe)
$wcmInjector = Join-Path $PSScriptRoot "..\..\_infrastructure\devbraind\scripts\Import-ProjectCredentials.ps1"
if (Test-Path $wcmInjector) { . $wcmInjector; Import-ProjectCredentials -Project sennova }
$env:PYTHONUNBUFFERED = "1"

if (-not (Test-Path -LiteralPath $LogDir)) { New-Item -ItemType Directory -Path $LogDir -Force | Out-Null }

function Write-Log { param($msg, $color="White") Write-Host "[$(Get-Date -Format 'HH:mm:ss')] $msg" -ForegroundColor $color }

function Test-TcpEndpoint {
    param([string]$HostName, [int]$Port)

    try {
        $client = [System.Net.Sockets.TcpClient]::new()
        $result = $client.ConnectAsync($HostName, $Port).Wait(800)
        $connected = $result -and $client.Connected
        $client.Dispose()
        return $connected
    } catch {
        return $false
    }
}

function Assert-BackendConfiguration {
    $placeholderPattern = "(?i)(change[-_ ]?this|replace[-_ ]?this|generar|your[-_]|example|placeholder)"
    $jwtSecret = [System.Environment]::GetEnvironmentVariable("JWT_SECRET", "Process")
    if ([string]::IsNullOrWhiteSpace($jwtSecret)) {
        throw "Falta JWT_SECRET. Defínelo en el entorno del proceso, Windows Credential Manager o el archivo .env local no rastreado."
    }
    if ($jwtSecret.Length -lt 32 -or $jwtSecret -match $placeholderPattern) {
        throw "JWT_SECRET no cumple la política mínima. Debe tener 32 o más caracteres y no ser un valor de ejemplo."
    }

    $databaseUrl = [System.Environment]::GetEnvironmentVariable("DATABASE_URL", "Process")
    if (-not [string]::IsNullOrWhiteSpace($databaseUrl)) {
        if ($databaseUrl -match $placeholderPattern) {
            throw "DATABASE_URL contiene un valor de ejemplo. Configura una credencial local válida sin guardarla en Git."
        }

        try {
            $databaseUri = [Uri]$databaseUrl
        } catch {
            throw "DATABASE_URL no tiene un formato URI válido."
        }

        if ($databaseUri.Scheme -notmatch "^postgresql(?:\+psycopg)?$") {
            throw "DATABASE_URL debe usar PostgreSQL nativo; el launcher no permite fallback a SQLite."
        }
        if ($databaseUri.Host -notin @("127.0.0.1", "localhost") -or $databaseUri.Port -ne 5434) {
            throw "DATABASE_URL debe apuntar al PostgreSQL nativo local en 127.0.0.1:5434."
        }
        if ($databaseUri.AbsolutePath.Trim("/") -ne "sennova") {
            throw "DATABASE_URL debe apuntar a la base canónica 'sennova'."
        }
    } else {
        $componentDefaults = @{
            DB_HOST = "127.0.0.1"
            DB_PORT = "5434"
            DB_NAME = "sennova"
        }
        foreach ($entry in $componentDefaults.GetEnumerator()) {
            $currentValue = [System.Environment]::GetEnvironmentVariable($entry.Key, "Process")
            if ([string]::IsNullOrWhiteSpace($currentValue)) {
                [System.Environment]::SetEnvironmentVariable($entry.Key, $entry.Value, "Process")
            }
        }

        foreach ($requiredKey in @("DB_USER", "DB_PASSWORD")) {
            $requiredValue = [System.Environment]::GetEnvironmentVariable($requiredKey, "Process")
            if ([string]::IsNullOrWhiteSpace($requiredValue) -or $requiredValue -match $placeholderPattern) {
                throw "Falta $requiredKey o contiene un valor de ejemplo. Configúralo fuera de Git."
            }
        }

        if ($env:DB_HOST -notin @("127.0.0.1", "localhost") -or $env:DB_PORT -ne "5434" -or $env:DB_NAME -ne "sennova") {
            throw "DB_HOST, DB_PORT y DB_NAME deben usar 127.0.0.1:5434/sennova para el runtime local."
        }
    }

    if (-not (Test-TcpEndpoint -HostName "127.0.0.1" -Port 5434)) {
        throw "PostgreSQL nativo no responde en 127.0.0.1:5434. El backend no se iniciará con una base alternativa."
    }

    if (-not (Test-TcpEndpoint -HostName "127.0.0.1" -Port 6380)) {
        Write-Log "Memurai no responde en 127.0.0.1:6380; el backend puede operar sin caché, pero no se intentará WSL ni Docker." "Yellow"
    }
}

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
    
    # Usar Start-Process visible — la ventana oculta rompe uvicorn --reload (watchfiles)
    # porque el reloader necesita acceso a la consola para detectar cambios en Windows.
    # stdout/stderr van a archivo para mantener limpio el terminal de monitoreo.
    $p = Start-Process -FilePath $FilePath -ArgumentList $Arguments -WorkingDirectory $WorkingDir `
        -RedirectStandardOutput $LogPath -RedirectStandardError $ErrorLogPath `
        -WindowStyle Normal -PassThru
        
    Write-Log "$Label started (PID $($p.Id), log: $(Split-Path $LogPath -Leaf))" "Green"
    return $p
}

function Stop-Sennova {
    Write-Log "STOPPING all SENNOVA processes..." "Yellow"
    Stop-ProcessesOnPort 8000
    Stop-ProcessesOnPort 3006
    Write-Log "All native SENNOVA processes stopped." "Green"
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
if ($FrontendOnly -and $BackendOnly) { throw "FrontendOnly y BackendOnly no se pueden usar al mismo tiempo." }

# === DAEMON MODE: arranca procesos, guarda PIDs, sale inmediatamente ===
if ($Daemon) {
    Stop-ProcessesOnPort 8000
    Stop-ProcessesOnPort 3006

    if (-not $FrontendOnly) {
        if (-not $PythonExe) { Write-Error "ERROR: Python not found"; exit 1 }
        Assert-BackendConfiguration
    }
    if (-not $BackendOnly -and -not $NodeExe) {
        Write-Error "ERROR: Node not found"
        exit 1
    }

    $pidFile = Join-Path $LogDir "daemon.pid"
    $pids = @()

    if (-not $FrontendOnly) {
        if (-not $env:REDIS_HOST) { $env:REDIS_HOST = "127.0.0.1" }
        if (-not $env:REDIS_PORT) { $env:REDIS_PORT = "6380" }
        if (-not $env:ALLOWED_ORIGINS) {
            $env:ALLOWED_ORIGINS = "http://localhost:3006,http://localhost:5173,http://localhost:8050,http://127.0.0.1:3006,http://127.0.0.1:8050"
        }
        $env:DEBUG = "true"
        $env:VITE_API_URL = "http://localhost:8000"

        $beLog = Join-Path $LogDir "backend.log"
        $beErrLog = Join-Path $LogDir "backend_error.log"
        $beBat = Join-Path $LogDir "run_backend.bat"
        @"
@echo off
cd /d "$BackendDir"
"$PythonExe" run_server.py > "$beLog" 2> "$beErrLog" < NUL
"@ | Out-File -FilePath $beBat -Encoding ascii

        $p = Start-Process -FilePath "cmd.exe" -ArgumentList "/c `"$beBat`"" -WorkingDirectory $BackendDir -WindowStyle Hidden -PassThru
        $pids += $p.Id
    }

    if (-not $BackendOnly) {
        $feBat = Join-Path $LogDir "run_frontend.bat"
        $feLog = Join-Path $LogDir "frontend.log"
        $feErrLog = Join-Path $LogDir "frontend_error.log"

        @"
@echo off
set VITE_API_URL=http://localhost:8000
cd /d "$FrontendDir"
".\node_modules\.bin\vite.cmd" --port 3006 --host 0.0.0.0 > "$feLog" 2> "$feErrLog" < NUL
"@ | Out-File -FilePath $feBat -Encoding ascii

        $p = Start-Process -FilePath "cmd.exe" -ArgumentList "/c `"$feBat`"" -WorkingDirectory $FrontendDir -WindowStyle Hidden -PassThru
        $pids += $p.Id
    }

    # Guardar PIDs
    $pids | Out-File -FilePath $pidFile -Encoding UTF8
    Write-Output "DAEMON_OK:$($pids -join ',')"
    exit 0
}

# === MODO INTERACTIVO: loop de monitoreo (original) ===
Stop-ProcessesOnPort 8000
Stop-ProcessesOnPort 3006

if (-not $FrontendOnly) {
    if (-not $PythonExe) { Write-Log "ERROR: Python not found" "Red"; return }
    Assert-BackendConfiguration
}
if (-not $BackendOnly -and -not $NodeExe) { Write-Log "ERROR: Node not found" "Red"; return }

$pgOk = Test-TcpEndpoint -HostName "127.0.0.1" -Port 5434
$redisOk = Test-TcpEndpoint -HostName "127.0.0.1" -Port 6380

Write-Log "=== Starting SENNOVA Windows-Native ===" "Cyan"
if ($pgOk) { Write-Log "PostgreSQL: ONLINE (5434)" "Green" } else { Write-Log "PostgreSQL: OFFLINE — backend disabled" "Red" }
if ($redisOk) { Write-Log "Memurai: ONLINE (6380)" "Green" } else { Write-Log "Memurai: OFFLINE — cache disabled" "Yellow" }

$procs = @()

if (-not $FrontendOnly) {
    if (-not $env:REDIS_HOST) { $env:REDIS_HOST = "127.0.0.1" }
    if (-not $env:REDIS_PORT) { $env:REDIS_PORT = "6380" }
    if (-not $env:ALLOWED_ORIGINS) {
        $env:ALLOWED_ORIGINS = "http://localhost:3006,http://localhost:5173,http://localhost:8050,http://127.0.0.1:3006,http://127.0.0.1:8050"
    }
    $env:DEBUG = "true"

    $procs += Start-TransparentProcess -FilePath $PythonExe -Arguments "-c `"import asyncio; asyncio.set_event_loop(asyncio.new_event_loop()); import uvicorn; uvicorn.run('app.main:app', host='0.0.0.0', port=8000, reload=True)`"" -WorkingDir $BackendDir -LogPath (Join-Path $LogDir "backend.log") -Label "Backend" -Color "Cyan"
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
