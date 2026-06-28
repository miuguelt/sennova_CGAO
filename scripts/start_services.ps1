# Sistema SENNOVA CGAO - Script de inicio de servicios
param(
    [Parameter(Position=0)]
    [ValidateSet("start", "stop", "restart", "status")]
    [string]$Action = "start"
)

$BackendPort = 8000
$FrontendPort = 3006
$RootDir = Split-Path $PSScriptRoot -Parent
$MaintenancePath = Join-Path $RootDir "maintenance"
$BackendDir = Join-Path $RootDir "backend"
$PythonExe = if (Test-Path "$BackendDir\venv_win\Scripts\python.exe") { "$BackendDir\venv_win\Scripts\python.exe" }
             elseif (Test-Path "$BackendDir\.venv\Scripts\python.exe") { "$BackendDir\.venv\Scripts\python.exe" }
             else { (Get-Command python -ErrorAction SilentlyContinue).Source }

function Write-Status($msg, $color = "White") {
    $ts = Get-Date -Format "HH:mm:ss"
    Write-Host "[$ts] $msg" -ForegroundColor $color
}

function Get-BackendProcess {
    $conn = Get-NetTCPConnection -LocalPort $BackendPort -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($conn) {
        return Get-Process -Id $conn.OwningProcess -ErrorAction SilentlyContinue
    }
    return $null
}

function Get-FrontendProcess {
    $conn = Get-NetTCPConnection -LocalPort $FrontendPort -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($conn) {
        return Get-Process -Id $conn.OwningProcess -ErrorAction SilentlyContinue
    }
    return $null
}

function Test-Health($url) {
    try { 
        $r = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 3
        return $r.StatusCode -eq 200 
    } catch { return $false }
}

function Test-PortFree($port) {
    try {
        $listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $port)
        $listener.Start()
        $listener.Stop()
        return $true
    } catch {
        return $false
    }
}

function Stop-ProcessByPort($port) {
    $conn = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    foreach ($c in $conn) {
        $p = Get-Process -Id $c.OwningProcess -ErrorAction SilentlyContinue
        if ($p) {
            $p | Stop-Process -Force
            Write-Status "Matado proceso $($p.Name) (PID: $($p.Id)) en puerto $port" "Yellow"
        }
    }
    # Matar procesos python huerfanos cuyo command line incluya el puerto
    Get-CimInstance -ClassName Win32_Process -Filter "Name = 'python.exe'" -ErrorAction SilentlyContinue |
        Where-Object { $_.CommandLine -match "port $port|--port $port" } |
        ForEach-Object {
            $p = Get-Process -Id $_.ProcessId -ErrorAction SilentlyContinue
            if ($p) { $p | Stop-Process -Force; Write-Status "Matado python huerfano (PID: $($p.Id))" "Yellow" }
        }
}

function Clear-Port8000Blockers {
    # Verifica si iphlpsvc tiene conexiones zombies en puerto 8000
    $iphlSvc = Get-CimInstance Win32_Service -Filter "Name='iphlpsvc'" -ErrorAction SilentlyContinue
    if (-not $iphlSvc -or $iphlSvc.State -ne "Running") { return }
    $svchostPid = $iphlSvc.ProcessId
    $connections = Get-NetTCPConnection -LocalPort $BackendPort -ErrorAction SilentlyContinue |
        Where-Object { $_.OwningProcess -eq $svchostPid -and $_.State -in @("CloseWait", "FinWait2") }
    if (-not $connections) { return }
    
    Write-Status "Conexiones zombies en puerto $BackendPort (iphlpsvc PID $svchostPid). Reiniciando servicio..." "Yellow"
    try {
        Start-Process -FilePath "powershell" -ArgumentList "-Command net stop iphlpsvc; net start iphlpsvc" -Verb RunAs -WindowStyle Hidden -Wait
        Start-Sleep 2
        if (Test-PortFree $BackendPort) {
            Write-Status "Puerto $BackendPort liberado" "Green"
        } else {
            Write-Status "No se pudo liberar el puerto $BackendPort" "Red"
        }
    } catch {
        Write-Status "No se pudo reiniciar iphlpsvc (admin requerido). Ejecuta en terminal admin:" "Red"
        Write-Status "  net stop iphlpsvc && net start iphlpsvc" "Gray"
    }
}

function Wait-ForPortFree($port, $timeoutSeconds = 10) {
    $elapsed = 0
    while ($elapsed -lt $timeoutSeconds) {
        if (Test-PortFree $port) { return $true }
        Start-Sleep 1
        $elapsed++
    }
    return $false
}

# Asegurar que existe la carpeta de mantenimiento
if (!(Test-Path $MaintenancePath)) { New-Item -ItemType Directory -Path $MaintenancePath -Force }

# ==========================================
# ACCIONES
# ==========================================

if ($Action -eq "stop" -or $Action -eq "restart") {
    Write-Status "Deteniendo servicios..." "Yellow"
    
    Stop-ProcessByPort $BackendPort
    
    $f = Get-FrontendProcess
    if ($f) { 
        $f | Stop-Process -Force
        Write-Status "Frontend detenido (PID: $($f.Id))" "Green"
    } else { 
        Write-Status "Frontend no estaba corriendo" "Gray"
    }
    
    if ($Action -eq "stop") { 
        Wait-ForPortFree $BackendPort 5 | Out-Null
        exit 
    }
    Start-Sleep 2
}

