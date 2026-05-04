#Requires -Version 5.1
<#
.SYNOPSIS
    Script de arranque automático SENNOVA CGAO
.DESCRIPTION
    Verifica, corrige e inicia todos los servicios del sistema
#>

$ErrorActionPreference = "Continue"
$ProgressPreference = "Continue"

# Colores
$Green = "Green"
$Red = "Red"
$Yellow = "Yellow"
$Cyan = "Cyan"

function Write-Status($Message, $Color = $Green) {
    Write-Host "[$(Get-Date -Format 'HH:mm:ss')] $Message" -ForegroundColor $Color
}

function Test-Port($TargetHost, $Port, $Timeout = 2) {
    try {
        $client = New-Object System.Net.Sockets.TcpClient
        $connection = $client.BeginConnect($TargetHost, $Port, $null, $null)
        $success = $connection.AsyncWaitHandle.WaitOne([TimeSpan]::FromSeconds($Timeout))
        if ($success) {
            $client.EndConnect($connection)
            return $true
        }
        return $false
    } catch {
        return $false
    } finally {
        if ($client) { $client.Close() }
    }
}

function Test-HttpEndpoint($Url, $Timeout = 5) {
    try {
        $response = Invoke-WebRequest -Uri $Url -TimeoutSec $Timeout -UseBasicParsing
        return @{ Success = $true; Status = $response.StatusCode }
    } catch {
        return @{ Success = $false; Error = $_.Exception.Message }
    }
}

function Stop-NodeProcesses {
    Write-Status "Deteniendo procesos Node.js existentes..." $Yellow
    Get-Process -Name "node" -ErrorAction SilentlyContinue | ForEach-Object {
        try {
            Stop-Process -Id $_.Id -Force
            Write-Status "  Detenido PID $($_.Id)" $Yellow
        } catch {
            Write-Status "  No se pudo detener PID $($_.Id)" $Red
        }
    }
    Start-Sleep -Seconds 2
}

function Stop-PythonProcesses {
    Write-Status "Deteniendo procesos Python existentes..." $Yellow
    Get-Process -Name "python" -ErrorAction SilentlyContinue | Where-Object {
        $_.CommandLine -like "*uvicorn*" -or $_.CommandLine -like "*app.main*"
    } | ForEach-Object {
        try {
            Stop-Process -Id $_.Id -Force
            Write-Status "  Detenido PID $($_.Id)" $Yellow
        } catch {
            Write-Status "  No se pudo detener PID $($_.Id)" $Red
        }
    }
    Start-Sleep -Seconds 2
}

# ============================================
# INICIO DEL SCRIPT
# ============================================

Clear-Host
Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════════════╗" -ForegroundColor $Cyan
Write-Host "║           SENNOVA CGAO - Sistema de Arranque                ║" -ForegroundColor $Cyan
Write-Host "║         Verificación y Corrección Automática                 ║" -ForegroundColor $Cyan
Write-Host "╚══════════════════════════════════════════════════════════════╝" -ForegroundColor $Cyan
Write-Host ""

# Verificar directorio
$RootDir = $PSScriptRoot
if (-not $RootDir) { $RootDir = (Get-Location).Path }
Set-Location $RootDir
Write-Status "Directorio de trabajo: $RootDir" $Cyan

# ============================================
# PASO 1: Verificar Backend
# ============================================
Write-Host ""
Write-Status "═ PASO 1: Verificando Backend (Puerto 8000) ═" $Cyan

$BackendRunning = Test-Port "localhost" 8000
if ($BackendRunning) {
    Write-Status "✓ Backend YA está corriendo" $Green
    $HealthCheck = Test-HttpEndpoint "http://localhost:8000/health"
    if ($HealthCheck.Success) {
        Write-Status "✓ Health check: OK ($($HealthCheck.Status))" $Green
    } else {
        Write-Status "⚠ Health check falló: $($HealthCheck.Error)" $Yellow
    }
} else {
    Write-Status "✗ Backend NO está corriendo. Iniciando..." $Yellow
    Stop-PythonProcesses
    
    # Verificar base de datos
    $DbPath = Join-Path $RootDir "backend\sennova.db"
    if (-not (Test-Path $DbPath)) {
        Write-Status "⚠ Base de datos no existe. Se creará automáticamente." $Yellow
    }
    
    # Iniciar backend
    $BackendDir = Join-Path $RootDir "backend"
    if (Test-Path $BackendDir) {
        Write-Status "Iniciando UVicorn en $BackendDir..." $Cyan
        
        $BackendProcess = Start-Process -FilePath "python" -ArgumentList "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload" -WorkingDirectory $BackendDir -WindowStyle Hidden -PassThru
        
        # Esperar a que inicie
        $Attempts = 0
        $MaxAttempts = 30
        while ($Attempts -lt $MaxAttempts) {
            Start-Sleep -Seconds 1
            if (Test-Port "localhost" 8000) {
                Write-Status "✓ Backend iniciado exitosamente (PID: $($BackendProcess.Id))" $Green
                break
            }
            $Attempts++
            Write-Status "  Esperando backend... ($Attempts/$MaxAttempts)" $Yellow
        }
        
        if ($Attempts -eq $MaxAttempts) {
            Write-Status "✗ ERROR: Backend no respondió después de $MaxAttempts segundos" $Red
            Write-Status "  Verificando errores..." $Yellow
            
            # Verificar si hay errores de Python
            $PythonCheck = & python -c "print('OK')" 2>&1
            if ($LASTEXITCODE -ne 0) {
                Write-Status "✗ Python no está funcionando correctamente" $Red
                Write-Status "  Error: $PythonCheck" $Red
            }
        }
    } else {
        Write-Status "✗ ERROR: No se encontró directorio backend" $Red
    }
}

