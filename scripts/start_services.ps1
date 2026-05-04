# Sistema SENNOVA CGAO - Script de inicio de servicios
param(
    [Parameter(Position=0)]
    [ValidateSet("start", "stop", "restart", "status")]
    [string]$Action = "start"
)

$BackendPort = 8000
$FrontendPort = 3005
$RootDir = Split-Path $PSScriptRoot -Parent
$MaintenancePath = Join-Path $RootDir "maintenance"

function Write-Status($msg, $color = "White") {
    $ts = Get-Date -Format "HH:mm:ss"
    Write-Host "[$ts] $msg" -ForegroundColor $color
}

function Get-BackendProcess {
    return Get-Process python -ErrorAction SilentlyContinue | 
        Where-Object { $_.CommandLine -like "*uvicorn*" -and $_.CommandLine -like "*:8000*" }
}

function Get-FrontendProcess {
    return Get-Process node -ErrorAction SilentlyContinue | 
        Where-Object { $_.CommandLine -like "*vite*" }
}

function Test-Health($url) {
    try { 
        $r = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 3
        return $r.StatusCode -eq 200 
    } catch { return $false }
}

# Asegurar que existe la carpeta de mantenimiento
if (!(Test-Path $MaintenancePath)) { New-Item -ItemType Directory -Path $MaintenancePath -Force }

# ==========================================
# ACCIONES
# ==========================================

if ($Action -eq "stop" -or $Action -eq "restart") {
    Write-Status "Deteniendo servicios..." "Yellow"
    
    $b = Get-BackendProcess
    if ($b) { 
        $b | Stop-Process -Force
        Write-Status "Backend detenido (PID: $($b.Id))" "Green"
    } else { 
        Write-Status "Backend no estaba corriendo" "Gray"
    }
    
    $f = Get-FrontendProcess
    if ($f) { 
        $f | Stop-Process -Force
        Write-Status "Frontend detenido (PID: $($f.Id))" "Green"
    } else { 
        Write-Status "Frontend no estaba corriendo" "Gray"
    }
    
    if ($Action -eq "stop") { exit }
    Start-Sleep 2
}

if ($Action -eq "start" -or $Action -eq "restart") {
    Write-Status "Iniciando servicios..." "Cyan"
    
    # Iniciar Backend
    $existingBackend = Get-BackendProcess
    if ($existingBackend) {
        Write-Status "Backend ya está corriendo (PID: $($existingBackend.Id))" "Yellow"
    } else {
        Write-Status "Iniciando backend..." "Cyan"
        $backendPath = Join-Path $RootDir "backend"
        $logPath = Join-Path $MaintenancePath "backend.log"
        $errPath = Join-Path $MaintenancePath "backend_error.log"
        
        if (Test-Path $logPath) { Remove-Item $logPath -Force -ErrorAction SilentlyContinue }
        if (Test-Path $errPath) { Remove-Item $errPath -Force -ErrorAction SilentlyContinue }
        
        $proc = Start-Process -FilePath "python" `
            -ArgumentList "-m uvicorn app.main:app --host 127.0.0.1 --port $BackendPort --reload" `
            -WorkingDirectory $backendPath `
            -WindowStyle Hidden `
            -RedirectStandardOutput $logPath `
            -RedirectStandardError $errPath `
            -PassThru
        
        Start-Sleep 4
        if (Test-Health "http://localhost:$BackendPort/health") {
            Write-Status "Backend iniciado (PID: $($proc.Id)) - http://localhost:$BackendPort" "Green"
        } else {
            Write-Status "Backend iniciado pero no respondió aún" "Yellow"
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