if ($Action -eq "start" -or $Action -eq "restart") {
    Write-Status "Iniciando servicios..." "Cyan"
    
    # Iniciar Backend
    $backendPath = Join-Path $RootDir "backend"
    $logPath = Join-Path $MaintenancePath "backend.log"
    $errPath = Join-Path $MaintenancePath "backend_error.log"
    
    # Verificar si el puerto esta libre
    if (-not (Test-PortFree $BackendPort)) {
        Write-Status "Puerto $BackendPort ocupado. Limpiando..." "Yellow"
        Stop-ProcessByPort $BackendPort
        if (-not (Test-PortFree $BackendPort)) {
            Clear-Port8000Blockers
        }
        if (-not (Wait-ForPortFree $BackendPort 8)) {
            Write-Status "Puerto $BackendPort no se pudo liberar. Usando puerto alternativo 8001." "Yellow"
            $BackendPort = 8001
        }
    }
    
    $existingBackend = Get-BackendProcess
    if ($existingBackend) {
        Write-Status "Backend ya está corriendo (PID: $($existingBackend.Id)) - http://localhost:$BackendPort" "Yellow"
    } else {
        Write-Status "Iniciando backend en puerto $BackendPort..." "Cyan"
        
        if (Test-Path $logPath) { Remove-Item $logPath -Force -ErrorAction SilentlyContinue }
        if (Test-Path $errPath) { Remove-Item $errPath -Force -ErrorAction SilentlyContinue }
        
        $proc = Start-Process -FilePath $PythonExe `
            -ArgumentList "-u -m uvicorn app.main:app --host 127.0.0.1 --port $BackendPort --reload" `
            -WorkingDirectory $backendPath `
            -WindowStyle Hidden `
            -RedirectStandardOutput $logPath `
            -RedirectStandardError $errPath `
            -PassThru
        
        # Reintentar health check varias veces
        $maxRetries = 6
        $healthy = $false
        for ($i = 0; $i -lt $maxRetries; $i++) {
            Start-Sleep 3
            if (Test-Health "http://localhost:$BackendPort/health") {
                $healthy = $true
                break
            }
            Write-Status "Esperando respuesta del backend (intento $($i+1)/$maxRetries)..." "Gray"
        }
        
        if ($healthy) {
            Write-Status "Backend iniciado (PID: $($proc.Id)) - http://localhost:$BackendPort" "Green"
        } else {
            Write-Status "Backend NO responde. Revisa: $errPath" "Red"
            if (Test-Path $errPath) {
                Get-Content $errPath -Tail 10 -ErrorAction SilentlyContinue | ForEach-Object { Write-Host "  $_" -ForegroundColor Red }
            }
        }
    }
    
    # Iniciar Frontend
    $existingFrontend = Get-FrontendProcess
    if ($existingFrontend) {
        Write-Status "Frontend ya está corriendo (PID: $($existingFrontend.Id))" "Yellow"
    } else {
        Write-Status "Iniciando frontend..." "Cyan"
        $frontendPath = Join-Path $RootDir "frontend"
        $logPath = Join-Path $MaintenancePath "frontend.log"
        $errPath = Join-Path $MaintenancePath "frontend_error.log"
        
        if (Test-Path $logPath) { Remove-Item $logPath -Force -ErrorAction SilentlyContinue }
        if (Test-Path $errPath) { Remove-Item $errPath -Force -ErrorAction SilentlyContinue }
        
        $proc = Start-Process -FilePath "cmd.exe" `
            -ArgumentList "/c npm run dev" `
            -WorkingDirectory $frontendPath `
            -WindowStyle Hidden `
            -RedirectStandardOutput $logPath `
            -RedirectStandardError $errPath `
            -PassThru
        
        Start-Sleep 5
        if (Test-Health "http://localhost:$FrontendPort") {
            Write-Status "Frontend iniciado (PID: $($proc.Id)) - http://localhost:$FrontendPort" "Green"
        } else {
            Write-Status "Frontend iniciado pero no respondió aún" "Yellow"
        }
    }
}

if ($Action -eq "status") {
    Write-Status "=== ESTADO ===" "Cyan"
    
    $b = Get-BackendProcess
    if ($b) {
        $health = Test-Health "http://localhost:$BackendPort/health"
        Write-Status "Backend (PID: $($b.Id)): $(&{if($health){'OK'}else{'Sin respuesta'}})" $(if($health){"Green"}else{"Red"})
    } else {
        Write-Status "Backend: DETENIDO" "Red"
    }
    
    $f = Get-FrontendProcess
    if ($f) {
        $health = Test-Health "http://localhost:$FrontendPort"
        Write-Status "Frontend (PID: $($f.Id)): $(&{if($health){'OK'}else{'Sin respuesta'}})" $(if($health){"Green"}else{"Red"})
    } else {
        Write-Status "Frontend: DETENIDO" "Red"
    }
}

Write-Status "Comando completado" "Cyan"