# ============================================
# PASO 2: Verificar Frontend
# ============================================
Write-Host ""
Write-Status "═ PASO 2: Verificando Frontend (Puerto 3001) ═" $Cyan

$FrontendRunning = Test-Port "localhost" 3001
if ($FrontendRunning) {
    Write-Status "✓ Frontend YA está corriendo" $Green
    
    # Verificar que responde HTTP
    $HttpCheck = Test-HttpEndpoint "http://localhost:3001"
    if ($HttpCheck.Success) {
        Write-Status "✓ Frontend responde HTTP $($HttpCheck.Status)" $Green
    } else {
        Write-Status "⚠ Frontend no responde HTTP: $($HttpCheck.Error)" $Yellow
    }
} else {
    Write-Status "✗ Frontend NO está corriendo. Iniciando..." $Yellow
    Stop-NodeProcesses
    
    # Verificar node_modules
    $NodeModules = Join-Path $RootDir "node_modules"
    if (-not (Test-Path $NodeModules)) {
        Write-Status "⚠ node_modules no existe. Ejecutando npm install..." $Yellow
        & npm install 2>&1 | ForEach-Object { Write-Status "  $_" $Yellow }
    }
    
    # Verificar vite.config.js
    $ViteConfig = Join-Path $RootDir "vite.config.js"
    if (-not (Test-Path $ViteConfig)) {
        Write-Status "⚠ vite.config.js no existe. Creando configuración básica..." $Yellow
        @"
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3001,
    open: true
  }
})
"@ | Set-Content $ViteConfig -Encoding UTF8
    }
    
    # Iniciar frontend
    Write-Status "Iniciando Vite en puerto 3001..." $Cyan
    $FrontendProcess = Start-Process -FilePath "npm" -ArgumentList "run", "dev", "--", "--port", "3001", "--strictPort" -WorkingDirectory $RootDir -WindowStyle Hidden -PassThru
    
    # Esperar a que inicie
    $Attempts = 0
    $MaxAttempts = 30
    while ($Attempts -lt $MaxAttempts) {
        Start-Sleep -Seconds 1
        if (Test-Port "localhost" 3001) {
            Write-Status "✓ Frontend iniciado exitosamente (PID: $($FrontendProcess.Id))" $Green
            break
        }
        $Attempts++
        Write-Status "  Esperando frontend... ($Attempts/$MaxAttempts)" $Yellow
    }
    
    if ($Attempts -eq $MaxAttempts) {
        Write-Status "✗ ERROR: Frontend no respondió después de $MaxAttempts segundos" $Red
    }
}

# ============================================
# PASO 3: Verificar Conexión Frontend-Backend
# ============================================
Write-Host ""
Write-Status "═ PASO 3: Verificando Conexión Frontend ↔ Backend ═" $Cyan

$ApiUrl = "http://localhost:8000"
$EnvFile = Join-Path $RootDir ".env"

if (Test-Path $EnvFile) {
    $EnvContent = Get-Content $EnvFile -Raw
    $ApiMatch = [regex]::Match($EnvContent, '(?m)^VITE_API_URL=(.+)$')
    if ($ApiMatch.Success -and $ApiMatch.Groups.Count -gt 1) {
        $ApiUrl = $ApiMatch.Groups[1].Value.Trim()
        Write-Status "API URL configurada: $ApiUrl" $Cyan
    }
}

# Verificar CORS
Write-Status "Verificando CORS..." $Cyan
try {
    $CorsCheck = Invoke-WebRequest -Uri "$ApiUrl/health" -Headers @{
        "Origin" = "http://localhost:3001"
    } -TimeoutSec 5 -UseBasicParsing
    
    $AccessControl = $CorsCheck.Headers["Access-Control-Allow-Origin"]
    if ($AccessControl -eq "http://localhost:3001" -or $AccessControl -eq "*") {
        Write-Status "✓ CORS configurado correctamente" $Green
    } else {
        Write-Status "⚠ CORS puede tener problemas. Header: $AccessControl" $Yellow
    }
} catch {
    Write-Status "⚠ No se pudo verificar CORS: $($_.Exception.Message)" $Yellow
}

# ============================================
# PASO 4: Pruebas de Funcionamiento
# ============================================
Write-Host ""
Write-Status "═ PASO 4: Ejecutando Pruebas de Funcionamiento ═" $Cyan

# Test 1: Login
Write-Status "Test 1: Login..." $Cyan
try {
    $LoginBody = @{
        email = "admin@sena.edu.co"
        password = "123456"
    } | ConvertTo-Json
    
    $LoginResponse = Invoke-WebRequest -Uri "$ApiUrl/auth/login" -Method POST -Body $LoginBody -ContentType "application/json" -TimeoutSec 10 -UseBasicParsing
    
    if ($LoginResponse.StatusCode -eq 200) {
        $LoginData = $LoginResponse.Content | ConvertFrom-Json
        if ($LoginData.access_token) {
            Write-Status "✓ Login funciona correctamente" $Green
            $Token = $LoginData.access_token
            
            # Test 2: Dashboard Stats
            Write-Status "Test 2: Dashboard Stats..." $Cyan
            $StatsResponse = Invoke-WebRequest -Uri "$ApiUrl/stats/dashboard" -Headers @{
                "Authorization" = "Bearer $Token"
            } -TimeoutSec 10 -UseBasicParsing
            
            if ($StatsResponse.StatusCode -eq 200) {
                Write-Status "✓ Dashboard Stats funciona correctamente" $Green
                $Stats = $StatsResponse.Content | ConvertFrom-Json
                Write-Status "  Proyectos: $($Stats.proyectos.total)" $Cyan
                Write-Status "  Grupos: $($Stats.grupos.total)" $Cyan
                Write-Status "  Semilleros: $($Stats.semilleros.total)" $Cyan
            } else {
                Write-Status "✗ Dashboard Stats falló: $($StatsResponse.StatusCode)" $Red
            }
            
            # Test 3: CRUD básico
            Write-Status "Test 3: CRUD Grupos..." $Cyan
            $GruposResponse = Invoke-WebRequest -Uri "$ApiUrl/grupos" -Headers @{
                "Authorization" = "Bearer $Token"
            } -TimeoutSec 10 -UseBasicParsing
            
            if ($GruposResponse.StatusCode -eq 200) {
                $Grupos = $GruposResponse.Content | ConvertFrom-Json
                Write-Status "✓ CRUD Grupos funciona ($($Grupos.Count) grupos)" $Green
            } else {
                Write-Status "✗ CRUD Grupos falló: $($GruposResponse.StatusCode)" $Red
            }
        } else {
            Write-Status "✗ Login no retornó token" $Red
        }
    } else {
        Write-Status "✗ Login falló: $($LoginResponse.StatusCode)" $Red
    }
} catch {
    Write-Status "✗ Error en pruebas: $($_.Exception.Message)" $Red
}

# ============================================
# RESUMEN FINAL
# ============================================
Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════════════╗" -ForegroundColor $Cyan
Write-Host "║                    RESUMEN DEL SISTEMA                        ║" -ForegroundColor $Cyan
Write-Host "╚══════════════════════════════════════════════════════════════╝" -ForegroundColor $Cyan
Write-Host ""

$BackendOk = Test-Port "localhost" 8000
$FrontendOk = Test-Port "localhost" 3001

if ($BackendOk) {
    Write-Status "✓ Backend (http://localhost:8000)" $Green
    Write-Status "  API Docs: http://localhost:8000/docs" $Cyan
} else {
    Write-Status "✗ Backend NO disponible" $Red
}

Write-Host ""

if ($FrontendOk) {
    Write-Status "✓ Frontend (http://localhost:3001)" $Green
} else {
    Write-Status "✗ Frontend NO disponible" $Red
}

Write-Host ""

if ($BackendOk -and $FrontendOk) {
    Write-Status "╔══════════════════════════════════════════════════════════════╗" $Green
    Write-Status "║         ✅ SISTEMA LISTO PARA USO                           ║" $Green
    Write-Status "║                                                              ║" $Green
    Write-Status "║   Accede al sistema: http://localhost:3001                   ║" $Green
    Write-Status "║   Login: admin@sena.edu.co / 123456                         ║" $Green
    Write-Status "╚══════════════════════════════════════════════════════════════╝" $Green
} else {
    Write-Status "╔══════════════════════════════════════════════════════════════╗" $Red
    Write-Status "║         ⚠️  HAY PROBLEMAS EN EL SISTEMA                     ║" $Red
    Write-Status "║                                                              ║" $Red
    if (-not $BackendOk) {
        Write-Status "║   → Backend no responde en puerto 8000                     ║" $Red
    }
    if (-not $FrontendOk) {
        Write-Status "║   → Frontend no responde en puerto 3001                    ║" $Red
    }
    Write-Status "║                                                              ║" $Red
    Write-Status "║   Revisa los logs para más detalles:                       ║" $Red
    Write-Status "║   - backend_error.log                                       ║" $Red
    Write-Status "║   - frontend_error.log                                      ║" $Red
    Write-Status "╚══════════════════════════════════════════════════════════════╝" $Red
}

Write-Host ""
